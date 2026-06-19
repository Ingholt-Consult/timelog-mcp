# Empirical gate — Phase 3 resource booking

Verifies the live behaviour of `POST /workload/book` and
`GET /employee-projection/get-in-period` before the `book_workload` /
`get_employee_workload` schemas and descriptions are locked. Same discipline as
`empirical-create-tests.md`: don't trust the swagger; read the live API.

Run from the controller's guidance but executed by the owner (subagents can't run
`node` here; `.env` is access-restricted). Env setup: see CLAUDE.md › Manuelle /
live tests. Script: `test/manual/empirical-book-workload.mjs`.

## Result log

**2026-06-18 (mrt) — dry round 1 (reads + empty-body probes; no real booking).**
After fixing the `.env` quote-stripping (a quoted PAT had been sent verbatim →
401), the projection call returned 200 and the booking probes returned 400. No
write was attempted (`DO_REAL_BOOKING` not set).

### `GET /employee-projection/get-in-period` (200)

- **Response is a paging TAFList:**
  `{ Properties: { TotalRecord, TotalPage, PageNumber }, Entities: [{ Properties }], Links }`.
  A 5-day, all-employees window reported **TotalRecord 170 / TotalPage 17** but
  returned only **10 rows** → like every other TAFList it **silently caps at 10
  without `$pagesize`** (CONTEXT.md › Paging). `get_employee_workload` MUST page.
- **Row fields:** `ProjectionID`, `UserID`, `User` (null in the list), `Date`,
  `NormalWorkingTimeDayOrder`, `NormalWorkingHours`, `NormalWorkingMinutes`,
  `IsClosed`, `IsInClosedAccountingPeriod`, `HasRejectedTime`, `IsApproved`, `ID`.
- **Crucial for the preview design:** the projection carries **capacity only**
  (`NormalWorkingHours` per day, e.g. 7.5 on weekdays, 7.0 on the 26th) plus
  approval/closed-period flags. It does **NOT** contain already-booked or
  already-allocated hours. So a true **overbooking verdict cannot be computed**
  from this endpoint — the synthetic preview can show capacity + closed-period
  flags, but not "free vs. booked". (Settles the open spec question: surface the
  capacity rows, no server-computed `overbooking` flag.)
- **No employee filter param** — only `startDate`, `endDate`, `includeAllEmployees`.
  To show one Employee's capacity, fetch the period and filter by `UserID`
  client-side.

### `POST /workload/book` (400 on empty / ids-only)

- **Required fields confirmed** (FluentValidation messages):
  `EmployeeId` (> 0), `TaskId` (> 0), `Hours` (> 0), `StartDate` (valid date),
  `EndDate` (valid date). All five required; the `0001-01-01` default date is
  rejected, like create-from-template.
- **Casing confirmed:** the echoed model is
  `{"StartDate","EndDate","Hours","EmployeeId","TaskId"}` — `EmployeeId` / `TaskId`
  (lowercase `d`), not the `...ID` convention.
- A near-empty POST writes nothing (invalid model → 400). The error envelope is
  `{ Code, Details[], Message, Parameters, Url }`.

### `GET /workload` (404)

- No `GET /workload` route — there is no HATEOAS `Actions` source there. Field
  truth came from the 400 validation messages above instead.

### `GET /allocation` (405 — `UnsupportedApiVersion`, "does not support HTTP method 'GET'")

- **Not a 404.** The `/allocation` route **exists** but does not serve GET at API
  version 1. This is decided at the routing/versioning layer (returned even with a
  bad token). It **weakens the "AllocationController is an empty stub" hypothesis**
  — a POST/PUT may exist. **Resolved in dry round 2 below.**

**2026-06-19 (mrt) — dry round 2 (`/allocation` method probes; still no real booking).**
The projection (200), task list for 1034 (200), and `/workload/book` empty-body
probe (400, same five required fields) all reproduced round 1. The `/allocation`
method probes settled the open write question:

### `POST /allocation` (400 — FluentValidation) — a CREATE route EXISTS

- The probe returned the same model-state envelope as the create endpoints:
  `{ Code, Details, Message, Parameters, Url }` with
  `Details: ["'User Id' must not be empty.", "'Task Id' must not be empty."]` and
  `Parameters: allocationCreateModel: {"UserId":0,"TaskId":0}`.
