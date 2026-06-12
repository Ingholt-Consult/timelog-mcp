# TimeLog MCP — Phase 2 design (project construction)

**Date:** 2026-06-12
**Status:** Approved (brainstorming). Next step: implementation plan via writing-plans.

## Context

Phase 1 (all reads + project field updates) is complete and merged. This spec
covers Phase 2 per ADR 0004: project construction — create-from-template,
tasks/sub-tasks, contracts and payment plans. Phase 3 (resource booking) stays
out.

Account facts established empirically during brainstorming (2026-06-12, read-only
calls against the live account):

- **4 active project templates:** Fastpris – Småsag (7), Fastpris – Stor/mellem
  sag (9), Medgået tid – Småsag (6), Medgået tid – Stor/mellem sag (8). The
  owner confirmed templates carry the task/sub-task structure and the contract
  assignment per task (T&M tasks on the T&M contract, fixed-price tasks on the
  fixed-price contract).
- **2 contract models in use:** TimeMaterialBasic (ContractModelID 1) and
  FixedPriceBasic (2). The three other API contract models (prepaid services,
  task driven revenue, T&M account end balancing) are not in the account's setup
  and are out of scope.
- **12 task types** (ydelsesfaser 1.1 Idéoplæg → 4.8 Certificering KK3),
  **18 payment terms**.
- **The API has no DELETE for projects, tasks, contracts, or payments.** Test
  creations are permanent; they can only be neutralised by archiving the project.
- **Every create endpoint has a paired `validate-*` endpoint** (e.g.
  `POST /project/validate-create-from-template`). These power the preview step.

## Goal

Let an administrator construct a project in conversation: create it from the
right template, supplement tasks/sub-tasks, add contracts, and add payment-plan
lines (payments) — each write previewed before it runs.

## Scope

### Write tools (5) — preview-and-confirm tier

| Tool | Execute endpoint | Preview endpoint |
|---|---|---|
| `create_project_from_template` | `POST /project/create-from-template` | `POST /project/validate-create-from-template` |
| `create_task` | `POST /task`, or `POST /task/create-sub-task` when `parentTaskID` is set | `POST /task/validate-new-task` |
| `create_time_material_contract` | `POST /contract/create-time-material-basic-contract` | `POST /contract/validate-time-material-basic-contract` |
| `create_fixed_price_contract` | `POST /contract/create-fixed-price-basic-contract` | `POST /contract/validate-fixed-price-basic-contract` |
| `create_payment` | `POST /payment` | `POST /payment/validate-new-payment` |

Body models from the swagger: `ProjectApiCreateModel` (18 fields),
`TaskApiCreateModel` (21 fields, shared by task and sub-task),
`TimeMaterialBasicContractApiCreateModel`,
`FixedPriceBasicContractApiCreateModel`, `PaymentApiCreateModel`.

Tool-shape decisions (approach "A — hybrid", owner-approved):

- Task and sub-task share one tool because they share one model; an optional
  `parentTaskID` routes to the sub-task endpoint.
- The two contract models stay separate tools because their field sets differ
  (fixed-price has payment-plan/target-rate fields; T&M has budget-overrun
  notification). One merged tool would have a muddled schema.

### Read tools (8)

| Tool | Endpoint | Notes |
|---|---|---|
| `list_project_templates` | `GET /project-template/get-all` | The 4 templates. |
| `list_tasks` | `GET /task?projectID=` | Task tree of a project; source of `parentTaskID`. |
| `get_task` | `GET /task/{taskID}` | Full task record. |
| `list_task_types` | `GET /TaskType` | Ydelsesfaser. |
| `list_contracts` | `GET /contract?projectID=` | Contracts are listed per project. |
| `get_contract` | `GET /contract/{contractID}` | Full contract record. |
| `list_payments` | `GET /payment?contractID=` | Payment-plan lines per contract. |
| `list_contract_hourly_rates` | `GET /contract-hourly-rate?contractID=` | Tasks reference an `HourlyRateID`; this resolves it. |

All reads follow the Phase 1 conventions: `$pagesize` paging, `Properties`
unwrap (CONTEXT.md › API conventions).

### Out of scope

