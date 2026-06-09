# System Administration & Settings

Reference documentation for the System Administration area of TimeLog. This is where administrators configure how the product behaves for the whole organization: who can do what (roles and rights), how time and expenses get approved, how projects and tasks are set up by default, financial rates, organizational structure (departments and legal entities), salary handling, integrations, and each user's personal preferences. Most settings live under the **System administration** menu, organized into sub-sections such as Employees, Projects, Finance, General settings, and Integrations & API.

## User Roles and Rights

- A **role** establishes the link between users (employees) and system functionality, defining which reports, areas, and features an employee can access.
- TimeLog uses **role-based access control**: an employee must have at least one role and may be assigned several roles at once.
- Roles are managed under **System administration → Employees → Roles and rights management**.
- Creating a role involves entering a role name and description, selecting the accessible areas/pages, and configuring privileges (for example, whether the role can track time for the employee only and/or for others).
- A role can optionally be granted access to the System administration pages themselves.
- Editing a role (adding or removing areas via checkboxes) applies automatically to every employee who holds that role.
- A role can only be deleted once it is unlinked from all employees; bulk deletion is available via the "Select action" menu.
- Typical functional role examples include bookkeeper, approver, project manager, and salary manager.
- An **employee-specific role** can grant individual exceptions to a single employee via the customer card (Search employees → Employee name → Edit employee → Employee specific role).

## User Rights Overview

- The **User rights overview** (System administration → Employees → User rights overview) lets administrators audit who has which roles and permissions.
- Results can be filtered by department when the department structure feature is in use; otherwise all employees are shown.
- Three views are available: links between roles and employees, links between roles and areas/pages, and links between employees and user rights.
- The overview supports exporting the rights data to Excel for documentation or review.

## Approval Settings

- Approval workflows are configured under **System administration → Approval processes** and cover timesheets, expenses, and invoices/vouchers.
- **Timesheet approval flow** offers three options: no approval; approval by the immediate manager only; or a two-step flow approved first by the project manager and then by the immediate manager.
- **Expense approval flow** is built from individual steps, letting administrators decide how many approval steps apply; expenses are processed via the Approve Expenses report in the Employees menu.
- **Invoices and vouchers**: administrators can enable a "Ready for booking" button on draft invoices, separating the role that prepares drafts from the role that books them as a quality-assurance step.
- **Timesheet closure rules** let administrators warn or block submission, for example a warning or block when tracked time is below standard hours, or when any week has 0 hours registered.

## Time Tracking Configuration

- Time tracking factors are set under **System administration → Time tracking**, applying to the whole organization.
- **Time format** can be decimal (1.5) or time (1:30), and the choice affects all flex and billable calculations.
- Feature toggles include the stop watch in TimeLog Tracker for Desktop, mandatory comments on registrations, copying the previous week's entries, and showing milestones in timesheets.
- **Rounding of time registrations** (requires Invoicing Advanced) automatically adjusts billable hours while keeping salaried and billable time distinct.
- **Overtime factor** (requires Invoicing Advanced) sets a percentage multiplier (whole numbers, must include 100) that adjusts the hourly rate on a registration; for example a 150% factor turns a 100 EUR rate into 150 EUR.
- **Timesheet view defaults** determine which tasks employees see: all tasks, favourites only, tasks with hours, or the employee's project assignments.
- **Flex calculation** settings control whether normal working time and flex balance appear in the timesheet, and the calculation start date (today, yesterday, or Sunday last week).
- A **user-defined comment field** can add an extra documentation field with configurable validation (mandatory or task-level) and input type (all characters or whole numbers).

## Project Module Settings

- Configured under **System administration → Projects → Project module settings**; settings apply uniformly across all projects in the instance.
- **Project features** control options such as milestones, baselines, drop-down sorting, and hourly rates.
- **Project fields** govern reporting and invoicing information captured on individual projects.
- **Task features** include options such as task numbers, which make it easier to locate tasks in large project plans.
- **Task fields** allow supplementary per-task information to aid task identification.
- **Budgeting** controls the locking of budget amounts and hours.
- **Planning** configures start/end date behavior and how employees are assigned to tasks.
- Disabling unused features lets administrators simplify the project setup.

## Default Settings for New Projects

- Configured under **System administration → Projects → Default settings for new projects**; all settings apply only to projects created after the change.
- **Default setup for new projects** sets defaults for project status (Quotation, Approved, In progress), project type, project category, time-tracking scope (allocated employees, all employees, department-wide, or resource groups), default hourly rate source, and payment model.
- **Default setup for new tasks** sets task status (In progress or Not started), billability, and whether the task is included in capacity/resource planning.
- **Default task plan options** choose how new projects are populated: no tasks, a single task named after the project, a custom-named task, or a template-based plan with milestone allocation rules.

## Project Invoicing Settings

- Configured under **System administration → Projects → Project invoicing**.
- **Payment models** determine which invoicing models employees can choose for a project.
- **Billable marking** controls whether employees can flag time, expenses, and mileage as billable, with an optional default-checked state.
- **Invoice date locking** can tie the invoicing date to the end date of fixed-price tasks.
- **Default invoice text** lets administrators set standard heading and message text, with dynamic tags such as `<#ProjectName#>` and `<#ProjectNo#>` that are replaced automatically.

## Departments (Department Structure)

- **Departments** divide the organization into business units and allow data segmentation; the feature is available only in selected higher-tier TimeLog packages.
- Managed under **System administration → General settings → Departments**.
- Each department has a name, identifying number, an assigned **department manager**, an active/inactive status, and a position in the hierarchy.
- The hierarchy supports a main department with up to 3 levels of sub-departments.
- Editing a department applies throughout the system immediately, including historical records; creating a new department instead preserves pre-change data when separation is needed.
- A department can only be deactivated when all its connected projects and employees are deactivated, and can only be deleted when it has no project, employee, or registration links.
- Department filters are available across TimeLog for sorting and analyzing data, and roles/rights overviews can be filtered by department.

