# Project — TimeLog REST API v1

> Scraped from docs.timelog.com/rest on 2026-06-16, diffed against
> `timelog-api-spec.json`. See [README](./README.md) and
> [../../CONTEXT.md](../../CONTEXT.md).

Service for handling projects in TimeLog. This is the server's headline domain:
its main job is **mass-changing Project Type** across many projects.
[Project Type](../../CONTEXT.md) and [Project Category](../../CONTEXT.md) are
**distinct concepts** that exist independently on a Project — do not conflate
them. Project **status** is changed through its own `UpdateStatus` endpoint
(below), not through the `Update` field-replacement endpoint.

Runtime base URL (this tenant):
`https://app5.timelog.com/ingholtconsult2/api`. All paths below are
`/v{version}/…` where `version` is a path param, currently `v1`.

**Related but SEPARATE services** (documented elsewhere, not here — cross-link
only): project external-keys, project-expense, project-header, project-template,
ProjectType, ProjectCategory.

## Endpoints

### GET /v{version}/project/get-all
- **Purpose:** Get all projects. Optionally filter by customer and active state.
- **Docs:** https://docs.timelog.com/rest/method/project_getall
- **Response model:** `ProjectApiReadModel`
- **Params (query):**

  | Param | Type | Required | Notes |
  |---|---|---|---|
  | customerID | int | No | Filter to one [Customer](../../CONTEXT.md). |
  | isActive | bool | No | Project active status. Docs say default `true`. |

- **Response:** TAFList wrapping — `{ Properties: { TotalRecord, TotalPage, PageNumber }, Entities: [ { Properties: { …ProjectApiReadModel } } ], Links }`.
  ⚠️ **Paging:** without `$pagesize` the list silently returns only the first
  **10** rows even when `TotalRecord` is higher. Pass `$page`, `$pagesize`,
  `$expand` to page/expand.
- **Read fields (`ProjectApiReadModel`):**

  | Field | Type | Notes |
  |---|---|---|
  | ProjectID | int | Numeric project identifier (use for path on get-by-id / update). |
  | ID | uuid | GUID identifier. |
  | Name | string | |
  | No | string | Project number. **Read-side name is `No`**; written as `ProjectNo` (create/update). |
  | ExpenseIsBillable | bool | |
  | CustomerID | int | |
  | Customer | ref `CustomerApiReadModel` | Embedded customer object (separate service). |
  | ContactID | int | |
  | Description | string | |
  | DepartmentID | int | |
  | ProjectManagerID | int | |
  | AccountManagerID | int | |
  | PartnerID | int | |
  | ProjectTypeID | int | The field this server mass-changes. |
  | ProjectCategoryID | int | Distinct from ProjectTypeID. |
  | BudgetWorkHours | double | |
  | BudgetWorkAmount | double | |
  | StartDate | date-time | **Read-side name is `StartDate`**; written as `ProjectStartDate` (create). |
  | EndDate | date-time | **Read-side name is `EndDate`**; written as `ProjectEndDate` (create). |

- **Errors:** 401 invalid auth token; 500 request processing failure.
- **Quirks:** Read/write field-name mismatch — `No`↔`ProjectNo`,
  `StartDate`/`EndDate`↔`ProjectStartDate`/`ProjectEndDate`.

---

### GET /v{version}/project/{projectID}
- **Purpose:** Get a single project by its numeric project identifier.
- **Docs:** https://docs.timelog.com/rest/method/project_getbyid
- **Response model:** `ProjectApiReadModel`
- **Params (path):**

  | Param | Type | Required | Notes |
  |---|---|---|---|
  | projectID | int | Yes | Numeric `ProjectID` (not the UUID). |
  | version | string | Yes | API version (`v1`). |

- **Response:** single-resource wrapping —
  `{ Properties: { …ProjectApiReadModel }, Links, Actions }`. Fields as in the
  `ProjectApiReadModel` table above.
- **Errors:** 401 invalid auth token; 500 "Project with the identifier does not
  exist".
- **Quirks:** Same read/write naming mismatch as get-all. The read model does
  **not** return `LanguageID` (write-only per ADR 0005) and the GET docs table
  omits `PartnerID` description but swagger lists it on the read model — see gate.

---

### POST /v{version}/project/create-from-template
- **Purpose:** Create a new project from a [project-template](../../CONTEXT.md)
  (separate service). Summary "Create new project".
