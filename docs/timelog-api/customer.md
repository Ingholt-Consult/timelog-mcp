# Customer — TimeLog REST API v1

> Scraped from docs.timelog.com/rest on 2026-06-16, diffed against
> `timelog-api-spec.json`. See [README](./README.md) and
> [../../CONTEXT.md](../../CONTEXT.md).

A **Customer** is an organization a [Project](../../CONTEXT.md) belongs to. This
service creates, updates, retrieves, and searches customers. A customer's lifecycle
state is held in `CustomerStatusID`, governed by the separate **CustomerStatus**
service (index-only — cross-linked here by name, not documented in this file).

**Runtime base URL:** `https://app5.timelog.com/ingholtconsult2/api`; all paths are
`/v{version}/…` where `version` is a path param (currently `v1`).

**Response wrapping (all endpoints).** A single resource returns as
`{ Properties: {…real fields}, Links, Actions }`. A list returns as the TAFList
shape `{ Properties: { TotalRecord, TotalPage, PageNumber }, Entities: [ { Properties: {…} } ], Links }`.
Read-side field names differ from write-side (e.g. read `No` / `VATNo` vs. write
`CustomerNo` / `VatNo`).

**The read model is tiny.** Every GET/search/create/update response returns only the
8-field `CustomerApiReadModel` (`CustomerID`, `ID`, `Name`, `No`,
`DefaultMileageDistance`, `CustomerStatusID`, `VATNo`, `OrganizationNo`). The
create/update request models carry 40+/30+ fields respectively. **A GET therefore
cannot reconstruct the full write model** — this is the core RMW concern for `update`
(see below and the gate section).

## Endpoints

### GET /v{version}/customer
- **Purpose:** Get all customers.
- **Docs:** https://docs.timelog.com/rest/method/customer_getall
- **Response model:** list of `CustomerApiReadModel`

  | Field | Type | Notes |
  |---|---|---|
  | CustomerID | int | Customer identifier (write-side key) |
  | ID | uuid (string) | GUID identifier |
  | Name | string | |
  | No | string | Customer number (write-side: `CustomerNo`) |
  | DefaultMileageDistance | int | |
  | CustomerStatusID | int | FK to CustomerStatus service |
  | VATNo | string | (write-side: `VatNo` — casing differs) |
  | OrganizationNo | string | |

- **Response:** TAFList wrapper. ⚠️ **Paging:** without `$pagesize` this returns only
  the first **10** rows even when `TotalRecord` is higher. Honors `$page`,
  `$pagesize`, `$expand`.
- **Params:** `version` (path, required).
- **Quirks:** No filter params — returns all customers, paged.

### GET /v{version}/customer/{customerID}
- **Purpose:** Get the customer with the given customer identifier.
- **Docs:** https://docs.timelog.com/rest/method/customer_getbyid
- **Response model:** `CustomerApiReadModel` (8 fields, as above)
- **Response:** single-resource wrapper `{ Properties, Links, Actions }`.
- **Params:** `customerID` (path, int, required); `version` (path, required).

### GET /v{version}/customer/by-number/{customerNumber}
- **Purpose:** Get customers matching the customer number.
- **Docs:** https://docs.timelog.com/rest/method/customer_getbycustomernumber
- **Response model:** **array** of `CustomerApiReadModel` (8 fields, as above)
- **Response:** array — customer numbers are apparently not guaranteed unique, hence
  multiple matches. (The docs page rendered only the error model for the 200 body;
  the array-of-read-model shape is taken from the swagger, which is authoritative for
  shape.)
- **Params:** `customerNumber` (path, string, required); `version` (path, required).

### GET /v{version}/customer/search-for-time-tracking
- **Purpose:** Search for customers the user can register time on, with customer
  information.
- **Docs:** https://docs.timelog.com/rest/method/customer_searchfortimetracking
- **Response model:** list of `CustomerApiReadModel` (8 fields, as above)
- **Response:** TAFList wrapper. ⚠️ **Paging:** first 10 rows only without
  `$pagesize`.
