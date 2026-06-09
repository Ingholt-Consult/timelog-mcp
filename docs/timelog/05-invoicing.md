# Invoicing & Billing

This document describes TimeLog's Invoicing and Billing feature area: how invoices and credit notes are created, the debtor list that drives invoicing, payment plans on contracts, on-account and prepaid billing, invoice designs, and transfer of finished invoices to an accounting system. It captures what the product can do and the exact terminology TimeLog uses. It is reference documentation, not an API description.

## Core Concepts and Terminology

- An **invoice** is built from the **invoicing potential** registered on projects, that is, the time registrations, mileage, travels, expenses, and payments that are ready to be billed.
- A **credit note** is used to balance out an invoice that was booked with incorrect information.
- A **debtor** is a customer that owes money; the **Debtor list – Invoices** report shows invoicing potential and outstanding invoices per customer.
- **Invoice potential** (also "non-invoiced items") is registrations that are ready for invoicing but not yet placed on an invoice.
- **Work in progress** is the available balance on prepaid contracts.
- An invoice moves through statuses: **Draft** (editable, not yet final) and **Booked** (finalized, locked, not yet reconciled against the financial system).
- TimeLog uses **invoice** as a catch-all term covering invoices, vouchers, and reminders.
- **On-account** billing means the customer pays in advance and consumption is balanced later; **prepaid hours** are hour pools bought up front at a discount and consumed like vouchers.

## Creating a New Invoice

- Invoices are created from the **registered invoice potential** on projects; best practice is to start from the **Debtor list** rather than entering invoices manually.
- An invoice has three building blocks: **Invoice data** (customer, references, settings), **Invoicing potential** (eligible project registrations), and **Invoice lines** (the billable items).
- Editable invoice-data fields include customer and invoicing address, **Internal reference** (contact person for customer inquiries), **Invoice date** and **Payment terms** (which auto-update the due date), **Currency**, **Default discount**, **VAT calculation** and **VAT percentage**, plus **Heading** and **Message** (defaulted from System Administration).
- Currency is locked once the invoice is linked to a project, and is editable only before the first invoice line is added.
- To invoice one customer for several projects on a single invoice, no **Project** must be selected on the invoice.
- Invoice lines are added by selecting an invoicing-potential view, period, and clicking **Show**, then adding lines individually or by ticking boxes and using the **Select action** dropdown.
- Each line's **Description**, **Quantity**, **Rate %**, **Discount %**, **VAT %**, and **Amount** can be edited directly, and lines can be consolidated, split, and reordered by drag-and-drop.
- Extra non-registered lines can be added: **Heading**, **Sub-total**, **Text**, **Empty line**, and **Product** (a manual line needing Project, Date, Quantity, Rate, Discount %, and VAT %).
- Manually created invoice lines appear in the **Miscellaneous** section of project totals; fixed-price amounts should instead be added to the contract's payment plan rather than as manual lines.

## Creating a Credit Note

- A credit note balances out an invoice that was booked with incorrect information.
- It is created via **New credit note** in the Invoices section, by selecting the customer who should receive it.
- Optional fields include invoicing address, internal reference, invoice design, and invoice date (system-generated but editable); **Heading** and **Message** are entered manually.
- The main credit-note information is stored with **Save**, credit postings are added with **New invoice line**, and the credit note is finalized with **Book**.

## Debtor List – Invoices

- The **Debtor list – Invoices** report (Invoices → Debtor list – Invoices) shows invoicing potential, invoice drafts, and non-balanced invoices per customer for a selected period.
- It is the recommended starting point for invoicing work and for batch invoice creation.
- Filters let users view all registrations ready for invoicing (default), specific registration types (time, mileage, travels, expenses, payments), only customers with non-invoiced items, or registrations not yet marked **Ready for invoicing**.
- Result columns include **No.** (customer number), **Name** (customer/project/contract), **Items** (count of invoiceable registrations), **Time & Material** (split into Time, Expenses, and Work in progress), **Fixed price**, **Total**, and **Invoices** (Draft and Booked values), with optional Owner, Project manager, and Account manager columns.
- Users can create invoices at customer or project level, drill into amounts to open drafts or the archive, view detailed registration lists, and select the display currency.

## One Click Invoicing (OCI)

