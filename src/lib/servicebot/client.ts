const BASE = "/api/admin/servicebot";

export async function fetchTickets(subsidiary?: string) {
  const params = subsidiary ? `?subsidiary=${subsidiary}` : "";
  const res = await fetch(`${BASE}/tickets${params}`);
  if (!res.ok) throw new Error(`Failed to fetch tickets: ${res.status}`);
  return res.json();
}

export async function fetchDrafts(ticketId: string) {
  const res = await fetch(`${BASE}/drafts?ticket=${ticketId}`);
  if (!res.ok) throw new Error(`Failed to fetch drafts: ${res.status}`);
  return res.json();
}

export async function fetchTasks(ticketId: string) {
  const res = await fetch(`${BASE}/tasks?ticket=${ticketId}`);
  if (!res.ok) throw new Error(`Failed to fetch tasks: ${res.status}`);
  return res.json();
}

export async function approveDraft(
  draftId: string,
  actor: string,
  ticketEmail: string,
) {
  const res = await fetch(`${BASE}/drafts/${draftId}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actor, ticketEmail }),
  });
  if (!res.ok) throw new Error(`Failed to approve draft: ${res.status}`);
  return res.json();
}

export async function rejectDraft(draftId: string, reason: string) {
  const res = await fetch(`${BASE}/drafts/${draftId}/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error(`Failed to reject draft: ${res.status}`);
  return res.json();
}