- **Params:**

  | Param | In | Type | Required (docs) | Notes |
  |---|---|---|---|---|
  | searchText | query | string | Yes | Customer name, nickname, or number |
  | searchAll | query | bool | No | If true, search all |
  | version | path | string | Yes | API version |

### GET /v{version}/customer/search-for-time-tracking-order-by-recent-registration
- **Purpose:** Same as above, but results ordered by recent registration.
- **Docs:** https://docs.timelog.com/rest/method/customer_searchfortimetrackingorderbyrecentregistration
- **Response model:** list of `CustomerApiReadModel` (8 fields, as above)
- **Response:** TAFList wrapper. ⚠️ **Paging:** first 10 rows only without
  `$pagesize`.
- **Params:**

  | Param | In | Type | Required (docs) | Notes |
  |---|---|---|---|---|
  | searchText | query | string | Yes | Customer name, nickname, or number |
  | searchAll | query | bool | Yes* | If true, search all |
  | version | path | string | Yes | API version |

  *`searchAll` is marked Required on this page but optional on the plain
  `search-for-time-tracking` page — inconsistent docs (flagged for gate).

### GET /v{version}/customer/search-for-expense-travel-registration-order-by-recent-registration
- **Purpose:** Search for customers for expense/travel registration, ordered by
  recent registration. (No description text on the service index; derived from the
  method page.)
- **Docs:** https://docs.timelog.com/rest/method/customer_searchforexpensetravelregistrationorderbyrecentregistration
- **Response model:** list of `CustomerApiReadModel` (8 fields, as above)
- **Response:** TAFList wrapper. ⚠️ **Paging:** first 10 rows only without
  `$pagesize`.
- **Params:**

  | Param | In | Type | Required (docs) | Notes |
  |---|---|---|---|---|
  | searchText | query | string | Yes | Search text |
  | searchAll | query | bool | Yes | If true, search all records |
  | version | path | string | Yes | API version |

### POST /v{version}/customer/create
- **Purpose:** Create a new customer.
- **Docs:** https://docs.timelog.com/rest/method/customer_create
- **Request model:** `CustomerApiCreateModel`

  ⚠️ **Required fields unconfirmed — docs/swagger claim all-optional, but ADR 0005
  precedent shows this is often false. Resolve via the empirical gate
  (`docs/runbooks/empirical-put-test.md`); do not trust.** (The docs field table
  lists every field as Required = No; `Name` is the obvious real-world candidate for a
  required field but is unconfirmed.)

  | Field | Type | Required (docs) | Notes |
  |---|---|---|---|
  | Name | string | No | Customer name |
  | CurrencyID | int | No | Currency ID |
  | CustomerStatusID | int | No | Customer status ID (FK to CustomerStatus) |
  | CustomerNo | string | No | Customer number (read-side: `No`) |
  | NickName | string | No | Nickname |
  | PrimaryKAMID | int | No | Primary KAM (key account manager) |
  | SecondaryKAMID | int | No | Secondary KAM |
  | CustomerSince | date-time | No | Date the customer started |
  | IndustryID | int | No | Industry ID |
  | Phone | string | No | |
  | Fax | string | No | |
  | Email | string | No | |
  | Website | string | No | |
  | Address | string | No | Address line 1 |
  | Address2 | string | No | Address line 2 |
  | Address3 | string | No | Address line 3 |
  | ZipCode | string | No | |
  | City | string | No | |
  | State | string | No | |
  | CountryID | int | No | Address country |
  | UseInvoicingAddress | bool | No | Customer has separate invoicing address |
  | InvoicingAddress | string | No | |
  | InvoicingAddress2 | string | No | |
  | InvoicingAddress3 | string | No | |
  | InvoicingAddressZipCode | string | No | |
  | InvoicingAddressCity | string | No | |
  | InvoicingAddressState | string | No | |
  | InvoicingAddressCountryID | int | No | |
  | VatNo | string | No | VAT number (read-side: `VATNo` — casing differs) |
  | OrganizationNo | string | No | |
  | DefaultMileageDistance | int | No | |
  | ExpenseIsBillable | bool | No | If expenses are billable |
  | MileageIsBillable | bool | No | If mileage is billable |
  | DefaultDistIsMaxBillable | bool | No | Default mileage distance is max billable |
  | ContactID | int | No | Contact person |
  | InvoiceAddressToUse | int (enum) | No | Which address to use for invoicing — see Enums |
  | InternalReferenceID | int | No | Internal reference |
  | CustomerReferenceID | int | No | Customer reference |
  | PaymentTermID | int | No | Payment term ID |
  | DiscountPercentage | double | No | |
  | CalculateVat | bool | No | If VAT should be calculated |
  | VatPercentage | double | No | |
  | UseEanNo | bool | No | If customer uses EAN |
  | EanNo | string | No | EAN number |
  | LanguageID | int | No | Language ID used for the invoice |

