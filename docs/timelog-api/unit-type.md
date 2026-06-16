# Unit Type — TimeLog REST API v1

> Scraped from docs.timelog.com/rest on 2026-06-16, diffed against
> `timelog-api-spec.json`. See [README](./README.md) and
> [../../CONTEXT.md](../../CONTEXT.md).

Service for handling unit types in TimeLog. A unit type is the unit of measure
attached to a billable amount — most importantly, it is the lookup that resolves
the `UnitType` integer enum on a [Payment](./payment.md) into a human-readable
label. This service exposes a single read-only "get all" list endpoint.

## Endpoints

### GET /v{version}/unit-type
- **Purpose:** Get all unit types defined in the TimeLog system. (Docs summary and
  swagger summary both literally say *"Get all customer types"* — this is a copy-paste
  error in TimeLog's own docs/swagger; the service page, the model name
  `UnitTypeApiReadModel`, and the runtime path `/unit-type` all confirm the real
  subject is **unit types**, not customer types.)
- **Docs:** https://docs.timelog.com/rest/method/unittype_getall
- **Runtime URL:** `https://app5.timelog.com/ingholtconsult2/api/v1/unit-type`
- **Request model:** none (no request body; only the `version` path param)
- **Response model:** `UnitTypeApiReadModel` (returned as a list)

  | Field | Type | Required (docs) | Notes |
  |---|---|---|---|
  | UnitTypeID | integer | n/a (read-only) | Unit type identifier. This is the value stored in a Payment's `UnitType` field. |
  | Name | string | n/a (read-only) | Display label for the unit type. |

- **Enums:** UnitTypeID → Name mapping is **not enumerated** on the docs page. The
  docs show only the empty template (`{ "Name": "", "UnitTypeID": 0 }`) and no value
  table. ⚠️ The label for each numeric UnitTypeID is undocumented — resolve at
  runtime by calling this endpoint (it *is* the canonical source of these labels).
- **Response:** Read conventions apply — a single resource wraps as
  `{ Properties: {…}, Links, Actions }`. The docs example shows a bare
  `{ "Name": "", "UnitTypeID": 0 }` object, but per CONTEXT.md the live API is
  expected to wrap each entity; a list almost certainly returns as a TAFList
  (`{ Properties: { TotalRecord, TotalPage, PageNumber }, Entities: [ { Properties: {…} } ], Links }`).
  ⚠️ **Paging:** if this returns a TAFList, it will silently return only the first
  **10** rows unless `$pagesize` is supplied. Given the small fixed set of unit
  types this may not matter in practice, but pass `$pagesize` to be safe.
- **Params:**
  - Path: `version` (string) — requested API version, currently `v1`.
  - Query (if TAFList): `$page`, `$pagesize`, `$expand` per the list conventions.
- **Quirks:**
  - Read-only service — no create/update/delete endpoints, so no PUT-replace or
    required-field concerns here.
  - The docs/swagger "Get all customer types" summary is a mislabel (see Purpose).
  - **Cross-link:** The [Payment](./payment.md) create/read model carries a
    `UnitType` integer field with enum `[0, 1, 2, 3, 4, 6, 7, 8, 9]` whose labels
    are undocumented in swagger (note the gap at 5). This endpoint is the resolver
    for those labels: each Payment `UnitType` value maps to a `UnitTypeID` returned
    here, and the `Name` is the label. When documenting payment.md's `UnitType`
    enum, point readers to `GET /v1/unit-type`.
- **Errors:**
  - `401` — Invalid authentication token.
  - `500` — "Request to GetAll has failed."
  - Error body shape: `{ Code (int), Details (array), DeveloperNote (object), Message (string), Parameters (string), Url (string) }`.

## For the empirical gate
- **Resolve the Payment `UnitType` enum labels.** The docs page for
  `GET /unit-type` does NOT enumerate UnitTypeID→Name pairs. Hypothesis: calling
  `GET /v1/unit-type` at runtime returns the full set of `{ UnitTypeID, Name }`
  rows, and those `UnitTypeID` values are exactly the Payment `UnitType` enum
  `[0,1,2,3,4,6,7,8,9]`. Confirm the mapping (including why `5` is absent from the
  Payment enum — is `5` a UnitTypeID that exists but is not valid on payments, or
  is it simply unused?) and record each label.
- **Confirm response wrapping/paging shape.** Hypothesis: this list returns as a
  TAFList subject to the 10-row default cap. Confirm whether the response is a bare
  array, wrapped single objects, or a paged TAFList, and whether `$pagesize` is
  honored. (Likely moot given the small fixed set, but verify.)
- **Confirm the mislabeled summary is cosmetic only.** Hypothesis: despite the
  "Get all customer types" summary, the payload contains unit types
  (`UnitTypeApiReadModel`), not customer types. Confirm against the live response.