- **One Click Invoicing (OCI)** streamlines invoice creation and secures high data quality, and is available in the **Invoicing Advanced** version of TimeLog.
- OCI is activated under System Administration → Finance → One Click Invoicing, and customers must be set up with the right invoice template in Finance before use.
- TimeLog provides default invoice templates that can be inspected and edited; templates group invoice content in ways such as Employee/Time, Project/Payment/Contract, Project/Employee, Project/Employee/Task, Project/Task, Project/Task/Employee, and Project/Hourly rate.
- OCI batch-creates invoice drafts based on the OCI choices made on each project; projects not opted into OCI are ignored in the run.

## Billing of Contracts and Projects

- Multiple contracts can run simultaneously on one project, and contracts determine how work and payments are billed.
- **Time & material** contracts come in four forms: standard ongoing invoicing (billed on actual time and materials), on-account with end-balancing (advances during the project, final consumption invoiced at completion), continuous on-account with period balancing (regular prepayments offset against work each period), and prepaid hours (discounted hour pools consumed like vouchers, treated financially as advance payments).
- **Fixed-price** contracts come in four forms: standard (fixed total with a payment plan tied to deliveries), task-driven revenue (payments linked to specific tasks), continuous service (fixed recurring subscription with no end date), and ongoing item invoicing (volume-based billing such as per payslip or per server, with variable monthly units).
- Time & material contracts can enforce a maximum budget to prevent invoicing beyond the agreed limit.
- Expenses can be billed as part of a fixed price, separately on a time & material contract, or in combined approaches.
- Tasks and time registrations can be marked **billable** or **non-billable**, which controls whether they contribute to invoicing potential.

## Project Payments and Payment Plans

- **Adjust project payments** (under Projects) gives an overview and lets users maintain payments across projects, typically reviewed monthly to decide which contracts and projects are ready to invoice.
- Payment status is shown by icons: a grey round icon (not ready, invoice date not yet reached), a red round icon (not ready, invoice date passed), and a green checkmark (marked **Ready for invoicing**).
- Editable fields include **Invoice date** (expected, or actual booking date once invoiced), **Quantity & Unit**, **Rate**, discount percentage, and currency amounts; the Ready-for-invoicing toggle is clickable.
- Filters include customer, project manager, project status, contract status, contract model, standard period, account manager, project type, and department, with views for continuous time & material contracts, invoiced payments, and internal projects.
- Batch actions can delete selected payments or shift invoice dates (to today, or one month, three months, or one year ahead).
- Fixed-price amounts are managed through the contract's payment plan rather than as manual invoice lines.

## Invoice Designs (Templates)

- **Invoice designs** are customizable templates controlling the visual presentation of invoices, vouchers, and reminders.
- An unlimited number of designs can be created, and separate designs can be kept for different customer types (private/public, domestic/foreign); a design can be marked **Default**, **Active**, or **Locked**.
- The Edit invoice design page has 14 configurable sections: Top section, Dates and numbers, Invoice titles, Company logo, Recipient data, Invoice details, Page numbers, Invoice description, Invoice columns, Specification columns, Invoice totals, Payment terms, Footer, and Bank information.
- Customizable elements include logo placement (first page or all pages), country-specific date and number formatting, reminder language, titles and descriptions, recipient data (such as EAN codes), column headers and visibility, payment-term display, footer and bank information, page numbering, and VAT/totals calculation.

## Transferring Invoices to the Finance System

- After invoices and credit notes are **booked**, they can be transferred (exported) to an integrated accounting/financial system.
- Relevant states are **Booked** (posted and ready to transfer), **Non-transferred**, **Previously transferred**, and **Ignored** (skipped, can be transferred later).
- A transfer table is built using view filters (legal entity if TimeLog MLE is enabled, customer name, invoice type for invoices or credit notes, date period, and free-text search by customer or invoice number).
- Each invoice row shows number, customer, title, type, date, currency, and net amount; rows are auto-selected and can be transferred or ignored, and yellow highlighting flags discrepancies between the TimeLog net amount and the accounting-system net amount.
- After transfer, the accounting-system posting status is shown on the right side of the transfer table, and all transfers are tracked in the Integration log report.

## Sources

- https://help.timelog.com/en/help-center/invoices/new-invoice
- https://help.timelog.com/en/help-center/invoices/new-credit-note
- https://help.timelog.com/en/help-center/invoices/debtor-list-invoices-new
- https://help.timelog.com/en/contract-management
- https://help.timelog.com/en/help-center/invoices/transfer-invoices
- https://help.timelog.com/en/help-center/system-administration/invoice-designs
- https://help.timelog.com/en/help-center/projects/adjust-project-payments
- https://help.timelog.com/en/processes/invoicing-process/activate-oci/ (via site search summary; page returned 404 on direct fetch)
