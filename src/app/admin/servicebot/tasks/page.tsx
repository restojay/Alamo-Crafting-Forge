"use client";

import { useState } from "react";
import { TasksTable } from "../components/TasksTable";

export default function TasksPage() {
  const [ticketId, setTicketId] = useState("");

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="mb-6 text-2xl font-bold">Tasks</h1>
      <div className="mb-4">
        <input
          type="text"
          value={ticketId}
          onChange={(e) => setTicketId(e.target.value)}
          placeholder="Enter ticket ID to view tasks..."
          className="w-full rounded border px-3 py-2 text-sm"
        />
      </div>
      {ticketId && <TasksTable ticketId={ticketId} />}
    </main>
  );
}
