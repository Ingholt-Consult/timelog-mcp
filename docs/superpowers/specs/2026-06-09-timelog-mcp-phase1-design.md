# TimeLog MCP — Phase 1 design

**Date:** 2026-06-09
**Status:** Approved (brainstorming). Next step: implementation plan via writing-plans.

## Context

This MCP server lets a handful of project administrators at the firm administer
TimeLog via its REST API (v1), each running their own local instance with their
own Personal Access Token (PAT). The product-feature basis for scoping lives in
`docs/timelog/`; the API truth is `timelog-api-spec.json`.

The full agreed scope (Projects + Employees) is too large for one spec, so it is
delivered in three phases (see ADR 0004). **This spec covers Phase 1 only.**

- **Phase 1 (this spec):** All read tools (projects + employees) plus project
  field administration. Trust-the-conversation write tier.
- **Phase 2 (later):** Project construction — create-from-template, tasks,
  contracts and payment plans. Preview-and-confirm write tier.
- **Phase 3 (later):** Resource booking (`/workload/book`). Preview-and-confirm
  write tier.

## Goal

Deliver three of the four job categories the owner asked for, with zero
irreversible-creation risk:

- Project insight (read across projects).
- Employee / resource lookup (read).
- Project cleanup and administration (update existing project fields + status).

Headline use case: mass-changing Project Types across many projects, orchestrated
in conversation (no bulk tool).

## Scope

### In scope

Twelve tools (5 project reads, 5 relation/employee reads, 2 project writes).

**Read — projects (5):**

| Tool | Endpoint | Notes |
|---|---|---|
| `list_projects` | `GET /project/get-all` | Optional filters `customerID`, `isActive`. |
| `get_project` | `GET /project/{id}` | Full project record. |
| `list_project_types` | `GET /ProjectType` | Read-only classification list. |
| `list_project_categories` | `GET /ProjectCategory` | Read-only classification list. |
| `list_departments` | `GET /department` | Org units. |

**Read — relations / employees (5):**

| Tool | Endpoint | Notes |
|---|---|---|
| `list_customers` | `GET /customer` | For customer/contact lookup. |
| `list_contacts` | `GET /contact` | Contact persons. |
| `list_users` | `GET /user` | Employees — resolve PM/AM names to IDs. |
| `list_employee_types` | `GET /employee-type` | Employee classification. |
| `whoami` | `GET /user/me` | Which user the PAT acts as. Matters because several admins each run their own instance. |

**Write — project fields (2), trust-the-conversation tier:**

| Tool | Endpoint | Body model |
|---|---|---|
| `update_project` | `PUT /project/{id}` | `ProjectApiUpdateModel` — 14 fields. |
| `update_project_status` | `PUT /project/{id}/status` | `ProjectStatusApiUpdateModel` — `{ ProjectStatus 0–6, AllowTimeTracking }`. |

`update_project` is a single tool with all 14 fields optional. Claude sets only
the fields being changed. The 14 fields:

```
Name, ProjectNo, CustomerID, ContactID, Description, DepartmentID,
ProjectManagerID, AccountManagerID, PartnerID, ProjectTypeID,
ProjectCategoryID, BudgetWorkHours, BudgetWorkAmount, LanguageID
```

### Out of scope (Phase 1)

- Creating or deleting projects, tasks, or contracts (Phase 2).
- Resource booking / allocation (Phase 3).
- Creating employees, changing normal working time (cut entirely — owner chose
  read-only on the employee write side except booking).
- Touching time registrations, expenses, invoicing.
- Setting `StartDate` / `EndDate` (not present in the update model — the API
  cannot do this).
- `hourly-rate` and `cost-price` reads — deferred; pull in only if a later phase
  needs rate/economy insight.

## Write semantics

The update semantics are governed by ADR 0002 and are **not yet empirically
verified**. The first implementation step is the empirical PUT test:

1. Run one real `PUT /project/{id}` against one disposable test project, setting
   exactly one field.
2. Verify in the TimeLog UI that the other 13 fields are **preserved**.
3. If preserved → partial update (send only changed fields).
4. If reset to null/blank → supersede ADR 0002 and switch to read-modify-write
   (GET the project, merge the change, PUT all fields).

Either way, `update_project`'s external signature is identical (optional fields);
only the internal implementation differs. This test runs manually against the
test project, not in the automated suite.

## Write safety

Per ADR 0003:

- One project per call. No bulk tool.
- Mass operations are orchestrated in conversation:
  `list_projects` → user confirms the target set → one call per project →
  per-project report of success/failure.
- The preview-and-confirm tier is reserved for Phase 2–3 (create / booking). It
  is deliberately not built in Phase 1 because field updates on existing
  projects are low-risk and reversible by re-editing.

## ProjectStatus labels

`ProjectStatus` is an integer 0–6 whose labels are not yet confirmed against this
account (caveat 2 from the handoff). `update_project_status` therefore exposes a
raw integer with a warning in its description until labels are verified. Verify
empirically (set status, read the UI), then document the mapping in `CONTEXT.md`
and give the tool friendly names.

`get-all`'s 200 schema is mis-typed in the swagger (references the single-project
model, not an array) — parse the response as an array regardless (caveat 3).

## Architecture and stack

- **Language/SDK:** TypeScript + `@modelcontextprotocol/sdk`.
- **Validation:** `zod`. Each tool's input schema carries per-field descriptions
  — this doubles as machine-readable capability documentation for Claude.
- **HTTP:** native `fetch`. Base URL and auth from config.
- **Transport:** Streamable HTTP, multi-tenant-ready. PAT read from the
  `Authorization` header **or** the `TIMELOG_PAT` env var (ADR 0001). Runs on
  localhost in Phase 1.
- **Config:** `TIMELOG_BASE_URL=https://app5.timelog.com/ingholtconsult2/api/v1`,
  `TIMELOG_PAT`. Auth = `Bearer`. Server 5, account `ingholtconsult2`.

Suggested unit boundaries (each independently testable):

- A thin TimeLog REST client (auth header, base URL, JSON, error mapping) — knows
  nothing about MCP.
- One module per tool group (project reads, relation/employee reads, project
  writes), each consuming the client.
- The MCP server wiring (tool registration, transport, PAT resolution).

## Testing

- TDD against a mocked REST layer: red tests first, mock TimeLog responses.
- The one real integration (the PUT preservation test) is run manually against
  the test project, not in the suite.
- Rate limits are undocumented (caveat 4) — batch sequentially/conservatively.

## Capability documentation (deliverable)

- zod field descriptions on every tool.
- A README table of can / cannot. Explicit cannots for Phase 1:
  - Cannot create or delete projects.
  - Cannot touch time registrations, expenses, or invoicing.
  - Cannot set `StartDate` / `EndDate` (not in the update model).
  - Cannot create employees or change resource bookings (later phases / cut).

## Caveats carried forward

1. Empirical PUT test must pass before any field-update tool is trusted (ADR 0002).
2. `ProjectStatus` 0–6 labels unconfirmed — expose raw integer until verified.
3. `get-all` 200 schema mis-typed — parse as array.
4. Rate limits undocumented — go sequential on batches.
5. PAT is employee-specific and needs project-administration rights; never bake a
   shared PAT into a hosted server (ADR 0001).
