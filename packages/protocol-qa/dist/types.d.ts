export declare const APPROVAL_DECISIONS: readonly ["approved", "rejected", "commented"];
export type ApprovalDecision = (typeof APPROVAL_DECISIONS)[number];
export declare const SESSION_STATUSES: readonly ["active", "idle", "halted", "dead"];
export type SessionStatus = (typeof SESSION_STATUSES)[number];
export interface ProposalPack {
    id: string;
    project: string;
    title: string;
    intent: string;
    diff: string | null;
    impact: string;
    requested_by: string;
    status: "pending" | ApprovalDecision;
    ceo_response: string | null;
    created_at: string;
    decided_at: string | null;
}
export interface SessionState {
    id: string;
    pid: number;
    project: string;
    cwd: string;
    started_at: string;
    last_heartbeat: string;
    status: SessionStatus;
    last_activity: string;
}
export interface PolicyDecision {
    action: string;
    actor: string;
    project: string | null;
    allowed: boolean;
    reason: string;
    tier: "auto" | "openclaw" | "ceo_only";
    timestamp: string;
}
export interface ApprovalMessage {
    type: "approval";
    approval_id: string;
    decision: ApprovalDecision;
    project: string;
    reason?: string;
    timestamp: string;
    message_id: number;
}