- **Docs:** https://docs.timelog.com/rest/method/project_createfromtemplate
- **Request model:** `ProjectApiCreateModel`

  | Field | Type | Required (docs) | Notes |
  |---|---|---|---|
  | Name | string | No ⚠️ | Project name. |
  | ProjectNo | string | No ⚠️ | Project number (written name; read as `No`). |
  | CustomerID | int | No ⚠️ | |
  | Description | string | No ⚠️ | |
  | ProjectTemplateID | int | No ⚠️ | Template to create from. Likely required in practice — gate. |
  | ProjectManagerID | int | No ⚠️ | |
  | ProjectStartDate | date-time | No ⚠️ | Written name; read as `StartDate`. |
  | ProjectEndDate | date-time | No ⚠️ | Written name; read as `EndDate`. |
  | ProjectTypeID | int | No ⚠️ | |
  | ProjectCategoryID | int | No ⚠️ | |
  | CurrencyID | int | No ⚠️ | |
  | LegalEntityID | int | No ⚠️ | |
  | DepartmentID | int | No ⚠️ | |
  | AccountManagerID | int | No ⚠️ | |
  | PartnerID | int | No ⚠️ | Present on create model; absent from read model and update model — see gate. |
  | ContactID | int | No ⚠️ | Contact person. |
  | InvoicingCustomerReferenceID | int | No ⚠️ | Customer Reference ID on invoicing settings. |
  | LanguageID | int | No ⚠️ | Language ID used for the invoice. Write-only (not returned by GET; ADR 0005). |

  ⚠️ Required fields unconfirmed — docs/swagger claim all-optional, but ADR 0005
  precedent shows this is often false. Resolve via the empirical gate
  (`docs/runbooks/empirical-put-test.md`); do not trust.
- **Response:** 200 returns a `ProjectApiCreateModel` payload (same 18 fields as
  the request), single-resource wrapping. Note this is the **create** model, not
  `ProjectApiReadModel` — it does not include `ProjectID`, `ID`, budgets, etc.
- **Errors:** 401 invalid auth token; 500 "Project could not be created".
- **Quirks:** Response echoes the create model rather than the read model, so to
  obtain `ProjectID`/`ID` you likely need a follow-up `get-all`/`get-by-id`.

---

### POST /v{version}/project/validate-create-from-template
- **Purpose:** Validate a would-be new-from-template project without creating it.
  ("Validate new project created from template".)
- **Docs:** https://docs.timelog.com/rest/method/project_validatenewproject
- **Request model:** `ProjectApiCreateModel` (identical fields to
  create-from-template above — same ⚠️ required-unconfirmed caveat).
- **Response:** 200 returns the `ProjectApiCreateModel` payload (same structure
  as the request), single-resource wrapping.
- **Errors:** 401 invalid auth token; 500 "Project could not be validated".
- **Quirks:** Dry-run companion to create-from-template; same write-only
  `LanguageID` and orphan `PartnerID` notes apply.

---

### PUT /v{version}/project/{projectID}
- **Purpose:** Update an existing project by its numeric identifier.
- **Docs:** https://docs.timelog.com/rest/method/project_update
- **Request model:** `ProjectApiUpdateModel`
- **Params (path):**

  | Param | Type | Required | Notes |
  |---|---|---|---|
  | projectID | int | Yes | Numeric `ProjectID`. |
  | version | string | Yes | API version (`v1`). |

  | Field | Type | Required (docs) | Notes |
  |---|---|---|---|
  | Name | string | No ⚠️ | |
  | ProjectNo | string | No ⚠️ | Written name; read as `No`. |
  | CustomerID | int | No ⚠️ | |
  | ContactID | int | No ⚠️ | |
  | Description | string | No ⚠️ | |
  | DepartmentID | int | No ⚠️ | |
  | ProjectManagerID | int | No ⚠️ | |
  | AccountManagerID | int | No ⚠️ | |
  | PartnerID | int | No ⚠️ | On update model per swagger; docs update table omits it — see gate. |
  | ProjectTypeID | int | No ⚠️ | The field this server mass-changes. |
  | ProjectCategoryID | int | No ⚠️ | Distinct from ProjectTypeID. |
  | BudgetWorkHours | double | No ⚠️ | |
  | BudgetWorkAmount | double | No ⚠️ | |
  | LanguageID | int | No ⚠️ | Write-only (not returned by GET; ADR 0005). |

  ⚠️ Required fields unconfirmed — docs/swagger claim all-optional, but ADR 0005
  precedent shows this is often false. Resolve via the empirical gate
  (`docs/runbooks/empirical-put-test.md`); do not trust.
