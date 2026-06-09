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
Manager and Account Manager. Settable via the project update model.
_Avoid_: subcontractor (that is a separate API concept), vendor.

**Language**:
The language set on a Project (`LanguageID`), used for project-facing output such
as invoices. One of the 14 updatable project fields.

**Personal Access Token (PAT)**:
The per-User credential used to authenticate to the REST API as a Bearer token.
Employee-specific — it acts on behalf of the User it belongs to, so that User
needs project-administration rights.
_Avoid_: API key, secret.
