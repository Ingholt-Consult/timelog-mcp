# Absence & Approval

This document describes the Absence and Approval feature area of TimeLog. It covers how employees register absence, how absence is classified and tracked through absence codes and balances, the calendars and reports that visualise absence, and the approval workflow that controls timesheets and expenses. The aim is to document what the product does and what its concepts are called, not how its API works. Terminology follows TimeLog's own English help-centre wording.

## Absence codes

- An absence code is the entity employees use to register absence such as vacation or illness, so that non-working time can be captured and reported.
- Absence codes represent non-productive hours, that is, the part of the working day in which an employee is not working on assignments.
- Each absence code is classified by an absence type, of which TimeLog defines four: Illness, Vacation, Absence non-compensated, and Absence compensated.
- Illness is used to register when employees were sick or, for example, had rehabilitation.
- Vacation is used to register when an employee has vacation.
- Absence, non-compensated is used to register absence where the employee pays for the time spent themselves (unpaid time off).
- Absence, compensated typically registers absence where the company pays for the time spent.
- The system ships with default Vacation and Illness codes out of the box.
- Administrators create, edit, and delete absence codes under System administration to match reporting needs.
- Employee-visible settings on a code include sorting (display order in the timesheet), name (the label), and description.
- Administrator-only settings include the absence type, the format (Hours, Full days, or Half and full days), the calculation method (whether the code adds to or subtracts from a balance), whether it contributes to a flex account, whether manager approval is required, whether it deducts capacity in the resource planner, whether it is visible in the holiday calendar, and salary-system export settings for integrated payroll.
- When agreements change, administrators are advised to create new absence codes rather than edit existing ones, to keep balance calculations accurate and avoid conversion confusion.

## Absence registration

- Employees register absence on their timesheet using absence codes, in the same place they register time on assignments.
- Depending on the code's configured format, absence can be registered in hours, full days, or half and full days.
- Adding vacation or other absence (such as courses or conferences) to the calendar via the Outlook integration helps ensure the employee does not appear available for meetings during the period they are away.
- Whether a given absence registration needs manager approval is controlled by the manager-approval setting on the absence code.

## Absence calendar

- The absence calendar is a management report that gives visibility into employee absences across a chosen time period, organised by absence code.
- Users select a period and choose how dates appear (start date, week numbers, or month names), and can navigate between periods with arrow controls.
- Multiple absence codes can be displayed at once to identify patterns across employees.
- Absence is colour-coded: green for holiday, dark grey for illness, light grey for weekend, dark pink for non-compensated absence, blue for compensated absence, and pink for public holiday.
- Custom filters can be saved and reused, a default filter can be set in Page settings, and the page can be configured to load data automatically on access.
- Accurate colour display requires the browser to be at 100% zoom.

## Vacation calendar

- The vacation calendar is a personal tool that gives an employee an overview of public holidays and their planned and held vacation for a specific period.
- It uses the same colour coding as the absence calendar: green for vacation, dark grey for illness, light grey for weekends, dark pink for non-compensated absence, blue for compensated absence, and pink for public holidays.
- Half-day absences appear as lighter blocks within their colour category, and planned vacation spanning a weekend is shown as separate blocks per period.
- Hovering over a coloured block shows a detailed description of the planned vacation.
- Users can select the period, choose how dates display (start date, week numbers, or month names), navigate forward and backward, save filters, and set a default filter.

## Absence reports

- The absence specification report breaks absence down by absence code and surfaces an employee's non-productive hours.
- The absence/productivity report gives an overview of employee absence and working time, showing each employee's normal working time alongside their registrations on internal versus external work.
- The absence/productivity report's "Distribution, Internal time" section splits internal hours across internal projects, internal support cases, and salary codes with registrations in the selected period.
- The absence/productivity report covers all salary codes regardless of whether the company or the employee bears the cost, and can show figures as hours or percentages.

## Vacation, flex, and leave balances

- Salary management is where administrators allocate vacation days and track balances for flex, maternity leave, and non-compensated absence.
- A balance works like a bank account: the company makes a deposit (allocation) and employees withdraw from it through their absence registrations.
- Whether an absence code adds to or subtracts from a balance is set by that code's calculation method.
- For an individual employee, administrators can reset balances, make adjustments, and move time between salary accounts via the burger menu.
- For multiple employees at once, an action menu allows batch adjustments, batch balance resets, and deletion of manual adjustments.
- When salary rules are configured, the system automatically adds accruals as adjustments (automatic postings), which cannot be deleted or corrected directly; instead the administrator adds a reset or a manual adjustment.
- The salary accounts and salary groups underpinning balances are set up by the system administrator.

