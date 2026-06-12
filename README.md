# TimeLog MCP (Phase 1)

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

| Can | Cannot (Phase 1) |
|---|---|
| List projects (filter by customer / active) | Create or delete projects |
| Read one project in full | Create/update tasks or contracts |
| List project types, categories, departments | Touch time registrations, expenses, invoicing |
| List customers, contacts, users, employee types | Create employees / change working time |
| Show the connected user (`whoami`) | Set StartDate / EndDate (not in the API update model) |
| Update project fields (11 fields, read-modify-write, one project per call) | Bulk-update many projects in one call |
| Set project status (0–6) and time-tracking toggle | Resource booking / allocation |

Mass changes are orchestrated in conversation: list → confirm the set → one
update per project → per-project result. See `docs/superpowers/specs/` for the
design and `docs/adr/` for the boundary decisions.

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
