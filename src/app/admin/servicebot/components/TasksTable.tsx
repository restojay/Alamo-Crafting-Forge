"use client";

import { useEffect, useState } from "react";
import { fetchTasks } from "@/lib/servicebot/client";

interface Task {
  id: string;
  category: string;
  state: string;
  description: string;
  urgency: number;
  createdAt: string;
}

export function TasksTable({ ticketId }: { ticketId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks(ticketId)
      .then((data) => setTasks(data.tasks))
      .finally(() => setLoading(false));
  }, [ticketId]);

  if (loading) return <p className="text-gray-500">Loading tasks...</p>;
  if (tasks.length === 0)
    return <p className="text-gray-500">No tasks found.</p>;

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b text-gray-600">
          <th className="pb-2">Category</th>
          <th className="pb-2">State</th>
          <th className="pb-2">Description</th>
          <th className="pb-2">Urgency</th>
        </tr>
      </thead>
      <tbody>
        {tasks.map((t) => (
          <tr key={t.id} className="border-b">
            <td className="py-2">{t.category}</td>
            <td className="py-2">
              <span
                className={`rounded px-2 py-0.5 text-xs ${
                  t.state === "done"
                    ? "bg-green-100 text-green-700"
                    : t.state === "escalated"
                      ? "bg-red-100 text-red-700"
                      : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {t.state}
              </span>
            </td>
            <td className="py-2">{t.description}</td>
            <td className="py-2">{t.urgency}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
