import { TicketsTable } from "../components/TicketsTable";

export default function TicketsPage() {
  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="mb-6 text-2xl font-bold">Open Tickets</h1>
      <TicketsTable />
    </main>
  );
}
