# Time & Expense Registration

This document describes the Time & Expense Registration feature area of TimeLog: how users record the time they spend on work and the money they spend on the company's behalf. It covers the timesheet, time registrations, timestamps and the stopwatch, the Tracker applications (including TimeLog for Desktop), personal expenses, travel expenses, mileage, importing expense data, and the submission/approval flow. The focus is on what the product does and the exact terminology TimeLog uses, not on any API.

## Time registrations and the timesheet

- A user's time entries are called **time registrations**, and they are recorded in the **timesheet**.
- The timesheet is reached from the **Time** page, where users "track your work time on projects and your absence."
- Each time registration is made against a **task**, which sits under a **project**, which belongs to a **customer** (the hierarchy is Customers, then Projects, then Tasks).
- The timesheet shows a **week's view** by default; users can switch to **day**, **two weeks**, or **month** using the **calendar icon**.
- Entries are saved automatically when the user navigates away from the input field; there is no separate save step in the detailed timesheet.
- A **Budget column** shows allocated versus used hours with color-coded progress bars (green up to 80%, yellow up to 100%, red above 100%, grey for completed tasks).
- Tasks can be marked as **favorites** with the star icon and filtered accordingly for quick access.
- Registrations and projects can be collapsed and expanded in the timesheet view.

## Entering time

- **Fast track** is the quick-entry method: the user searches for a task, customer, or project, then enters the date, hours spent, and an optional comment, and clicks **Save**.
- **Timesheet entry** is the detailed method: the user locates the project and task already in the timesheet, types the hours and any comment, and the entry saves automatically.
- Hours can be entered in **Time format** (HH:MM, e.g. typing "1111" becomes 11:11) or **Decimal format** (e.g. "1,5" becomes 1.5 hours), depending on personal settings.
- The **Stopwatch** lets users start and stop a registration live from within the timesheet; only one registration can run at a time, it persists across browser navigation, and it automatically resets at midnight.
- Personal settings control defaults such as the timesheet view, timesheet layout, time format, and Fast track search behavior.

## Comments on registrations

- Each time registration can carry a **comment** for additional context about the work done.
- Comments can be added both via Fast track and directly in the timesheet, and edited later in the registration line.

## Absence registration

- Users register absence in the same timesheet by selecting an **absence code** configured by system administrators.
- Absence can be entered as hours, or as a **half day** or **full day**, with an optional comment.
- A **Register for several days** option (via the burger/menu) creates absence across a multi-day period in one action.

## Timestamps

- **Timestamps** record the exact **Start time** and **End time** of a work period alongside the registration's **Amount** (its duration).
- Timestamps are activated in **System administration > Time and expense registrations > Time tracking setup**, either **mandatory for all users** or **per employee** (managers enable it on the employee card; non-mandatory users can self-activate in Profile & Preferences).
- TimeLog calculates the missing value automatically depending on what is entered:
  - Enter the **Amount** only and the system treats the current time as the End time, calculating the Start time backwards.
  - Enter **Start time and End time** and the system calculates the Amount.
  - Enter **Start time and Amount** and the system calculates the End time.
  - Use the **Stopwatch** and the system records the press of start as Start time and the press of stop as End time, with any pre-added time shifting the Start time backwards.
- Timestamps work identically in the Desktop tracker, and the **Time registrations (new)** report displays and exports timestamps to Excel.

## TimeLog Tracker applications

- The **Tracker applications** let users "track your time on the go without having to open TimeLog," and come in four editions: **Desktop** (Windows and Mac OS), **iPhone**, **Android**, and **Microsoft Outlook**.
- All trackers synchronize with the TimeLog web application so registrations stay consistent across devices.

## TimeLog for Desktop

- **TimeLog for Desktop** is a downloadable desktop app for users who switch between many tasks during the day; it is found in the **Register** menu under **Time tracking apps**.
- Users can search for and select tasks or absence codes, navigating Customers, Projects, and Tasks, with results filtering as they type and keyboard arrow-key navigation.
- A **stopwatch / play icon** starts a registration immediately (when enabled by an administrator); users can pause and restart tracking on a task.
- The **plus** button adds a manual registration, where the user can add details, a comment, and a date (including other dates) before starting it.
- A **time registration list** shows the day's registrations; entries are edited by double-clicking the time or comment column or via the **pencil icon**, and removed with the **trash can** icon.
- When enabled by an administrator, the tracker shows the **billable value** of the user's time registrations (registered hours and billable amount).
- Timesheets can be submitted from the app using the configured **submission rules**, with the start and end dates auto-filled to the current week.

## Billable vs non-billable

- Time registrations and expenses can be **billable** (intended to be invoiced to a customer) or **non-billable**.
- For expenses, the **Billable** option appears when project invoicing is enabled, and is selected "if the expense should be invoiced to a customer or client."
- During approval, a manager can change the billable status of each registration from billable to non-billable and vice versa.

