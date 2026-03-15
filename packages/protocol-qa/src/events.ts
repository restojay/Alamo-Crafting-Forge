export const QA_EVENT_TYPES = [
  "session.started",
  "session.heartbeat",
  "session.ended",
  "session.status",
  "session.output",
  "approval.requested",
  "approval.decided",
  "policy.decision",
  "command.received",
  "message.received",
  "message.sent",
  "message.queued",
  "halt.requested",
  "halt.executed",
  "system.startup",
  "system.shutdown",
] as const;

export type QaEventType = (typeof QA_EVENT_TYPES)[number];

export function isQaEvent(value: unknown): value is QaEventType {
  return typeof value === "string" && QA_EVENT_TYPES.includes(value as QaEventType);
}

export interface QaEvent {
  seq: number;
  timestamp: string;
  type: QaEventType;
  source: string;
  project: string | null;
  payload: string;
  checksum: string;
  schema_version: number;
}
