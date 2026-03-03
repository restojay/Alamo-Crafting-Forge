"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { fetchTicket } from "@/lib/servicebot/client";
import { DraftsQueue } from "../../components/DraftsQueue";

interface Ticket {
  id: string;
  subsidiaryId: string;
  subject: string;
  customerEmail: string;
  customerName: string;
  status: string;
  createdAt: string;
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTicket(id)
      .then((d) => setTicket(d.ticket))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load ticket"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <main className="mx-auto max-w-4xl p-8"><p className="text-gray-500">Loading...</p></main>;
  if (error) return <main className="mx-auto max-w-4xl p-8"><p className="text-red-600">{error}</p></main>;
  if (!ticket) return null;

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="mb-6">
        <Link href="/admin/servicebot/tickets" className="text-sm text-blue-600 hover:underline">
          ← Back to tickets
        </Link>
      </div>

      <div className="mb-6 rounded-lg border p-4">
        <div className="mb-1 flex items-center justify-between">
          <h1 className="text-xl font-bold">{ticket.subject}</h1>
          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            {ticket.status}
          </span>
        </div>
        <div className="mt-2 space-y-1 text-sm text-gray-600">
          <p><span className="font-medium">Customer:</span> {ticket.customerName} &lt;{ticket.customerEmail}&gt;</p>
          <p><span className="font-medium">Subsidiary:</span> {ticket.subsidiaryId}</p>
          <p><span className="font-medium">Created:</span> {ticket.createdAt.slice(0, 19).replace("T", " ")}</p>
          <p className="font-mono text-xs text-gray-400">ID: {ticket.id}</p>
        </div>
      </div>

      <h2 className="mb-3 text-lg font-semibold">Draft Responses</h2>
      <DraftsQueue ticketId={ticket.id} />
    </main>
  );
}
