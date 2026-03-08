export type TaskState = "new" | "in_progress" | "awaiting_response" | "done" | "escalated";
export type TicketStatus = "open" | "pending" | "resolved" | "closed";
export type Urgency = "low" | "medium" | "high" | "critical";

export interface Ticket {
  id: string;
  subsidiaryId: string;
  emailId: string;
  subject: string;
  customerEmail: string;
  customerName: string;
  status: TicketStatus;
  assignedTo?: string;
  slaDeadline?: string;
  firstResponseAt?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  ticketId?: string;
  subsidiaryId: string;
  category: string;
  state: TaskState;
  description: string;
  urgency: number;
  dedupeHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface Draft {
  id: string;
  ticketId: string;
  body: string;
  approved: 0 | 1;
  approvedBy?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  editedBody?: string;
  sentAt?: string;
  createdAt: string;
}

export interface WebhookAttempt {
  id: string;
  subsidiaryId: string;
  eventType: string;
  eventId: string;
  url: string;
  status: string;
  attempt: number;
  responseCode?: number;
  errorMessage?: string;
  nextRetryAt?: string;
  createdAt: string;
  deliveredAt?: string;
}

export interface Contact {
  id: string;
  subsidiaryId: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  payloadJson: string;
  createdAt: string;
}

export interface Subsidiary {
  id: string;
  name: string;
  configJson: string;
  createdAt: string;
}
