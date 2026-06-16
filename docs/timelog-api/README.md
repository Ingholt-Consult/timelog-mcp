# TimeLog REST API v1 — reference

In-repo reference for the **TimeLog REST API v1**, scraped from the official
human-authored docs site (`docs.timelog.com/rest`) on **2026-06-16** and diffed
against the machine spec (`../../timelog-api-spec.json`). The purpose is durable
*Claude context*: so future sessions can reason about this API without
re-deriving its behaviour each time.

This sits alongside two existing references — keep the boundaries straight:

| Doc | Answers |
|---|---|
| [`../timelog/`](../timelog/README.md) | What the **product** can do (help-center features). |
| **`docs/timelog-api/`** (this) | What the **REST API v1** actually exposes. |
| [`../../CONTEXT.md`](../../CONTEXT.md) | Domain glossary + cross-cutting API conventions. |

## Why these docs exist (and what to trust)

The swagger (`timelog-api-spec.json`) is the endpoint inventory, but its
metadata is **demonstrably untrustworthy** for the two things that matter most:

- **`required` is wrong.** Every create/update model in the swagger marks *all*
  fields optional (e.g. `TaskApiCreateModel` has `required: None`). [ADR 0005]
  (../adr/0005-put-is-full-replace-read-modify-write.md) records the proof: a
  field the docs called optional caused a **400 on a partial PUT**. So every
  "Required (docs)" column here is flagged ⚠️ and treated as a *hypothesis*, not
  truth.
- **Enum labels are absent.** `ProjectStatus` (0–6), `ContractStatus` (1–4),
  `ContractModelType` (1–8, 20), `UnitType`, `PaymentRecognitionModel`,
  `InstallmentType` etc. appear as bare integers with no labels.

**The docs site is a strong hypothesis; the live API is the proof.** Field
requirements and enum meanings are settled by the empirical gate
([`../runbooks/empirical-put-test.md`](../runbooks/empirical-put-test.md) on this
branch; a dedicated create-field gate runbook,
`empirical-create-tests.md`, lives on the `phase2-construction` branch), **not**
by this documentation. Each detailed file ends with a `## For the empirical gate`
section listing exactly what to confirm. Do **not** tighten `src/` Zod schemas
based on these docs alone.

## Conventions that hold across the API

Recap from [`../../CONTEXT.md › API conventions`](../../CONTEXT.md):

- **Runtime base URL (this tenant):** `https://app5.timelog.com/ingholtconsult2/api`.
  Paths are `/v{version}/…`; `version` is a path param, currently `v1`.
- **Response wrapping.** Single resource → `{ Properties: {…}, Links, Actions }`.
  List ("TAFList") → `{ Properties: { TotalRecord, TotalPage, PageNumber },
  Entities: [ { Properties: {…} } ], Links }`. Read vs write field names can
  differ (project number is `No` on read, `ProjectNo` on write).
- **Paging.** List endpoints honour `$page` / `$pagesize` / `$expand`. Without
  `$pagesize`, a list silently returns only the first **10** rows.
- **PUT is a full replace**, not a partial update (ADR 0005) — read-modify-write
  the whole model.
- **Docs URL shapes.** Service page: `docs.timelog.com/rest/service/{slug}`.
  Method page: `docs.timelog.com/rest/method/{slug}_{method}` (lowercase, no
  separators; a few have no `{slug}_` prefix).

## Service index (63 services)

📄 = a detailed reference file exists (Phase 2 core). Other services are listed
with their endpoints (method names as the docs site presents them — map to the
runtime path via the conventions above) and can be deepened on demand.

### Projects & work structure

- 📄 **[Project](./project.md)** — `project` — the server's headline domain
  (mass-changing Project Type). GetAll, GetByID, CreateFromTemplate,
  ValidateNewProject, Update (full replace), UpdateStatus.
