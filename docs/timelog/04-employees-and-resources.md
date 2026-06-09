# Employees & Resource Planning

This document describes the Employees & Resource Planning feature area of TimeLog: the tools for maintaining employee profiles, organising people into departments and resource groups, planning their workload over time in the Resource Planner, and managing salary accounts and balances. It captures what each feature does, the exact TimeLog terminology, what users can do, and how it ties back to projects and allocations. The focus is on product capability and naming, not on any API.

## Resource Planner

- The Resource Planner is a TimeLog report that gives an overview of employees' project workload and lets users plan when work should be carried out.
- It works from allocated hours, so the picture it shows depends on how employees have been allocated to project tasks.
- Users can view an employee's workload across a selected time period.
- Users can define specific hourly allocations for project tasks, down to the daily level.
- Users can display estimated revenue, calculated from allocated hours and hourly rates.
- It integrates with TimeLog Tracker for Outlook, so Outlook appointments can update workload automatically.
- Users can apply Resource filters and Project filters to refine the view, and they can save filter settings for reuse.
- It links to the Booked vs. Registered Work report for comparing planned hours against logged hours.

## Resource Planner terminology

- Allocation: Hours assigned to employees for specific work on a project task.
- Booking: A manual hour assignment, or hours captured from an Outlook appointment registration.
- Unregistered hours: Hours not yet logged relative to what was allocated.
- Reference day: The basis used for calculating man-days, configured in System Administration.
- Saved filter views: Custom filter configurations in the Resource Planner that can be named, given specific time periods, edited, deleted, and set as a default view that loads when the planner is opened.

## Employee Overview

- The Employee Overview is the search and management interface for locating both active and inactive employees.
- Users can search by employee name or initials in the Search employee field.
- Users can filter by License type, Status, and Department.
- Setting the Status filter to inactive surfaces inactive employees.
- Each employee appears as an Employee card, which is the entry point for editing.
- Users can reactivate an inactive employee from the edit page by moving the activation slider.

## Employee profile (new and edit)

- An employee profile is created and maintained across several information groups, each holding related fields.
- Personal Information: First name(s), Last name, User name (login), Initials (used for employee selection and in reports), Job title (optional), Email address (receives the activation email and notifications), and a Comments field.
- Organisational Information: Department (required for reporting), Legal entity (with the Multiple Legal Entities module), Manager (approves time registrations and expenses), Employee ID (optional, used for APIs and salary integrations), Employee type, Date of employment (starts flex calculation), Date of resignation (optional, with optional automatic deactivation), Default hourly rate for customers, Internal cost, and OIO ID (for OIOUBL e-invoicing).
- Work Time and Salary Information: Public holiday calendar, Allowance legislation (for travel expenses), Normal working time, Salary code group, and Pay period.
- Contact Information: Personal address, phone numbers, and social media links pulled from the employee's personal profile.
- Licence and Rights: Access to extensions (such as TimeLog CRM), Roles that determine which reports and functionalities the employee can access, and activation control (immediate, manual, or on a specific date).
- Mandatory fields are marked with an asterisk and must be completed before saving.

## Employee types and rates

- Employee type is an attribute on the employee profile used to filter report searches.
- Default hourly rate for customers is the rate suggested when the employee is allocated to projects.
- Internal cost is used to calculate time and material costs for the employee.
- Within a resource group, an individual hourly rate can be set per employee for that project.
- When a project has multiple contracts, rates can display as "Mixed" if the same rate names carry different amounts across contracts.

## Departments

- Department is a required organisational field on every employee, used throughout reporting.
- Departments are available as a filter in the Employee Overview, the Resource Planner, and salary management.

## Normal working time (capacity and availability)

- Normal working time (also called standard working hours or normal working hours) represents the scheduled hours assigned to an employee and forms the basis of the employee's flex calculation.
- Administrators change it from the Employee Overview by opening the employee card and selecting Change normal working time.
- Changes use a Valid from effective date and can be applied retroactively or prospectively.
- One-week and two-week working time schedules can be established, with the available standard hour options configured in System Administration.
- All changes are recorded in History (the modifications) and in the Action Log (who changed it and when).

## Resource groups

- A resource group is a group of employees who can work on a project's tasks without being individually allocated a specific number of hours per task.
- With time registration for resource group members, employees in the group are automatically allocated to all of the project's tasks.
- With time registration for allocated employees, individual team members are assigned directly to specific tasks instead.
- When adding employees to a group, users can search by first name, surname, initials, department, or employee type, and view each employee's workload during the project period.
- Users can set individual hourly rates per employee within the project and add multiple employees at once.
- Membership can be changed by Remove, Deactivate, or Reactivate, and deactivating an employee automatically removes them from resource groups.

## Allocations and how employees relate to projects

- Allocation is the assignment of employees (resources) to tasks together with their hours and budget.
- Resources are added to tasks via Add resources to tasks, or through the burger menu options Add one resource or Add multiple resources.
- When adding multiple resources, the system first shows employees already in the resource group, with an option to view all available employees; with the CV module, employees can be searched by competencies.
- Budget (h) is the hours allocated to a task; Responsible is the employee who owns a milestone.
- A task with sub-tasks cannot have allocated employees or budgets, because it acts as a summation task; tasks accept time registrations only when their status is In Progress.
- These allocations feed the Resource Planner, which aggregates allocated hours into each employee's workload view.

## Salary management

- Salary management is used to allocate vacation days and to track balances for flex time, maternity leave, and unpaid absence, and to reset or adjust employee balances.
- Salary accounts are the individual accounts that balances are tracked on.
- Salary groups (salary code groups) group employees so that salary and absence code setups can differ, which is useful for organisations with multiple collective agreements.
- Salary postings are individual transactions, treated like bank deposits and withdrawals.
- Salary rules are administrator-configured settings that drive automatic accumulation.
- Users can filter by department, salary group, employee, and salary account, and view either a posting overview or a collapsed summary.
- Users can reset an account balance, make adjustments, move time between salary accounts, perform bulk operations across multiple employees, delete manual adjustments, and save default filter preferences.
- Automatic accumulation postings cannot be deleted, only reset; manual adjustments can correct automatic accumulations.

## Salary groups (configuration)

- Salary groups let administrators differentiate salary and absence code setups across employees.
- Salary accounts must be added to a group after creation, managed through a matrix view of which accounts are active in each group.
- Salary codes and absence codes determine what employees can register against in their Timesheet.
- After a group is created, administrators assign it to individual employee cards, which controls the codes shown in each employee's timesheet; historical registrations remain visible after reassignment.
- Prerequisites include Advanced salary time registration enabled in Staff Management and salary groups activated in the Employee module settings.

## Sources

- https://help.timelog.com/en/employees/resource-planner
- https://help.timelog.com/en/help-center/employees/employee-overview
- https://help.timelog.com/en/help-center/employees/salary-management
- https://help.timelog.com/en/help-center/employees/new-employee
- https://help.timelog.com/en/help-center/employees/edit
- https://help.timelog.com/en/help-center/employees/change-normal-working-time
- https://help.timelog.com/en/help-center/projects/resource-group
- https://help.timelog.com/en/help-center/projects/how-to-work-in-the-project-plan
- https://help.timelog.com/en/help-center/system-administration/salary-groups