## Multiple Legal Entities (MLE)

- **MLE** lets organizations with several companies, offices, or group structures manage staff employed by one entity while working on projects owned or invoiced by another.
- A **legal entity** is a separate company/business unit; processes can be **global** (standardized across all entities) or **local** (adjusted per entity).
- Per-entity configuration includes hourly rates, employee costs, employee assignment, finance and salary integrations, number series, and role setup.
- Global configuration includes most system administration settings, currency conversion/exchange rates, and shared customers and contacts (customers are not entity-linked).
- MLE affects projects, invoicing, currencies, reporting, and access control via roles and rights; setup typically requires a TimeLog consultant and prior contact with TimeLog support.

## Hourly Rates (Rate Cards / Price Lists)

- Configured under **System administration → Finance → Hourly rates**; terminology includes hourly rates, price groups, and price lists (standard and customer-specific).
- Services are assigned hourly rates organized into **price groups**, with general hourly rates that can be applied to projects.
- Rates are shown in a list view (single price group) or matrix view (multiple price groups), and can be activated/deactivated (green status circle indicates active).
- **Customer-specific price lists** can be created, optionally copying data from an existing list.
- When rates change, administrators can update active projects immediately or defer via the indexation page; rate-name changes, new/deleted rates, and product-number changes can be batch-applied to projects.
- Standard hourly rates can only be deleted from the standard price list, not from a customer-specific price list.

## Employee Module Settings

- Configured under **System administration → Employees → Employee module settings**; these set default values used when creating new employees.
- **Employee ID** display can be enabled; if active, every employee needs an ID, and IDs are mandatory when salary integration is enabled.
- **Pay period** sets the default for new employees; changing it updates all employees, and with Advanced salary time administration individual pay periods can be set per employee.
- **Allowance legislation** sets the default applicable to employees.
- Advanced salary management components can be activated here: **salary accounts** (split salary/absence codes into accounts such as time off in lieu), **salary specification** (track supplement and paid-out codes), and **salary groups**.

## Salary Groups

- **Salary groups** differentiate salary and absence code configurations for groups of employees, useful when staff fall under different collective agreements.
- Enabling them requires three steps: activate advanced salary time registration on the system administration front page (Staff management); activate salary groups under Employees → Employee module settings (which also enables salary accounts and salary specification); and complete advanced setup of salary accounts, salary codes, and absence codes.
- Key terms: **salary accounts** (financial tracking categories), **salary codes** (registration options), **absence codes** (time-off categories), and a **matrix view** showing which accounts are activated per group.
- Administrators can create, edit, and delete salary groups, assign accounts via the matrix view, filter by active/inactive status, assign groups to individual employee cards, and manage flex and time-off-in-lieu settings.

## Personal Profile

- The **personal profile** holds an employee's own contact and identity information, edited via a pencil icon on hover and confirmed with a Save button.
- Editable profile fields include profile picture, first/last name, job title, and a comment field.
- Contact fields include email, direct number, mobile phone, instant messenger type and ID, and private phone; work phone numbers are entered in the contact section.
- Address fields include address line 1, address 2 (or CO address), postal code, and city.
- Social media fields include LinkedIn, Twitter, and Facebook profile links.

## Personal Settings

- **Personal settings** are reached via the arrow next to the user's name in the top-right corner and control individual preferences (not organization-wide).
- **System settings** include language, preferred start page after login, colour scheme, and the shortcut key for the advanced "super search" field.
- **Front page settings** choose which info boxes appear: TimeLog CRM links, the project manager info box, and Messages from TimeLog (business information, events, and articles).

## Integrations & API

- Integrations are configured under **System administration → Integrations & API → Integrations**, where administrators add, configure, and activate connections to external systems.
- Supported integration categories include payroll/salary (e.g., DataLøn, Visma Lön, Fortnox Lön, Datev Lohn, SLS), finance/accounting (e.g., Business Central, Fortnox), and document management (e.g., SharePoint).
- Departments used by finance/payroll integrations are created and maintained under System administration → General settings → Departments.

## Security & Compliance

- TimeLog provides general compliance information and in-product guides covering personal data protection and GDPR.
- Detailed guidance lives in the Personal data protection article within the Security & Compliance section of the knowledge base.

## Sources

- https://help.timelog.com/en/help-center/system-administration/user-roles-and-rights
- https://help.timelog.com/en/help-center/system-administration/rights-overview
- https://help.timelog.com/en/help-center/system-administration/approval-settings
- https://help.timelog.com/en/help-center/system-administration/time-tracking
- https://help.timelog.com/en/help-center/system-administration/project-module-settings
- https://help.timelog.com/en/help-center/system-administration/default-settings-for-new-projects
- https://help.timelog.com/en/help-center/system-administration/project-invoicing
- https://help.timelog.com/en/help-center/system-administration/departments
- https://help.timelog.com/en/help-center/system-administration/multiple-legal-entities-timelog-mle
- https://help.timelog.com/en/hourly-rates-setup
- https://help.timelog.com/en/help-center/system-administration/employee-module-settings
- https://help.timelog.com/en/help-center/system-administration/salary-groups
- https://help.timelog.com/en/help-center/system-administration/personal-profile
- https://help.timelog.com/en/help-center/system-administration/personal-settings
- https://help.timelog.com/en/security-compliance
- https://help.timelog.com/en/using-timelog
