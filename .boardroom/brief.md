# Alamo Crafting Forge

> One-liner: Holding company for all ACF subsidiaries — corporate website + ServiceBot multi-tenant customer support engine.

## Overview

| Field | Value |
|-|-|
| Repo | `C:\Users\Jay\OneDrive\Desktop\Alamo-Crafting-Forge\` |
| Stage | — |
| Sector | Holding Company |
| Tech Stack | TypeScript, Next.js 16, pnpm workspaces, SQLite (better-sqlite3), Vitest |

## Capabilities

### Corporate Website
Landing page and public-facing corporate identity for Alamo Crafting Forge.

### ServiceBot (migrated from ACFDesigns — 2026-03-02)
Multi-tenant customer support engine serving all subsidiaries:
- **Core** (`packages/core`): Gmail intake, Claude AI triage/classification/drafting, task engine with recurring scheduler, SQLite persistence, SMTP outbound, webhook dispatcher, observability
- **Service** (`service`): Background service runner, CLI tools, webhook workers
- **Subsidiaries** (`subsidiaries`): Per-client config files (HVAC sample included)
- **Admin UI** (`src/app/admin/servicebot`): Dashboard for tickets, tasks, drafts
- **API Routes** (`src/app/api/admin/servicebot`, `src/app/api/health`): REST endpoints

187 tests across 29 test files, 3 workspace packages. Phase 1 and Phase 2 complete. Full QA pipeline passed (Codex + Gemini audited, CEO approved).

**Phase 2 delivered (2026-03-03, QA closed 2026-03-08):**
- Multi-tenant DB layer: Subsidiary type, saveSubsidiary/listSubsidiaries, registerClient sync
- Dashboard UI: subsidiary filter, ticket detail with drafts, SMTP mode badge
- SMTP: nodemailer transport with SMTP_LIVE dry-run gate, auto-resolve subsidiary config on approval
- Security: admin auth middleware + login page, DB-sourced email recipients

## Current State

Phase 2 complete and QA'd. SMTP in dry-run mode. Single subsidiary config (HVAC sample). Admin auth requires ADMIN_SECRET env var (Action #1: set in Vercel before production deploy).

## Next Milestones

| # | Milestone | Status |
|-|-|-|
| 1 | Phase 1 — Core engine | Done |
| 2 | Phase 2 — Multi-tenant + Dashboard + SMTP | Done |
| 3 | Production deploy (set ADMIN_SECRET, SMTP creds) | Not started |
| 4 | First live subsidiary onboarding | Not started |

## Risks

| # | Risk | Severity | Mitigation |
|-|-|-|-|
| 1 | better-sqlite3 native module in serverless | Medium | serverExternalPackages in next.config.ts |
| 2 | ServiceBot scope creep before revenue | Medium | Phase-gated development, single-subsidiary until stable |

## Session Log
- 2026-03-03: Phase 2 implemented (9 tasks), QA pipeline run (Codex 2 escapes resolved, Gemini unavailable)
- 2026-03-08: Gemini audit completed (0 escapes), CEO unconditional approval, QA gap closed
