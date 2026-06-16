# Task — TimeLog REST API v1

> Scraped from docs.timelog.com/rest on 2026-06-16, diffed against
> `timelog-api-spec.json`. See [README](./README.md) and
> [../../CONTEXT.md](../../CONTEXT.md).

Service for handling **tasks** in TimeLog. A Task belongs to a
[Project](../../CONTEXT.md); a **sub-task** is created on an existing Task (via
`create-sub-task`, supplying that Task's id as `ParentTaskID`). Besides CRUD-ish
create/validate endpoints, this service exposes a large family of **time-tracking
search helpers** (`search-*`) that return the tasks the current user is allowed to
register time on, plus a registration endpoint to log hours against a task.

Runtime base URL (this tenant):
`https://app5.timelog.com/ingholtconsult2/api`. All paths below are
`/v{version}/…` where `version` is a path param, currently `v1`.

**Related but SEPARATE services** (cross-link only, not documented here):
TaskType (`TaskTypeID` references it). The Task service page links no other
service.

## Endpoints

### GET /v{version}/task
- **Purpose:** Get a list of all tasks belonging to a project ("GetAllByProjectID").
- **Docs:** https://docs.timelog.com/rest/method/task_getallbyprojectid
- **Response model:** `TaskApiReadModel`
- **Params (query):**

  | Param | Type | Required | Notes |
  |---|---|---|---|
  | projectID | int | Yes | The [Project](../../CONTEXT.md) to list tasks for. |

- **Read fields (`TaskApiReadModel`):**

  | Field | Type | Notes |
  |---|---|---|
  | TaskID | int | Numeric task identifier (use for path on get-by-id, and as `ParentTaskID` when creating a sub-task). |
  | ID | string (uuid) | GUID identifier. |
  | Name | string | Task name. |
  | No | string | Task number. **Read-side is `No`**; written as `TaskNo` (create). |
  | ProjectID | int | Owning project. |
  | Project | object | Embedded project object (separate service). |
  | ParentTaskID | int | Parent task id (set on sub-tasks). |
  | ParentFullName | string | Full name of the parent task. |
  | AdditionalTextIsRequired | bool | Whether a comment/extra text is required on registration. |
  | IsDefaultBillable | bool | Default billable state. |
  | IsFavourite | bool | Marked as favourite by the user. |
  | IsFixedPrice | bool | Fixed-price task. |
  | IsTravelTimeTask | bool | Travel-time task. |

- **Response:** List endpoint. Apply TAFList wrapping —
  `{ Properties: { TotalRecord, TotalPage, PageNumber }, Entities: [ { Properties: { …TaskApiReadModel } } ], Links }`.
  ⚠️ **Paging:** without `$pagesize` the list silently returns only the first
  **10** rows even when `TotalRecord` is higher. Pass `$page`, `$pagesize`,
  `$expand` to page/expand.
- **Quirks:** Same read model is returned by the get-by-id, get-recently-registered,
  travel-time, and all `search-*` endpoints below.
- **Errors:** 401 invalid auth token; 500 request failed (`ErrorResponse`).

### GET /v{version}/task/{taskID}
- **Purpose:** Get a single task by its identifier ("GetByID").
- **Docs:** https://docs.timelog.com/rest/method/task_getbyid
- **Response model:** `TaskApiReadModel` (fields as in GET /task above).
- **Params (path):**

  | Param | Type | Required | Notes |
  |---|---|---|---|
  | taskID | int | Yes | Task identifier. |

- **Response:** Single resource — `{ Properties: { …TaskApiReadModel }, Links, Actions }`.
- **Errors:** 401 invalid auth token; 500 "Task with the TaskID provided does not exist" (`ErrorResponse`).

### POST /v{version}/task
- **Purpose:** Create a task on a specified project ("CreateTask").
- **Docs:** https://docs.timelog.com/rest/method/task_createtask
- **Request model:** `TaskApiCreateModel` (docs call the body `taskModel`)
- **Body fields:**

  | Field | Type | Required (docs) | Notes |
  |---|---|---|---|
  | TaskName | string | No | Task name. |
  | TaskNo | string | No | Task number (write-side name; read-side is `No`). |
  | Description | string | No | |
  | ProjectID | int | No | Owning [Project](../../CONTEXT.md). |
  | ParentTaskID | int | No | Parent task id. |
  | TaskTypeID | int | No | References the TaskType service. |
  | StartDate | string (date) | No | |
  | EndDate | string (date) | No | |
  | BudgetHours | number | No | |
  | BudgetAmount | number | No | |
  | IsBillable | bool | No | |
  | IsReadyForInvoicing | bool | No | |
  | AdditionalTextIsRequired | bool | No | |
  | HourlyRateID | int | No | |
  | ProjectSubContractID | int | No | The sub-[Contract](../../CONTEXT.md) the task is booked under. |
  | PaymentAmount | number | No | TDR task payment amount. |
  | PaymentName | string | No | TDR task payment name. |
  | PaymentProductNo | string | No | TDR task payment product number. |
  | PaymentInvoiceDate | string (date) | No | TDR task payment invoice date. |
  | TaskHourlyRate | number | No | Hourly rate of a TDR task. |
  | PaymentRecognitionModel | int | No | Enum — value→label undocumented (gate). |

- **Enums:** `PaymentRecognitionModel` (int) — label mapping undocumented (gate).
- **Response:** "Task was created successfully" (200). Apply single-resource wrapping.
- **Quirks:** ⚠️ Required fields unconfirmed — docs/swagger claim all-optional, but
  ADR 0005 precedent shows this is often false. The handoff explicitly verified
  swagger lists `required: None` for `TaskApiCreateModel`. In practice at least
  `TaskName` + `ProjectID` are almost certainly required. Resolve via the empirical
  gate (`docs/runbooks/empirical-put-test.md`); do not trust.
- **Errors:** 401 invalid auth token; 500 "Task could not be created" (`ErrorResponse`).

### POST /v{version}/task/create-sub-task
- **Purpose:** Create a sub-task on an existing task of a specified project ("CreateSubTask").
- **Docs:** https://docs.timelog.com/rest/method/task_createsubtask
- **Request model:** `TaskApiCreateModel` (same model as CreateTask; docs body `taskModel`).
- **Body fields:** Same field set as POST /task. Notable difference per docs:
  `ProjectSubContractID` — *"When creating a sub task, if not supplied, the contract
  ID of its parent task will be used."* The parent is identified by `ParentTaskID`
  (the existing Task's `TaskID`). (Field `HourlyRateID` is also present; no
  separate fields beyond the CreateTask set.)
- **Enums:** `PaymentRecognitionModel` (int) — label mapping undocumented (gate).
- **Response:** "Sub task was created successfully" (200). Single-resource wrapping.
- **Quirks:** ⚠️ Required fields unconfirmed — docs/swagger claim all-optional, but
  ADR 0005 precedent shows this is often false. In practice `ParentTaskID` (and
  likely `TaskName`) are required to create a sub-task. Resolve via the empirical
  gate (`docs/runbooks/empirical-put-test.md`); do not trust.
- **Errors:** 401 invalid auth token; 500 "Sub task could not be created" (`ErrorResponse`).

### POST /v{version}/task/validate-new-task
- **Purpose:** Validate whether a new task can be created, without creating it ("ValidateNewTask").
- **Docs:** https://docs.timelog.com/rest/method/task_validatenewtask
- **Request model:** `TaskApiCreateModel` (same `taskModel` body as CreateTask).
- **Body fields:** Same field set as POST /task (TaskName, TaskNo, Description,
  ProjectID, ParentTaskID, ProjectSubContractID, StartDate, EndDate, TaskTypeID,
  BudgetHours, BudgetAmount, IsBillable, HourlyRateID, IsReadyForInvoicing,
  AdditionalTextIsRequired, TaskHourlyRate, PaymentName, PaymentAmount,
  PaymentProductNo, PaymentInvoiceDate, PaymentRecognitionModel).
- **Response:** "Validation completed successfully" (200).
- **Quirks:** Same all-optional caveat as CreateTask — but this endpoint exists
  precisely to test creatability, so it is the natural empirical-gate probe for the
  required-field question. ⚠️ Required fields unconfirmed (see gate).
- **Errors:** 401 invalid auth token; 500 validation failure (`ErrorResponse`).

### POST /v{version}/task/registration
- **Purpose:** Create a time registration (hours) against a task ("CreateRegistration").
- **Docs:** https://docs.timelog.com/rest/method/task_createregistration
- **Request model:** `TimeRegistrationApiCreateModel`
- **Body fields:**

  | Field | Type | Required (docs) | Notes |
  |---|---|---|---|
  | TaskID | int | **Yes** | Task to register time on. |
  | Date | string (date-time) | **Yes** | Date of the registration. |
  | Hours | number | No | Hours worked. |
  | Minutes | int | No | Additional minutes worked. |
  | StartTime | string (date-time) | No | When tracking started. |
  | EndTime | string (date-time) | No | When tracking ended. |
  | Comment | string | No | General comment. |
  | AdditionalComment | string | No | Supplementary comment. |
  | Billable | bool | No | Whether hours are billable. |
  | BillableHours | number | No | Hours marked billable. |
  | BillableMinutes | int | No | Minutes marked billable. |
  | Factor | number | No | Billing-rate multiplier. |
  | MonthlyPeriod | string | No | Associated monthly period. |

- **Response:** "Registration created successfully" (200).
- **Quirks:** This is the one create-style body where docs DO mark some fields
  required (`TaskID`, `Date`). Still confirm against the live API before relying on
  it (gate). The hours/minutes vs start/end-time pairing is unspecified — likely
  one or the other.
- **Errors:** 401 invalid auth token; 500 "Registration could not be created" (`ErrorResponse`).

### GET /v{version}/task/filter
- **Purpose:** Get a filtered list of extended task information ("GetAllByFilter").
- **Docs:** https://docs.timelog.com/rest/method/getallbyfilter
- **Params (query, all optional except version):**

  | Param | Type | Required | Notes |
  |---|---|---|---|
  | projectId | int | No | Filter by project. |
  | taskId | int | No | Filter by task id. |
  | taskGuid | string | No | Filter by task GUID. |
  | isActive | bool | No | Filter by active state. |
  | taskStatus | int | No | Enum — see below. |
  | isBillable | bool | No | Filter by billable. |
  | startDate | string (date) | No | Inclusive lower bound. |
  | endDate | string (date) | No | Inclusive upper bound. |

- **Enums:** `taskStatus` (int) — docs page only partially renders the table
  (`0 = NotSet`, `1 = New`, `2 = InProgress`, "etc."). Full value→label mapping
  undocumented (gate).
- **Response:** Extended-task list (richer than `TaskApiReadModel`). The docs page's
  rendered "response model" table only showed `ErrorResponse` fields (Code, Details,
  DeveloperNote, Message, Parameters, Url) — the success model did not render; treat
  the success shape as a TAFList of extended task objects and confirm via gate.
  Apply TAFList paging caveat (10-row default without `$pagesize`).
- **Quirks:** Slug has **no** `task_` prefix on the docs site (`/rest/method/getallbyfilter`).
- **Errors:** 401 invalid auth token; 500 "Failed to retrieve the list of task".

### GET /v{version}/task/get-recently-registered
- **Purpose:** List tasks the user has recently registered time on ("GetRecentlyRegistered").
- **Docs:** https://docs.timelog.com/rest/method/task_getrecentlyregistered
- **Response model:** `TaskApiReadModel`.
- **Params (query):**

  | Param | Type | Required | Notes |
  |---|---|---|---|
  | includeFavouriteOnly | bool | No | Show only favourite tasks. |

- **Response:** Task list (TAFList wrapping; 10-row paging caveat applies).
- **Errors:** 401 invalid auth token; 500 request failed.

### GET /v{version}/task/travel-time-task-for-time-tracking
- **Purpose:** List all travel-time tasks for a project ("GetTravelTimeTaskForTimeTrackingByProjectID").
- **Docs:** https://docs.timelog.com/rest/method/task_gettraveltimetaskfortimetrackingbyprojectid
- **Response model:** `TaskApiReadModel` (entries have `IsTravelTimeTask = true`).
- **Params (query):**

  | Param | Type | Required | Notes |
  |---|---|---|---|
  | projectID | int | Yes | Project to list travel-time tasks for. |

- **Response:** Task list (TAFList; 10-row paging caveat applies).
- **Quirks:** Runtime path (`/task/travel-time-task-for-time-tracking`) takes
  `projectID` as a query param despite the method name ending "...ByProjectID".
- **Errors:** 401 invalid auth token; 500 request failed.

---

## Time-tracking search helpers

All return `TaskApi​ReadModel` lists of tasks the current user may register time
on (TAFList wrapping; 10-row paging caveat applies to each). Documented concisely.
⚠️ Note: the docs mark `searchAll` / `includeFavouriteOnly` as **required** on some
of these and **optional** on others — inconsistent across pages; treat
required-ness of the boolean params as unconfirmed (gate).

### GET /v{version}/task/search-by-customer
- **Purpose:** Search tasks (registrable) belonging to a customer.
- **Docs:** https://docs.timelog.com/rest/method/task_searchbycustomer
- **Params:** `searchText` (string, req — customer name/nickname/number),
  `searchAll` (bool, opt).
- **Response:** `TaskApiReadModel` list.

### GET /v{version}/task/search-by-project
- **Purpose:** Search tasks (registrable) belonging to a project.
- **Docs:** https://docs.timelog.com/rest/method/task_searchbyproject
- **Params:** `searchText` (string, req — project name/number),
  `searchAll` (bool, docs say req).
- **Response:** `TaskApiReadModel` list.

### GET /v{version}/task/search-for-time-tracking
- **Purpose:** Search tasks (registrable) by task name/number, with task info.
- **Docs:** https://docs.timelog.com/rest/method/task_searchfortimetracking
- **Params:** `searchText` (string, req), `searchAll` (bool, opt),
  `includeFavouriteOnly` (bool, opt).
- **Response:** `TaskApiReadModel` list.

### GET /v{version}/task/search-for-time-tracking-order-by-recent-registration
- **Purpose:** As search-for-time-tracking, ordered by recent registration.
- **Docs:** https://docs.timelog.com/rest/method/task_searchfortimetrackingorderbyrecentregistration
- **Params:** `searchText` (string, req), `searchAll` (bool, docs say req),
  `includeFavouriteOnly` (bool, docs say req).
- **Response:** `TaskApiReadModel` list.

### GET /v{version}/task/search-for-time-tracking-by-customer-id
- **Purpose:** Search registrable tasks belonging to a customer (by id).
- **Docs:** https://docs.timelog.com/rest/method/task_searchfortimetrackingbycustomerid
- **Params:** `customerID` (int, req), `searchText` (string, req),
  `searchAll` (bool, docs say req), `includeFavouriteOnly` (bool, docs say req).
- **Response:** `TaskApiReadModel` list.

### GET /v{version}/task/search-for-time-tracking-by-customer-id-order-by-recent-registration
- **Purpose:** As above, ordered by recent registration.
- **Docs:** https://docs.timelog.com/rest/method/task_searchfortimetrackingbycustomeridorderbyrecentregistration
- **Params:** `customerID` (int, req), `searchText` (string, req),
  `searchAll` (bool, opt).
- **Response:** `TaskApiReadModel` list.

### GET /v{version}/task/search-for-time-tracking-by-project-id
- **Purpose:** Search registrable tasks belonging to a project (by id).
- **Docs:** https://docs.timelog.com/rest/method/task_searchfortimetrackingbyprojectid
- **Params:** `projectID` (int, req), `searchText` (string, req),
  `searchAll` (bool, opt), `includeFavouriteOnly` (bool, opt).
- **Response:** `TaskApiReadModel` list.

### GET /v{version}/task/search-for-time-tracking-by-project-id-order-by-recent-registration
- **Purpose:** As above, ordered by recent registration.
- **Docs:** https://docs.timelog.com/rest/method/task_searchfortimetrackingbyprojectidorderbyrecentregistration
- **Params:** `projectID` (int, req), `searchText` (string, req),
  `searchAll` (bool, docs say req).
- **Response:** `TaskApiReadModel` list.

### GET /v{version}/task/search-for-time-tracking-by-project-id-order-by-travel-time-task
- **Purpose:** As above, ordered by travel-time task.
- **Docs:** https://docs.timelog.com/rest/method/task_searchfortimetrackingbyprojectidorderbytraveltimetask
- **Params:** `projectID` (int, req), `searchText` (string, req),
  `searchAll` (bool, opt).
- **Response:** `TaskApiReadModel` list (travel-time tasks ordered first).

---

## For the empirical gate

- **`TaskApiCreateModel` required fields (CreateTask, CreateSubTask, ValidateNewTask).**
  Docs AND swagger mark every field optional (handoff verified swagger
  `required: None`). ADR 0005 precedent: this is often false. Hypothesis: `TaskName`
  and `ProjectID` are required for CreateTask; `ParentTaskID` (and likely `TaskName`)
  required for CreateSubTask. Probe with `validate-new-task` first (it exists to
  test creatability), then confirm against POST /task.
- **`PaymentRecognitionModel` enum (int).** Value→label mapping undocumented on all
  three create/validate pages. Hypothesis: small int enum (e.g. recognition by
  invoice date / by registration / fixed). Confirm allowed values against live API.
- **`taskStatus` enum (int) on GET /task/filter.** Docs render only a partial table
  (`0 NotSet, 1 New, 2 InProgress, …`). Full value→label mapping unconfirmed.
- **`searchAll` / `includeFavouriteOnly` required-ness on search-* endpoints.** Docs
  pages disagree (required on some, optional on others). Hypothesis: both are truly
  optional booleans defaulting to false. Confirm.
- **GET /task/filter success response shape.** The docs method page failed to render
  the success model (only the `ErrorResponse` table appeared). Hypothesis: TAFList of
  extended task objects (superset of `TaskApiReadModel`, incl. status/date fields).
  Capture a live response to lock the schema.
- **`TimeRegistrationApiCreateModel` hours vs start/end pairing.** Docs list both
  `Hours`/`Minutes` and `StartTime`/`EndTime` as optional. Hypothesis: supply one
  pairing or the other; confirm which combinations the API accepts.
