# Booking uses a synthetic capacity preview; Allocation write is confirmed but deferred

> **SUPERSEDED by ADR 0008 (2026-06-19).** The empirical gate's final round showed
> `POST /workload/book` (Booking) is non-functional — it rejects every valid `UserID`
> with `ErrorCode 37040` — so the synthetic-preview booking tool this ADR describes
> cannot work. `POST /allocation` is the only working resource write. See ADR 0008.
> The rest of this file is kept for the record.

Phase 3 adds resource booking. The empirical gate (2026-06-18,
`docs/runbooks/empirical-book-workload.md`) established that the v1 API's
resource-booking surface differs from the create endpoints in ways that force two
decisions.

## `POST /workload/book` has no validate twin and no undo → synthetic preview

Unlike every Phase 2 create endpoint, `/workload/book` has **no paired `validate-*`
endpoint** and **no DELETE**. A Booking cannot be previewed dry, and a mistaken
Booking cannot be undone or even archived away — it can only be removed manually in
the Resource Planner UI.

So `book_workload` does **not** use `runWrite` (which is built around a
`validatePath`). It uses a new `runBooking` helper whose preview is *synthesised*
from `GET /employee-projection/get-in-period`:

- **preview** writes nothing; it reads the Employee's capacity for the booking
  period and returns `{ mode: "preview", capacity, note, payload }`, where `note`
  states the Booking cannot be undone via the API.
- **execute** posts to `/workload/book`. The endpoint may answer **202**
  (asynchronous) — so a successful call does not guarantee the Booking is already
  visible; the tool reports the raw outcome rather than asserting completion.

### Preview surfaces capacity only — no overbooking verdict, no name enrichment

The projection carries **capacity only** (`NormalWorkingHours` per day) — it does
**not** expose already-booked hours, and has no employee filter. Two consequences:

- A true **overbooking flag cannot be computed** from the API. The design spec's
  proposed `overbooking: yes/no` is therefore dropped; the preview surfaces the
  capacity rows (filtered client-side to the booked Employee) and leaves the
  judgement to the agent in conversation.
- This stays within **ADR 0006**: the preview shows *new* information the agent
  does not already hold (capacity), and does **not** re-resolve Task/Employee names
  the caller already has. Capacity is surfaced; display-name enrichment is not.

## Allocation write is CONFIRMED writable; scope is pending (not unresolved)

Pure Allocation — assigning an Employee to a Task — was first hypothesised out of
scope on the theory that `AllocationController` is an empty stub. Dry round 1
weakened that (`GET /allocation` → 405, not 404). **Dry round 2 (2026-06-19)
overturned it:** `POST /allocation` returns **400 FluentValidation**, binding an
`allocationCreateModel` and requiring `UserId` (> 0) and `TaskId` (> 0); `GET` and
`PUT` are both 405 (`UnsupportedApiVersion`). So at v1 `/allocation` is a real,
**POST-only create route**. Allocation **is** writable via the API.

Note the casing: `UserId` (matching the projection's `UserID`), **not** `EmployeeId`
as `/workload/book` uses; both use `TaskId`.

Allocation is therefore **confirmed writable but deliberately not built in this
phase — scope is pending, not the API's existence.** The open question is the create
model's **full field set**: the empty-body echo showed only `{UserId, TaskId}`, yet
the domain (`docs/timelog/04-employees-and-resources.md`) defines an Allocation as
*hours* assigned to an Employee on a Task. Whether `allocationCreateModel` carries
hours/budget/period fields, or only the two ids (with hours set elsewhere), is being
probed non-destructively by `test/manual/empirical-allocation-fields.mjs` before any
`create_allocation` tool is designed. Until that decision:
- `book_workload` covers **Booking** only.
- Allocation-as-Task-budget remains available via Phase 2 `create_task`
  (`BudgetHours`).
- CONTEXT.md records Allocation's write status as **confirmed writable, tool not yet
  built (POST-only, requires `UserId` + `TaskId`; full field set under probe).**

## Consequences

- `runBooking` lives alongside `runWrite` in `preview.ts`; it does not share the
  validate-path machinery. Shared helpers (`bodyFromArgs`, `WriteMode`, `modeField`)
  are reused.
- `get_employee_workload` and the booking preview share `fetchEmployeeProjection`
  (paging `$pagesize` + unwrap) in `resourceReads.ts`.
- This decision is **partly open**: the Allocation write-probe and the
  `Hours`-over-period semantics / 200-vs-202 confirmation are tracked as open items
  in the runbook. They do not block the Booking tool, which is complete and tested.