- The three unused contract models and their endpoints.
- `update-recurring-contract-payment-plan-amount` (recurring contracts only).
- All time-tracking task endpoints (`/task/search-for-time-tracking*`,
  `/task/registration`, time-tracker).
- External-keys endpoints.
- Updating or deleting tasks/contracts/payments (no API support for delete;
  update deferred until a need exists).
- Resource booking (Phase 3).

## Preview/execute semantics

Every write tool takes `mode: "preview" | "execute"`, **default `"preview"`**.

- **Preview** posts the full payload to the paired `validate-*` endpoint and
  returns (a) the validation outcome (errors or OK) and (b) a structured summary
  of exactly what would be created, with looked-up display names (template name,
  customer name, …) instead of bare IDs where the existing reads make that cheap.
  Nothing is written.
- **Execute** posts to the real create endpoint and returns the created resource
  (including its new ID).
- Enforcement is **soft** (owner's choice): tool descriptions instruct Claude to
  always run preview first, show the user the result, and only call execute after
  the user's explicit yes in conversation. No token mechanism.
- ADR 0003 still governs: one resource per call, no bulk tools; mass construction
  is orchestrated in conversation.

## Empirical gate (per endpoint)

Each of the 5 write endpoints repeats the ADR 0002-style empirical check before
its tool is trusted. Runbook with result log:
`docs/runbooks/empirical-create-tests.md`. Strategy (owner-approved): clearly
named test projects on the live account, archived afterwards.

1. **`validate-*` is dry:** confirm for each endpoint that the validate call
   creates nothing (check the UI). The preview step rests on this.
2. **Create-from-template:** create one "API-TEST …" project from each of the 4
   templates. Verify in the UI that tasks, sub-tasks, and contracts arrive from
   the template, and record what the API fields actually control (template
   defaults vs. blanking for omitted fields).
3. **Task / contracts / payment:** tested on top of the API-TEST projects.
   Verify field binding and defaults in the UI.
4. **Cleanup:** set all API-TEST projects to Archived/Cancelled via the existing
   `update_project_status`.

Open questions the gate must answer:

- What `ContractTypeID` (on the contract create models) refers to — no list
  endpoint exists for it.
- What the `PaymentRecognitionModel` integer enum on tasks means.
- Which fields are actually required — the swagger declares none, and Phase 1
  proved the swagger lies about model binding.

## Architecture

Same patterns as Phase 1; no new architectural moves.

- `src/tools/constructionReads.ts` — the 8 reads, consuming `TimeLogClient`.
- `src/tools/constructionWrites.ts` — the 5 writes with preview/execute routing.
- Zod schemas with per-field descriptions in a new `src/constructionSchemas.ts`
  — 13 new tools would overgrow the Phase 1 `schemas.ts`.
- Registration in `registerTools.ts`. Transport, PAT resolution, and config
  unchanged (ADR 0001: localhost, per-admin PAT).

## Testing

- TDD against the mocked REST layer, as in Phase 1. Per write tool: preview hits
  the validate endpoint (and never the create endpoint), execute hits the create
  endpoint, errors map correctly, and `create_task` routes correctly with/without
  `parentTaskID`.
- The empirical gate runs as manual scripts in `test/manual/`, not in the suite.
- Rate limits remain undocumented — sequential batches.

## Documentation

- New CONTEXT.md terms: Project Template, Task, Sub-task, Task Type, Contract,
  Contract Model (TimeMaterialBasic / FixedPriceBasic), Payment, Hourly Rate.
- README capability table updated: can now create projects/tasks/contracts/
  payments (each with a preview step); still cannot delete anything, cannot touch
  time registrations/expenses/invoicing, cannot book resources (Phase 3).
- Empirical findings land in the runbook; conventions that generalise get lifted
  into CONTEXT.md › API conventions.

## Caveats carried forward

1. Swagger `required` lists are empty and untrustworthy — the empirical gate
   determines real required fields per endpoint.
2. `GET /project/get-all`-style response-shape surprises may recur on the new
   reads — unwrap defensively.
3. No API delete exists: a mistaken execute is permanent (mitigate via preview
   discipline and archiving).
4. `ContractTypeID` and `PaymentRecognitionModel` semantics unknown until the
   gate runs.
