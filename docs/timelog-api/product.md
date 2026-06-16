# Product — TimeLog REST API v1

> Scraped from docs.timelog.com/rest on 2026-06-16, diffed against
> `timelog-api-spec.json`. See [README](./README.md) and
> [../../CONTEXT.md](../../CONTEXT.md).

Service for handling products in TimeLog. Read-only: a single GET returns the full
product catalog (VAT settings, product numbers, names). Products are referenced by
[Payment](./payment.md) and contract data — see the cross-link note below.

## Endpoints

### GET /v{version}/product
- **Purpose:** Get all products (the full product catalog for the account).
- **Docs:** https://docs.timelog.com/rest/method/product_getall
- **Request model:** none (no body; GET).
- **Response model:** `ProductApiReadModel` (returned per entity)

  | Field | Type | Required (docs) | Notes |
  |---|---|---|---|
  | ProductNumberID | int | n/a (read-only) | Numeric product identifier. This is the int that [Payment](./payment.md) read models return as `ProductNumberID`. |
  | ProductNumber | string | n/a (read-only) | String product number. This is what [Payment](./payment.md) `create` takes as `ProductNumber` (string) — products are referenced by string on write, by int on read. |
  | ProductName | string | n/a (read-only) | Display name. |
  | Description | string | n/a (read-only) | Free-text description. |
  | UseVAT | bool | n/a (read-only) | Whether VAT applies to this product. |
  | VATPercentage | double | n/a (read-only) | VAT percentage (docs type: number). |
  | IsActive | bool | n/a (read-only) | Whether the product is active. |
  | ProductNumberGuid | uuid | n/a (read-only) | GUID form of the product number (docs type: string). |
  | LegalEntityID | int | n/a (read-only) | Legal entity the product belongs to. |

- **Enums:** none.
- **Response:** List endpoint. Apply the **TAFList** wrapping convention:
  `{ Properties: { TotalRecord, TotalPage, PageNumber }, Entities: [ { Properties: {…ProductApiReadModel} } ], Links }`.
  ⚠️ **Paging:** without `$pagesize` the list silently returns only the first **10**
  rows even when `TotalRecord` is higher. Pass `$pagesize` (and `$page`) to get the
  full catalog. `$expand` is also honored on TAFList endpoints.
- **Params:** `version` (path) — the API version being requested (currently `v1`).
  No documented query params beyond the standard paging/expand params above.
- **Quirks:**
  - Read-only service — no create/update/delete, so no PUT-replace or required-field
    hazards apply here.
  - Docs describe the 200 body as a plain array of product objects; per CONTEXT.md
    list-wrapping convention, expect the TAFList envelope at runtime. Confirm the
    actual envelope shape via the gate (below).
  - **Error responses:** `401` invalid authentication token; `500` request failed
    (returns error model with `Code`, `Details`, `Message`, `Parameters`, `Url`).

## Related — Project Product service (separate, index-only)

"Project Product" is a **separate service** (`https://docs.timelog.com/rest/service/projectproduct`),
not documented here beyond this read-model note. Its read model differs from the
catalog product above (it is the per-project product line with pricing):

`ProjectProductApiReadModel`: ProductID(int), ProductGuid(uuid), ProductName(string),
UnitTypeID(int), IsActive(bool), Cost(double), SalesPrice(double),
StandardComment(string), ProductNumberID(int), ExpenseTypeID(int),
PaymentMethodID(int), SupplierID(int), LegalEntityID(int), CurrencyID(int).

Note `ProductNumberID` here is the join back to the Product catalog
(`ProductApiReadModel.ProductNumberID`).

## For the empirical gate

- **Response envelope shape.** Docs show the `GET /v{version}/product` 200 body as a
  plain array of product objects, but CONTEXT.md convention says lists come back as a
  TAFList envelope (`{ Properties, Entities, Links }`). Hypothesis: the live endpoint
  returns the TAFList envelope, not a bare array. Confirm against the live API.
- **10-row paging cap.** Hypothesis: `GET /v{version}/product` without `$pagesize`
  returns only the first 10 products even when more exist; passing `$pagesize` returns
  the rest. Confirm the cap and that `$pagesize`/`$page` are honored here.
- **Product reference type asymmetry (cross-service).** Hypothesis: [Payment](./payment.md)
  `create` accepts a product by its string `ProductNumber`, while Payment reads return
  the int `ProductNumberID`; both map to the same product in `ProductApiReadModel`.
  Confirm that the string passed to Payment.create matches `ProductApiReadModel.ProductNumber`
  and resolves to the same product as the int `ProductNumberID` on read.
