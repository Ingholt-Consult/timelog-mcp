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
