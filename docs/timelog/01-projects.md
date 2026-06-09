# TimeLog Projects

This document is reference material for the Projects feature area of the TimeLog product, based on TimeLog's public Help Center (help.timelog.com). It describes what the product can do and what the concepts are called, using TimeLog's own terminology. It is not API documentation.

A Project is the central object in TimeLog. It belongs to a Customer (internal projects have no external customer), is run by a Project Manager, and is classified by a Project Type, a Project Category, a Project Status, and optionally a Project Stage. Work is structured in a Project plan of Tasks, money is governed by one or more Contracts, and people are connected through allocation or Resource groups.

## Project Setup and Settings

- A Project is created in the Projects module, either from scratch or based on a Project template.
- Each project has a Project name (TimeLog recommends prefixing it with a customer-specific code) and a Project number that is auto-generated from a number series defined in System administration.
- A project can carry an optional P.O. number that is editable.
- A project is designated as either a customer project or an internal project.
- The Project manager is the person responsible for the project and the one who receives project notifications.
- A project can be assigned to a Department (requires a department structure and TimeLog MLE) and, if enabled, to an Account manager and a Partner.
- Grouping fields include Project type and Project category, each shown only when enabled in System administration.
- Progress fields include Project status, Project stage, Forecast % (likelihood of success), and ETC (Estimate to Complete) functionality.
- Scheduling fields include Expected start date and Expected end date, which are transferred to new tasks as defaults.
- A project carries overall budget figures that can be changed on an ongoing basis.
- Financial settings include Price list (with Invoicing Advanced), Currency (locked once tasks are added, unlockable via project copy), exchange rate management, and the ability to index hourly rates.
- Time tracking on a project can be enabled or disabled per user; it cannot be deactivated once time has been tracked unless tasks/allocations are completed or the project status is changed.

## Project Types

- A Project type divides projects into overall business areas, for example operational projects, investment projects, or customer projects.
- Project types are managed in System administration > Projects > Project types.
- The feature can be enabled or disabled, and usage can be made mandatory for all projects.
- Administrators can create, rename, activate, and deactivate types, and can run bulk actions via the Select action menu.
- Project managers select an active project type when creating a project.

## Project Categories

- A Project category categorises a project's purpose, helping a company map how much time is spent on different areas (for example market analysis, account management, or internal time tracking).
- Project categories are managed in System administration > Projects > Project categories.
- The feature can be enabled or disabled globally, and usage can be made mandatory.
- Administrators can create, rename, activate, deactivate, and bulk-manage categories.

## Project Status and Lifecycle

- Project status specifies a project's order- and delivery-related progress in relation to the customer (for example whether it is at quotation stage, approved, work has started, or it is completed).
- Project status is pre-defined and not customizable.
- The documented status options are Quotation, Approved, In progress, On hold, Completed, Archive, and Cancelled.
- Each status controls whether time and expenses can be registered on the project, so a paused or completed project can be removed from employees' weekly timesheets.
- Status enables searching and filtering of projects by where they sit in the delivery process.
- Reports support filtering by a specific status (e.g. In progress, On hold) and by general status groupings such as Active projects and Inactive projects.

## Project Stages

- A Project stage represents the stages a project goes through from start to end, matching the "Stages" concept in the PRINCE2 project model.
- Project stages are managed in System administration > Projects > Project stages and can be enabled or disabled system-wide.
- Stages are customizable (unlike Project status) and are used for sorting and searching projects.
- Each stage has a Name and a Sorting value (numeric); lowest values display first, and the system auto-corrects invalid sorting numbers.
- Example stage models: Idea > Business case > Development > Implementation > Completed; or Offer phase > Customer approval > Production > Customer delivery > Invoiced.
- New or changed stages apply only to projects created afterward; existing projects keep their original stage model.
- A Reset function deletes all stage data from all projects and history and should be used only for a complete restart.

## Project Plan, Tasks and Milestones

- The Project plan is where work is broken down into Tasks; it supports up to five hierarchical levels (depending on the TimeLog version).
- A project always needs at least one task before time can be tracked on it.
- Top-level tasks summarize the budgets and time registrations of their underlying tasks.
- Each task has a WBS (Work Breakdown Structure) number that is auto-generated and manually editable to reorganize tasks (e.g. WBS 1.2 makes a task a subtask of task 1).
- Subtasks are created via the burger menu (New sub task) or by assigning a nested WBS number; a task cannot have subtasks if employees or budgets are already allocated to it.
- A task has a Task status; it must be In progress to allow time registrations.
- Each task can carry a budget in the Budget (h) field with a selected hourly rate, and can be linked to a Contract.
- Tasks have invoicing controls including billable status and a Ready for invoicing designation.
- Tasks with time registrations or invoices cannot be deleted.
- Milestones mark important project dates/deadlines, require a responsible employee, appear in timesheets, and trigger notifications 14 days before the deadline (green indicator, turning red after the deadline).

