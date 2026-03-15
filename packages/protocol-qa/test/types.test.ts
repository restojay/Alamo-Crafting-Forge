import { describe, it, expect } from "vitest";
import {
  type ProposalPack,
  type ApprovalDecision,
  type SessionState,
  APPROVAL_DECISIONS,
  SESSION_STATUSES,
} from "../src/types.js";

describe("ProposalPack", () => {
  it("creates a valid proposal shape", () => {
    const proposal: ProposalPack = {
      id: "proposal:abc12345",
      project: "Anvil",
      title: "Governance Gate: Deploy v2",
      intent: "Deploy latest changes",
      diff: null,
      impact: "API routes, 3 files",
      requested_by: "governance-gate",
      status: "pending",
      ceo_response: null,
      created_at: "2026-03-15T00:00:00.000Z",
      decided_at: null,
    };
    expect(proposal.status).toBe("pending");
    expect(proposal.decided_at).toBeNull();
  });
});

describe("ApprovalDecision", () => {
  it("defines valid decisions", () => {
    expect(APPROVAL_DECISIONS).toContain("approved");
    expect(APPROVAL_DECISIONS).toContain("rejected");
    expect(APPROVAL_DECISIONS).toContain("commented");
  });
});

describe("SessionState", () => {
  it("defines valid session statuses", () => {
    expect(SESSION_STATUSES).toContain("active");
    expect(SESSION_STATUSES).toContain("idle");
    expect(SESSION_STATUSES).toContain("halted");
    expect(SESSION_STATUSES).toContain("dead");
  });
});
