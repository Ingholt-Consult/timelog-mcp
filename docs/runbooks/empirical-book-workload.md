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
  — a POST/PUT may exist. **Unresolved:** before declaring pure Allokering out of
  scope (ADR 0007), probe `/allocation` with a non-GET method (e.g. POST an empty
  body and read the error) to see whether a write route is actually there.

## Still open (not yet run)

1. **`Hours`-over-period semantics** — does a booking spread `Hours` across
   `StartDate→EndDate` or land it on the start day? Needs one real booking
   (`DO_REAL_BOOKING=1`) on project 1034 + a Resource Planner UI check, since the
   projection does not show booked hours. Until verified, describe `book_workload`
   conservatively.
2. **200 vs 202** — only the 400 path has been exercised; the success/async
   behaviour is unconfirmed (depends on the real booking).
3. **`/allocation` write probe** — see above.
