# Pagevo Architecture Docs

Per-subsystem engineering detail. Each file is the reference for one layer of the
system. **Read the relevant file before working in that subsystem, and keep it
current when the subsystem changes.**

| File | Covers |
| --- | --- |
| [backend-overview.md](backend-overview.md) | The two-process model (Next.js web + pg-boss worker), worker scaling + idempotency rules, `app/` route groups, the `lib/` service-layer map, the reusable UI component library, and the four **registry pieces** (Block, Property, Notification, Job) that the product is assembled from |
| [background-jobs.md](background-jobs.md) | Complete catalog of every pg-boss job/queue — name, schedule, purpose, retry policy, and idempotency pattern — grouped by domain (notifications, email, search, trash & cleanup, pages & export, storage, auth) |

See also: [../ui-design.md](../ui-design.md) for the UI component library, design tokens, and feature UI patterns that the `components/` layer implements.

## Why this structure

- A **single jobs catalog** instead of job definitions scattered across feature
  docs — so anyone can see, in one place, everything the worker does and when.
- A **backend overview** that names the reusable **pieces** (services, UI
  components, and registries) the codebase is composed of — so a new contributor
  learns the building blocks once, then recognizes them everywhere.

See also: the product specs in [../../Features/](../../Features/) and the build
plan in [../../Features/development-plan.md](../../Features/development-plan.md).

---

*Last updated: 2026-06-12*
