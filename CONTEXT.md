# TimeLog MCP

An MCP server that lets Claude administer projects in the firm's TimeLog account
via TimeLog's REST API (v1). First use case: cleaning up project settings —
notably mass-changing project types.

## Language

The domain terms below mirror TimeLog's own REST API model. We keep TimeLog's
names so code, API, and the product UI stay aligned.

**Project**:
A unit of work in TimeLog with a type, category, status, customer, and managers.
Identified by `ProjectID` (integer). The thing this server administers.

**Project Type**:
A classification of a Project (`ProjectTypeID`). Read-only list in the API
(`GET /ProjectType`); set on a Project via update. The headline cleanup target.
_Avoid_: project kind, category (Category is a separate concept).

**Project Category**:
A separate classification of a Project (`ProjectCategoryID`), distinct from
Project Type. Both exist independently on a Project.
_Avoid_: type (Type is the separate concept above).

**Project Status**:
The lifecycle state of a Project (`ProjectStatus`, integer 0–6) plus whether
time tracking is allowed. Changed via its own endpoint, not the field update.
_Avoid_: state.

**Customer**:
An organization a Project belongs to (`CustomerID`). Has a status and number.
_Avoid_: client, account.

**Contact**:
A contact person attached to a Customer (`ID` on the contact, `ShownName` for
display). A Project references one via `ContactID`.
_Avoid_: contact person (use Contact), person.

**Department**:
An organizational unit (`DepartmentID`) a Project can belong to.

**User**:
An employee in TimeLog (`UserID`, with `FirstName`/`LastName`/`Initials`).
Fills Project roles. The Personal Access Token belongs to a User and acts on
that User's behalf.
_Avoid_: employee, member, person.

**Project Manager**:
The User responsible for running a Project (`ProjectManagerID`). Distinct from
Account Manager.

**Account Manager**:
The User responsible for the customer relationship on a Project
(`AccountManagerID`). Distinct from Project Manager.

**Partner**:
A third party associated with a Project (`PartnerID`), distinct from Project
Manager and Account Manager. NOT part of the project update model — read-only on
the Project from this server's perspective (see ADR 0005).
_Avoid_: subcontractor (that is a separate API concept), vendor.

**Language**:
The language set on a Project (`LanguageID`), used for project-facing output such
as invoices. One of the update-model fields, but `GET /project/{id}` does not
return it, so read-modify-write cannot preserve it (see ADR 0005).

**Personal Access Token (PAT)**:
The per-User credential used to authenticate to the REST API as a Bearer token.
Employee-specific — it acts on behalf of the User it belongs to, so that User
needs project-administration rights.
_Avoid_: API key, secret.

**Project Template**:
A reusable blueprint (`ProjectTemplateID`) carrying a Project's Task/Sub-task
structure and the per-Task Contract assignment. A Project is created from one
(`POST /project/create-from-template`). **Read-only in the API**
(`GET /project-template/get-all`): the API cannot create, edit, or delete
templates — building and saving a template is a UI-only action (see API
conventions › No template write).
_Avoid_: blueprint, scaffold.

**Task**:
A unit of work within a Project (`TaskID`) forming the project plan. Has a Task
Type, a status, an optional budget with an Hourly Rate, and may link to a
Contract.
_Avoid_: activity, item.

**Sub-task**:
A Task nested under a parent Task (referenced by `parentTaskID`). Shares the same
model as a Task; distinguished only by having a parent.
_Avoid_: child task (use Sub-task).

**Task Type**:
A classification of a Task — the firm's ydelsesfaser (e.g. 1.1 Idéoplæg →
4.8 Certificering KK3). Read-only list (`GET /TaskType`).
_Avoid_: phase, category.

**Contract**:
The framework governing how a Project is invoiced and how revenue is recognised
(`ContractID`). A Project can hold several. Listed per Project
(`GET /contract?projectID=`).
_Avoid_: agreement.

**Contract Model**:
The kind of a Contract. Two are in the account's setup: TimeMaterialBasic
(`ContractModelID` 1) and FixedPriceBasic (2); the three other API models
(prepaid services, task-driven revenue, T&M account end-balancing) are not used.
_Avoid_: contract type — `ContractTypeID` is a separate field on the create
model whose meaning is not yet resolved.

