# TimeLog product reference

Reference documentation of what the TimeLog product can do and what its
features are called, scraped from TimeLog's public Help Center
(help.timelog.com) in June 2026. The purpose is an informed basis for deciding
what this MCP server should expose — feature knowledge first, scope decisions
second.

These docs describe the **product**. What the **REST API (v1)** actually
exposes is a separate, narrower question, answered against
`../../timelog-api-spec.json` (the swagger).
A feature documented here is only an MCP candidate if the API exposes it.

## Primary focus

Per the project owner, the MCP's scope centers on **Projects** and
**Employees / Resources**. The other areas are documented for context and to
understand how the focus areas connect to the rest of the product.

## Feature areas

- [01 — Projects](01-projects.md) — **Primary.** Project setup, Project Type,
  Project Category, Project Status, Project Stage, Tasks/WBS, Contracts,
  Project Templates, budgets.
- [04 — Employees and resources](04-employees-and-resources.md) — **Primary.**
  Employee profiles, Employee Overview, Resource Planner, allocations,
  capacity, Resource Groups, salary management.
- [02 — Time and expense registration](02-time-and-expense-registration.md) —
  Timesheet, time registrations, timestamps, personal/travel/mileage expenses.
- [03 — Reports](03-reports.md) — Standard report library (accuracy,
  utilization, budget follow-up, pivot, timesheet status).
- [05 — Invoicing](05-invoicing.md) — Invoices, credit notes, debtor list,
  contracts and payment plans, One Click Invoicing.
- [06 — Customers and CRM](06-customers-and-crm.md) — Customers, Contacts,
  CRM module, Pipeline, opportunities, Groups.
- [07 — System administration](07-system-administration.md) — Roles and
  rights, approval processes, price lists, departments, MLE, integrations.
- [08 — Absence and approval](08-absence-and-approval.md) — Absence codes,
  salary accounts/balances, vacation/absence calendars, timesheet approval and
  closure.

## Notes on coverage

- Several detail pages under TimeLog's `/guides/` and `/reports/` paths are
  JS-rendered and returned 404 to the scraper; those facts were captured from
  TimeLog's own search snippets instead and are flagged inline in the source
  docs.
- Terminology is recorded using TimeLog's exact names so code, API, and product
  UI stay aligned (see also `../../CONTEXT.md`).