- This **overturns the "empty stub" hypothesis.** `/allocation` serves **POST**,
  binds an `allocationCreateModel`, and validates it. Pure Allocation **is** writable
  via the API. Minimum required: `UserId` (> 0) and `TaskId` (> 0). Note the casing:
  `UserId` (matching the projection's `UserID`), **not** `EmployeeId` as
  `/workload/book` uses. Both use `TaskId`. The full field set beyond the two required
  ids is not yet probed (would need iterative empty/partial POSTs).
- `GET /allocation` → **405** and `PUT /allocation` → **405** (both
  `UnsupportedApiVersion`): at v1 the route serves **POST only**.

This resolves the runbook's open `/allocation` write-probe item and forces a revision
of ADR 0007 (Allocation was "unresolved/deferred"; it is now confirmed writable —
the remaining question is scope, not existence).

**2026-06-19 (mrt) — round 3 (real booking attempts + real allocation + v2 probe).**
The decisive round. Scripts: `empirical-book-workload.mjs` (with `DO_REAL_BOOKING`),
`discover-users.mjs`, `discover-employee-id.mjs`, `empirical-allocation-fields.mjs`
(with `DO_REAL_ALLOCATION`), `discover-swagger-employeeid.mjs`,
`discover-v2-resourceplanner.mjs`.

### `POST /workload/book` (Booking) is NON-FUNCTIONAL — rejects every UserID (37040)

- Real booking attempted for three valid, active users — `EmployeeId` 29 (mrt, the
  PAT owner), 64 (Ole), 14 (RTA) — on leaf task 4961. **All three returned HTTP 500,
  `Code:102`, `Details:[{"Message":"No user with UserID: X exist","ErrorCode":37040}]`.**
  No booking was ever written (business-rule rejection precedes the write).
- **Not an id-space problem:** the TimeLog UI shows `EmployeeID = UserID`
  (`.../Organization/Employee/EditEmployee/29` = UserID 29). **Not a resource-status
  problem:** 64 was not a resource on 4961; 29 was (allocated, 0 h); 14 was a resource
  *with* 7 h registered — all rejected identically. The endpoint resolves no UserID.
- Therefore **`Hours`-spread semantics and 200-vs-202 are UNVERIFIABLE** — no booking
  succeeds. Swagger `WorkloadApiCreateModel` = exactly `{StartDate, EndDate, Hours,
  EmployeeId, TaskId}`; no other id field exists. `EmployeeId` has no documented v1
  source (see below).
- **Conceptually wrong target too:** the glossary and `docs/timelog/04` define Booking
  as a *manual or Outlook-appointment-captured* hour post (Tracker for Outlook) —
  a niche, not general resource planning. `WorkloadController` is "Service for handling
  bookings"; the resource-planning concepts are Allocation + Resource Planner.

### `POST /allocation` (Allokering) WORKS — the real resource write

- `DO_REAL_ALLOCATION=1` with `{UserId:29, TaskId:4961}` → **HTTP 200, empty body**
  (synchronous). The candidate-fields probe (extra fields + invalid ids) echoed back
  only `{UserId, TaskId}` → the create model has **exactly those two fields**.
- **Confirmed in the UI** (Projektplan/Plan/Index/1034): MRT now appears as a
  **resource** on task 4961 with **0 allocated hours**. So `POST /allocation` =
  "add employee as a resource to a task" (the user's step 1). Hours-per-day ("when")
  is a separate Resource Planner step, not this 2-field create.

### No EmployeeID source; v2 / ResourcePlanner not reachable

- `/employee` and `/resource` → 404. `/user` & `/user/me` expose `UserID` only (no
  separate EmployeeID). `/department` carries `ManagerEmployeeID`, `ProjectExpense`
  carries `EmployeeID` — the id space exists but **no v1 read maps a UserID to it**.
- Swagger (`timelog-api-spec.json`) declares `V2.Employee...ResourcePlannerController`
  and `V1.ProjectManagement...AllocationController` as tags but documents **no paths**
  for either; only `/v{version}/workload/book` is pathed (so `/allocation` works live
  yet is absent from the spec — the spec is incomplete).
- **API v2 is NOT live:** `/api/v2/user/me` → 404 "does not support the API version
  '2'"; every `/api/v2/resource-planner*` guess → 404; the `api-version` header is
  ignored (versioning is URL-segment based). Only v1 is served on app5/ingholtconsult2.

## Gate status

**Closed — reversed premise.** Booking is non-functional and conceptually
mislabelled; the Resource Planner "when" step needs v2, which is not live; **only
`POST /allocation` works**. Phase 3's resource-write surface = Allocation alone.
Action items: build `create_allocation`; retire/flag `book_workload`; fix the glossary
(Allocation + Resource Planner are the concepts, Booking is a niche Outlook post);
ADR 0007 superseded (see ADR 0008). Cleanup: remove the MRT→4961 allocation in the UI
(no API DELETE).

## Resolved

1. **`Hours`-over-period semantics / 200-vs-202** — UNVERIFIABLE: `/workload/book`
   never succeeds (37040). Closed as "booking non-functional", not measured.
2. **`/allocation` write probe** — RESOLVED: works, POST-only, model `{UserId, TaskId}`,
   adds a task resource at 0 h (confirmed in UI).
