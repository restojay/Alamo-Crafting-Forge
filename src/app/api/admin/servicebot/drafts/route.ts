import { NextRequest } from "next/server";
import { getServiceBotDb } from "@/lib/servicebot/server";
import { jsonOk, jsonError, getSearchParam } from "@/lib/servicebot/http";

/**
 * GET /api/admin/servicebot/drafts
 *
 * List drafts for a ticket.
 * Query params: ?ticket=<ticketId>
 */
export async function GET(request: NextRequest) {
  try {
    const db = getServiceBotDb();
    const ticketId = getSearchParam(request.url, "ticket");
    if (!ticketId) {
      return jsonError("ticket query param required", 400);
    }
    const drafts = db.getDraftsByTicket(ticketId);
    return jsonOk({ drafts });
  } catch (err) {
    return jsonError(
      err instanceof Error ? err.message : "Internal error",
      500,
    );
  }
}
