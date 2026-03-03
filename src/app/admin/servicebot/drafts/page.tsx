import Link from "next/link";

export default function DraftsPage() {
  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="mb-4 text-2xl font-bold">Draft Responses</h1>
      <p className="text-gray-600">
        Drafts are now reviewed from the{" "}
        <Link
          href="/admin/servicebot/tickets"
          className="text-blue-600 underline hover:text-blue-800"
        >
          ticket detail view
        </Link>
        . Select a ticket to review and approve its drafts.
      </p>
    </main>
  );
}
