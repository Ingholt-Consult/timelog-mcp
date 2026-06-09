# TimeLog Reports & Analytics

This document is a reference to the standard reports available in TimeLog's Reports & Analytics area. It describes what each report shows, its exact TimeLog name, the filters and dimensions it offers, and the business question it answers. The focus is on the product's reporting capabilities — what the reports are called and what they can do — not on any API.

All reports are reached from the **Reports** menu, which groups reports by subject and lets users search and filter to find the right one. Most reports share a common pattern: a **View** panel where you set filters (typically a time period plus relevant dimensions), a **Show** button to run the report, and **View options** for toggling display formats (for example hours versus percentage) and showing or hiding columns and empty rows. Many reports let you click a number or link to drill down into the underlying time registrations.

## Reports menu, List view and Table view

- The **Reports** menu shows every report available to the signed-in user, organised into subject groups, each with a description of the data shown and the filters available.
- **Reports – List view** presents reports as a long list divided into subject groups, with a description under each report.
- **Reports – Table view** presents the same reports grouped into boxes per subject group; hovering over a report name reveals its data and available filters.
- Users can switch display between box view, list view and table view using icons in the upper-right corner.
- Reports can be searched by report name, by the data they include, or by the filters they offer, and separate search words can be combined to narrow results.
- Report visibility is governed by user permissions, and administrators can turn individual reports on or off (Enable/disable reports).

## Time registration accuracy

- Exact name: **Time registration accuracy**.
- Evaluates how effectively and how promptly employees register their time after the work is performed.
- Shows a **Timeliness Factor** based on the number of days between when work was performed and when the entry was recorded; a value above 1 indicates delays of more than one day.
- Shows the **Latest Time Entry** date, meaning the date the most recent entry belongs to (not its creation date).
- Filters are set under **View** and applied with **Show**.
- Answers: How long does it take employees to record their time, and are they registering consistently and on time?

## Last time registration

- Exact name: **Last time registration**.
- Provides an overview of when each employee last tracked their time.
- Lets you tick the boxes next to employees and send them customised email reminders about late time registration.
- Answers: Which employees have fallen behind on time tracking, and how can a manager prompt them to catch up?

## Timesheet status

- Exact name: **Timesheet status**.
- Gives a graphical overview of employees' timesheet completion and approval status, using colour-coded icons.
- Status icons: green checkmark = timesheet approved; green dot = completed and closed; yellow dot = completed and open; red dot = empty.
- Filters by period via the **View** dropdown.
- Includes a **Request to close** link that sends automated emails prompting employees to submit their timesheets.
- Note: locking an accounting period does not automatically update timesheet status; employees must still actively submit their timesheets.
- Answers: Have employees closed and submitted their timesheets for the period?

## Absence calendar

- Exact name: **Absence calendar**.
- Provides a graphical overview of employee absence categorised by absence code over a selected period.
- Colour coding: green = holiday; dark grey = illness; light grey = weekend; dark pink = non-compensated absence; blue = compensated absence; pink = public holiday.
- Filters: time period (display by start date, week number or month name), one or more absence codes, and forward/backward calendar navigation.
- Supports **Save filters** to preserve search parameters and a default-filter option via Page settings, plus a **Load data automatically** option; requires 100% browser zoom for correct colours.
- Answers: Which employees are absent in a given period, and by what type of absence, supporting workforce planning and absence-pattern recognition.

## Vacation calendar

- Exact name: **Vacation calendar**.
- Provides a personal overview of public holidays and planned and held vacation for a chosen period.
- Filters: time period and display format (start date, week numbers or month name); navigate forward/backward and hover for details.
- Uses the same colour coding as the absence calendar (vacation, illness, weekend, compensated/non-compensated absence, public holiday).
- Answers: When am I and my colleagues taking time off, and how do public holidays align with planned absences?

## Employee time – Customers and projects

- Exact name: **Employee time – Customers and projects**.
- Shows how employee work time is distributed across customers and projects, in two tables: registrations by customer and registrations by project.
- Filters set under **View** and applied with **Show**; hold Ctrl and left-click to select multiple employees.
- **View options** toggle the measurement between hours and percentage.
- Answers: How is employee time allocated across different customers and projects?

## Employee time – Project types and task types

