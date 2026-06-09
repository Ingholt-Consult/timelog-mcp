# Customers & CRM

This reference describes TimeLog's Customers & CRM feature area: how customers and contacts are created and managed, the CRM add-on module, the sales pipeline with opportunities and forecasts, and how customer data flows into projects and invoicing. It documents what the product does and what features are called, based on TimeLog's public Help Center.

## Customers

- A customer is the company record that a project and its invoices belong to; you must have a customer before you can create a project, because the customer's data populates invoice details.
- Customers are created via the "New customer" action, with the company name as the only strictly required field.
- A customer can be classified using a customer status, which marks the company as a customer, partner, or supplier.
- Each customer has an owner, selected from the list of active employees, used to indicate responsibility for the account.
- Customers can be tagged with an industry code so they can be sorted and filtered by sector.
- A comments field is available on the customer card; entries are automatically timestamped with the logged-in user.

## Customer numbers

- Every customer can carry a customer number, which can be assigned automatically or entered manually.
- Automatic customer numbers are controlled by a number series configured in System Administration under General Settings.
- A number series can combine elements such as the year, the customer number, or a serial number, with custom separator characters placed between elements.
- The number series shows the next number in the sequence and previews an example of the resulting format before it is applied.
- Deactivating the number series switches customer numbering to manual entry.
- In TimeLog MLE (Multiple Legal Entities), a separate number series can be set up per legal entity, allowing different numbering schemes across business units.

## Contacts (contact persons)

- A contact (contact person) is an individual person associated with a customer company.
- Contacts are created with the "New contact" action, available from the Actions menu on a customer and from the main navigation.
- Contacts are searchable in the CRM database and appear alongside customers in CRM search results.
- A contact person can be transferred to invoicing and to finance integrations (for example, as the invoice contact person on a customer in Business Central or Fortnox).

## Invoicing details on the customer

- Customer records hold the financial data that drives invoicing, so this information does not have to be re-entered per project.
- A separate invoice address can be specified when that option is enabled in system settings.
- Each customer can store a VAT number and a preferred invoicing currency.
- A customer can have a standard invoice design (template) and default payment terms, used as defaults when invoicing the customer.
- An invoice template can be assigned for use with One Click Invoicing.
- OIOUBL e-invoicing can be activated on a customer, for example when invoicing public institutions.

## The CRM module

- TimeLog CRM is an add-on module that employees must be granted access to before its features (such as Groups) become available.
- The customer-facing CRM interface is found under "My Customers," where users search and manage the customer database.
- Search results are presented in a report view, split between customers and contacts, with counts shown for the company and for the logged-in user.
- Users can search across all company data or filter to view only their own records, and can click through numbers in the overview to see detailed descriptions.

## Groups (segmentation)

- Groups are configurable fields used to segment CRM data, appearing as extra fields that employees fill in on customers, contacts, and sales opportunities.
- A group can be set up as an input field (free text) or as a drop-down menu with preset options and a designated default value.
- Groups are configured under System administration -> Customers -> Groups.
- Typical uses include lead source tracking (for example recommendation, SEO, AdWords), competitor tracking during a sale, reference-customer interest flags, and A/B/C customer classification.
- Because groups are searchable, employees can filter and narrow CRM records for analysis and reporting.

## Pipeline

- The pipeline presents current sales and a weighted prognosis (forecast) for estimated sales over a given period.
- The pipeline can be filtered, customized, and grouped according to the user's preferences.
- Users can toggle between a report view and an editable view; in the editable view, details such as status and forecast can be changed directly in the report.
- Reports can optionally display the last quotation and the last event for each entry.

## Opportunities and opportunity status

- An opportunity represents a potential sale tracked through the pipeline and is moved through configurable stages via its opportunity status.
- Each opportunity status has a name (for example "Hot lead" or "Customer") and a criteria description explaining how the status should be used.
- Each opportunity status carries a fixed forecast value that is applied automatically whenever the status is selected, feeding the pipeline's weighted forecast.
- Administrators decide whether the forecast on a status is locked or can be edited by individual users.
- Opportunity statuses can be filtered by active, inactive, or all, reordered by drag and drop, and deactivated with a toggle (green = active, grey = inactive).
- Opportunity statuses are intended to be configured to fit the organization's own sales process.

## How customers and contacts relate to projects and invoicing

- A customer is a prerequisite for creating a project; the project is attached to the customer.
- Customer financial data (invoice address, VAT number, currency, invoice design, payment terms, invoice template) flows into the invoices produced for that customer's projects.
- Contacts can be carried through to invoicing as the invoice contact person and synced to finance systems via integrations.
- Sales activity captured in CRM (opportunities and pipeline forecasts) sits upstream of projects, supporting the path from a prospective sale to a delivered, invoiced project.

## Sources

- https://help.timelog.com/en/help-center/customers/new-customer
- https://help.timelog.com/en/help-center/customers/crm-start
- https://help.timelog.com/en/help-center/customers/pipeline
- https://help.timelog.com/en/help-center/system-administration/opportunity-status-in-crm
- https://help.timelog.com/en/help-center/system-administration/groups-in-crm
- https://help.timelog.com/en/help-center/system-administration/number-series/
