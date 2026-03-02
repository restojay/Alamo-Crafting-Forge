"use client";

import { useEffect, useState } from "react";
import { fetchDrafts } from "@/lib/servicebot/client";
import { ApprovalActions } from "./ApprovalActions";

interface Draft {
  id: string;
  ticketId: string;
  body: string;
  approved: 0 | 1;
  approvedBy?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  sentAt?: string;
  createdAt: string;
}

function statusBadge(draft: Draft) {
  if (draft.sentAt) return { label: "Sent", className: "bg-green-100 text-green-700" };
  if (draft.approved) return { label: "Approved", className: "bg-blue-100 text-blue-700" };
  if (draft.rejectedAt) return { label: "Rejected", className: "bg-red-100 text-red-700" };
  return { label: "Pending", className: "bg-yellow-100 text-yellow-700" };
}

export function DraftsQueue({ ticketId, ticketEmail }: { ticketId: string; ticketEmail: string }) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = () => {
    fetchDrafts(ticketId)
      .then((data) => setDrafts(data.drafts))
      .finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, [ticketId]);

  if (loading) return <p className="text-gray-500">Loading drafts...</p>;
  if (drafts.length === 0) return <p className="text-gray-500">No drafts.</p>;

  return (
    <div className="space-y-4">
      {drafts.map((d) => {
        const badge = statusBadge(d);
        return (
          <div key={d.id} className="rounded-lg border p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-xs text-gray-500">{d.id.slice(0, 8)}</span>
              <span className={`rounded px-2 py-0.5 text-xs ${badge.className}`}>
                {badge.label}
              </span>
            </div>
            <p className="mb-3 whitespace-pre-wrap text-sm">{d.body}</p>
            {!d.approved && !d.rejectedAt && (
              <ApprovalActions draftId={d.id} ticketEmail={ticketEmail} onAction={reload} />
            )}
            {d.rejectionReason && (
              <p className="mt-2 text-xs text-red-600">
                Rejection: {d.rejectionReason}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