## Submitting hours and approval

- Users send time for approval with the **Submit for approval** button in the timesheet.
- The submission scope can be a single **day**, an entire **week**, or a full **month**, depending on company workflow (users are reminded to include weekends).
- A **day-by-day** submission approach lets employees see which days are complete and which still need attention.
- A comment can be added to the submitted period for the manager to read during approval.
- The submission log (via the three-dot menu next to Time) shows when submissions happened and who handled them.
- Employees can use **Reopen Submitted Days** to edit submitted days again, as long as the manager has not yet approved them.
- Approval can be configured so registrations are approved only by the immediate manager, or first by the project manager and then by the immediate manager; project managers are alerted via the **Notification Center** when projects have time awaiting approval.

## Personal expenses

- A **personal expense** is an expense an employee paid on behalf of the company (e.g. with a personal or company credit card); these are reimbursed with the employee's salary.
- A personal expense is created from the shortcut bar plus symbol and **+ Personal Expense**, and its key fields include:
  - **Date of expense** (as shown on the receipt or invoice).
  - **Payment method** (company card, personal card, cash).
  - **Amount incl. VAT** (the total amount including VAT).
  - **Currency** (when multi-currency is enabled), selected from the receipt.
  - **VAT amount**, normally calculated automatically from the organization's VAT settings for the expense type.
  - **Expense Type** (e.g. travel, accommodation, meals, software, office supplies).
  - **Supplier** (optional vendor name).
  - **Billable** (optional, when project invoicing is enabled).
  - **Comment** (optional context).
- Project linkage fields include **Employee** (defaults to the current user), **Customer**, **Project** (required, used for cost and margin calculations), and **Contract** (when the project has multiple contracts).
- Receipts are attached as PDF files or pictures via file upload or drag-and-drop, and multiple files are supported.
- **Save** completes the expense (moving to expense report submission) and **Save & new** saves it and opens a fresh form for the same project.
- An expense becomes uneditable once it is approved, added to an invoice draft, or invoiced to a customer.

## Travel expenses

- **Travel expenses** register an employee's travels and group several expense items under one travel.
- A travel records departure/destination locations and dates, a **Travel type**, and a **Purpose** description (which can appear on the customer invoice).
- **Specified Expenses** are individual line items with a date, invoice number, expense type, payment method, cost (with automatic VAT calculation and an option to remove VAT for tax-exempt items), and automatic currency conversion with the shown exchange rate.
- **Allowances** are meal-based per diems labeled **B (breakfast), L (lunch), and D (dinner)**, with selectable rates and auto-populated, editable travel data.
- **Accommodation, unspecified** captures accommodation costs by location and rate.
- Travels are registered without VAT and can be invoiced to customers or used for internal employee settlement; rates and types are configured in System administration.

## Mileage expenses

- The **mileage rate** is "the cost, which the employee is reimbursed per km driven in their car."
- A mileage rate tracks three financial dimensions per kilometer: the **reimbursement amount per km**, the **cost** added to the project expense, and the **sales price** invoiced to the customer.
- A **Reimburse employee** checkbox posts mileage registrations to specified salary codes in the payroll system, with optional taxable/non-taxable share breakdown.
- Mileage rates are maintained in periods with start and end dates rather than recreated each year.
- Employees create **mileage registrations** linked to a project; TimeLog automatically generates the corresponding project expense, which can then be invoiced to the customer.

## Importing expense data

- Expenses can be imported from a **.txt or .csv** file with columns separated by semicolon (;), comma (,), or tab.
- Each row must contain exactly **11 fields** in order: Date, Expense No., Account No., Supplier No. (must exist as a customer with Supplier status), Amount incl. VAT, VAT (percentage without the % sign), Comment, Currency code (three letters), Exchange rate, Project No., and Invoice No.
- Field values cannot contain semicolons, commas, tabs, or line breaks, and each row must have exactly 10 separators or the import reports rows that "do not contain the required number of columns (11)."
- The Project No. is converted to the matching project name when it exists, linking the imported expense to the right project.

## Sources

- https://help.timelog.com/en/register/new-personal-expense
- https://help.timelog.com/en/add-or-register-a-personal-expense
- https://help.timelog.com/en/register/timelog-for-desktop
- https://help.timelog.com/en/help-center/register/register-time-through-our-desktop-tracker
- https://help.timelog.com/en/register/timelog-tracker-applications
- https://help.timelog.com/en/registration/travel-expenses
- https://help.timelog.com/en/help-center/system-administration/mileage-rates
- https://help.timelog.com/en/help-center/register/timestamps
- https://help.timelog.com/en/register-time-with-timestamps
- https://help.timelog.com/en/register/how-to-format-your-import-file
- https://help.timelog.com/en/help-center/register/how-to-register-time-in-timelog
- https://help.timelog.com/en/help-center/register/time
- https://help.timelog.com/en/help-center/register/submit-hours-for-approval
