# Contract — TimeLog REST API v1

> Scraped from docs.timelog.com/rest on 2026-06-16, diffed against
> `timelog-api-spec.json`. See [README](./README.md) and
> [../../CONTEXT.md](../../CONTEXT.md).

The Phase 2 financial core. A [Contract](../../CONTEXT.md) (a "project sub
contract") belongs to a [Project](../../CONTEXT.md) — a project can hold several,
one of which is the *main* contract. Each contract carries a budget, a status,
billing/expense flags and a set of hourly rates. There are **five contract
TYPES**, each with its own dedicated create endpoint plus a matching validate
(dry-run) endpoint:

1. Fixed Price Basic
2. Prepaid Services
3. Task Driven Revenue
4. Time & Material — Account with End Balancing
5. Time & Material — Basic

This family spans three docs services, documented here as three `##` sections:
**Contract Model** (lookup of available contract models), **Project Sub
Contract** (the actual contract get/create endpoints), and **Contract Hourly
Rate** (the rates attached to a contract).

Runtime base URL (this tenant):
`https://app5.timelog.com/ingholtconsult2/api`. All paths below are
`/v{version}/…` where `version` is a path param, currently `v1`.

⚠️ **Read across the whole family before trusting any create body.** Every
create/validate endpoint here shows **all fields optional** in both the docs
site and the swagger, and **no enum** (`ContractModelType`, `ContractStatus`,
`ContractHourlyRateCreateCategory`) carries a value→label mapping. Per ADR 0005
this is exactly the situation that has lied before — see the gate section.

---

## Contract Model

> Docs service: `https://docs.timelog.com/rest/service/contractmodel`
> "Service for handling contract models in TimeLog."

A **contract model** is the catalogue entry that defines a contract's
behaviour/type. The five create endpoints in Project Sub Contract correspond to
contract models; `ContractTypeID` on a create body and `ContractModelType` on a
read body refer back into this catalogue.

### GET /v{version}/ContractModel
- **Purpose:** Get all contract models (the catalogue of selectable models).
- **Docs:** https://docs.timelog.com/rest/method/contractmodel_getall
- **Response model:** `ContractModelApiReadModel`
- **Params (path):**

  | Param | Type | Required | Notes |
  |---|---|---|---|
  | version | string | Yes | API version (`v1`). |

- **Read fields (`ContractModelApiReadModel`):**

  | Field | Type | Notes |
  |---|---|---|
  | ContractModelID | int | Contract model identifier. |
  | Name | string | Display name of the contract model. |

- **Response:** list. The docs call it "a list of contract models". Apply the
  usual TAFList wrapping —
  `{ Properties: { TotalRecord, TotalPage, PageNumber }, Entities: [ { Properties: { …ContractModelApiReadModel } } ], Links }`.
  ⚠️ **Paging:** without `$pagesize` a list silently returns only the first
  **10** rows even when `TotalRecord` is higher. Pass `$page`, `$pagesize`,
  `$expand` to page/expand. (The catalogue is likely short, but the convention
  still applies — confirm at the gate.)
- **Errors:** 401 invalid auth token; 500 "Request to GetAll has failed".
- **Quirks:** No `projectID`/filter param — this is a tenant-wide catalogue, not
  a per-project list. Pair with the create endpoints to map a model to its
  create body.

---

## Project Sub Contract

> Docs service: `https://docs.timelog.com/rest/service/projectsubcontract`
> "Service for handling contracts in TimeLog."

This is where contracts are actually read and created. Two read endpoints
(by project, by id), five typed create endpoints (each with a validate
twin), and one recurring-payment-plan update (also with a validate twin).

> **Read vs write naming.** Reads return a `Contract` model whose ID is
> `ContractID` and whose type is `ContractModelType`. Writes take per-type
> create models keyed on `ContractTypeID` (no `ContractModelType` field on the
> body). The read model has **no** create-only fields (budgets, owner, rates),
> so to read back a freshly created contract's full shape you must GET it.

### GET /v{version}/contract
- **Purpose:** Get all contracts for one project.
- **Docs:** https://docs.timelog.com/rest/method/projectsubcontract_getallbyprojectid
- **Response model:** `ProjectSubContractApiReadModel`
- **Params (query):**

  | Param | Type | Required | Notes |
  |---|---|---|---|
  | projectID | int | Yes | The [Project](../../CONTEXT.md) whose contracts to list. Required (swagger marks it required; docs page implies it). |
  | version | string | Yes | API version (`v1`). |

- **Read fields (`ProjectSubContractApiReadModel`):**

  | Field | Type | Notes |
  |---|---|---|
  | ContractID | int | Numeric contract identifier (use for path on get-by-id). |
  | ContractGuid | uuid | GUID identifier. |
  | ContractModelType | int (enum 1–8, 20) | Contract model type. Labels undocumented — gate. |
  | ProjectID | int | Owning project. |
  | IsMainContract | bool | Whether this is the project's main contract. |
  | ContractName | string | |
  | ContractStatus | int (enum 1–4) | Labels undocumented — gate. |
  | IsMileageBillable | bool | |
  | IsDefaultExpenses | bool | |
  | ContractTypeID | int | Type identifier (no docs description). Relation to `ContractModelType` unclear — gate. |
  | ContractTypeName | string | Human-readable type name (no docs description). |

- **Enums:** `ContractModelType` (values `[1,2,3,4,5,6,7,8,20]`) and
  `ContractStatus` (values `[1,2,3,4]`) — docs page provides **no** value→label
  mapping for either. Label undocumented — gate.
- **Response:** TAFList wrapping —
  `{ Properties: { TotalRecord, TotalPage, PageNumber }, Entities: [ { Properties: { …ProjectSubContractApiReadModel } } ], Links }`.
  ⚠️ **Paging:** without `$pagesize` the list silently returns only the first
  **10** rows even when `TotalRecord` is higher. Pass `$page`, `$pagesize`,
  `$expand` to page/expand.
- **Errors:** 401 invalid auth token; 500 request processing failure.
- **Quirks:** Path is `/contract` (not `/contract/get-all`); the project is a
  **query** param, not a path segment.

---

### GET /v{version}/contract/{contractID}
- **Purpose:** Get a single contract by its numeric contract identifier.
- **Docs:** https://docs.timelog.com/rest/method/projectsubcontract_getbyid
- **Response model:** `ProjectSubContractApiReadModel`
- **Params (path):**

  | Param | Type | Required | Notes |
  |---|---|---|---|
  | contractID | int | Yes | Numeric `ContractID` (not the GUID). |
  | version | string | Yes | API version (`v1`). |

- **Response:** single-resource wrapping —
  `{ Properties: { …ProjectSubContractApiReadModel }, Links, Actions }`. Fields
  and enum caveats as in the `ProjectSubContractApiReadModel` table above.
- **Errors:** 401 invalid auth token; 500 "Contract with the ID does not exist".
- **Quirks:** Same `ContractModelType` / `ContractStatus` unlabelled-enum caveat
  as get-all.

---

### POST /v{version}/contract/create-fixed-price-basic-contract
- **Purpose:** Create a **Fixed Price Basic** contract for a specified project.
- **Docs:** https://docs.timelog.com/rest/method/projectsubcontract_fixedpricebasiccontractcreate
- **Request model:** `FixedPriceBasicContractApiCreateModel`

  | Field | Type | Required (docs) | Notes |
  |---|---|---|---|
  | ProjectID | int | Not specified ⚠️ | Owning project. Likely required in practice — gate. |
  | ContractName | string | Not specified ⚠️ | |
  | ContractStatus | int (enum 1–4) | Not specified ⚠️ | Labels undocumented — gate. |
  | ContractOwnerUserID | int | Not specified ⚠️ | UserID of the contract owner. |
  | ContractTypeID | int | Not specified ⚠️ | Contract type ID (selects the model). Likely required — gate. |
  | BudgetWorkAmount | double | Not specified ⚠️ | |
  | BudgetWorkHour | double | Not specified ⚠️ | |
  | BudgetExpensesAmount | double | Not specified ⚠️ | |
  | BudgetTravelAmount | double | Not specified ⚠️ | |
  | TargetHourlyRate | double | Not specified ⚠️ | |
  | PaymentPlanAmount | double | Not specified ⚠️ | |
  | RevenueExprAmount | double | Not specified ⚠️ | "Revenue expr amount" (sic — likely revenue/expense split). |
  | RevenueTravelAmount | double | Not specified ⚠️ | |
  | IsExpensesLinked | bool | Not specified ⚠️ | Expenses linked to revenue distribution. |
  | IsTravelLinked | bool | Not specified ⚠️ | Travel linked to revenue distribution. |
  | HasCompletionNotification | bool | Not specified ⚠️ | |
  | CompletionNotificationPercentage | double | Not specified ⚠️ | |
  | IsMileageBillable | bool | Not specified ⚠️ | |
  | IsDefaultExpenses | bool | Not specified ⚠️ | |

  ⚠️ Required fields unconfirmed — docs/swagger claim all-optional, but ADR 0005
  precedent shows this is often false. Resolve via the empirical gate
  (`docs/runbooks/empirical-put-test.md`); do not trust.
- **Enums (`ContractStatus`):** values `[1,2,3,4]`; no value→label mapping in the
  docs. Label undocumented — gate.
- **Response:** 200 "Contract was created successfully"; on failure the
  documented body is the standard error model (Code, Details, DeveloperNote,
  Message, Parameters, Url). No created-entity model is documented — to obtain
  the new `ContractID`/`ContractGuid` you likely need a follow-up
  `GET /contract?projectID=…`.
- **Params (path):** `version` (string, `v1`).
- **Errors:** 401 invalid auth token; 500 "Contract could not be created".
- **Quirks:** This and **Task Driven Revenue** share an identical body shape
  (budgets + revenue split + payment plan); the distinction is `ContractTypeID`.

---

### POST /v{version}/contract/validate-fixed-price-basic-contract
- **Purpose:** Dry-run validate a would-be Fixed Price Basic contract without
  creating it.
- **Docs:** https://docs.timelog.com/rest/method/projectsubcontract_fixedpricebasiccontractvalidate
- **Request model:** `FixedPriceBasicContractApiCreateModel` (identical body to
  the create endpoint above — same fields, same ⚠️ required-unconfirmed and
  `ContractStatus` enum caveats).
- **Response:** 200 (validation succeeded); error model on failure.
- **Errors:** 401 invalid auth token; 500 contract could not be validated.
- **Quirks:** Validate twin of `create-fixed-price-basic-contract`. ⚠️ Swagger
  path slug for the validate endpoints is inferred from the create slugs ("each
  create-* has a matching validate-*"); confirm the exact runtime path at the
  gate. Docs method slug is `projectsubcontract_fixedpricebasiccontractvalidate`.

---

### POST /v{version}/contract/create-prepaid-services-contract
- **Purpose:** Create a **Prepaid Services** contract for a specified project.
- **Docs:** https://docs.timelog.com/rest/method/projectsubcontract_prepaidservicescontractcreate
- **Request model:** `PrepaidServicesContractApiCreateModel`

  | Field | Type | Required (docs) | Notes |
  |---|---|---|---|
  | ProjectID | int | Not specified ⚠️ | Owning project. Likely required — gate. |
  | ContractName | string | Not specified ⚠️ | |
  | ContractStatus | int (enum 1–4) | Not specified ⚠️ | Labels undocumented — gate. |
  | ContractOwnerUserID | int | Not specified ⚠️ | |
  | ContractTypeID | int | Not specified ⚠️ | Likely required — gate. |
  | BudgetWorkAmount | double | Not specified ⚠️ | |
  | BudgetWorkHour | double | Not specified ⚠️ | |
  | IsFixedHourlyRate | bool | Not specified ⚠️ | Whether the hourly rate is fixed. |
  | HourlyRatePrice | double | Not specified ⚠️ | |
  | HourlyRateName | string | Not specified ⚠️ | |
  | HasCompletionNotification | bool | Not specified ⚠️ | |
  | CompletionNotificationPercentage | double | Not specified ⚠️ | |
  | IsMileageBillable | bool | Not specified ⚠️ | |
  | IsDefaultExpenses | bool | Not specified ⚠️ | |

  ⚠️ Required fields unconfirmed — docs/swagger claim all-optional, but ADR 0005
  precedent shows this is often false. Resolve via the empirical gate
  (`docs/runbooks/empirical-put-test.md`); do not trust.
- **Enums (`ContractStatus`):** values `[1,2,3,4]`; label undocumented — gate.
- **Response:** 200 "Contract created successfully"; error model on failure. No
  created-entity model documented — fetch via `GET /contract?projectID=…`.
- **Params (path):** `version` (string, `v1`).
- **Errors:** 401 invalid auth token; 500 "Contract could not be created".
- **Quirks:** Only contract type that carries inline hourly-rate fields
  (`IsFixedHourlyRate`, `HourlyRatePrice`, `HourlyRateName`) on its create body;
  has **no** budget travel/expenses or revenue-split fields.

---

### POST /v{version}/contract/validate-prepaid-services-contract
- **Purpose:** Dry-run validate a would-be Prepaid Services contract.
- **Docs:** https://docs.timelog.com/rest/method/projectsubcontract_prepaidservicescontractvalidate
- **Request model:** `PrepaidServicesContractApiCreateModel` (identical to create
  above — same ⚠️ caveats).
- **Response:** 200; error model on failure.
- **Errors:** 401 invalid auth token; 500 contract could not be validated.
- **Quirks:** Validate twin. Runtime `validate-*` path inferred — confirm at gate.

---

### POST /v{version}/contract/create-task-driven-revenue-contract
- **Purpose:** Create a **Task Driven Revenue** contract for a specified project.
- **Docs:** https://docs.timelog.com/rest/method/projectsubcontract_taskdrivenrevenuecontractcreate
- **Request model:** `TaskDrivenRevenueContractApiCreateModel` — **identical
  field shape to `FixedPriceBasicContractApiCreateModel`** (ProjectID,
  ContractName, ContractStatus(enum 1–4), ContractOwnerUserID, ContractTypeID,
  BudgetWorkAmount, BudgetWorkHour, BudgetExpensesAmount, BudgetTravelAmount,
  TargetHourlyRate, PaymentPlanAmount, RevenueExprAmount, RevenueTravelAmount,
  IsExpensesLinked, IsTravelLinked, HasCompletionNotification,
  CompletionNotificationPercentage, IsMileageBillable, IsDefaultExpenses). See
  the Fixed Price Basic table for per-field notes.

  ⚠️ Required fields unconfirmed — docs/swagger claim all-optional, but ADR 0005
  precedent shows this is often false. Resolve via the empirical gate
  (`docs/runbooks/empirical-put-test.md`); do not trust.
- **Enums (`ContractStatus`):** values `[1,2,3,4]`; label undocumented — gate.
- **Response:** 200 "Contract was created successfully"; error model on failure.
- **Params (path):** `version` (string, `v1`).
- **Errors:** 401 invalid auth token; 500 "Contract could not be created".
- **Quirks:** Same body as Fixed Price Basic — the type is distinguished only by
  the endpoint (and presumably `ContractTypeID`). Confirm which `ContractTypeID`
  value belongs to which endpoint at the gate.

---

### POST /v{version}/contract/validate-task-driven-revenue-contract
- **Purpose:** Dry-run validate a would-be Task Driven Revenue contract.
- **Docs:** https://docs.timelog.com/rest/method/projectsubcontract_taskdrivenrevenuecontractvalidate
- **Request model:** `TaskDrivenRevenueContractApiCreateModel` (identical to
  create above — same ⚠️ caveats).
- **Response:** 200; error model on failure.
- **Errors:** 401 invalid auth token; 500 contract could not be validated.
- **Quirks:** Validate twin. Runtime `validate-*` path inferred — confirm at gate.

---

### POST /v{version}/contract/create-time-material-account-end-balancing-contract
- **Purpose:** Create a **Time & Material — Account with End Balancing** contract
  for a specified project.
- **Docs:** https://docs.timelog.com/rest/method/projectsubcontract_timematerialaccountendbalancingcontractcreate
- **Request model:** `TimeMaterialAccountEndBalancingContractApiCreateModel`

  | Field | Type | Required (docs) | Notes |
  |---|---|---|---|
  | ProjectID | int | Not specified ⚠️ | Owning project. Likely required — gate. |
  | ContractName | string | Not specified ⚠️ | |
  | ContractStatus | int (enum 1–4) | Not specified ⚠️ | Labels undocumented — gate. |
  | ContractOwnerUserID | int | Not specified ⚠️ | |
  | ContractTypeID | int | Not specified ⚠️ | Likely required — gate. |
  | BudgetWorkAmount | double | Not specified ⚠️ | |
  | BudgetWorkHour | double | Not specified ⚠️ | |
  | BudgetExpensesAmount | double | Not specified ⚠️ | |
  | BudgetTravelAmount | double | Not specified ⚠️ | |
  | HasBudgetOverrunNotification | bool | Not specified ⚠️ | Whether the contract has budget-overrun notification. |
  | HasCompletionNotification | bool | Not specified ⚠️ | |
  | CompletionNotificationPercentage | double | Not specified ⚠️ | |
  | IsMileageBillable | bool | Not specified ⚠️ | |
  | IsDefaultExpenses | bool | Not specified ⚠️ | |

  ⚠️ Required fields unconfirmed — docs/swagger claim all-optional, but ADR 0005
  precedent shows this is often false. Resolve via the empirical gate
  (`docs/runbooks/empirical-put-test.md`); do not trust.
- **Enums (`ContractStatus`):** values `[1,2,3,4]`; label undocumented — gate.
- **Response:** 200 "Contract was created successfully"; error model on failure.
- **Params (path):** `version` (string, `v1`).
- **Errors:** 401 invalid auth token; 500 "Contract could not be created".
- **Quirks:** Body is identical to **Time & Material Basic** (budgets +
  `HasBudgetOverrunNotification`); no revenue-split or payment-plan fields. The
  two T&M types differ only by endpoint / `ContractTypeID`.

---

### POST /v{version}/contract/validate-time-material-account-end-balancing-contract
- **Purpose:** Dry-run validate a would-be T&M Account-with-End-Balancing contract.
- **Docs:** https://docs.timelog.com/rest/method/projectsubcontract_timematerialaccountendbalancingcontractvalidate
- **Request model:** `TimeMaterialAccountEndBalancingContractApiCreateModel`
  (identical to create above — same ⚠️ caveats).
- **Response:** 200; error model on failure.
- **Errors:** 401 invalid auth token; 500 contract could not be validated.
- **Quirks:** Validate twin. Runtime `validate-*` path inferred — confirm at gate.

---

### POST /v{version}/contract/create-time-material-basic-contract
- **Purpose:** Create a **Time & Material — Basic** contract for a specified
  project.
- **Docs:** https://docs.timelog.com/rest/method/projectsubcontract_timematerialbasiccontractcreate
- **Request model:** `TimeMaterialBasicContractApiCreateModel` — **identical
  field shape to `TimeMaterialAccountEndBalancingContractApiCreateModel`**
  (ProjectID, ContractName, ContractStatus(enum 1–4), ContractOwnerUserID,
  ContractTypeID, BudgetWorkAmount, BudgetWorkHour, BudgetExpensesAmount,
  BudgetTravelAmount, HasBudgetOverrunNotification, HasCompletionNotification,
  CompletionNotificationPercentage, IsMileageBillable, IsDefaultExpenses). See
  the Account-End-Balancing table for per-field notes.

  ⚠️ Required fields unconfirmed — docs/swagger claim all-optional, but ADR 0005
  precedent shows this is often false. Resolve via the empirical gate
  (`docs/runbooks/empirical-put-test.md`); do not trust.
- **Enums (`ContractStatus`):** values `[1,2,3,4]`; label undocumented — gate.
- **Response:** 200 "Contract creation succeeded"; error model on failure.
- **Params (path):** `version` (string, `v1`).
- **Errors:** 401 invalid auth token; 500 "Contract could not be created".
- **Quirks:** Same body as Account-with-End-Balancing — distinguished only by
  endpoint / `ContractTypeID`.

---

### POST /v{version}/contract/validate-time-material-basic-contract
- **Purpose:** Dry-run validate a would-be T&M Basic contract.
- **Docs:** https://docs.timelog.com/rest/method/projectsubcontract_timematerialbasiccontractvalidate
- **Request model:** `TimeMaterialBasicContractApiCreateModel` (identical to
  create above — same ⚠️ caveats).
- **Response:** 200; error model on failure.
- **Errors:** 401 invalid auth token; 500 contract could not be validated.
- **Quirks:** Validate twin. Runtime `validate-*` path inferred — confirm at gate.

---

### POST /v{version}/contract/update-recurring-contract-payment-plan-amount
- **Purpose:** Update the payment-plan amount on a **recurring** contract only.
- **Docs:** https://docs.timelog.com/rest/method/projectsubcontract_recurringcontractpaymentplanamountupdate
- **Request model:** `RecurringPaymentPlanAmountUpdateModel`

  | Field | Type | Required (docs) | Notes |
  |---|---|---|---|
  | ProjectId | int | Not specified ⚠️ | Docs description sloppily calls it "projectNo for the entity" — it is the project identifier. Likely required — gate. |
  | ProjectSubContractId | int | Not specified ⚠️ | The contract to update. Likely required — gate. |
  | PaymentPlanAmount | double | Not specified ⚠️ | Docs description erroneously says "value of the hourly rate" (copy-paste from hourly-rate model) — it is the payment-plan amount. |

  ⚠️ Required fields unconfirmed — docs/swagger claim all-optional, but ADR 0005
  precedent shows this is often false. Resolve via the empirical gate
  (`docs/runbooks/empirical-put-test.md`); do not trust.
- **Response:** 200 "Payment plan amount was updated successfully"; error model
  on failure.
- **Params (path):** `version` (string, `v1`).
- **Errors:** 401 invalid auth token; 500 "Payment plan could not be updated".
- **Quirks:** Note the casing — `ProjectId` / `ProjectSubContractId` (lower `d`),
  unlike the read model's `ProjectID` / `ContractID`. Applies to **recurring**
  contracts only; behaviour on a non-recurring contract is undocumented — gate.
  Has its own validate twin (below). This is **not** a generic contract update;
  there is no full PUT-replace contract-update endpoint in this service.

---

### POST /v{version}/contract/validate-update-recurring-contract-payment-plan-amount
- **Purpose:** Dry-run validate a recurring payment-plan-amount update.
- **Docs:** https://docs.timelog.com/rest/method/projectsubcontract_recurringcontractpaymentplanamountupdatevalidate
- **Request model:** `RecurringPaymentPlanAmountUpdateModel` (identical to the
  update endpoint above — same ⚠️ caveats and casing note).
- **Response:** 200; error model on failure.
- **Errors:** 401 invalid auth token; 500 payment plan could not be validated.
- **Quirks:** Validate twin of `update-recurring-contract-payment-plan-amount`.
  Runtime `validate-*` path inferred from the create/validate convention —
  confirm the exact path at the gate. Docs method slug is
  `projectsubcontract_recurringcontractpaymentplanamountupdatevalidate`.

---

## Contract Hourly Rate

> Docs service: `https://docs.timelog.com/rest/service/contracthourlyrate`
> "Service for handling hourly rates in TimeLog."

The hourly rates attached to a contract (project sub contract). Two read
endpoints (by contract, by id) and a create/validate pair.

### GET /v{version}/contract-hourly-rate
- **Purpose:** Get all hourly rates for one contract.
- **Docs:** https://docs.timelog.com/rest/method/contracthourlyrate_getallbycontractid
- **Response model:** `ContractHourlyRateApiReadModel`
- **Params (query):**

  | Param | Type | Required | Notes |
  |---|---|---|---|
  | contractID | int | Yes | The contract whose rates to list. |
  | version | string | Yes | API version (`v1`). |

- **Read fields (`ContractHourlyRateApiReadModel`):**

  | Field | Type | Notes |
  |---|---|---|
  | ContractHourlyRateID | int | Numeric rate identifier (use for get-by-id). |
  | ContractHourlyRateGUID | uuid | GUID identifier. |
  | ProjectSubContractID | int | Owning contract. |
  | Name | string | Rate name. **Read-side name is `Name`**; written as `ContractHourlyRateName`. |
  | Amount | double | Rate value. **Read-side name is `Amount`**; written as `ContractHourlyRateValue`. |
  | Type | string | Rate type/category as a string. **Read side is a string `Type`**; written as the numeric `ContractHourlyRateCreateCategory` enum. |
  | ContractSpecificHourlyRateID | int | |
  | IsActive | bool | |
  | IsManuallyAdjusted | bool | |
  | ProductNo | string | Product number. **Same name on read and write** (`ProductNo`). |
  | CurrencyISO | string | Currency ISO code. |

- **Response:** the docs call it an array of `ContractHourlyRate`. Apply TAFList
  wrapping —
  `{ Properties: { TotalRecord, TotalPage, PageNumber }, Entities: [ { Properties: { …ContractHourlyRateApiReadModel } } ], Links }`.
  ⚠️ **Paging:** without `$pagesize` the list silently returns only the first
  **10** rows even when `TotalRecord` is higher. Pass `$page`, `$pagesize`,
  `$expand` to page/expand.
- **Errors:** 401 invalid auth token; 500 "Request to GetAllByContractID has
  failed".
- **Quirks:** Path is `/contract-hourly-rate` (contract is a **query** param);
  the by-id sibling uses `/contract-hourly-rate/get-by-id`. Read/write naming
  mismatch — `Name`↔`ContractHourlyRateName`, `Amount`↔`ContractHourlyRateValue`,
  string `Type`↔numeric `ContractHourlyRateCreateCategory`.

---

### GET /v{version}/contract-hourly-rate/get-by-id
- **Purpose:** Get a single hourly rate by its numeric identifier.
- **Docs:** https://docs.timelog.com/rest/method/contracthourlyrate_getbyid
- **Response model:** `ContractHourlyRateApiReadModel`
- **Params (query):**

  | Param | Type | Required | Notes |
  |---|---|---|---|
  | contractHourlyRateID | int | Yes | Numeric `ContractHourlyRateID` (not the GUID). |
  | version | string | Yes | API version (`v1`). |

- **Response:** single-resource wrapping —
  `{ Properties: { …ContractHourlyRateApiReadModel }, Links, Actions }`. Fields as
  in the read-model table above.
- **Errors:** 401 invalid auth token; 500 "Request to GetByID has failed".
- **Quirks:** Note the id is a **query** param (`get-by-id?contractHourlyRateID=…`),
  not a path segment — unlike `contract/{contractID}` in the Project Sub Contract
  service.

---

### POST /v{version}/contract-hourly-rate/create-hourly-rate
- **Purpose:** Create an hourly rate on a contract. Per docs, the rate is created
  **only if** no existing standard rate with the same amount and name already
  exists; if created, it takes the type/category from
  `ContractHourlyRateCreateCategory`.
- **Docs:** https://docs.timelog.com/rest/method/contracthourlyrate_createhourlyrate
- **Request model:** `ContractHourlyRateApiCreateModel`

  | Field | Type | Required (docs) | Notes |
  |---|---|---|---|
  | ProjectId | int | Not specified ⚠️ | Owning project. Likely required — gate. |
  | ProjectSubContractId | int | Not specified ⚠️ | Owning contract. Likely required — gate. |
  | ContractHourlyRateCreateCategory | int (enum 1–3) | Not specified ⚠️ | Rate type/category. Labels undocumented — gate. |
  | ContractHourlyRateName | string | Not specified ⚠️ | Written name; read as `Name`. |
  | ContractHourlyRateValue | double | Not specified ⚠️ | Written name; read as `Amount`. |
  | ProductNo | string | Not specified ⚠️ | Product number. |

  ⚠️ Required fields unconfirmed — docs/swagger claim all-optional, but ADR 0005
  precedent shows this is often false. Resolve via the empirical gate
  (`docs/runbooks/empirical-put-test.md`); do not trust.
- **Enums (`ContractHourlyRateCreateCategory`):** values `[1,2,3]`; no value→label
  mapping in the docs. Label undocumented — gate.
- **Response:** 200 "Contract hourly rate created successfully"; error model on
  failure. No created-entity model documented.
- **Params (path):** `version` (string, `v1`).
- **Errors:** 401 invalid auth token; 500 request failure (error model).
- **Quirks:** Casing — `ProjectId` / `ProjectSubContractId` (lower `d`), matching
  the recurring-update model and unlike the read model. De-dupe behaviour
  (skip-if-existing) means a 200 does not guarantee a *new* row was created —
  confirm how to detect this at the gate.

---

### POST /v{version}/contract-hourly-rate/validate-hourly-rate
- **Purpose:** Dry-run validate a would-be hourly rate without creating it.
- **Docs:** https://docs.timelog.com/rest/method/contracthourlyrate_validatehourlyrate
- **Request model:** `ContractHourlyRateApiCreateModel` (identical body to
  create-hourly-rate above — same fields, same ⚠️ required-unconfirmed and
  `ContractHourlyRateCreateCategory` enum caveats).
- **Response:** 200; error model on failure.
- **Errors:** 401 invalid auth token; 500 request failure.
- **Quirks:** Validate twin of `create-hourly-rate`. Same skip-if-existing note.

---

## For the empirical gate

- **All Contract create/validate fields are claimed optional.** Every create-*
  and validate-* endpoint (five contract types ×2, the recurring-payment-plan
  update ×2, and the hourly-rate create ×2) shows **every** field as "Not
  specified"/optional in both the docs site and swagger. ADR 0005 precedent: a
  field marked optional caused a 400 on a partial PUT. Hypothesis: at minimum
  `ProjectID`, `ContractName`, and `ContractTypeID` are required on each contract
  create; `ProjectId`/`ProjectSubContractId` on the hourly-rate create and the
  recurring update; `ContractHourlyRateValue`/`ContractHourlyRateName` on the
  hourly-rate create. Confirm the actual required set per endpoint against the
  live API.
- **`ContractModelType` enum 1–8, 20 has no labels.** Read model
  (`ProjectSubContractApiReadModel`) returns `ContractModelType` as one of
  `[1,2,3,4,5,6,7,8,20]` with no documented mapping. Hypothesis: these enumerate
  the contract models (the five public create types plus internal/legacy ones;
  value 20 is suspiciously out-of-sequence). Map value→label via
  `GET /ContractModel` and the TimeLog UI.
- **`ContractStatus` enum 1–4 has no labels.** Present on the read model and all
  five contract create bodies; values `[1,2,3,4]`, no mapping. Hypothesis: maps
  to states like Draft/Open/Closed/Cancelled. Confirm value→label against the
  live API / UI. (Distinct from Project's `ProjectStatus` enum 0–6 in
  [project.md](./project.md) — do not conflate.)
- **`ContractHourlyRateCreateCategory` enum 1–3 has no labels.** On the
  hourly-rate create/validate body; values `[1,2,3]`, no mapping. The read model
  returns the category as a free-string `Type` instead. Hypothesis: the three
  numeric categories correspond to the `Type` strings (e.g. standard / contract-
  specific / employee). Confirm the numeric→string correspondence at the gate.
- **`ContractTypeID` meaning and per-endpoint values.** Appears on every contract
  create body and on the read model, with no docs description, alongside the
  separate `ContractModelType`. Hypothesis: `ContractTypeID` selects the model
  for a create and each typed endpoint expects a specific value (so posting the
  wrong `ContractTypeID` to a given create endpoint may fail or be ignored).
  Confirm which `ContractTypeID` value pairs with which create endpoint, and how
  it relates to `ContractModelType`/`ContractModelID`.
- **Validate-endpoint runtime paths are inferred.** The docs service page lists
  validate endpoints by docs method slug only; the runtime `validate-*` paths
  here are inferred from the matching `create-*` paths ("each create-* has a
  matching validate-* with the same body model"). Confirm the exact runtime path
  for each validate endpoint against the live API / swagger.
- **Create endpoints return no created entity.** All contract and hourly-rate
  create endpoints document only a 200 success message and the error model — no
  body carrying the new `ContractID`/`ContractGuid`/`ContractHourlyRateID`.
  Hypothesis: the new identifier must be fetched via a follow-up
  `GET /contract?projectID=…` or `GET /contract-hourly-rate?contractID=…`.
  Confirm whether any identifier is returned in the create response.
- **Recurring-update scope.** `update-recurring-contract-payment-plan-amount`
  states it applies to recurring contracts "only". Confirm behaviour when called
  against a non-recurring contract (error vs no-op), and that `ProjectId` +
  `ProjectSubContractId` together (not `ContractID` alone) are the correct keys.
- **Hourly-rate skip-if-existing.** Create/validate "only create if an existing
  standard rate with the same amount and name does not exist". Confirm how the
  caller can tell whether a new rate was actually created vs. silently skipped
  (the 200 response carries no entity).
- **Field-name read/write mismatches (hourly rate).** Read `Name`/`Amount`/string
  `Type` ↔ write `ContractHourlyRateName`/`ContractHourlyRateValue`/numeric
  `ContractHourlyRateCreateCategory`; `ProductNo` is shared. Confirm a
  read-modify-write loop maps these correctly.
- **Casing inconsistency.** Write models use `ProjectId`/`ProjectSubContractId`
  (lower `d`) while read models use `ProjectID`/`ContractID`/`ProjectSubContractID`.
  Confirm the API is case-sensitive on these JSON keys (a wrong-cased key could be
  silently dropped — exactly the ADR 0005 failure mode).