- Exact name: **Employee time – Project types and task types**.
- Shows employee registrations distributed on project types and on task types, each in its own table.
- Filters via the **View** panel; **View options** let you display hours or percentages and include or exclude the project-type and task-type tables.
- Answers: How is employee time distributed across different project types and task categories?

## Work – project types

- Exact name: **Work – project types**.
- Shows time registrations distributed across all project types, as both hours and monetary value, for a selected period.
- Filters: time period via **View**; **View options** can hide empty lines.
- Click hour totals to see the individual time registrations behind them.
- Answers: Which project types generate the most work and revenue?

## Internal/external – analysis

- Exact name: **Internal/external – Analysis**.
- Shows how much of an employee's time is spent on projects and calculates each employee's utilisation percentage on external (billable) work.
- Filters/dimensions: employee (expandable to individual projects), time period, and a configurable External% target threshold.
- Columns: Work (hours, with overtime percentage), Internal (%), External (%), vacation hours and normal working time; external utilisation is calculated as External (h) / (Norm. (h) − Vacation (h)).
- Internal company projects are configured in System Administration; click numeric values to drill into the registrations.
- Answers: How efficiently are employees allocated between billable external work and internal work relative to their contracted hours?

## Absence/productivity

- Exact name: **Absence/productivity**.
- Gives an overview of employee absence and working time, including normal working time and registrations on internal versus external work.
- Filters/dimensions: time period, internal versus external categorisation, projects, support cases and salary codes (a Distribution section).
- Covers all salary codes regardless of whether the cost is company-paid or employee-paid; data can be shown as hours or percentages.
- Answers: How are employee hours allocated between internal work, external projects and various salary classifications during a period?

## Invoicing percentage

- Exact name: **Invoicing percentage**.
- Shows the invoicing percentage for each employee based on available and booked hours for a selected period.
- Filters/dimensions: time period, individual employees and a project-level breakdown (expandable via a plus sign).
- Columns include Work in hours — Registered hours and Reg. %, Booked-as-Revenue hours (BAR) and BAR %, against a target invoicing percentage (70%) — and Work in currency — cost of registered hours, registered value and BAR value.
- Excludes external user profiles; amounts are based on registration date rather than booking date.
- Answers: What share of each employee's available working time was booked as revenue during the period?

## Employee key figures

- Exact name: **Employee key figures**.
- Shows key figures per employee per month, with the ability to set goals so that underperformers are marked in red.
- Dimensions: employee and month.
- Columns: Invoicing % and hours, External % and hours, Registration % and hours, Cost (EUR), Actual/Expected revenue (EUR), Invoiced value (EUR), Write-off value (EUR) and Non-booked value (EUR).
- Answers: How productive and billable is each employee per month, and are they meeting invoicing targets?

## Key Performance Index (KPI)

- Exact name: **Key Performance Index (KPI)**.
- Presents key numbers for employees and the company through graphs and figures for performance tracking.
- Filters/dimensions: employee selection, time period (defaults to the current month) and an optional comparison with the previous two months.
- Metrics: registered value (Reg. EUR) and invoiced value (Inv. EUR), with budget-variance indicators (red below budget, green above) and a 12-month overview with hover-for-value detail.
- Budgets are configured by system administrators via the Budget – employees and Budget – company reports.
- Answers: How are employees and the company performing against budgeted key numbers across the selected period?

## Project factor

- Exact name: **Project factor**.
- Shows the results factor of projects depending on setup (registered work, estimated work or work booked as revenue).
- Filters/dimensions: project selection via **View**, a Project Factor interval (From/To), a status date for the calculation, and View options for extra fields.
- Columns: project master data, work amounts in EUR by data type, the Project Factor result, plus tasks and expenses/travels tables; optional MTD and YTD columns when "Show all fields" is enabled.
- Answers: How profitable or efficient is each project based on registered hours, estimated work or revenue booking versus expected thresholds?

## Budget follow-up

- Exact name: **Budget follow-up**.
- Provides an overview of the budget and progress of projects, covering contract value, budgets and remaining value/hours.
- Use cases: comparing contract values and budgets (hours and amounts), computing work in progress, tracking fixed-price projects and spotting projects over budget.
- Filters/View options: time period, show working hours as time or monetary value, include/exclude travels and outlays, show/hide internal projects and projects without registrations in the period, and show negative remaining budget or display "0" instead.
- Click links to open registration overviews or navigate directly to a project.
- Answers: Which projects have exceeded their budget, and how is budget progress tracking across the portfolio?

