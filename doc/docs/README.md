# WorkFlik Docs

Deeper engineering reference for WorkFlik, split out from the product specs so
each layer can be read on its own. The product surface is described in the
[top-level README](../README.md) and the per-feature specs in
[Features/](../Features/); this folder covers **how the system is built**.

## Map

| Doc | Covers |
| --- | --- |
| [architecture/README.md](architecture/README.md) | Index of the per-subsystem architecture docs |
| [architecture/backend-overview.md](architecture/backend-overview.md) | Two-process model (web + worker), worker scaling & idempotency, `app/` route groups, the `lib/` service layer, and the reusable UI/registry **pieces** WorkFlik is assembled from |
| [architecture/background-jobs.md](architecture/background-jobs.md) | Full catalog of pg-boss **jobs & queues** — notifications, email, search, trash, exports, storage, sessions — with schedules, retry policy, and idempotency notes |
| [security.md](security.md) | Consolidated **security model** — auth, permission resolution / BOLA, sharing & guest access, file-upload safety, Orbit admin |
| [ui-design.md](ui-design.md) | **UI design system** — color tokens, typography, spacing, every component spec, feature UI patterns (editor, databases, settings, search, notifications, onboarding), accessibility (WCAG AA), responsive rules |

## Contributor guide

[CLAUDE.md](../CLAUDE.md) (root) is the lean index for contributors and agents — project overview, commands, architecture map, conventions, development practices, and the **rules** derived from the Phase-1 decisions.

## How this relates to the existing docs

- [README.md](../README.md) — product vision, feature summary, MVP scope, tech stack (the "what")
- [GETTING-STARTED.md](../GETTING-STARTED.md) — local setup and first run
- [DATABASE-PLAN.md](../DATABASE-PLAN.md) — full schema plan
- [Features/](../Features/) — one spec per product feature (the detailed "what + rules")
- [Features/development-plan.md](../Features/development-plan.md) — tech stack, repo structure, phases, key architecture decisions

The files in this folder are the **engineering-side companion** to the above: when
a subsystem (jobs, services, components) changes, update the matching doc here so
the architecture reference never drifts from the code.

---

*Last updated: 2026-06-12*
