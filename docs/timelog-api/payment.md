# Payment — TimeLog REST API v1

> Scraped from docs.timelog.com/rest on 2026-06-16, diffed against
> `timelog-api-spec.json`. See [README](./README.md) and
> [../../CONTEXT.md](../../CONTEXT.md).

Service for handling **payments** (installments / invoice lines) on a
[Contract](../../CONTEXT.md). A Payment belongs to a Contract — modelled here as
the **ProjectSubContract** (`ProjectSubContractID`) — and can additionally
reference a [Task](../../CONTEXT.md) (`TaskID`) and a Product
(`ProductNumber` on write / `ProductNumberID` on read). Payments are the
billable line items that drive invoicing (`IsReadyForInvoicing`,
`IsFixedPricePayment`). This is part of the Phase 2 financial core.

Runtime base URL (this tenant):
`https://app5.timelog.com/ingholtconsult2/api`. All paths below are
`/v{version}/…` where `version` is a path param, currently `v1`.

**Read vs write field mismatch (important):** the create model and the read
model are **not symmetric**. Create takes `ProductNumber` (string) and
`DiscountPercentage` (double); read returns `ProductNumberID` (int) and
`Discount` (double), plus read-only fields not present on create
(`InstallmentType`, `Rate`, `ExpensesCost`, `PaymentID`, `PaymentGuid`). A
read-modify-write loop therefore cannot round-trip these fields directly — see
the gate section.

**Related (separate services):** **Payment-method** and **Payment-term** are
their own services (index-only; not documented here). The swagger groups two
small read models with payment, but they are distinct services — cross-link only,
do not document them in this file.

## Endpoints

### GET /v{version}/payment
- **Purpose:** Get all payments by contract ID — every Payment on one Contract
  (`contractID`).
- **Docs:** https://docs.timelog.com/rest/method/payment_getallbycontractid
- **Response model:** `PaymentApiReadModel`
- **Params (query):**

  | Param | Type | Required | Notes |
  |---|---|---|---|
  | contractID | int | **Yes** | Contract ID. The contract here is the [ProjectSubContract](../../CONTEXT.md) (`ProjectSubContractID`). |
  | version | string | Yes | API version path param (`v1`). |

- **Response:** Single-resource/list wrapping per CONTEXT.md conventions. The
  docs do not state whether this returns a TAFList wrapper or a bare array.
  ⚠️ **Paging:** if this is a TAFList, without `$pagesize` the list silently
  returns only the first **10** rows even when `TotalRecord` is higher; pass
  `$page`, `$pagesize`, `$expand`. Confirm the wrapper shape against the live API.
- **Read fields (`PaymentApiReadModel`):**

  | Field | Type | Notes |
  |---|---|---|
  | PaymentID | int | Numeric payment identifier (use for path on get-by-id). |
  | PaymentGuid | uuid | GUID identifier. Read-only; not on create model. |
  | Name | string | Payment name. |
  | Comment | string | |
  | Amount | double | The payment amount. |
  | InvoiceDate | date-time | |
  | IsReadyForInvoicing | bool | Whether this instance is ready for invoicing. |
  | IsFixedPricePayment | bool | Whether the payment is fixed price. |
  | InstallmentType | int (enum 1–3) | **Read-only** — not on create model. Value→label undocumented — gate. |
  | ProjectID | int | |
  | TaskID | int | Optional [Task](../../CONTEXT.md) reference. |
  | ProductNumberID | int | **Read-side is `ProductNumberID` (int)**; written as `ProductNumber` (string) on create. |
  | Discount | double | **Read-side is `Discount`**; written as `DiscountPercentage` on create. |
  | ProjectSubContractID | int | The owning [Contract](../../CONTEXT.md). |
  | Quantity | double | |
  | UnitType | int (enum, see below) | Value→label undocumented — gate. |
  | Rate | double | **Read-only** — not on create model. |
  | ExpensesCost | double | **Read-only** — not on create model. |

- **Enums:**
  - `UnitType` — values `[0,1,2,3,4,6,7,8,9]` (note the **gap: no 5**). Labels
    undocumented — gate.
  - `InstallmentType` — values `[1,2,3]`. Labels undocumented — gate.
- **Errors:** 401 invalid auth token; 500 "Request to GetAllByContractID has
  failed". Error model: `Code`, `Details[]`, `DeveloperNote`, `Message`,
  `Parameters`, `Url`.
- **Quirks:** Payments are scoped to a contract — there is no "get all payments"
  endpoint; you must enumerate by `contractID`.

### GET /v{version}/payment/{paymentID}
- **Purpose:** Get payment by payment ID.
- **Docs:** https://docs.timelog.com/rest/method/payment_getbyid
- **Response model:** `PaymentApiReadModel` (same fields as get-all above).
- **Params (path):**

  | Param | Type | Required | Notes |
  |---|---|---|---|
  | paymentID | int | **Yes** | Payment ID (the numeric `PaymentID`, not the GUID). |
  | version | string | Yes | API version path param (`v1`). |

- **Response:** single-resource wrapping —
  `{ Properties: { …PaymentApiReadModel }, Links, Actions }`.
- **Enums:** `UnitType` and `InstallmentType` as above — labels undocumented — gate.
- **Errors:** 401 invalid auth token; 500 "Payment with the ID does not exist"
  (note: a missing payment surfaces as **500**, not 404). Error model as above.

