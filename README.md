# TimeLog MCP (Phases 1–3)

A localhost MCP server for administering TimeLog projects via the REST API (v1).

## Configure

Copy `.env.example` to `.env` and set:

- `TIMELOG_BASE_URL` — e.g. `https://app5.timelog.com/ingholtconsult2/api/v1`
- `TIMELOG_PAT` — a Personal Access Token for a user with project-administration rights
- `PORT` — optional, defaults to 8787

## Run

```bash
npm install
npm run build
node dist/index.js
```

The server listens on `http://localhost:<PORT>/mcp` (Streamable HTTP). The PAT is
read from `TIMELOG_PAT`, or per request from an `Authorization: Bearer <pat>` header.

## Capabilities

| Can | Cannot |
|---|---|
| List projects (filter by customer / active); read one in full | Delete anything — the API has no DELETE for projects, tasks, contracts, or payments |
| List project types, categories, departments, customers, contacts, users, employee types | Create or edit **project templates** (no template-write endpoint — see below) |
| Show the connected user (`whoami`) | Set StartDate / EndDate on the project update model |
| Update project fields (11 fields, read-modify-write, one project per call) | Bulk-update many projects in one call |
| Set project status (0–6) and time-tracking toggle | Touch time registrations, expenses, or invoicing |
| **Create a project from a template** (`create_project_from_template`) | Create employees / change working time |
| **Add tasks and sub-tasks** (`create_task`) | Undo a **Booking** — `/workload/book` has no DELETE (remove it manually in the Resource Planner UI) |
| **Add T&M and fixed-price contracts** (`create_time_material_contract`, `create_fixed_price_contract`) | Compute an overbooking verdict — the capacity projection does not expose already-booked hours |
| **Add payment-plan lines** (`create_payment`) | **Allocate** an Employee to a Task beyond its budget — no confirmed v1 write endpoint (see ADR 0007) |
| Read the supporting data: templates, tasks, task types, contracts, payments, hourly rates | |
| **Read Employee Kapacitet over a period** (`get_employee_workload`) | |
| **Book hours for an Employee on a Task** (`book_workload`, synthetic capacity preview) | |

Every write tool runs in **preview** mode by default — it validates against
TimeLog's paired `validate-*` endpoint and shows exactly what would be created —
and only writes when called again with `mode: "execute"` after you confirm.
`book_workload` is the exception: `/workload/book` has no `validate-*` endpoint and
no undo, so its preview is *synthesised* — it reads the Employee's capacity for the
period and warns that a Booking cannot be reversed via the API (see ADR 0007).

Mass changes are orchestrated in conversation: list → confirm the set → one
write per resource → per-resource result. See `docs/superpowers/specs/` for the
design and `docs/adr/` for the boundary decisions.

### Building a new project template

The REST API cannot create or edit templates. The supported path is:

1. Use `create_project_from_template` (or an existing project) plus `create_task`
   and the contract tools to construct a project shaped exactly like the template
   you want.
2. In TimeLog's web UI, open that project and choose **Save as template**.
3. The new template then appears in `list_project_templates` for future use.

> **Updates are read-modify-write:** `PUT /project/{id}` is a full replace, not a
> partial update (verified empirically — see ADR 0005). `update_project` reads the
> project and merges your changes, so callers still pass only the fields to change.
> The update model has 11 fields; `DepartmentID`/`AccountManagerID`/`PartnerID` are
> not updatable, and `LanguageID` is not returned by GET (sent only if you pass it).

> **Status labels:** `ProjectStatus` is a raw integer 0–6, confirmed via the
> project's embedded action: 0=Quote, 1=Approved, 2=InProgress, 3=OnHold,
> 4=Completed, 5=Archived, 6=Cancelled.

> **Classification lists need `$pagesize`:** TimeLog's list endpoints (e.g.
> `GET /ProjectType`) silently return only the first 10 rows unless paged with
> TimeLog's `$`-query options (`$page`, `$pagesize`, `$expand`) — by design, not a
> bug. The list tools pass `$pagesize=100` to return the full list. See
> `CONTEXT.md` › API conventions.
