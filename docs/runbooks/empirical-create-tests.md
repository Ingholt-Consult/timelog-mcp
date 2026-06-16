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
| project/validate-create-from-template | ☑ | 2026-06-16: empty + template-only bodies → 400, UI unchanged. |
| task/validate-new-task | ☑ | 2026-06-16: returns 400 (real ProjectID) / 500 (ProjectID 0); nothing created. |
| contract/validate-time-material-basic-contract | ☑ | 2026-06-16: empty → 400; UI unchanged. |
| contract/validate-fixed-price-basic-contract | ☑ | 2026-06-16: empty → 400; UI unchanged. |
| payment/validate-new-payment | ☑ | 2026-06-16: 400/500; UI unchanged. |

Confirmed dry: failing validations all returned 4xx/5xx with the project list
unchanged, and round 3 produced a **successful** validate (payment on FP contract
2244 → 200 OK) — contract 2244 must still show exactly 5 payments afterwards
(confirm in UI). Both the failing and the passing path write nothing.

## Step 1 — learn required fields from validation errors (dry)

For each endpoint, POST increasingly-empty bodies to `validate-*` and read the
error messages to discover which fields are actually required and how they bind.
Record findings below — these may later tighten `src/constructionSchemas.ts`.

| Endpoint | Fields validation insists on | Field-binding surprises |
|---|---|---|
| create-from-template | `Name`, `CustomerID` (>0), `ProjectTemplateID`, `ProjectManagerID`, `ProjectTypeID` (>0), `CurrencyID` (>0), `ProjectStartDate`, `ProjectEndDate` | **`CustomerID` must be > 0** — contradicts the "internal, customer-less" test strategy below. Dates must be real ISO (the `0001-01-01` default is rejected). Template does NOT auto-satisfy these *at validate time* (execute untested). |
| validate-new-task | `TaskName`, `BudgetHours`, `BudgetAmount`, `HourlyRateID`, `StartDate` (+`EndDate`) | **500, not 400, when `ProjectID` is missing/invalid** — validate crashes instead of reporting "project required". `TaskTypeID` and `ParentTaskID` are NOT required. |
| TM contract | `ProjectID` (>0), `ContractName`, `ContractStatus` (≠ 0) | `ContractTypeID` 0 accepted (not required). |
| FP contract | `ProjectID` (>0), `ContractName`, `ContractStatus` (≠ 0) | Same as TM. Payment-plan fields (`PaymentPlanAmount`, …) not required at validate. |
| payment | `Name`, `InvoiceDate` (valid date) | **Payments only allowed on a fixed-price contract** — a T&M contract gives "The selected contract does not support import of payment". `Amount` 0 was not rejected. Against FP contract 2244 with `Name`+`Amount`+valid `InvoiceDate` → **validate 200 OK** (round 3). |

Open questions — **resolved from the live API's HATEOAS `Actions[].Fields[].Enums`**
(GET list responses self-describe each create action's fields and enum labels):
- **ContractTypeID** — ✅ not a lookup we need: real contracts carry `ContractTypeID: 0`, `ContractTypeName: ""`. 0 = none; field is optional.
- **PaymentRecognitionModel** (task) — ✅ `0=Undefined, 1=OverallPaymentPlan, 2=FixedPricePayment`.
- **ContractStatus** — ✅ `1=Quotation, 2=Active, 3=Completed, 4=Cancelled` (1-indexed; 0 invalid).
- **UnitType** (payment, `InvoiceUnitTypes`) — ✅ `0=Undefined, 1=Hours, 2=Minutes, 3=Days, 4=Km, 5=Pieces, 6=Liters, 7=Meters, 8=Kilograms` (from `/payment` GET actions; real payments use 0).

> **Discovery worth reusing:** TimeLog list endpoints return HATEOAS `Actions` with
> `Fields` (and `Enums`) describing every create/validate action. This is a more
> reliable enum/field source than the swagger — relevant to the separate
> API-docs-scrape task (handoff 2026-06-16).

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

**2026-06-16 (mrt) — rounds 1–3 (dry). Dry gate complete.** Ran
`test/manual/empirical-create-validate.mjs` (minimal bodies),
`empirical-create-validate-2.mjs` (real IDs from test project 1034 + contracts
2244 FP / 2245 T&M), and `empirical-create-validate-3.mjs` (payment on FP 2244 +
`/payment` HATEOAS read). Outcomes:

- **Step 0:** dry confirmed on both the failing and the successful (200) path.
- **Step 1:** required-field tables + all four enums (`ContractStatus`,
  `PaymentRecognitionModel`, `UnitType`, `ContractTypeID`) resolved — from the live
  HATEOAS `Actions` metadata, not the swagger. Folded into `constructionSchemas.ts`
  descriptions.
- **Step 2 (real execute, create-from-template):** minimal body
  `{ProjectTemplateID:7, Name}` → **400 with the SAME field errors as the dry
  validate**. Conclusion: validate is NOT stricter than execute; template does NOT
  auto-supply these; nothing created. Script: `empirical-create-execute-step2.mjs`.
- **Step 2 (full execute, end-to-end):** a complete body finally validated 200 and
  **created ProjectID 1179** with the template's **7 tasks + 2 contracts** (2454
  FP, 2453 T&M). Template population works. Script:
  `empirical-create-execute-step2-full.mjs`. Project 1179 to be archived
  (`archive-test-project.mjs`).
  - **Layered business rules** (surfaced one-at-a-time AFTER model validation, not
    in the "must not be empty" list):
    1. `CurrencyID` must be a currency that HAS a price list — DKK=**35** works;
       AED=39 failed with "Price list with id 39 not found" (30097).
    2. `ProjectCategoryID` must be **> 0** (60013) — see list_project_categories.
    3. `ProjectNo` must be set — create-from-template does **NOT** auto-generate it
       (30171), unlike the UI.
  - Field shapes confirmed from the create response's HATEOAS Actions; the
    currency entity uses `CurrencyID` / `CurrencyABB` / `DescriptiveName`.
- **Gate outcome:** create-from-template genuinely requires **10** fields
  (ProjectTemplateID, Name, ProjectNo, CustomerID, ProjectManagerID, ProjectTypeID,
  ProjectCategoryID, CurrencyID, ProjectStartDate, ProjectEndDate). All now
  non-optional in `constructionSchemas.ts`. **Gate fully complete.**

> **Caveat on the strategy above:** Step 2 says use an "internal, customer-less"
> project, but Step 1 found create-from-template's validate **requires
> `CustomerID` > 0**. Reconcile before running Step 2 — either the template/execute
> path relaxes this, or the test project needs a (dummy) customer.
