import { NextRequest } from "next/server";
import { getServiceBotDb } from "@/lib/servicebot/server";
import { jsonOk, jsonError } from "@/lib/servicebot/http";

/**
 * POST /api/admin/servicebot/onboarding
 *
 * Register a new client from config.
 * Body: { config: SubsidiaryConfig }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { config } = body;

    if (!config) {
      return jsonError("config is required", 400);
    }

    const db = getServiceBotDb();
    // Inline registration logic to avoid cross-package import issues
    const { validateConfig } = await import("@servicebot/core");

    const validation = validateConfig(config);
    if (!validation.valid) {
      return jsonError(
        `Config validation failed: ${validation.errors.join(", ")}`,
        400,
      );
    }

    const existing = db.getSyncState(`client:${validation.config.id}`);
    if (existing) {
      return jsonOk({ clientId: validation.config.id, created: false });
    }

    db.saveSyncState(
      `client:${validation.config.id}`,
      JSON.stringify({
        registeredAt: new Date().toISOString(),
        name: validation.config.name,
        sector: validation.config.sector,
      }),
    );

    return jsonOk({ clientId: validation.config.id, created: true });
  } catch (err) {
    return jsonError(
      err instanceof Error ? err.message : "Internal error",
      500,
    );
  }
}
