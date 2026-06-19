# Booking is non-functional; Allocation is the resource write

> **SUPERSEDED by ADR 0009 (2026-06-19).** This ADR's claim that "v2 is not live" was
> wrong (wrong route guesses + `/user/me` is not a v2 controller). The real resource-
> planning write is `POST /api/v2/resource-planner/book-hours` (PAT-authed, proven).
> The booking-is-dead and allocation findings below still hold; the v2 conclusion does
> not. See ADR 0009.

Supersedes **ADR 0007**. Phase 3 set out to add *resource booking* via
`POST /workload/book`. The empirical gate's final round (2026-06-19, full log
`docs/runbooks/empirical-book-workload.md`) showed that premise is wrong on two
counts — the endpoint does not work, and "Booking" is the wrong concept.

## `POST /workload/book` (Booking) is non-functional via this API

Real bookings were attempted for three valid, active users — `EmployeeId` 29 (the
PAT owner), 64, 14 — on a leaf task. **All returned HTTP 500, `Code:102`,
`ErrorCode 37040` — "No user with UserID: X exist."** No booking was written.

This is not solvable from the client:

- **Not an id-space issue** — the TimeLog UI shows `EmployeeID = UserID`
  (`EditEmployee/29` = UserID 29), and `GET /user`/`/user/me` expose only `UserID`.
- **Not a resource-status issue** — one user was not a resource on the task, one was
  (0 h), one was a resource with registered time; all three were rejected identically.
- **No alternative id exists** — swagger's `WorkloadApiCreateModel` is exactly
  `{StartDate, EndDate, Hours, EmployeeId, TaskId}`, and no v1 read maps a `UserID` to
  the `EmployeeID` key space the endpoint resolves against.

## "Booking" is the wrong concept anyway

The glossary and `docs/timelog/04` define **Booking** as a *manual or
Outlook-appointment-captured* hour post (Tracker for Outlook) — a niche feature, not
general resource planning. The resource-planning concepts are:

1. **Allocation** (Allokering) — assign an employee to a task: *how many* hours.
2. **Resource Planner** (Ressourceplanlægger) — plan *when* the allocated hours fall.

Phase 3 mistakenly elevated the niche `BookWorkload` endpoint to a primary concept.
The glossary is corrected: Allocation + Resource Planner are primary; Booking is a
niche Outlook post, flagged non-functional via the API.

## Decision

- **`POST /allocation` (Allokering) is the resource write.** It works: 200
  (synchronous), model = exactly `{UserId, TaskId}` (`UserId` is a real `UserID`),
  POST-only (`GET`/`PUT` → 405), no DELETE. Confirmed in the UI: it adds the user as a
  **resource** on the task at **0 allocated hours**. Build a `create_allocation` tool
  on this.
- **Retire/flag `book_workload`.** The booking tool and its `runBooking` synthetic
  preview (ADR 0007) cannot function — remove the tool or guard it as a documented
  no-op with a clear error pointing to Allocation.
- **The Resource Planner "when" step is out of scope** — it lives on the V2
  `ResourcePlannerController`, and **API v2 is not live** on this instance
  (`/api/v2/...` → 404 "does not support the API version '2'"). Allocation sets the
  resource and its budget; per-day scheduling is UI-only for now.

## Consequences / open items

- **Allocation's hours/budget:** the 2-field create only attaches the resource at 0 h.
  How allocated hours get set via the API (a second call? a field we haven't probed? a
  V2-only path?) is unverified — gate before promising hour-level allocation in the
  tool. Task-budget hours remain settable via Phase 2 `create_task` (`BudgetHours`).
- **No reads for allocations:** `GET /allocation` is 405, so a `create_allocation`
  tool cannot read back what it wrote; surface the resource via the UI / projection.
- `get_employee_workload` (`GET /employee-projection/get-in-period`) stays valid —
  capacity-only, paged; keep it.
- Cleanup: the `MRT→4961` allocation written during the gate must be removed in the UI
  (no API DELETE).
