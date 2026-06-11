# Project updates are read-modify-write (PUT is a full replace)

`PUT /project/{id}` is a **full replace** of the update model, not a partial
update. `update_project` therefore reads the project, merges the caller's changed
fields onto the current values, and PUTs the complete model.

Supersedes ADR 0002.

## Why

ADR 0002 assumed partial update worked because every field is optional in the
swagger spec. The empirical test (2026-06-11, project 1034) disproved this. A PUT
carrying only `{ ProjectTypeID: 257 }` returned **400 Invalid model state**, and the
server echoed the model it had bound — every omitted field defaulted to `null`/`0`:

```
{"Name":null,"ProjectNo":null,"CustomerID":0,...,"ProjectManagerID":0,"ProjectTypeID":257,...}
```

It rejected the call only because `Name`, `CustomerID`, and `ProjectManagerID` are
required. Had they not been, the other fields would have been silently blanked. A
read-modify-write PUT (GET → merge the one field → PUT all fields) then succeeded:
`ProjectTypeID` changed 262 → 257 with every other field preserved. See
`docs/runbooks/empirical-put-test.md` and the repro scripts under `test/manual/`.

## Consequences

- `update_project` GETs the project and merges changes before PUT. The external tool
  signature is unchanged — callers still pass only the fields they want to change.
- The update model has **11 fields**: Name, ProjectNo, CustomerID, ContactID,
  Description, ProjectManagerID, ProjectTypeID, ProjectCategoryID, BudgetWorkHours,
  BudgetWorkAmount, LanguageID. `DepartmentID`, `AccountManagerID`, and `PartnerID`
  are not in the update model and were removed from the schema.
- Field-name trap: GET exposes the project number as `No`; the update model wants
  `ProjectNo`. The handler maps between them.
- `LanguageID` is not returned by GET, so read-modify-write cannot preserve it. It is
  sent only if the caller passes it; otherwise it is omitted. Known gap.
- Each `update_project` call now costs one extra GET. Acceptable for single-project
  writes (ADR 0003).
