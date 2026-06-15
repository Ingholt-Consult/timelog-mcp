# Empirical gate — Phase 2 create endpoints

**Strategy (grill-with-docs, 2026-06-15): minimized, validate-heavy.** The API has
no DELETE; real creates are permanent and can only be neutralised by archiving.
So learn as much as possible from the **dry** `validate-*` calls, and do the bare
minimum of real (execute) creates — on an **internal, customer-less** project so
nothing reaches invoicing.

Run against the live account (`TIMELOG_BASE_URL` + a `TIMELOG_PAT`). There is no
sandbox.

## Step 0 — confirm validate-* is dry

For each of the 5 endpoints, POST a minimal body to its `validate-*` path, then
check the TimeLog UI: **nothing must be created.** The preview step depends on
this. Use `test/manual/empirical-create-validate.mjs` (below). Record the result.

| Endpoint | validate writes nothing? | Notes |
|---|---|---|
| project/validate-create-from-template | ☐ | |
| task/validate-new-task | ☐ | |
| contract/validate-time-material-basic-contract | ☐ | |
| contract/validate-fixed-price-basic-contract | ☐ | |
| payment/validate-new-payment | ☐ | |

## Step 1 — learn required fields from validation errors (dry)

For each endpoint, POST increasingly-empty bodies to `validate-*` and read the
error messages to discover which fields are actually required and how they bind.
Record findings below — these may later tighten `src/constructionSchemas.ts`.

| Endpoint | Fields validation insists on | Field-binding surprises |
|---|---|---|
| create-from-template | | |
| validate-new-task | | |
| TM contract | | |
| FP contract | | |
| payment | | |

Open questions to resolve here:
- **ContractTypeID** — what it refers to (no list endpoint exists).
- **PaymentRecognitionModel** (task enum 0|1|2) — what each value means.
- **ContractStatus** (1–4) and **UnitType** (payment) enum labels.

## Step 2 — minimal real creates (execute)

Only what validate cannot teach. On an **internal (no CustomerID)** project named
`API-TEST <date>`:

1. `create_project_from_template` (execute) from ONE template. Verify in the UI
   that tasks, sub-tasks, and contracts arrive from the template; record which API
   fields override template defaults vs. are ignored.
2. Optionally one `create_task` (execute) on that project to confirm task binding.
3. Create real contracts/payments **only if** Step 1 left their field binding
   genuinely unknown — otherwise rely on the validate findings.

## Step 3 — cleanup

Set every `API-TEST` project to Archived (status 5) or Cancelled (status 6) via
`update_project_status`. Note that archiving hides the project but does NOT delete
the contracts/payments underneath.

## Result log

_(fill in as the gate runs — date, who, outcome per row above)_
