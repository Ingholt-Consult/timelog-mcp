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

- (pending) — run against a real test project before trusting `update_project`.
