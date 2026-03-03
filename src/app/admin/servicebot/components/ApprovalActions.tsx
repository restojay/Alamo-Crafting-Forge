"use client";

import { useState } from "react";
import { approveDraft, rejectDraft } from "@/lib/servicebot/client";

interface Props {
  draftId: string;
  onAction: () => void;
}

export function ApprovalActions({ draftId, onAction }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");

  const handleApprove = async () => {
    setLoading(true);
    setError(null);
    try {
      await approveDraft(draftId, "admin");
      onAction();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!reason.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await rejectDraft(draftId, reason);
      onAction();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reject failed");
    } finally {
      setLoading(false);
      setShowReject(false);
      setReason("");
    }
  };

  return (
    <div className="space-y-1">
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    <div className="flex items-center gap-2">
      <button
        onClick={handleApprove}
        disabled={loading}
        className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? "..." : "Approve"}
      </button>
      {!showReject ? (
        <button
          onClick={() => setShowReject(true)}
          disabled={loading}
          className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700 disabled:opacity-50"
        >
          Reject
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Rejection reason..."
            className="rounded border px-2 py-1 text-sm"
          />
          <button
            onClick={handleReject}
            disabled={loading || !reason.trim()}
            className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700 disabled:opacity-50"
          >
            Confirm
          </button>
          <button
            onClick={() => setShowReject(false)}
            className="text-sm text-gray-500"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
    </div>
  );
}
