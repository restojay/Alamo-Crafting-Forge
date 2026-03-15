import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createNotifier } from "../notify.js";
import type { ApprovalDecision } from "@openclaw/protocol-qa";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface AwaitDecisionArgs {
  project: string;
  title: string;
  intent: string;
  impact: string;
  hubUrl?: string;
  hubToken?: string;
  pollTimeoutMs?: number;
  existingProposalId?: string;
}

export interface AwaitDecisionResult {
  status: "approved" | "rejected" | "commented" | "timeout" | "hub-unreachable";
  proposalId?: string;
  response?: string;
}

async function hubFetch(hubUrl: string, token: string, path: string, init?: RequestInit): Promise<Response | null> {
  try {
    return await fetch(`${hubUrl}/api${path}`, {
      ...init,
      headers: { ...init?.headers, Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    return null;
  }
}

export async function awaitDecision(args: AwaitDecisionArgs): Promise<AwaitDecisionResult> {
  const hubUrl = args.hubUrl || process.env.HUB_URL || "http://127.0.0.1:7700";
  const token = args.hubToken || process.env.HUB_TOKEN || "";
  const timeout = args.pollTimeoutMs ?? 600_000;

  let proposalId = args.existingProposalId;

  // Check existing proposal first
  if (proposalId) {
    const resp = await hubFetch(hubUrl, token, `/approvals/${encodeURIComponent(proposalId)}`);
    if (resp?.ok) {
      const data = (await resp.json()) as { proposal?: { status: string; ceo_response: string | null } };
      if (data.proposal && data.proposal.status !== "pending") {
        return {
          status: data.proposal.status as ApprovalDecision,
          proposalId,
          response: data.proposal.ceo_response || undefined,
        };
      }
    }
  }

  // Create new proposal if needed
  if (!proposalId) {
    const resp = await hubFetch(hubUrl, token, "/approvals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project: args.project,
        title: args.title,
        intent: args.intent,
        impact: args.impact,
        requested_by: "governance-gate",
      }),
    });

    if (!resp?.ok) {
      // Hub unreachable — send direct Telegram as fallback
      const configPath = resolve(__dirname, "..", "..", "config", "telegram-config.json");
      const logFile = resolve(__dirname, "..", "..", ".boardroom", "telegram-log.md");
      const { sendApproval } = createNotifier(configPath, logFile);
      const message = `*Governance Gate: ${args.title}*\n\n*Project:* ${args.project}\n*Intent:* ${args.intent}\n*Impact:* ${args.impact}`;
      const shadowId = `shadow:${Date.now().toString(36)}`;
      await sendApproval("actions", message, shadowId);
      return { status: "hub-unreachable" };
    }

    const data = (await resp.json()) as { proposal?: { id: string } };
    proposalId = data.proposal?.id;
    if (!proposalId) return { status: "hub-unreachable" };
  }

  // Poll for decision
  const deadline = Date.now() + timeout;
  const pollInterval = 2000;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, pollInterval));

    const resp = await hubFetch(hubUrl, token, `/approvals/${encodeURIComponent(proposalId)}`);
    if (resp?.ok) {
      const data = (await resp.json()) as { proposal?: { status: string; ceo_response: string | null } };
      if (data.proposal && data.proposal.status !== "pending") {
        return {
          status: data.proposal.status as ApprovalDecision,
          proposalId,
          response: data.proposal.ceo_response || undefined,
        };
      }
    }
  }

  return { status: "timeout", proposalId };
}

// CLI entry point
if (process.argv[1] && (process.argv[1].endsWith("await-decision.ts") || process.argv[1].endsWith("await-decision.js"))) {
  const args = process.argv.slice(2);
  const get = (flag: string): string | undefined => {
    const idx = args.indexOf(flag);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : undefined;
  };

  const project = get("--project");
  const title = get("--title");
  const intent = get("--intent");
  const impact = get("--impact");
  const timeoutStr = get("--timeout");

  if (!project || !title || !intent || !impact) {
    console.error("Usage: npx tsx src/cli/await-decision.ts --project <name> --title <title> --intent <intent> --impact <impact> [--timeout <seconds>]");
    console.error("Exit codes: 0=approved, 1=rejected, 2=timeout, 3=hub-unreachable");
    process.exit(2);
  }

  const timeoutSec = timeoutStr ? parseInt(timeoutStr, 10) : 600;

  awaitDecision({
    project,
    title,
    intent,
    impact,
    pollTimeoutMs: (isNaN(timeoutSec) || timeoutSec <= 0 ? 600 : timeoutSec) * 1000,
  }).then((result) => {
    console.log(JSON.stringify(result));
    switch (result.status) {
      case "approved": process.exit(0); break;
      case "rejected":
      case "commented": process.exit(1); break;
      case "timeout": process.exit(2); break;
      case "hub-unreachable": process.exit(3); break;
    }
  });
}
