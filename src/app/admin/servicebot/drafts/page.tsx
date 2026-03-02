"use client";

import { useState } from "react";
import { DraftsQueue } from "../components/DraftsQueue";

export default function DraftsPage() {
  const [ticketId, setTicketId] = useState("");
  const [ticketEmail, setTicketEmail] = useState("");

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="mb-6 text-2xl font-bold">Draft Responses</h1>
      <div className="mb-4 space-y-2">
        <input
          type="text"
          value={ticketId}
          onChange={(e) => setTicketId(e.target.value)}
          placeholder="Ticket ID..."
          className="w-full rounded border px-3 py-2 text-sm"
        />
        <input
          type="email"
          value={ticketEmail}
          onChange={(e) => setTicketEmail(e.target.value)}
          placeholder="Customer email (for sending)..."
          className="w-full rounded border px-3 py-2 text-sm"
        />
      </div>
      {ticketId && ticketEmail && (
        <DraftsQueue ticketId={ticketId} ticketEmail={ticketEmail} />
      )}
    </main>
  );
}
