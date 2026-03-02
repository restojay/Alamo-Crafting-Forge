import Link from "next/link";

export default function ServiceBotDashboard() {
  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="mb-6 text-2xl font-bold">ServiceBot Admin</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link
          href="/admin/servicebot/tickets"
          className="rounded-lg border p-6 hover:bg-gray-50"
        >
          <h2 className="font-semibold">Tickets</h2>
          <p className="text-sm text-gray-500">View open customer tickets</p>
        </Link>
        <Link
          href="/admin/servicebot/tasks"
          className="rounded-lg border p-6 hover:bg-gray-50"
        >
          <h2 className="font-semibold">Tasks</h2>
          <p className="text-sm text-gray-500">Track task progress</p>
        </Link>
        <Link
          href="/admin/servicebot/drafts"
          className="rounded-lg border p-6 hover:bg-gray-50"
        >
          <h2 className="font-semibold">Drafts</h2>
          <p className="text-sm text-gray-500">
            Review and approve draft responses
          </p>
        </Link>
      </div>
    </main>
  );
}
