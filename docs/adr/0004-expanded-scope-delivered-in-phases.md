# Scope expands to projects + employees, delivered in three phases

The server's scope expands beyond read-only-plus-field-updates. It now covers,
across the Projects and Employees domains:

- **Reads:** projects, types, categories, departments, customers, contacts, users,
  employee types, tasks, contracts, templates.
- **Project field updates:** the 14 `ProjectApiUpdateModel` fields + status.
- **Project construction:** create-from-template, tasks/sub-tasks, contracts and
  payment plans.
- **Resource booking:** `/workload/book`.

It deliberately does **not** create employees or change normal working time
(`/user/create`, `/normal-working-time/assign-to-employee` are out), and does not
touch time registrations, expenses, or invoicing.

This **supersedes the v1 stance that create-from-template was out of scope.** The
owner reconsidered on 2026-06-09 and opted in to creation, contracts, tasks, and
booking.

Delivery is phased by risk and dependency, each phase its own spec → plan → build:

1. **Phase 1** — all reads + project field updates (trust-the-conversation tier).
2. **Phase 2** — project construction (create-from-template, tasks, contracts).
3. **Phase 3** — resource booking.

## Why

The combined scope is 25+ tools spanning trivial reads to irreversible contract
creation. Building creation on top of an unverified write assumption (ADR 0002 is
not yet empirically confirmed) would be building on loose ground. Phasing puts the
empirical PUT verification first, delivers the safe insight/cleanup value
immediately, and keeps each spec small enough to reason about.

The write-safety appetite is **differentiated**:

- Field updates on existing projects → trust the conversation (ADR 0003: one
  resource per call, no bulk, list → confirm → run → report).
- Creation (project / contract / task) and booking → an explicit
  **preview-and-confirm** step before the real write. Built in Phase 2–3, not
  Phase 1.

## Consequences

- Phase 2–3 tools must implement a preview mode (show what *would* happen) before
  executing, in addition to the ADR 0003 single-resource / no-bulk rule.
- Each new write endpoint repeats the ADR 0002 empirical-preservation check before
  its tool is trusted.
- Deployment stays localhost, per-admin, own PAT (ADR 0001 unchanged) — a few
  project administrators each run their own instance. No hosting yet.
- New domain terms (Partner, Project Stage, Task, WBS, Contract, Payment plan,
  Resource Group, allocation/booking) enter as their phases are specced; record
  them in `CONTEXT.md` then.