**Payment**:
A line in a Contract's payment plan (`PaymentID`) — e.g. a fixed-price milestone
amount. Listed per Contract (`GET /payment?contractID=`).
_Avoid_: invoice, installment.

**Hourly Rate**:
A billing rate (`HourlyRateID`) that a Task references for its budget; resolved
per Contract via `GET /contract-hourly-rate?contractID=`.
_Avoid_: price, tariff.

**Booking**:
Hours placed for an Employee on a Task across a period — the unit of the Resource
Planner (Ressourceplanlægger). Created via `POST /workload/book`
(`EmployeeId`/`TaskId`/`Hours`/`StartDate`/`EndDate`; note the `EmployeeId`/`TaskId`
casing, not `...ID`). Distinct from **Allocation**. The endpoint has no `validate-*`
twin and no DELETE (see API conventions › No booking validate / no booking undo).
_Avoid_: allocation (that is the separate concept below).

**Allocation**:
The budget hours a Task carries for an Employee (`BudgetHours` on the Task) — the
"how much", versus a Booking's "when". Set via the Task (Phase 2 `create_task`).
Pure Allocation of an Employee to a Task beyond the Task budget has **no confirmed
v1 write endpoint** — `GET /allocation` returns 405 (the route exists but not for
GET); a write route is unconfirmed (see ADR 0007). _Avoid_: booking.

**Workload / Capacity**:
An Employee's scheduled capacity over a period — normal working hours per day, read
via `GET /employee-projection/get-in-period` (a paging TAFList). It carries capacity
(`NormalWorkingHours`) and closed/approval flags only, **not** already-booked hours.
_Avoid_: availability (informal).

## API conventions

Conventions that hold across TimeLog's REST API (v1), learned empirically — apply
them to every endpoint, not just the ones already wired up. Per-endpoint
reference (request models, enums, response shapes, docs-vs-swagger conflicts) lives
in [`docs/timelog-api/`](docs/timelog-api/README.md).

**Response wrapping.** A single resource comes back as
`{ Properties: {...}, Links, Actions }` — the real fields are under `Properties`,
and `Actions` lists the writable operations (with their field sets and enum
labels). A list ("TAFList") comes back as
`{ Properties: { TotalRecord, TotalPage, PageNumber }, Entities: [{ Properties: {...} }], Links }`
— unwrap each row's `Properties`. Field names can differ between read and write
models (e.g. a project's number is `No` when read but `ProjectNo` when written).

**Paging — `$`-prefixed query options.** TAFList endpoints page with TimeLog's own
options: **`$page`**, **`$pagesize`**, and **`$expand`** (collapse/expand child
entities). Without them a list silently returns only the first **10** rows even
though `TotalRecord` is higher — this is by design, not a bug. Example:
`GET /ProjectType?$pagesize=100` returns all 27 types in one call;
`?$page=2&$pagesize=10` returns the second page. Plain `pageNumber`/`pageSize`,
`$skip`/`$top`, headers, etc. are ignored — only the `$page`/`$pagesize` form
works. Always pass `$pagesize` when you need a full list.

**PUT is a full replace**, not a partial update — read-modify-write the whole
model (see ADR 0005).

**No template write.** The REST API (v1) exposes only `GET /project-template/get-all`
for Project Templates — there is no POST/PUT/DELETE and no "save-as-template"
endpoint anywhere in the spec, even though the product UI supports building and
saving templates. Creating or editing a template is therefore a UI-only action.
The supported substitute is to construct a source Project with the Phase 2 tools
and then save it as a template manually in TimeLog's UI.

**No DELETE for constructed resources.** There is no DELETE for projects, tasks,
contracts, or payments. A mistaken create is permanent; it can only be
neutralised by archiving the Project. Every create endpoint has a paired
`validate-*` endpoint that writes nothing — this powers the preview step.

**No booking validate / no booking undo.** `POST /workload/book` (Booking) is the
exception to the rule above: it has **no** paired `validate-*` endpoint and **no**
DELETE — a Booking cannot be previewed dry or undone via the API, and (unlike a
create) cannot even be archived away. `book_workload`'s preview is therefore
*synthesised* from `GET /employee-projection/get-in-period`: it surfaces the
Employee's capacity for the period (not a server-computed verdict, consistent with
ADR 0006), since the projection does not expose already-booked hours. A mistaken
Booking can only be removed manually in the Resource Planner UI. See ADR 0007.