- **Response:** 200 (project updated successfully); no body model documented
  beyond the error model.
- **Errors:** 401 invalid auth token; 500 "Project could not be updated".
- **Quirks:** ⚠️ **PUT is a full replace, not a partial update** (ADR 0005). Any
  field omitted from the body is wiped/reset, so callers must read-modify-write:
  GET the project, mutate fields, send the whole model back. Note the read model
  carries `No`/`StartDate`/`EndDate` and **not** `LanguageID`/`PartnerID` on a
  clean RMW path, while the update model takes `ProjectNo`/`LanguageID` and lacks
  `StartDate`/`EndDate`/`ProjectStatus` — so a naive RMW cannot round-trip every
  field. `LanguageID` is write-only (never read back) and `PartnerID` is on the
  update model but not cleanly recoverable from the read model. Status is **not**
  settable here — use `UpdateStatus`.

---

### PUT /v{version}/project/{projectID}/status
- **Purpose:** Update a project's status (and time-tracking permission) by its
  numeric identifier.
- **Docs:** https://docs.timelog.com/rest/method/project_updatestatus
- **Request model:** `ProjectStatusApiUpdateModel`
- **Params (path):**

  | Param | Type | Required | Notes |
  |---|---|---|---|
  | projectID | int | Yes | Numeric `ProjectID`. |
  | version | string | Yes | API version (`v1`). |

  | Field | Type | Required (docs) | Notes |
  |---|---|---|---|
  | ProjectStatus | int (enum 0–6) | No ⚠️ | See enum below. |
  | AllowTimeTracking | bool | No ⚠️ | Whether time tracking is allowed. |

  ⚠️ Required fields unconfirmed — docs/swagger claim all-optional, but ADR 0005
  precedent shows this is often false. Resolve via the empirical gate
  (`docs/runbooks/empirical-put-test.md`); do not trust.
- **Enums (`ProjectStatus`):** swagger gives values `[0,1,2,3,4,5,6]`; the docs
  method page does **not** provide value→label mappings.
  - 0 → label undocumented — gate
  - 1 → label undocumented — gate
  - 2 → label undocumented — gate
  - 3 → label undocumented — gate
  - 4 → label undocumented — gate
  - 5 → label undocumented — gate
  - 6 → label undocumented — gate
- **Response:** 200 (status updated successfully); no body model documented
  beyond the error model.
- **Errors:** 401 invalid auth token; 500 "Project status could not be updated".
- **Quirks:** This is the **only** way to change project status — the `Update`
  endpoint's body has no status field. Because `Update` is a full replace and
  does not carry status, status and field-state are managed on separate calls.

## For the empirical gate

- **All Project create/update fields are claimed optional.** `create-from-template`,
  `validate-create-from-template`, `Update`, and `UpdateStatus` all show every
  field as "No"/optional in both docs and swagger. ADR 0005 precedent: a
  field marked optional caused a 400 on partial PUT. Hypothesis: at least
  `ProjectTemplateID`, `Name`, and `CustomerID` are required on
  create-from-template; the actual required set on each endpoint must be
  confirmed against the live API.
- **`ProjectStatus` enum 0–6 has no labels.** Hypothesis: the seven values map to
  human-readable statuses (e.g. some of Lead/Quote/Open/Closed/On hold/Completed/
  Cancelled). Confirm value→label mapping against the live API / TimeLog UI.
- **`LanguageID` is write-only.** Accepted by create and update models but never
  returned by GET (`ProjectApiReadModel`). Confirm it is silently accepted and
  not echoed; a read-modify-write loop cannot preserve it from a GET (ADR 0005).
- **`PartnerID` round-trip gap.** Present on the create model and (per swagger)
  the update model, and on the read model — but the docs update table omits it.
  Confirm whether `PartnerID` is actually accepted on PUT `Update` and whether a
  GET reliably returns it, since a full-replace PUT could otherwise wipe it.
- **Create/validate response uses the create model, not the read model.**
  `create-from-template` 200 returns `ProjectApiCreateModel` (no `ProjectID`/`ID`).
  Confirm whether the new project's identifiers must be fetched via a follow-up
  `get-by-id`/`get-all`.
- **`isActive` default on get-all.** Docs say default `true`. Confirm that
  omitting `isActive` returns only active projects.
