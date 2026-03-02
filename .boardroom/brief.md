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

186 tests across 3 workspace packages. Phase 1 complete. Phase 2 planned: dashboard UI enhancements, SMTP send, multi-subsidiary support.

## Risks

| # | Risk | Severity | Mitigation |
|-|-|-|-|
| 1 | better-sqlite3 native module in serverless | Medium | serverExternalPackages in next.config.ts |
| 2 | ServiceBot scope creep before revenue | Medium | Phase-gated development, single-subsidiary until stable |