### POST /v{version}/payment
- **Purpose:** Create a payment for a contract.
- **Docs:** https://docs.timelog.com/rest/method/payment_createpayment
- **Request model:** `PaymentApiCreateModel`
- **Body fields (`PaymentApiCreateModel`):**

  | Field | Type | Required (docs) | Notes |
  |---|---|---|---|
  | Name | string | No ⚠️ | Payment name. |
  | Comment | string | No | |
  | Amount | double | No ⚠️ | The payment amount. |
  | InvoiceDate | date-time | No | |
  | IsReadyForInvoicing | bool | No | Whether ready for invoicing. |
  | IsFixedPricePayment | bool | No | Whether the payment is fixed price. |
  | ProjectID | int | No ⚠️ | |
  | TaskID | int | No | Optional [Task](../../CONTEXT.md) reference. |
  | ProductNumber | string | No | **Write-side is `ProductNumber` (string)**; read returns `ProductNumberID` (int). |
  | DiscountPercentage | double | No | **Write-side is `DiscountPercentage`**; read returns `Discount`. |
  | ProjectSubContractID | int | No ⚠️ | The owning [Contract](../../CONTEXT.md). |
  | Quantity | double | No | |
  | UnitType | int (enum, see below) | No | Value→label undocumented — gate. |
  | version | string | Yes | API version path param (`v1`). |

  ⚠️ **Required fields unconfirmed — docs/swagger claim all-optional, but ADR 0005
  precedent shows this is often false. Resolve via the empirical gate
  (`docs/runbooks/empirical-put-test.md`); do not trust.** Strong candidates
  for actually-required: `ProjectSubContractID` (a payment must belong to a
  contract), `Amount`, and `Name`/`ProjectID`.

  **Not on create model (read-only / server-set):** `PaymentID`, `PaymentGuid`,
  `InstallmentType`, `Rate`, `ExpensesCost` — these appear only on
  `PaymentApiReadModel`. `ProductNumberID` and `Discount` are the read-side names
  for create's `ProductNumber` and `DiscountPercentage`.

- **Enums:**
  - `UnitType` — values `[0,1,2,3,4,6,7,8,9]` (**gap: no 5**). Labels
    undocumented — gate.
- **Response:** 200 "Payment was created successfully". The docs do not document
  a success body model (only the error model). Confirm whether the response
  echoes the created payment (and whether it returns the new `PaymentID`) against
  the live API.
- **Errors:** 401 invalid auth token; 500 "Payment could not be created". Error
  model: `Code`, `Details[]`, `DeveloperNote`, `Message`, `Parameters`, `Url`.
- **Quirks:** No update or delete endpoint is documented for payments — only
  create. There is no PUT, so the full-replace caveat does not apply here.

### POST /v{version}/payment/validate-new-payment
- **Purpose:** Validate a new payment without creating it (dry-run validation of
  a `PaymentApiCreateModel`). Note the docs description is mislabelled
  "Create payment for contract" (copy/paste from create); the 200 message is
  "Payment was validated successfully".
- **Docs:** https://docs.timelog.com/rest/method/payment_validatenewpayment
- **Request model:** `PaymentApiCreateModel` (identical body to create — see
  field table above).
- **Params (path):** `version` (string, required).
- **Enums:** `UnitType` as above — labels undocumented — gate.
- **Response:** 200 "Payment was validated successfully"; no success body model
  documented beyond the error model.
- **Errors:** 401 invalid auth token; 500 "Payment could not be validated".
- **Quirks:** Use this to pre-flight a create. The same all-optional caveat
  applies — validation may be where the true required set is enforced; capture
  what it rejects during the empirical gate.

## For the empirical gate

- **All Payment create fields are claimed optional.** Both `CreatePayment` and
  `ValidateNewPayment` show every `PaymentApiCreateModel` field as "No"/optional
  in both docs and swagger. ADR 0005 precedent: a field marked optional caused a
  400 on partial PUT. Hypothesis: at least `ProjectSubContractID` (a payment must
  belong to a contract) and `Amount` are required, likely also `Name` and/or
  `ProjectID`. Confirm the actual required set against the live API — and use
  `validate-new-payment` to discover which fields it rejects.
- **`UnitType` enum has labels undocumented and a value gap.** Values
  `[0,1,2,3,4,6,7,8,9]` — **5 is absent**. Hypothesis: these map to human-readable
  unit types (e.g. hours/days/pieces/amount/percent…) and `5` is a retired/
  reserved value. Confirm value→label mapping and whether `5` is rejected.
- **`InstallmentType` enum (read-only) has labels undocumented.** Values
  `[1,2,3]` on `PaymentApiReadModel`. Hypothesis: maps to installment categories
  (e.g. fixed/recurring/milestone). Confirm value→label mapping; it is not
  settable on create, so confirm how the server assigns it.
- **Read/write field-name asymmetry.** Create sends `ProductNumber` (string) and
  `DiscountPercentage` (double); read returns `ProductNumberID` (int) and
  `Discount` (double). Hypothesis: `ProductNumber` is looked up to a
  `ProductNumberID`, and `DiscountPercentage` is stored/echoed as `Discount`.
  Confirm the mapping (especially whether `Discount` read-back equals the
  `DiscountPercentage` written) against the live API.
- **Read-only fields not on create.** `PaymentID`, `PaymentGuid`,
  `InstallmentType`, `Rate`, `ExpensesCost` are returned by GET but cannot be
  set on create. Confirm they are server-computed and how `Rate`/`ExpensesCost`
  are derived.
- **Create response body shape.** `CreatePayment` 200 documents no success body
  (only the error model). Confirm whether the new `PaymentID`/`PaymentGuid` are
  returned, or whether you must re-query via GET-all-by-contract.
- **GET-all wrapper shape + paging.** The get-all-by-contract docs do not state
  whether the response is a TAFList wrapper or a bare array. Confirm; if it is a
  TAFList, confirm the 10-row default-page cap applies.
- **Missing payment returns 500, not 404.** `GetByID` surfaces a non-existent
  payment as 500 "Payment with the ID does not exist". Confirm error-handling
  behaviour (so callers do not treat 500 as a transient/server fault).
