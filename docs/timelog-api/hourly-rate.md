# Hourly Rate — TimeLog REST API v1

> Scraped from docs.timelog.com/rest on 2026-06-16, diffed against
> `timelog-api-spec.json`. See [README](./README.md) and
> [../../CONTEXT.md](../../CONTEXT.md).

Service for handling hourly rates in TimeLog. Read-only: two GET list endpoints
that return the tenant's hourly-rate catalogue (all rates, or only the default
rates). An hourly rate carries an `Amount` in a given currency and may be tied to
a [Customer](../../CONTEXT.md), a service, and a legal entity.

> **Contract Hourly Rate is a SEPARATE service** — the per-[Contract](../../CONTEXT.md)
> rate is documented in [contract.md](./contract.md), not here.

Runtime base URL (this tenant):
`https://app5.timelog.com/ingholtconsult2/api`. All paths below are
`/v{version}/…` where `version` is a path param, currently `v1`.

## Endpoints

### GET /v{version}/hourly-rate
- **Purpose:** Get all hourly rates.
- **Docs:** https://docs.timelog.com/rest/method/hourlyrate_getall
- **Response model:** `HourlyRateApiReadModel`
- **Params (path):**

  | Param | Type | Required | Notes |
  |---|---|---|---|
  | version | string | Yes | Requested API version (currently `v1`). |

- **Response:** TAFList wrapping — `{ Properties: { TotalRecord, TotalPage, PageNumber }, Entities: [ { Properties: { …HourlyRateApiReadModel } } ], Links }`.
  ⚠️ **Paging:** without `$pagesize` the list silently returns only the first
  **10** rows even when `TotalRecord` is higher. Pass `$page`, `$pagesize`,
  `$expand` to page/expand.
- **Read fields (`HourlyRateApiReadModel`):**

  | Field | Type | Notes |
  |---|---|---|
  | HourlyRateID | int | Numeric hourly-rate identifier. |
  | ID | uuid | GUID identifier. |
  | HourlyRateName | string | Display name of the rate. |
  | Amount | double | The rate amount. |
  | Description | string | Free-text description. |
  | IsActive | bool | Whether the rate is active. |
  | IsDefault | bool | Whether the rate is a default rate (the filter the `/default` endpoint applies). |
  | CustomerID | int | Associated [Customer](../../CONTEXT.md). |
  | ProductNo | string | Product number reference. |
  | ServiceID | int | Associated service. |
  | HourlyRateCurrencyID | int | Currency identifier for the rate. |
  | CurrencyISO | string | ISO currency code (e.g. `DKK`, `EUR`). |
  | LegalEntityID | int | Associated legal entity. |

- **Errors:** `401` invalid authentication token; `500` "Request to GetAll has
  failed" (error object with `Code`, `Message`, `Details`, `Parameters`, `Url`).
- **Quirks:** Read-only — no create/update/delete endpoints in this service.

### GET /v{version}/hourly-rate/default
- **Purpose:** Get the **default** hourly rates (those with `IsDefault = true`).
  ⚠️ The docs method page reuses the description "Get all hourly rates" verbatim
  (same string as the GetAll endpoint), and the swagger summary is likewise
  duplicated. The "default subset" purpose is **inferred** from the path name and
  the `IsDefault` field, not stated by the docs — confirm via the gate.
- **Docs:** https://docs.timelog.com/rest/method/hourlyrate_getdefaulthourlyrates
- **Response model:** `HourlyRateApiReadModel` (same model as GetAll — see field
  table above).
- **Params (path):**

  | Param | Type | Required | Notes |
  |---|---|---|---|
  | version | string | Yes | Requested API version (currently `v1`). |

- **Response:** TAFList wrapping, same shape as GetAll.
  ⚠️ **Paging:** without `$pagesize` returns only the first **10** rows.
- **Errors:** `401` invalid authentication token; `500` "Request to
  GetDefaultHourlyRates has failed" (error object with `Code`, `Message`,
  `Details`, `DeveloperNote`, `Parameters`, `Url`).
- **Quirks:** Read-only.

## Notes
- **No create/update endpoints**, so the ADR 0005 all-optional-fields trap does
  not apply to this service. PUT/full-replace conventions are likewise irrelevant.
- **No documented enums** in this service. `HourlyRateCurrencyID`, `ServiceID`,
  `LegalEntityID`, and `CustomerID` are foreign keys into other catalogues, not
  enums.

## For the empirical gate
- **`/hourly-rate/default` purpose unconfirmed.** Both the docs page and the
  swagger summary literally say "Get all hourly rates" for this endpoint — a
  copy-paste duplicate of GetAll. Hypothesis: `/default` returns only rates where
  `IsDefault = true` (a strict subset of GetAll). Confirm against the live API by
  comparing the two response sets and checking that every row from `/default` has
  `IsDefault = true`.
- **Response wrapping unconfirmed for this service.** Wrapping is assumed to be
  TAFList per the project-wide convention, but neither method page shows the
  envelope (the docs render only the bare `HourlyRateApiReadModel` array).
  Hypothesis: both endpoints return TAFList (`Properties`/`Entities`/`Links`) and
  honor `$page`/`$pagesize`/`$expand` with the 10-row default cap. Confirm by
  calling without `$pagesize` and inspecting the envelope.