## Project Members and Allocation

- Employees are connected to a project either by allocation to specific tasks or through Resource groups.
- Allocation assigns an employee to specific tasks for a number of hours; resources are added via the Add resources to tasks button or the burger menu, and can be searched by competencies when the CV module is in use.
- A Resource group sets up a group of employees who can work on the project's tasks without being allocated to individual tasks for a specific number of hours.
- Resource group members can be given custom hourly rates for the project and can be deactivated/reactivated.
- The Project assignments report shows the projects and tasks an employee is allocated to and time tracked, with an Alloc. (h.) column (allocated hours) and an Actual (h.) column (tracked hours); actual hours exceeding allocated display in red.

## Contracts and Contract Management

- A Contract is the framework that governs how a customer is invoiced and how revenue is recognized; each project can hold an unlimited number of contracts, including multiple simultaneous fixed-price or time-and-material contracts.
- Example: a project may have a major delivery at a fixed price, subdeliveries on time and material, and an ongoing maintenance service, all as separate contracts.
- Time and material contract types: Ongoing invoicing, On-account with end-balancing, Periodic balancing, and Prepaid hours.
- Fixed price contract types: Per-project revenue recognition, Per-task revenue recognition, Continuous service (subscriptions, usually no end date), and Volume invoicing (unit-based pricing).
- Time-and-material contracts support unlimited hourly rates and configurable billable/non-billable settings, and can enforce a maximum budget (hours over budget are not available for invoicing).
- Fixed-price contracts carry supplier risk for overruns but allow higher hourly rates, and use Payment plans tied to deliverables (e.g. 40% advance, 50% at first delivery, 10% final).
- Per-task revenue recognition lets a manager control which parts of the payment plan go to which tasks and expenses, enabling department-level budget tracking.
- Payment plans can use calendar-style recurrence (e.g. first day of each month) and auto-generate future payments; they can be manually adjusted via the Adjust project payments interface.
- Key financial concepts: Revenue recognition, Completion level assessment, Work in progress (WIP), and Billable vs. non-billable.
- Contract creation/editing/deletion is controlled by user role privileges configured under System administration > Employees > User roles and rights management > Projects.

## Project Templates

- A Project template is a reusable blueprint for standardizing project setup across similar projects.
- Templates can include tasks (main tasks and subtasks with names, types, and statuses), milestones, contracts, and the project plan layout / WBS.
- A new template is created by building a project and saving it as a new template.
- Templates can be activated, deactivated, edited, deleted, and given descriptions to guide colleagues on appropriate use.
- When a template is changed, updates can be pushed to existing projects built from it, and the system produces a Project templates change log.
- Projects based on multiple templates receive updates only from the first template used, and WBS modifications limit update flexibility.

## Budget Follow-up

- Budget follow-up is a report giving an overview of the budget and progress of projects, showing all projects that hold contract value, budgets, and remaining value/hours.
- It supports status meetings, project follow-ups, and general reporting, and is useful for monitoring budget progress on fixed-price projects and identifying projects that have exceeded budget.
- It tracks Hours (shown as time or value), contract value and budget amounts, and remaining value/hours.
- View options let users select time periods, toggle hours as time vs. value, include/exclude travels and outlays, show/hide internal projects and projects without registrations, and choose how negative remaining budget is displayed.
- Links in the report drill through to registration overviews or directly to a project.

## Project Module Settings (Global)

- Project module settings are global, system-wide configurations under System administration > Projects > Project module settings that apply to all projects.
- Project features: options such as use of milestones, baselines, and sorting of drop-down menus and hourly rates.
- Project fields: reporting and invoicing information elements.
- Task features: project-plan options such as the use of task numbers to find tasks in large project plans.
- Task fields: additional information per task, e.g. task number.
- Budgeting: lock controls for budget amounts and hours.
- Planning: settings governing start/end dates and employee task assignments.

## Sources

- https://help.timelog.com/en/using-timelog
- https://help.timelog.com/en/contract-management
- https://help.timelog.com/en/help-center/system-administration/project-templates
- https://help.timelog.com/en/help-center/reports/budget-follow-up
- https://help.timelog.com/en/help-center/system-administration/project-module-settings
- https://help.timelog.com/en/help-center/system-administration/project-types
- https://help.timelog.com/en/help-center/system-administration/project-categories
- https://help.timelog.com/en/help-center/system-administration/project-stages
- https://help.timelog.com/en/help-center/projects/project-settings
- https://help.timelog.com/en/help-center/projects/how-to-work-in-the-project-plan
- https://help.timelog.com/en/help-center/projects/resource-group
- https://help.timelog.com/en/help-center/reports/project-assignments
- https://help.timelog.com/en/guides/for-the-latest-version-of-timelog/project-status-task-status-and-project-stages/