## Project assignments

- Exact name: **Project assignments**.
- Gives a quick overview of the projects and tasks you are allocated to and how much time you have tracked on active project tasks.
- Filters/dimensions: view format (table or Gantt chart), include general projects, column visibility, and employee selection (for coordinators).
- Columns: Allocated hours (Alloc. h.), Tracked/Actual hours (shown in red when exceeded), project and task details, and optional customer, customer number and project number.
- Clicking actual hours opens a detailed popup with decimal-level breakdowns; the current view can be saved as the default.
- Answers: Are budgeted time and project end dates still realistic given actual versus allocated hours?

## Full project overview

- Exact name: **Full project overview**.
- Presents all relevant project data in a single stylised report covering financials, completion status, time and planning visualisations.
- Filters/dimensions: project status, department, project manager and individual project selection.
- Sections/metrics: project overview (KPIs), project information and totals, project plan – hours (budgeted, allocated, registered), contribution margin, level of completion and a Gantt chart.
- Export options: **Word**, **Excel** and a printable format.
- Answers: What is the complete financial and operational status of a specific project for stakeholder communication?

## Time registrations report

- Exact name: **Time registrations report**.
- Presents all time registrations within the selected filter, including customer, project, task and comments.
- Filters/dimensions: selectable time period plus customer, project and task; columns are customisable via **View options**.
- Export options: a standard export of the visible screen data and a full export that includes all underlying data behind the registrations, in multiple formats.
- Answers: Provides a complete, auditable extract of all time-tracking data across projects and customers — useful for billing verification and analysis in tools like Excel.

## Pivot report

- Exact name: **Pivot report**.
- Useful for extracting time registrations with different accruals and groupings; an analytical extraction of registration data.
- Filters/organisation: View filters, customisable grouping options, and a choice of view type (table or diagram).
- Table options: choose which data to include and which accrual type to display (a blank accrual shows totals for the selected period).
- Diagram options: choose the diagram type and whether to present values as hours or percentage.
- Answers: How do time registrations look when organised flexibly across multiple dimensions with configurable accruals?

## Notes on filtering and export (cross-cutting)

- Most reports use a **View** panel for filters (commonly time period plus dimension selections) and a **Show** button to run the report.
- **View options** typically control display format (hours versus percentage), column visibility and hiding empty rows.
- Drill-down is common: clicking a number or link opens the underlying registrations or navigates to the related project.
- Dedicated export to **Word**, **Excel** or print is documented for the Full project overview, and the Time registrations report offers a standard and a full data export in multiple formats; other reports do not document specific export formats in the help center.
- The Absence calendar supports saving filters and setting a default filter; report availability per user is controlled by permissions and the Enable/disable reports administration setting.

## Sources

- https://help.timelog.com/en/time-registration-accuracy
- https://help.timelog.com/en/last-time-registration
- https://help.timelog.com/en/employee-time-customers-and-projects
- https://help.timelog.com/en/timesheet-status
- https://help.timelog.com/en/absence-calendar
- https://help.timelog.com/en/help-center/reports/vacation-calendar
- https://help.timelog.com/en/help-center/reports/employee-time-project-types-and-task-types
- https://help.timelog.com/en/help-center/reports/work-project-types
- https://help.timelog.com/en/help-center/reports/internalexternal-analysis
- https://help.timelog.com/en/help-center/reports/absenceproductivity
- https://help.timelog.com/en/help-center/reports/invoicing-percentage
- https://help.timelog.com/en/help-center/reports/employee-key-figures
- https://help.timelog.com/en/help-center/reports/key-performance-index
- https://help.timelog.com/en/help-center/reports/project-factor
- https://help.timelog.com/en/help-center/reports/budget-follow-up
- https://help.timelog.com/en/help-center/reports/project-assignments
- https://help.timelog.com/en/help-center/reports/full-project-overview
- https://help.timelog.com/en/help-center/reports/time-registrations
- https://help.timelog.com/en/help-center/reports/pivot-report
- https://help.timelog.com/en/help-center/reports/reports-list-view
- https://help.timelog.com/en/help-center/reports/reports-table-view
- https://help.timelog.com/en/using-timelog