- **Enums:** `InvoiceAddressToUse` — swagger lists values `[0, 1, 2, 4]` (note: **no 3**).
  ⚠️ Value→label mapping is undocumented (label undocumented — gate).
- **Response:** single-resource wrapper around `CustomerApiReadModel` (8 fields). The
  rich create payload is **not** echoed back — only the 8 read fields.
- **Params:** `version` (path, required).

### POST /v{version}/customer/validate-new-customer
- **Purpose:** Validate a prospective new customer payload (pre-flight check before
  `create`).
- **Docs:** https://docs.timelog.com/rest/method/customer_validatenewcustomer
- **Request model:** `CustomerApiCreateModel` (identical field set to `create` above —
  same 45 fields, all marked optional in docs).

  ⚠️ **Required fields unconfirmed — docs/swagger claim all-optional, but ADR 0005
  precedent shows this is often false. Resolve via the empirical gate
  (`docs/runbooks/empirical-put-test.md`); do not trust.**

- **Enums:** `InvoiceAddressToUse` — same as create (`[0, 1, 2, 4]`, labels
  undocumented — gate).
- **Response:** echoes a customer object on success; 500 `"User could not be
  validated"` on failure. Likely intended to surface validation errors without
  committing — exact success/failure semantics unconfirmed (gate).
- **Params:** `version` (path, required).

### PUT /v{version}/customer/update
- **Purpose:** Update an existing customer.
- **Docs:** https://docs.timelog.com/rest/method/customer_update
- **Request model:** `CustomerApiUpdateModel`

  ⚠️ **PUT is a full replace, not a partial update (ADR 0005).** Any updatable field
  omitted from the body is overwritten/cleared, not preserved. The MCP `update_customer`
  tool MUST read-modify-write.

  ⚠️ **RMW is impossible from a GET alone** (worse than the project case in ADR 0005):
  the read model has only 8 fields, but the update model has 33. A GET cannot supply
  values for the ~25 write-only fields (Phone, Email, addresses, KAM IDs, currency,
  industry, invoicing fields, …), so a naive read-modify-write would blank them. The
  caller must source the full prior state from elsewhere or accept data loss — resolve
  via the gate before shipping `update_customer`.

  | Field | Type | Required (docs) | Notes |
  |---|---|---|---|
  | CustomerID | int | **Yes** | Customer identifier — the one confirmed-required field |
  | Name | string | No | |
  | CustomerNo | string | No | (read-side: `No`) |
  | CurrencyID | int | No | |
  | CustomerStatusID | int | No | FK to CustomerStatus |
  | NickName | string | No | |
  | CountryID | int | No | |
  | CustomerSince | date-time | No | |
  | OrganizationNo | string | No | |
  | PrimaryKAMID | int | No | |
  | SecondaryKAMID | int | No | |
  | IndustryID | int | No | |
  | Phone | string | No | |
  | Fax | string | No | |
  | Email | string | No | |
  | Website | string | No | |
  | Address | string | No | |
  | Address2 | string | No | |
  | Address3 | string | No | |
  | ZipCode | string | No | |
  | City | string | No | |
  | State | string | No | |
  | VatNo | string | No | (read-side: `VATNo`) |
  | UseInvoicingAddress | bool | No | |
  | InvoicingName | string | No | Update-only field (not present in create model) |
  | InvoicingAddress | string | No | |
  | InvoicingAddress2 | string | No | |
  | InvoicingAddress3 | string | No | |
  | InvoicingAddressZipCode | string | No | |
  | InvoicingAddressCity | string | No | |
  | InvoicingAddressState | string | No | |
  | InvoicingAddressCountryID | int | No | |
  | CreditorID | string | No | Update-only field (not present in create model) |

