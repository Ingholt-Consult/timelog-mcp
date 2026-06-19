# Resource planning is the V2 resource planner (PAT-authed)

Supersedes **ADR 0008** (which wrongly concluded "v2 not live" and "allocation is the
write"). The empirical gate's final rounds (2026-06-19, full log
`docs/runbooks/empirical-book-workload.md`) established the real, working surface for
the user's two-step model — *allocate how many hours, then plan when they fall* — and
it is the **V2 resource planner**, reachable with our Personal Access Token.

> History: ADR 0007 (synthetic-preview booking) → ADR 0008 (booking dead / allocation
> is the write) → **ADR 0009** (the v2 resource planner is the answer). The earlier
> conclusions were genuine intermediate findings; this one is verified end to end.

## What works

**API v2 is live and PAT-authed.** Versioning is URL-segment based (`/api/v2/...`);
the PAT resolves the tenant (TenantId 35564). The relevant controller is
`V2.Employee.Controllers.ResourcePlannerController` (declared in swagger but with no
documented paths — the routes below were found empirically).

**Write — book hours:**
`POST /api/v2/resource-planner/book-hours`
body `{ resourceId, workItemId, unitType:"hours", value, startsAt, endsAt }` → `200 "OK"`.

- **No SignalR `hubConnectionId` is required** (the browser sends one for live UI
  updates; omitting it still books).
- **`value` = TOTAL hours, distributed EVENLY per day across `[startsAt, endsAt]`**
  (controlled test: value `2` over two days → 1 h/day).
- **Idempotent REPLACE, not additive:** re-booking the same resource+workItem+period
  overwrites (value `3` then made it 1.5 h/day, not 2.5). An earlier "additive 0.66"
  reading was a misleading month-aggregate cell, not raw per-day hours.
- *Untested:* weekend / working-day handling, and whether the employee must be
  pre-allocated to the task (the test task already had the employee as a resource).

**Reads — the v1 ↔ v2 id bridge (both POST, params in query, empty body):**

- `POST /api/v2/resource-planner/partial-group-by-work-item?groupedby=groupbyworkitem&…&EmployeeIds=<UserID>`
  → work-item rows; `workItemSourceReferenceId` = **TaskID** (and project ids), paired
  with the opaque `workItemId` book-hours needs.
- `POST /api/v2/resource-planner/partial-group-by-employee?groupedby=groupbyresource&…&EmployeeIds=<UserID>`
  → resource rows; `resourceSourceReferenceId` = **UserID** → the opaque `resourceId`
  (constant per employee across all work items; `resourceType:"Employee"`).
- Both take `periodstartsat`/`periodendsat`/`periodtypes`/`unittypes`/`reportingtypes`
  and `EmployeeIds` (a real **UserID**) + `IsEmployeeInclusive`. Each row carries
  per-period `value` + `TotalBooked` for measuring/reading the plan.
- Route names matter: `partial-group-by-resource` → 404, `group-by-employee` → 405
  (POST unsupported); `…-total-row` variants return only the footer aggregate.

## Decision

- **Build the resource-planning tool on the V2 resource planner.** Resolve `resourceId`
  from `UserID` and `workItemId` from `TaskID` via the two `partial-group-by-*` reads,
  then `book-hours`. PAT-authed; no hub needed.
- **`get_employee_workload`** can move to / be complemented by the planner reads, which
  expose booked vs actual vs EAC per period (richer than the capacity-only
  `employee-projection`).
- **Retire `book_workload`** (`/workload/book`, v1): non-functional (rejects every
  `UserID` with `ErrorCode 37040`) and the wrong concept — "Booking" is a niche
  manual/Outlook post, not resource planning.
- **`POST /allocation` (v1)** remains a separate, working write that adds an employee
  as a task resource at 0 h. Whether it is a required precondition for `book-hours`,
  or whether `book-hours` assigns implicitly, is an open gate item.

## Consequences / risks

- These v2 routes are **undocumented** (absent from the swagger paths) — they could
  change without notice; pin behaviour with the manual gate scripts and re-verify.
- **No DELETE / no read of a single booking by id** — clearing hours means a
  `book-hours` with `value` 0 (to verify) or the UI. Gate this.
- Opaque ids (`resourceId`/`workItemId`) must be resolved per call from the v1 ids the
  agent holds (UserID/TaskID); cache per employee where sensible (`resourceId` is
  stable per employee).
- Open: working-day distribution rule; allocation-as-precondition; value-0 clearing.
