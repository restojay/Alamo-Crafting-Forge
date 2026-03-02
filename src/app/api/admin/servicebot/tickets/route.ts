import { NextRequest } from "next/server";
import { getServiceBotDb } from "@/lib/servicebot/server";
import { jsonOk, jsonError, getSearchParam } from "@/lib/servicebot/http";

/**
 * GET /api/admin/servicebot/tickets
 *
 * List tickets with optional subsidiary filter.
 * Query params: ?subsidiary=<id>
 */
export async function GET(request: NextRequest) {
  try {
    const db = getServiceBotDb();
    const subsidiary = getSearchParam(request.url, "subsidiary");
    const tickets = db.getOpenTickets(subsidiary ?? undefined);
    return jsonOk({ tickets });
  } catch (err) {
    return jsonError(
      err instanceof Error ? err.message : "Internal error",
      500,
    );
  }
}
