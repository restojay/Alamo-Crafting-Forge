# QA Review — ServiceBot Phase 2

**Date:** 2026-03-03
**Branch:** feat/servicebot-phase2
**Submitter:** CTO
**Trust Tier:** T1

## Pipeline Results

| Stage | Reviewer | Verdict | Rework |
|-|-|-|-|
| Peer Review 1 | CPO (cross-functional) | APPROVE | 1 iteration |
| Peer Review 2 | QAE (same-dept) | APPROVE | 1 iteration |
| CQO Gate | STE + CRV | APPROVE | 1 iteration |
| Codex Audit | External | APPROVE (2 escapes, resolved) | 1 iteration |
| Gemini Audit | External | APPROVE (5 findings, 0 confirmed) | — |
| CEO Review | Jay | **APPROVED** (unconditional) | — |

## CEO Decision

APPROVE — unconditional. Gemini gap closed 2026-03-08.

## Rework Summary

1. **CPO finding:** TicketsTable.tsx subsidiary column showed raw ID. Fixed to resolve name via client-side lookup.
2. **QAE finding:** server.test.ts had only structural test. Added dry-run behavioral test (recipient rewrite + subject prefix) and 3 getSubsidiarySmtpConfig tests.
3. **CQO finding:** approve/route.ts checked draft existence AFTER marking approved. Fixed to check before; HTTP 404 returned for missing draft.
4. **Codex finding (Escape):** Client-supplied `ticketEmail` used as SMTP recipient — email relay vulnerability. Fixed: use `ticket.customerEmail` from DB; removed `ticketEmail` from request body, client function, ApprovalActions, DraftsQueue.
5. **Codex finding (Escape):** Unauthenticated admin routes expose SMTP send capability. Fixed: added `src/middleware.ts` protecting all `/admin/*` and `/api/admin/*` routes with `ADMIN_SECRET` cookie session; added login page at `/admin/login` and auth endpoint at `/api/admin/auth`.
6. **Lint:** Pre-existing `react-hooks/exhaustive-deps` warning in DraftsQueue.tsx; fixed by wrapping `reload` in `useCallback`.

## Final State

- 187/187 tests passing
- 16 commits on feat/servicebot-phase2
- Lint clean (all changed files)
- Codex escapes: 2 confirmed, both resolved
- Gemini: unavailable (rate limited both sessions)
- Merge: **COMPLETE — merged to master. CEO unconditional approval 2026-03-08.**

## Gemini Audit (2026-03-08)

5 findings submitted, 0 confirmed by CQO:

1. **Race condition on draft approval (Sev 3)** — DISPUTED. Theoretical for single-admin SQLite WAL context. sendApprovedDraft checks sentAt guard.
2. **No rate limiting on login (Sev 2)** — DISPUTED. Internal admin tool. Rate limiting is infra/deployment concern. Cookie already has correct security flags.
3. **Missing CAN-SPAM/GDPR headers (Sev 2)** — DISPUTED. Transactional support replies, not commercial email. Unsubscribe requirements inapplicable.
4. **Audit log gaps (Sev 1)** — DISPUTED. Factually incorrect. approved_by column exists on drafts, audit_log table exists and is used.
5. **SMTP badge only on landing (Sev 1)** — DISPUTED. UX preference, not defect.

Gemini escapes: 0
