import { createServer, type IncomingMessage, type ServerResponse, type Server } from "http";
import { resolve } from "path";
import { OpenClawDatabase } from "../db/database.js";
import { createEventLog, type EventLog } from "./event-log.js";
import { createApprovals, type Approvals } from "./approvals.js";
import { createSessions, type Sessions } from "./sessions.js";
import { loadOrCreateToken, validateToken } from "./auth.js";
import type { QaEventType } from "@openclaw/protocol-qa";

const MAX_BODY = 1024 * 1024;

interface HubOptions {
  dbPath: string;
  port?: number;
  tokenPath?: string;
  configPath?: string;
  logFile?: string;
}

export interface Hub {
  token: string;
  port: number;
  stop(): Promise<void>;
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolveBody, reject) => {
    let data = "";
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY) { req.destroy(); reject(new Error("Body too large")); return; }
      data += chunk;
    });
    req.on("end", () => resolveBody(data));
    req.on("error", reject);
  });
}

function json(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

export async function createHub(opts: HubOptions): Promise<Hub> {
  const port = opts.port ?? 7700;
  const db = new OpenClawDatabase(opts.dbPath);
  const eventLog = createEventLog(db);
  const approvals = createApprovals(db, eventLog);
  const sessions = createSessions(db, eventLog);

  const tokenPath = opts.tokenPath ?? resolve(opts.dbPath, "..", "dashboard-token.json");
  const token = loadOrCreateToken(tokenPath);

  eventLog.append("system.startup", "hub", null, { port });

  let reaperInterval: ReturnType<typeof setInterval> | null = null;
  let deliveryStop: (() => void) | null = null;

  async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url || "/", `http://localhost`);
    const method = req.method || "GET";
    let path = url.pathname;

    // Normalize: /api/X -> /X
    if (path.startsWith("/api/")) path = path.slice(4);

    // Auth: exempt /status
    if (path !== "/status") {
      if (!validateToken(req.headers.authorization, token)) {
        return json(res, 401, { error: "Unauthorized" });
      }
    }

    try {
      // ── Status ──
      if (method === "GET" && path === "/status") {
        return json(res, 200, {
          hub: "running",
          active_sessions: sessions.getActive().length,
          pending_approvals: approvals.getPending().length,
          timestamp: new Date().toISOString(),
        });
      }

      // ── Approvals ──
      if (method === "GET" && path === "/approvals") {
        const project = url.searchParams.get("project");
        return json(res, 200, { approvals: approvals.getPending(project || undefined) });
      }

      if (method === "GET" && path.startsWith("/approvals/")) {
        const id = decodeURIComponent(path.slice("/approvals/".length));
        const proposal = approvals.get(id);
        return proposal ? json(res, 200, { proposal }) : json(res, 404, { error: "Not found" });
      }

      if (method === "POST" && path === "/approvals") {
        let body: Record<string, unknown>;
        try { body = JSON.parse(await readBody(req)); } catch { return json(res, 400, { error: "Invalid JSON" }); }
        if (!body.project || !body.title || !body.intent || !body.impact) {
          return json(res, 400, { error: "Missing: project, title, intent, impact" });
        }
        const proposal = approvals.create(
          body.project as string, body.title as string, body.intent as string,
          body.impact as string, (body.requested_by as string) || "unknown", body.diff as string | undefined
        );
        return json(res, 201, { proposal });
      }

      if (method === "POST" && path === "/approvals/decide") {
        let body: Record<string, unknown>;
        try { body = JSON.parse(await readBody(req)); } catch { return json(res, 400, { error: "Invalid JSON" }); }
        if (!body.proposal_id || !body.decision) {
          return json(res, 400, { error: "Missing: proposal_id, decision" });
        }
        const valid = ["approved", "rejected", "commented"];
        if (!valid.includes(body.decision as string)) {
          return json(res, 400, { error: `decision must be: ${valid.join(", ")}` });
        }
        const result = approvals.decide(
          body.proposal_id as string,
          body.decision as "approved" | "rejected" | "commented",
          body.response as string
        );
        return result ? json(res, 200, { proposal: result }) : json(res, 404, { error: "Not found or decided" });
      }

      // ── Sessions ──
      if (method === "GET" && path === "/sessions") {
        return json(res, 200, { sessions: sessions.getActive() });
      }

      if (method === "GET" && path.startsWith("/sessions/")) {
        const id = path.slice("/sessions/".length);
        const session = sessions.get(id);
        return session ? json(res, 200, { session }) : json(res, 404, { error: "Not found" });
      }

      if (method === "POST" && path === "/sessions/register") {
        let body: Record<string, unknown>;
        try { body = JSON.parse(await readBody(req)); } catch { return json(res, 400, { error: "Invalid JSON" }); }
        if (!body.project || !body.cwd) return json(res, 400, { error: "Missing: project, cwd" });
        const session = sessions.register(body.project as string, body.cwd as string, (body.pid as number) || 0, body.id as string);
        return json(res, 201, { session });
      }

      if (method === "POST" && path === "/sessions/heartbeat") {
        let body: Record<string, unknown>;
        try { body = JSON.parse(await readBody(req)); } catch { return json(res, 400, { error: "Invalid JSON" }); }
        if (!body.session_id) return json(res, 400, { error: "Missing: session_id" });
        const ok = sessions.heartbeat(body.session_id as string, body.activity as string);
        return json(res, ok ? 200 : 404, { ok });
      }

      if (method === "POST" && path === "/sessions/end") {
        let body: Record<string, unknown>;
        try { body = JSON.parse(await readBody(req)); } catch { return json(res, 400, { error: "Invalid JSON" }); }
        if (!body.session_id) return json(res, 400, { error: "Missing: session_id" });
        const ok = sessions.end(body.session_id as string);
        return json(res, ok ? 200 : 404, { ok });
      }

      // ── Events ──
      if (method === "GET" && path === "/events") {
        const type = url.searchParams.get("type") as QaEventType | null;
        const project = url.searchParams.get("project");
        const limit = url.searchParams.get("limit");
        const events = eventLog.getEvents({
          type: type || undefined,
          project: project || undefined,
          limit: limit ? parseInt(limit) : 50,
        });
        return json(res, 200, { events });
      }

      if (method === "POST" && path === "/events") {
        let body: Record<string, unknown>;
        try { body = JSON.parse(await readBody(req)); } catch { return json(res, 400, { error: "Invalid JSON" }); }
        if (!body.type || !body.source) return json(res, 400, { error: "Missing: type, source" });
        try {
          const event = eventLog.append(
            body.type as string, body.source as string,
            (body.project as string) || null, (body.payload as Record<string, unknown>) || {}
          );
          return json(res, 201, { event });
        } catch (err) {
          return json(res, 400, { error: err instanceof Error ? err.message : "Invalid event type" });
        }
      }

      json(res, 404, { error: "Not found" });
    } catch (err) {
      json(res, 500, { error: err instanceof Error ? err.message : "Internal error" });
    }
  }

  return new Promise((resolvePromise, reject) => {
    const server: Server = createServer((req, res) => {
      handleRequest(req, res).catch((err) => json(res, 500, { error: String(err) }));
    });

    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        reject(new Error(`Port ${port} in use`));
      } else {
        reject(err);
      }
    });

    server.listen(port, "127.0.0.1", () => {
      reaperInterval = setInterval(() => sessions.reapDead(120), 60_000);

      resolvePromise({
        token,
        port,
        async stop() {
          if (deliveryStop) deliveryStop();
          if (reaperInterval) clearInterval(reaperInterval);
          eventLog.append("system.shutdown", "hub", null, {});
          return new Promise<void>((r) => {
            server.close(() => { db.close(); r(); });
          });
        },
      });
    });
  });
}
