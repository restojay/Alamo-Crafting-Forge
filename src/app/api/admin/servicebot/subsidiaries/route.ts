import { getServiceBotDb } from "@/lib/servicebot/server";
import { jsonOk, jsonError } from "@/lib/servicebot/http";

/**
 * GET /api/admin/servicebot/subsidiaries
 *
 * List all registered subsidiaries (id + name only — no configJson).
 */
export async function GET() {
  try {
    const db = getServiceBotDb();
    const subsidiaries = db.listSubsidiaries().map((s) => ({
      id: s.id,
      name: s.name,
    }));
    return jsonOk({ subsidiaries });
  } catch (err) {
    return jsonError(
      err instanceof Error ? err.message : "Internal error",
      500,
    );
  }
}
