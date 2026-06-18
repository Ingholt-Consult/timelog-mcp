# TimeLog MCP — Phase 3 design (resource booking)

**Date:** 2026-06-18
**Status:** Approved (brainstorming). Next step: implementation plan via writing-plans.

## Context

Phase 1 (all reads + project field updates) and Phase 2 (project construction)
are complete and merged to `main` (HEAD `d582fb1`). This spec covers Phase 3 per
ADR 0004 point 3: **resource booking**. It is the last phase in the current
roadmap; there is no defined Phase 4.

The ubiquitous language (`docs/ubiquitous-language.md`) separates three concepts
that this phase must keep distinct:

- **Allokering / Allocation** (`Budget (h)` on a Task) — *how many* hours an
  Employee is budgeted for on a specific Task. Set on the Task (already covered by
  Phase 2's `create_task` via `BudgetHours`/`BudgetAmount`). Feeds the Resource
  Planner.
- **Booking** (`BookWorkload` / `workload`) — *when* those hours fall, distributed
  across the calendar. This is the write operation behind the **Resource Planner**
  (Ressourceplanlægger). Distinct from Allokering.
- **Kapacitet / Capacity** and **Arbejdsbyrde / Workload** — the read side:
  available working time vs. work already planned for an Employee over a period.

API surface established by sweeping `docs/timelog-api/` + the spec JSON during
brainstorming (2026-06-18; to be re-confirmed empirically before the schema is
locked):

- **`POST /workload/book`** — the only resource-booking write. Body fields seen in
  the spec: `EmployeeId`, `TaskId`, `Hours`, `StartDate`, `EndDate`. Returns
  **200** *or* **202** ("Message was received, booking will be created shortly" —
  asynchronous). **No paired `validate-*` endpoint. No GET/list, no update, no
  DELETE.**
- **`GET /employee-projection/get-in-period`** — capacity/normal-working-time per
  Employee per day for a date range (`startDate`, `endDate`, `includeAllEmployees`).
- `AllocationController` and the V2 `ResourcePlannerController` are declared in the
  spec but expose **no routes** in v1. Working hypothesis: pure Allokering
  (Employee→Task hours beyond the Task budget) has **no v1 API surface**.

This breaks two assumptions Phase 2 relied on, and that drives the whole design:

1. **No `validate-*` twin** for `/workload/book` → the dry-run preview that
   `runWrite` (Phase 2) depends on cannot run the same way.
2. **No DELETE/update** → a wrong Booking cannot be undone via the API (the
   irreversible-write situation the ADRs already take seriously; see CONTEXT.md ›
   No DELETE for constructed resources).

## Goal

Let an administrator, in conversation, (a) read an Employee's Kapacitet/
Arbejdsbyrde over a period to find who is free, and (b) create a Booking of hours
on a Task for that Employee — with a preview step before the irreversible write,
even though the API offers no validate endpoint.

## Scope

### Read tools (1) — trust-the-conversation tier

| Tool | Endpoint | Notes |
|---|---|---|
| `get_employee_workload` | `GET /employee-projection/get-in-period` | Kapacitet/Arbejdsbyrde per Employee per day. Params `startDate`, `endDate`, `includeAllEmployees`. Used both standalone ("who is free in week 30?") and internally by `book_workload`'s preview. |

### Write tools (1) — preview-and-confirm tier (synthetic preview)

| Tool | Execute endpoint | Preview |
|---|---|---|
| `book_workload` | `POST /workload/book` | **synthetic** — see below (no `validate-*` exists) |

`book_workload` follows ADR 0003: **one Booking per call, no bulk** — multiple
Bookings are orchestrated in conversation, like `create_task`.

### Out of scope (documented as a CONTEXT.md / ADR note)

- **Allokering** (Employee→Task hours beyond the Task budget) — if the empirical
  gate confirms the stub hypothesis (no v1 endpoint). Documented the same way
  "No template write" is.
- **Normaltid-skriv** (`POST /normal-working-time/assign-to-employee`) — kept out
  per ADR 0004.
- Time registration, expenses, invoicing (unchanged).
- Reading existing Bookings back — no list/GET endpoint exists.

## Preview/execute semantics — synthetic preview

`book_workload` takes `mode: "preview" | "execute"`, **default `"preview"`**, like
the Phase 2 writes. But because `/workload/book` has no `validate-*` twin, preview
is **synthesised** rather than delegated:

- **Preview** writes nothing. It calls `GET /employee-projection/get-in-period`
  for the Booking's `EmployeeId` over `StartDate→EndDate` and returns:
  `{ mode: "preview", capacity: <normal working time vs. already-booked in the
  period>, overbooking: <yes/no>, payload }` plus an explicit **"cannot be undone
  via the API"** note.
- **Execute** posts to `POST /workload/book` and reports the outcome honestly,
  including the **202 asynchronous** case ("received, will be created shortly") —
  not reported as definitively done.

**Reconciliation with ADR 0006 (owner-approved during brainstorming):** ADR 0006
deleted server-side *name enrichment* in preview (re-resolving IDs the caller
already holds). The synthetic preview deliberately stays within that decision:

- **No name enrichment.** It does not look up Task name or Employee name — the
  agent already resolved those.
- **Capacity is different.** Kapacitet/Arbejdsbyrde in the period is *new,
  decision-relevant information the agent does not already hold* and requires a
  separate read. Showing it is consistent with ADR 0006's own logic ("show only
  what the agent doesn't already know"), and it is the only "dry" signal the API
  offers in the absence of a validate endpoint.

## Architecture

Same patterns as Phase 1/2; minimal new surface.

- `src/tools/resourceReads.ts` — `get_employee_workload`, consuming
  `TimeLogClient`. Follows the read conventions (`$pagesize`/`$expand` if the
  endpoint is a TAFList; `Properties` unwrap — confirm the response shape
  empirically).
- `src/tools/resourceWrites.ts` — `book_workload` with preview/execute routing.
- `src/resourceSchemas.ts` — Zod shape for `book_workload` with per-field
  descriptions, mirroring `constructionSchemas.ts`. Required fields locked from
  the empirical gate, not the swagger.
- **New `runBooking` helper** in the `preview.ts` family rather than overloading
  `runWrite`. `runWrite` is built around a `validatePath`; `book_workload` has
  none and needs the capacity-read-based synthetic preview instead. A separate
  helper keeps the Phase 2 `runWrite` pattern clean (owner-approved). Shared
  bits (`bodyFromArgs`, `WriteMode`, `modeField`) are reused.
- Registration in `registerTools.ts` (`resourceReadTools`, `resourceWriteTools`).
  Transport, PAT resolution, config unchanged (ADR 0001: localhost, per-admin PAT).

## Empirical gate (BEFORE the schema and descriptions are locked)

Per the project discipline (kickoff + `docs/runbooks/empirical-create-tests.md`):
do not trust the swagger's `required` lists or field semantics. Run a runbook-
driven dry/careful live investigation — **from the controller, not a subagent**
(subagents can't run npm/npx/node here) — against test project **1034 "TEST
Aggersvolg Gods"**, with a single real Booking that is then cleaned up manually in
the UI (no DELETE exists). A new runbook section (or sibling runbook) records the
result log, like Phase 2.

The gate must answer:

1. **Booking semantics:** does `Hours` spread across `StartDate→EndDate`, or land
   entirely on the start day? This decides the tool's description and how preview
   frames the capacity comparison.
2. **True required fields + enums:** read `/workload/book`'s (or the relevant list
   endpoint's) HATEOAS `Actions[].Fields[].Enums` for the real binding — more
   reliable than the swagger (the Phase 2 discovery).
3. **Allokering:** confirm there is genuinely no v1 endpoint (the
   `AllocationController` stub hypothesis). If one exists, re-open scope with the
   owner before building.
4. **202 vs 200:** when does each occur, and can a created workload be read back
   afterwards (e.g. via `employee-projection`) to confirm the write landed? This
   shapes how `execute` reports success.

## Testing

- TDD against the mocked REST layer, as in Phase 1/2:
  - `get_employee_workload` calls the projection endpoint with the right params
    and unwraps the response.
  - `book_workload` **preview** calls `employee-projection` and **never** calls
    `/workload/book`; returns the capacity + overbooking + payload shape.
  - `book_workload` **execute** posts to `/workload/book`; the 202 path is
    reported as asynchronous, not as confirmed-complete.
  - Error mapping behaves like the other write tools.
- The empirical gate runs as a manual script in `test/manual/`, not in the suite.
- Rate limits remain undocumented — sequential calls.

## Documentation

- New / clarified CONTEXT.md terms: **Booking** (`BookWorkload`), **Workload**,
  **Capacity**, and the explicit Allokering-vs-Booking distinction. A new API-
  conventions note (mirroring "No template write" / "No DELETE"): **"No booking
  validate / no booking undo"** — `/workload/book` has no `validate-*` and no
  DELETE; preview is synthesised from `employee-projection`.
- README capability table updated: can now read Employee Kapacitet/Arbejdsbyrde
  and create Bookings (with a synthetic preview step); still cannot undo a Booking,
  cannot do pure Allokering (if confirmed), cannot touch time registration /
  expenses / invoicing.
- Empirical findings land in the runbook; anything that generalises is lifted into
  CONTEXT.md › API conventions.
- If the Allokering hypothesis holds, record it as a short ADR (0007) the way
  template-write was closed.

## Caveats carried forward

1. Swagger `required` lists are untrustworthy — the empirical gate determines the
   real required fields and enums for `/workload/book`.
2. Response-shape surprises may recur on `employee-projection` — unwrap
   defensively; confirm whether it is a single resource or a TAFList.
3. **No API undo for a Booking:** a mistaken execute is permanent and cannot even
   be archived away like a project. Mitigated only by the synthetic preview
   discipline and the one-per-call rule. This is a sharper version of the Phase 2
   no-DELETE caveat — the preview must make it unmistakable.
4. `/workload/book` may answer **202 asynchronously** — "executed" does not
   guarantee "created"; report it honestly.
5. The Allokering scope boundary is a *hypothesis* until the gate confirms it.
