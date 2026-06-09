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
| Update project fields (14 fields, one project per call) | Bulk-update many projects in one call |
| Set project status (0–6) and time-tracking toggle | Resource booking / allocation |

Mass changes are orchestrated in conversation: list → confirm the set → one
update per project → per-project result. See `docs/superpowers/specs/` for the
design and `docs/adr/` for the boundary decisions.

> **Status labels:** `ProjectStatus` is a raw integer 0–6; the label per value is
> not yet confirmed for this account. Verify in the UI before relying on a number.