- **Response:** single-resource wrapper around `CustomerApiReadModel` (8 fields).
- **Params:** `version` (path, required).
- **Quirks:** The update model lacks many create fields (no `ContactID`,
  `InvoiceAddressToUse`, `PaymentTermID`, billable flags, EAN, VAT percentage,
  discount, language, references). Whether those are simply not updatable via this
  endpoint, or are preserved despite full-replace semantics, is unconfirmed (gate).
  Conversely `InvoicingName` and `CreditorID` exist only on update.

## Error responses (all endpoints)
- **401** — Invalid authentication token.
- **500** — Request failed; body is an error object `{ Code (int), Details (array),
  DeveloperNote (object), Message (string), Parameters (string), Url (string) }`.

## For the empirical gate
- **`create` / `validate-new-customer` required fields.** Docs mark all 45 fields of
  `CustomerApiCreateModel` as optional. ADR 0005 precedent says this is unreliable.
  Hypothesis: at least `Name` (and likely `CustomerStatusID` and/or `CurrencyID`) is
  required; a POST omitting it returns 400. Confirm against the live API.
- **`update` required fields.** Docs mark only `CustomerID` as required. Hypothesis:
  additional fields (e.g. `Name`) are required because PUT is a full replace; a PUT
  with only `CustomerID` either errors or blanks `Name`. Confirm.
- **`InvoiceAddressToUse` enum labels.** Swagger values `[0, 1, 2, 4]` (no 3). Labels
  undocumented. Hypothesis: maps to {customer address, customer contact address,
  invoicing address, …} — exact label↔value mapping and the meaning of the missing `3`
  must be confirmed against the live API or UI.
- **RMW feasibility for `update_customer`.** The 8-field read model cannot reconstruct
  the 33-field update model. Hypothesis: a read-modify-write built only on GET will
  blank write-only fields under full-replace semantics. Confirm whether omitted fields
  are cleared, and determine a safe source for full prior state before shipping.
- **`update` field coverage.** Confirm whether create-only fields absent from the
  update model (`ContactID`, `InvoiceAddressToUse`, `PaymentTermID`,
  `ExpenseIsBillable`, `MileageIsBillable`, `DefaultDistIsMaxBillable`,
  `DefaultMileageDistance`, `DiscountPercentage`, `CalculateVat`, `VatPercentage`,
  `UseEanNo`, `EanNo`, `LanguageID`, `InternalReferenceID`, `CustomerReferenceID`) are
  preserved or wiped on PUT.
- **`searchAll` required-flag inconsistency.** Marked optional on
  `search-for-time-tracking` but required on the two
  `order-by-recent-registration` variants. Confirm whether `searchAll` is actually
  required on any of them.
- **`by-number` 200 body shape.** The docs method page rendered the error model in
  place of the 200 body; the array-of-`CustomerApiReadModel` shape is taken from the
  swagger. Confirm the live 200 body is an array and uses the read model.
