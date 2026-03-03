import { NextRequest } from "next/server";
import { getServiceBotDb } from "@/lib/servicebot/server";
import { jsonOk, jsonError } from "@/lib/servicebot/http";

/**
 * GET /api/admin/servicebot/tickets/[id]
 *
 * Return a single ticket by ID.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const db = getServiceBotDb();
    const ticket = db.getTicket(id);
    if (!ticket) return jsonError("Ticket not found", 404);
    return jsonOk({ ticket });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Internal error", 500);
  }
}
