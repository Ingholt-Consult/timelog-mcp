# TimeLog MCP

A small localhost server that lets **Claude** administer your firm's TimeLog
account through TimeLog's REST API (v1). You talk to Claude in plain language
("ret projekttypen på alle de her sager til …"), and Claude uses this server's
tools to read and change things in TimeLog on your behalf.

It runs on your own machine and acts as **you** — it uses your personal TimeLog
token, so it can only do what your own TimeLog user is allowed to do.

---

## Getting started (one-time setup)

You need [Node.js](https://nodejs.org/) installed.

### 1. Add your TimeLog token

Copy `.env.example` to `.env` and fill in:

```
TIMELOG_BASE_URL=https://app5.timelog.com/ingholtconsult2/api/v1
TIMELOG_PAT=<your Personal Access Token>
```

- Get the token in TimeLog: **Systemadministration → Personal Access Tokens**.
  Your user must have project-administration rights.
- ⚠️ **Don't wrap the token in quotes** unless your tooling strips them again —
  a stray `"` sent with the token gives `401 Authorization has been denied`.

### 2. Build and start the server

```bash
npm install
npm run build
node dist/index.js
```

It listens on `http://localhost:8787/mcp` (set `PORT` in `.env` to change it).
Leave it running while you work with Claude.

### 3. Connect Claude to it

In **Claude Code**, register the running server once:

```bash
claude mcp add --transport http timelog http://localhost:8787/mcp
```

(In Claude Desktop, add it as an HTTP/remote MCP server pointing at the same URL.)
The server already reads your token from `.env`, so you don't pass it again. After
this, Claude can see the TimeLog tools — just ask it to do things.

---

## What you can ask Claude to do

**Look things up / get an overview**
- "Vis alle aktive projekter for kunde X."
- "Hvilke projekttyper og -kategorier findes der?"
- "Vis opgavetræet og kontrakterne på projekt 1034."
- "Hvem er jeg logget ind som?" (Claude uses `whoami`.)

**Clean up project settings — the headline use case**
- "Ret projekttypen til 'Rådgivning' på følgende sager: …"
- "Sæt status på projekt 1034 til Afsluttet."
- Claude changes **one project at a time** and shows you what it'll do first.

**Build a project**
- "Opret et nyt projekt fra skabelonen 'Fastpris – Småsag' til kunde X."
- "Tilføj en underopgave 'Projektering' under opgave 12."
- "Tilføj en fastpris-kontrakt og en betalingsplan."

**Plan resources (booking)**
- "Hvem har arbejdstimer i uge 30?" (reads capacity)
- "Book Anders 8 timer på opgave 34 i uge 26."

**A note on how Claude works here:** for anything that *changes* TimeLog, Claude
first shows you a **preview** of exactly what it will do and waits for your "ja"
before writing. It works one thing at a time and reports back per item — there is
no silent bulk change.

---

## What it can do — and what it can't

| ✅ Can | ❌ Can't |
|---|---|
| Read projects, tasks, contracts, payments, hourly rates, and all the lookup lists (types, categories, departments, customers, contacts, users, employee types, templates) | **Delete anything** — TimeLog's API has no delete for projects, tasks, contracts or payments |
| Update project fields (name, customer, type, category, managers, budget, …) | Set a project's **start/end date** (not in the update model) |
| Change a project's **status** (e.g. Afsluttet, Arkiveret) | **Bulk-change** many projects in one go (it's deliberately one-at-a-time) |
| Create a project **from a template**, add tasks/sub-tasks, add T&M and fixed-price contracts and payment-plan lines | Create or edit **project templates** — that's a manual step in TimeLog's UI (see below) |
| Read an employee's **capacity** over a period (`get_employee_workload`) | **Undo a booking** — `/workload/book` has no delete; remove it manually in the Resource Planner |
| **Book** hours for an employee on a task (`book_workload`) | Tell you for certain whether a booking **overbooks** someone — TimeLog's capacity data doesn't expose already-booked hours, so Claude shows capacity and you judge |
| | **Allocate** an employee to a task beyond its budget — no confirmed API for it yet (see ADR 0007) |
| | Touch **time registrations, expenses, salary, or invoicing**, or create employees |

Two safety facts worth remembering: **nothing can be deleted via the API**, and a
**booking can't be undone** through Claude — so confirm bookings carefully (Claude
will warn you).

---

## Building a new project template

The REST API can't create or edit templates, so this is the one thing you do by
hand:

1. Ask Claude to build a project shaped exactly like the template you want (from an
   existing template + tasks + contracts).
2. In TimeLog's web UI, open that project and choose **Gem som skabelon**.
3. The new template then shows up next time you ask Claude to list templates.

---

## For developers

The server is Streamable HTTP MCP; the PAT is read from `TIMELOG_PAT` or, for a
multi-admin setup, per request via an `Authorization: Bearer <pat>` header. Design
docs live in `docs/superpowers/specs/`, boundary decisions in `docs/adr/`, the
domain glossary in `CONTEXT.md` / `docs/ubiquitous-language.md`, and the live-API
quirks in `docs/timelog-api/` + the runbooks under `docs/runbooks/`.

> **Updates are read-modify-write:** `PUT /project/{id}` is a full replace, not a
> partial update (ADR 0005). `update_project` reads the project and merges your
> changes, so you still pass only the fields to change. The update model has 11
> fields; `DepartmentID`/`AccountManagerID`/`PartnerID` aren't updatable, and
> `LanguageID` isn't returned by GET (sent only if you pass it).

> **Status labels:** `ProjectStatus` is a raw integer 0–6: 0=Quote, 1=Approved,
> 2=InProgress, 3=OnHold, 4=Completed, 5=Archived, 6=Cancelled.

> **Lists need `$pagesize`:** TimeLog's list endpoints silently return only the
> first 10 rows unless paged with the `$page`/`$pagesize` query options — by
> design. The tools pass `$pagesize` to get full lists. See `CONTEXT.md` › API
> conventions.
