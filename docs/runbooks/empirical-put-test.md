# Runbook: empirical PUT preservation test (ADR 0002)

Goal: confirm that `PUT /project/{id}` with only one field set leaves the other
13 fields unchanged. If it does not, the partial-update implementation is wrong
and must be replaced with read-modify-write.

## Steps

1. Pick a disposable test project in TimeLog. Note its ProjectID and record its
   current ProjectTypeID, ProjectManagerID, Description, and BudgetWorkHours from
   the UI (or via `get_project`).
2. Start the server (`npm run build && node dist/index.js`) with a real
   `TIMELOG_PAT` in `.env` belonging to a user with project-admin rights.
3. Call `update_project` with ONLY `{ projectID, Description: "PUT-TEST <timestamp>" }`.
4. Reload the project in the TimeLog UI.
5. Verify: Description changed; ProjectTypeID, ProjectManagerID, BudgetWorkHours,
   and all other fields are UNCHANGED.

## Outcomes

- **Preserved** → partial update is correct. Record the result here and proceed.
- **Reset/blanked** → STOP. Supersede ADR 0002 with a new ADR, and change
  `update_project`'s handler to read-modify-write: GET the project, merge the
  changed field into the full field set, then PUT all 14 fields. The tool's
  external signature does not change.

## Result log

- **2026-06-11, project 1034 (TEST Aggersvolg Gods) — RESET/BLANKED. ADR 0002 is wrong.**
  PUT `/project/1034` with only `{ ProjectTypeID: 257 }` returned **400 Invalid model
  state**. The server's own echoed `Parameters` showed it bound the *full* model with
  every omitted field defaulted to `null`/`0`:
  `{"Name":null,"ProjectNo":null,"CustomerID":0,...,"ProjectManagerID":0,"ProjectTypeID":257,...}`.
  Only because `Name`, `CustomerID`, and `ProjectManagerID` are required did it reject
  rather than silently blank the rest. **PUT is a full replace, not a partial update.**
  - Read-modify-write (GET → merge the one field → PUT all 10 update-model fields)
    succeeded: `ProjectTypeID` 262 → 257, every other field preserved (verified by diff).
  - **Action required:** supersede ADR 0002 and change `update_project` to RMW. See
    repro scripts `test/manual/empirical-put-1034.mjs` (partial, fails) and
    `test/manual/empirical-put-1034-rmw.mjs` (RMW, passes).

### Field/shape facts learned from the same calls
- GET `/project/{id}` wraps the record in `{ Properties: {...}, Links, Actions }`.
- Field rename: GET exposes `No`; the update model wants `ProjectNo`.
- The `update-project` action lists 11 writable fields: Name, ProjectNo, CustomerID,
  ContactID, Description, ProjectManagerID, ProjectTypeID, ProjectCategoryID,
  BudgetWorkHours, BudgetWorkAmount, LanguageID. **DepartmentID, AccountManagerID,
  PartnerID are NOT in the update model** (the zod schema overstates them).
- `LanguageID` is not returned by GET, so RMW cannot preserve it — known gap.
- `ProjectStatus` enum is confirmed by the project's embedded action:
  0=Quote, 1=Approved, 2=InProgress, 3=OnHold, 4=Completed, 5=Archived, 6=Cancelled.
- List endpoints (`/ProjectType`, 27 records) return only 10 rows by default; page
  them with TimeLog's `$`-query options (`$page`, `$pagesize`, `$expand`). E.g.
  `GET /ProjectType?$pagesize=100` returns all 27. (Earlier this was mistaken for a
  paging bug — it is a documented TAFList convention. See CONTEXT.md › API conventions.)
