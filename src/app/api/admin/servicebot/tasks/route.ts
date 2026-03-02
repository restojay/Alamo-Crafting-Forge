import { NextRequest } from "next/server";
import { getServiceBotDb } from "@/lib/servicebot/server";
import { jsonOk, jsonError, getSearchParam } from "@/lib/servicebot/http";

/**
 * GET /api/admin/servicebot/tasks
 *
 * List tasks with optional ticket filter.
 * Query params: ?ticket=<ticketId>
 */
export async function GET(request: NextRequest) {
  try {
    const db = getServiceBotDb();
    const ticketId = getSearchParam(request.url, "ticket");
    if (ticketId) {
      const tasks = db.getTasksByTicket(ticketId);
      return jsonOk({ tasks });
    }
    // Without filter, return empty — full listing requires iteration.
    // The admin UI will always filter by ticket.
    return jsonOk({ tasks: [] });
  } catch (err) {
    return jsonError(
      err instanceof Error ? err.message : "Internal error",
      500,
    );
  }
}
