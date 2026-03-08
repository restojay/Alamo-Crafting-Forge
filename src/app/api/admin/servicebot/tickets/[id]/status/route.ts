import { NextRequest } from "next/server";
import { getServiceBotDb } from "@/lib/servicebot/server";
import { jsonOk, jsonError } from "@/lib/servicebot/http";

const VALID_STATUSES = ["open", "pending", "resolved", "closed"];

/**
 * PATCH /api/admin/servicebot/tickets/[id]/status
 *
 * Update a ticket's status.
 * Body: { status: string, actor?: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, actor } = body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return jsonError(
        `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
        400,
      );
    }

    const db = getServiceBotDb();
    const ticket = db.getTicket(id);
    if (!ticket) return jsonError("Ticket not found", 404);

    db.updateTicketStatus(id, status, new Date().toISOString());

    return jsonOk({ updated: true, ticketId: id, status, actor: actor || "admin" });
  } catch (err) {
    return jsonError(
      err instanceof Error ? err.message : "Internal error",
      500,
    );
  }
}
