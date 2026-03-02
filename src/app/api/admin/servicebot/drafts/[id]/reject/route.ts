import { NextRequest } from "next/server";
import { getServiceBotDb } from "@/lib/servicebot/server";
import { jsonOk, jsonError } from "@/lib/servicebot/http";

/**
 * POST /api/admin/servicebot/drafts/[id]/reject
 *
 * Reject a draft with reason.
 * Body: { reason: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { reason } = body;

    if (!reason) {
      return jsonError("reason is required", 400);
    }

    const db = getServiceBotDb();
    db.markDraftRejected(id, reason, new Date().toISOString());

    return jsonOk({ rejected: true, draftId: id });
  } catch (err) {
    return jsonError(
      err instanceof Error ? err.message : "Internal error",
      500,
    );
  }
}
