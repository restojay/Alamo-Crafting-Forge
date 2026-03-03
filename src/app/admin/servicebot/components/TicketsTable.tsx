"use client";

import { useEffect, useState } from "react";
import { fetchTickets, fetchSubsidiaries } from "@/lib/servicebot/client";
import Link from "next/link";

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
  const [subsidiaries, setSubsidiaries] = useState<{ id: string; name: string }[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubsidiaries().then((d) => setSubsidiaries(d.subsidiaries));
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchTickets(filter || undefined)
      .then((data) => setTickets(data.tickets))
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Subsidiary</label>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded border px-2 py-1 text-sm"
        >
          <option value="">All subsidiaries</option>
          {subsidiaries.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>
      {loading ? (
        <p className="text-gray-500">Loading tickets...</p>
      ) : tickets.length === 0 ? (
        <p className="text-gray-500">No open tickets.</p>
      ) : (
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
              <tr key={t.id} className="border-b hover:bg-gray-50">
                <td className="py-2 font-mono text-xs">
                  <Link
                    href={`/admin/servicebot/tickets/${t.id}`}
                    className="text-blue-600 underline hover:text-blue-800"
                  >
                    {t.id.slice(0, 8)}
                  </Link>
                </td>
                <td className="py-2">
                  <Link href={`/admin/servicebot/tickets/${t.id}`} className="hover:underline">
                    {t.subject}
                  </Link>
                </td>
                <td className="py-2">{t.customerEmail}</td>
                <td className="py-2 text-xs text-gray-500">{t.subsidiaryId}</td>
                <td className="py-2 text-xs text-gray-500">{t.createdAt.slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
