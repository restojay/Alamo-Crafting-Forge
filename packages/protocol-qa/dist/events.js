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
];
export function isQaEvent(value) {
    return typeof value === "string" && QA_EVENT_TYPES.includes(value);
}
