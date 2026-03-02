"use client";

import { useEffect, useState } from "react";
import { fetchTickets } from "@/lib/servicebot/client";

interface Ticket {
  id: string;
  subsidiaryId: string;
  subject: string;
  customerEmail: string;
  customerName: string;
  status: string;
  createdAt: string;
}

export function TicketsTable() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTickets()
      .then((data) => setTickets(data.tickets))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-500">Loading tickets...</p>;
  if (tickets.length === 0)
    return <p className="text-gray-500">No open tickets.</p>;

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b text-gray-600">
          <th className="pb-2">ID</th>
          <th className="pb-2">Subject</th>
          <th className="pb-2">Customer</th>
          <th className="pb-2">Subsidiary</th>
          <th className="pb-2">Created</th>
        </tr>
      </thead>
      <tbody>
        {tickets.map((t) => (
          <tr key={t.id} className="border-b">
            <td className="py-2 font-mono text-xs">{t.id.slice(0, 8)}</td>
            <td className="py-2">{t.subject}</td>
            <td className="py-2">{t.customerEmail}</td>
            <td className="py-2">{t.subsidiaryId}</td>
            <td className="py-2 text-xs text-gray-500">{t.createdAt}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
