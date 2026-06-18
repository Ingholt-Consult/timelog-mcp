# Booking uses a synthetic capacity preview; Allocation write is unresolved

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

## Allocation write is UNRESOLVED (not closed)

Pure Allocation — assigning an Employee to a Task beyond the Task's budget hours —
was hypothesised out of scope on the theory that `AllocationController` is an empty
stub. The gate **weakened** that hypothesis: `GET /allocation` returns **405
UnsupportedApiVersion** ("does not support HTTP method 'GET'"), not 404. The route
**exists** but does not serve GET at v1, which leaves open that a POST/PUT write
route exists.

Therefore Allocation is **deferred, not declared out of scope.** Before any ADR
closes it the way "No template write" was closed, the gate must probe `/allocation`
with a non-GET method (POST an empty body and read the error envelope). Until then:
- `book_workload` covers **Booking** only.
- Allocation-as-Task-budget remains available via Phase 2 `create_task`
  (`BudgetHours`).
- CONTEXT.md records Allocation's write status as unconfirmed.

## Consequences

- `runBooking` lives alongside `runWrite` in `preview.ts`; it does not share the
  validate-path machinery. Shared helpers (`bodyFromArgs`, `WriteMode`, `modeField`)
  are reused.
- `get_employee_workload` and the booking preview share `fetchEmployeeProjection`
  (paging `$pagesize` + unwrap) in `resourceReads.ts`.
- This decision is **partly open**: the Allocation write-probe and the
  `Hours`-over-period semantics / 200-vs-202 confirmation are tracked as open items
  in the runbook. They do not block the Booking tool, which is complete and tested.