## Removing approved absence

- Employees can remove a previously approved absence directly from the timesheet, for example to change vacation plans.
- The option is reached through the three-dot (burger / options) menu next to the relevant absence code on the timesheet, by choosing "Remove approved absence".
- A dialog lets the employee specify the absence period to remove and optionally add a comment explaining the change.
- Once the request is submitted, the employee's manager is automatically notified of the change.

## Timesheet status and submission

- The timesheet status report is a graphic representation of each employee's timesheet status and whether it has been approved, helping managers follow up on whether employees have closed their weeks.
- Four status indicators are used: a green checkmark (timesheet approved), a green dot (completed and closed), a yellow dot (completed and open), and a red dot (timesheet empty).
- Timesheets must be explicitly submitted; closing an accounting period and locking time registration does not by itself change a timesheet's status in the report.
- Managers can use "Request to close" to send auto-generated system emails prompting employees to submit their timesheets.

## Approval workflow and settings

- Approval settings determine whether time registrations and expenses require approval and how many steps the approval has; they live under System administration -> Approval processes.
- Timesheet approval offers three levels: None (omit time-registration approvals), employee timesheets approved by the immediate manager only, or a two-step flow where the project manager approves first and then the immediate manager.
- Timesheet closing rules constrain submission with five options: no warnings, warn if time is below standard hours, block submission if time is below standard hours, warn if any week has 0 hours, or block submission if any week has 0 hours.
- Approval roles referenced in the workflow are the immediate (line) manager and the project manager.

## Expense and travel expense approval

- Approval steps for expenses and travel expenses are configured individually in the approval settings, and approval is carried out via the "Approve expenses" report in the Employees menu.
- Reviewers can filter expenses by employee (one or all), expense type and payment method, approval status (all, approved, or not approved), and date range.
- An expense is approved by checking its "Approved" box; an entry that cannot be passed on to the customer is marked with the "Non-billable" box, and changes are saved with Update.
- Expense approval is used both to authorise reimbursement of employee-paid expenses and to flag items that should be invoiced further to a customer (billable).
- An employee can see when an expense has been processed.

## Invoice and voucher approval

- A "Ready for booking" option separates invoice-draft creation from booking responsibility, so that only drafts marked ready for invoicing are booked and incomplete drafts are not booked by accident.

## Locking and reopening

- Locking happens when an accounting period is closed and time registration is locked, which prevents further changes to registrations in that period.
- Locking time registration is distinct from timesheet submission: a locked period does not change timesheet status, and timesheets must still be submitted to be reflected in the timesheet status report.

## How absence and approval relate to time registration and employees

- Absence is registered on the same timesheet as project time, using absence codes, so an employee's week combines productive registrations and non-productive (absence) hours.
- Absence codes feed employee balances (vacation, flex, maternity leave, non-compensated) by adding to or subtracting from salary accounts, tying day-to-day registration to the salary administration.
- Approval governs the lifecycle of a timesheet (open -> completed/closed -> approved) and of expenses, with the immediate manager and optionally the project manager acting as approvers.
- Manager notifications and the manager-approval flag on absence codes connect employee actions (registering or removing absence) back to the responsible manager.

## Sources

- https://help.timelog.com/en/absence-calendar
- https://help.timelog.com/en/timesheet-status
- https://help.timelog.com/en/help-center/system-administration/approval-settings
- https://help.timelog.com/en/help-center/system-administration/absence-codes
- https://help.timelog.com/en/help-center/employees/salary-management
- https://help.timelog.com/en/help-center/reports/vacation-calendar
- https://help.timelog.com/en/help-center/register/remove-approved-absence
- https://help.timelog.com/en/help-center/employees/approval-of-travel-expenses-and-expenses
- https://help.timelog.com/en/reports/absence-specification
- https://help.timelog.com/en/help-center/reports/absenceproductivity
- https://help.timelog.com/en/help-center/system-administration/time-tracking