- 📄 **[Task](./task.md)** — `task` — tasks & sub-tasks under a project, plus
  time-tracking search helpers. Create, CreateSubTask, ValidateNewTask, GetAll
  by project, filter, registration, and many `search-*` endpoints.
- **Project Type** — `projecttype` — GET /GetAll (all project types).
- **Project Category** — `projectcategory` — GET /GetAll (all project categories).
- **Project Template** — `projecttemplate` — GET /GetAll (all project templates).
- **Project Header** — `projectheader` — project search for time/expense
  registration (SearchForTimeTracking[ByCustomerID][OrderByRecentRegistration],
  SearchForExpenseTravelRegistration…); plus POST Create (mileage registration
  for project) and CreateEmployeeExpense.
- **Project External Keys** — `projectexternalkeys` — GetExternalKeys,
  UpdateExternalKeys (PUT, create-or-update), DeleteExternalKeys.
- **Task Type** — `tasktype` — GET /GetAll (all task types).
- **Task External Keys** — `taskexternalkeys` — GetExternalKeys,
  UpdateExternalKeys (PUT), DeleteExternalKeys.
- **Barrier** — `barrier` — GetAll, GetById, Create, Update (PUT), Delete.

### Contracts, payments & invoicing

- 📄 **[Contract](./contract.md)** — `contractmodel` + `projectsubcontract` +
  `contracthourlyrate` — the Phase 2 financial core. Five contract types each
  with create + validate (Fixed Price Basic, Prepaid Services, Task Driven
  Revenue, T&M Basic, T&M Account End Balancing); recurring payment-plan update;
  contract hourly rates.
- 📄 **[Payment](./payment.md)** — `payment` — GetAll by contract, GetByID,
  Create, ValidateNewPayment.
- 📄 **[Hourly Rate](./hourly-rate.md)** — `hourlyrate` — GetAll, GetDefault.
- **Payment Method** — `paymentmethod` — GET /GetByStatus (by all/inactive/active).
- **Payment Term** — `paymentterm` — GET /GetAll (all payment terms).
- **Cost Price** — `costprice` — GET /GetAll (all cost prices).
- **Currency** — `currency` — GET /GetByStatus (by all/inactive/active).

### Customers & CRM

- 📄 **[Customer](./customer.md)** — `customer` — GetAll, GetByID, by-number,
  Create, ValidateNewCustomer, Update (PUT full replace), and search endpoints.
- **Customer Status** — `customerstatus` — GET /GetAll (all customer statuses).
- **Contact Person** — `contactperson` — GetAll, Create, ValidateNewContact.
  (A Contact is attached to a Customer; see CONTEXT.md.)
- **Industry** — `industry` — GET /GetAll (all industries).
- **Address** — `address` — GetHomeAndWork (user addresses), Search.
- **Country** — `country` — GET /GetAll (all countries).

### Products, expenses & mileage

- 📄 **[Product](./product.md)** — `product` — GET /GetAll (product catalog).
- 📄 **[Unit Type](./unit-type.md)** — `unittype` — GET /GetAll (resolves the
  Payment `UnitType` enum labels; docs summary mislabels it "customer types").
- **Project Product** — `projectproduct` — GET /GetAll (all project products).
- **Project Expense** — `projectexpense` — GetAllByProjectID, GetByID,
  CreateProjectExpense, ValidateProjectExpense.
- **Expense Type** — `expensetype` — GetAll (opt. legal-entity/status filter),
  GetByStatus.
- **Employee Expense** — `employeeexpense` — GetAll, GetByID, Create, Update,
  AttachImage, AttachFile, Delete, DeleteImage, DeleteFile.
- **Employee Expense Financial Data** — `employeeexpensefinancialdata` —
  GetAllTimeTotal, GetByDate, GetByDateRange.
- **Mileage Rate** — `mileagerate` — GetAll, GetByID.
- **Mileage Registration** — `mileageregistration` — GetAll, GetByID, Create,
  Update, Delete.
