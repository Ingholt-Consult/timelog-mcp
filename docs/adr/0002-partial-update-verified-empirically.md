# Project updates are partial, verified empirically before batch

> **SUPERSEDED by ADR 0005 (2026-06-11).** The empirical check failed: `PUT` is a
> full replace, not a partial update. `update_project` now reads-modifies-writes.
> The text below is retained for the historical record.


`PUT /project/{id}` uses `ProjectApiUpdateModel`, whose 14 fields are all optional
in the swagger spec. We treat updates as **partial** — send only the fields being
changed — rather than read-modify-write (GetByID → merge → send the whole object).
Before any batch run, we verify on a single project that omitted fields are
preserved server-side.

## Why

The handoff assumed `PUT` was a full replace and recommended read-modify-write to
avoid nulling fields. The swagger spec contradicts this: every update field is
optional. Read-modify-write is also a poor fit here — the read model
(`ProjectApiReadModel`) contains fields the update model lacks (e.g. `StartDate`,
`EndDate`), so it cannot faithfully round-trip the whole object anyway. Partial
update is simpler and matches the spec.

The risk: "optional in swagger" does not guarantee the server preserves omitted
fields rather than nulling them. So the decision is conditional on an empirical
check — one real `PUT` against one test project, confirmed in the UI — before
trusting partial semantics for a batch.

## Consequences

- The first verification step of implementation is a live single-project test.
- If the check fails (omitted fields get nulled), revisit read-modify-write for
  the writable subset and supersede this ADR.