- **Car** — `car` — GetAll, GetByID, GetDefault, Create, Update, Delete.
- **Allowance Legislation** — `allowancelegislation` — GET /GetAll.

### Time tracking & timesheets

- **Time Registration** — `timeregistration` — Create, GetByID, Update (PUT),
  UpdateTime, Delete, CreateTimeTracker, StopTimeTracker, ImportTimeregistration
  (+ Validate), and absence update/delete variants.
- **Time Registration External Keys** — `timeregistrationexternalkeys` —
  GetExternalKeys, UpdateExternalKeys (PUT), DeleteExternalKeys.
- **Time Registration Financial Data** — `timeregistrationfinancialdata` —
  GetByDate, GetByDateRange, GetStatusByDate, GetStatusByDateRange.
- **Time Tracker** — `timetracker` — GetAll, GetByID, GetUserActiveTimeTracking,
  Create, StartTimeTrackerForTask, StartTimeTrackerForAbsence, Update, Delete.
- **Time Tracking Item** — `timetrackingitem` — GetByDate
  (+OrderByRecentRegistration), GetByID, GetWeeklyRegistrations, SaveFavourite.
- **Timesheet Status** — `timesheetstatus` — GET /WeeklyTimeSheetStatus.
- **Approval Timesheet** — `approvaltimesheet` — GetStatusBy{Dates,Period,
  WeekOfYear,…}, Submit{Dates,Period,TimeRegistrations}, ResubmitRejected….
- **Absence Code** — `absencecode` — GetByStatus, GetRecentlyRegistered, and
  CreateRegistrationBy{FullDay,HalfFullDay,Hours}, CreateTimeTracker.
- **Workload** — `workload` — POST /BookWorkload (book a workload/booking).
- **Employee Projection** — `employeeprojection` — GET /GetInPeriod.

### Organization & administration

- **User** — `user` — GetAll, GetByID, GetCurrentUser, Create, ValidateNewUser,
  Update (PUT). The PAT acts on behalf of its User (CONTEXT.md).
- **User Setting** — `usersetting` — GET /GetAll (e.g. BillableHourIsEditable).
- **User Preview Feature** — `userpreviewfeature` — GET /GetAll (active preview
  features for user).
- **Employee Type** — `employeetype` — GET /GetAll.
- **Department** — `department` — GET /GetAll.
- **Legal Entity** — `legalentity` — GetAll, GetById, SystemLegalEntity.
- **Role** — `role` — GetAll, Create, Delete.
- **Privilege** — `privilege` — GET /GetPrivileges (for user).
- **Salary Account** — `salaryaccount` — GetAll, GetEmployeePostingsAggregation,
  Create (bulk employee postings).
- **Salary Group** — `salarygroup` — GET /GetAll.
- **Normal Working Time** — `normalworkingtime` — GetAll, AssignToEmployee.
- **Holiday Calendar** — `holidaycalendar` — GET /GetAll.
- **Feature** — `feature` — PUT /Update.
- **Setting** — `setting` — PUT /Update.
- **External Systems** — `externalsystems` — GetAll, GetByID, Create, Update,
  Delete.
- **Integration Conflicts** — `integrationconflicts` — GetAll (by conflict
  status), GetByID, Create.
- **Index** — `index` — GET /Index (instance index/health).

## Status & coverage

- **Detailed (📄):** project, task, contract (×3 docs services), payment,
  customer, hourly-rate, product, unit-type — the services Phase 2 touches.
- **Indexed only:** the remaining 53 services above (endpoints listed; field
  tables, enums and quirks not yet captured). Deepen any on demand using the
  same method-page scrape + swagger diff.
- All 63 docs service pages fetched cleanly on 2026-06-16 (no 404s / JS-render
  gaps). A few method pages rendered only the error model for their success
  response; those are flagged in the relevant detailed file's gate section.
