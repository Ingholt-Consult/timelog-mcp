import { z } from "zod";

// Shared preview/execute switch. Default preview: a write tool must be asked
// explicitly to execute. See docs/adr/0004 (preview-and-confirm tier).
export const modeField = {
  mode: z
    .enum(["preview", "execute"])
    .default("preview")
    .describe(
      "preview (default): POSTs to the validate-* endpoint, writes NOTHING, and returns the validation outcome plus the exact payload that would be sent. execute: performs the real create. Always preview first, show the user, and only execute after an explicit yes.",
    ),
} as const;

// POST /project/create-from-template — ProjectApiCreateModel (18 fields). All
// optional: the swagger declares none required and is untrustworthy; the empirical
// gate determines the real requirements. Dates are ISO 8601 strings.
export const createProjectFromTemplateShape = {
  ...modeField,
  ProjectTemplateID: z.number().int().optional().describe("Template to build from (see list_project_templates)."),
  Name: z.string().optional().describe("Project name."),
  ProjectNo: z.string().optional().describe("Project number (usually auto-generated; omit unless overriding)."),
  CustomerID: z.number().int().optional().describe("Owning CustomerID; omit for an internal project."),
  Description: z.string().optional().describe("Project description."),
  ProjectManagerID: z.number().int().optional().describe("UserID of the Project Manager."),
  ProjectStartDate: z.string().optional().describe("Project start date, ISO 8601 (e.g. 2026-06-15T00:00:00)."),
  ProjectEndDate: z.string().optional().describe("Project end date, ISO 8601."),
  ProjectTypeID: z.number().int().optional().describe("ProjectTypeID (classification)."),
  ProjectCategoryID: z.number().int().optional().describe("ProjectCategoryID (classification)."),
  CurrencyID: z.number().int().optional().describe("CurrencyID."),
  LegalEntityID: z.number().int().optional().describe("LegalEntityID."),
  DepartmentID: z.number().int().optional().describe("DepartmentID."),
  AccountManagerID: z.number().int().optional().describe("UserID of the Account Manager."),
  PartnerID: z.number().int().optional().describe("PartnerID."),
  ContactID: z.number().int().optional().describe("Customer ContactID."),
  InvoicingCustomerReferenceID: z.number().int().optional().describe("Customer reference ID on invoicing settings."),
  LanguageID: z.number().int().optional().describe("LanguageID used for the invoice."),
} as const;

// POST /task (main task) or POST /task/create-sub-task — TaskApiCreateModel (21
// fields). Setting ParentTaskID routes create_task to the sub-task endpoint.
export const createTaskShape = {
  ...modeField,
  ProjectID: z.number().int().optional().describe("ProjectID the task belongs to."),
  ParentTaskID: z
    .number()
    .int()
    .optional()
    .describe("If set, the task is created as a SUB-TASK of this TaskID (routes to /task/create-sub-task)."),
  TaskName: z.string().optional().describe("Task name."),
  TaskNo: z.string().optional().describe("Task number (WBS); usually auto-generated."),
  Description: z.string().optional().describe("Task description."),
  TaskTypeID: z.number().int().optional().describe("TaskTypeID — ydelsesfase (see list_task_types)."),
  StartDate: z.string().optional().describe("Start date, ISO 8601."),
  EndDate: z.string().optional().describe("End date, ISO 8601."),
  BudgetHours: z.number().optional().describe("Budgeted hours."),
  BudgetAmount: z.number().optional().describe("Budgeted amount."),
  HourlyRateID: z.number().int().optional().describe("HourlyRateID for the budget (see list_contract_hourly_rates)."),
  ProjectSubContractID: z.number().int().optional().describe("ContractID to link the task to (see list_contracts)."),
  IsBillable: z.boolean().optional().describe("Whether the task is billable."),
  IsReadyForInvoicing: z.boolean().optional().describe("Whether the task is ready for invoicing."),
  AdditionalTextIsRequired: z.boolean().optional().describe("Whether additional text is required on registration."),
  PaymentRecognitionModel: z
    .number()
    .int()
    .min(0)
    .max(2)
    .optional()
    .describe("PaymentRecognitionModel enum: 0=Undefined, 1=OverallPaymentPlan, 2=FixedPricePayment (confirmed via the gate, 2026-06-16)."),
  PaymentAmount: z.number().optional().describe("Payment amount (TDR task)."),
  TaskHourlyRate: z.number().optional().describe("Hourly rate of a TDR task."),
  PaymentProductNo: z.string().optional().describe("Payment product no. (TDR task)."),
  PaymentName: z.string().optional().describe("Payment name (TDR task)."),
  PaymentInvoiceDate: z.string().optional().describe("Payment invoice date, ISO 8601 (TDR task)."),
} as const;

// Fields shared by both contract create models.
const contractCommon = {
  ...modeField,
  ProjectID: z.number().int().optional().describe("ProjectID the contract belongs to."),
  ContractName: z.string().optional().describe("Contract name."),
  ContractStatus: z
    .number()
    .int()
    .min(1)
    .max(4)
    .optional()
    .describe("ContractStatus enum: 1=Quotation, 2=Active, 3=Completed, 4=Cancelled (confirmed via the gate, 2026-06-16; 0 is invalid)."),
  ContractOwnerUserID: z.number().int().optional().describe("UserID of the contract owner."),
  ContractTypeID: z
    .number()
    .int()
    .optional()
    .describe("ContractTypeID — optional; 0 means none (real contracts carry ContractTypeID 0 / empty ContractTypeName). Confirmed via the gate, 2026-06-16."),
  BudgetWorkAmount: z.number().optional().describe("Budget work amount."),
  BudgetWorkHour: z.number().optional().describe("Budget work hours."),
  BudgetExpensesAmount: z.number().optional().describe("Budget expenses amount."),
  BudgetTravelAmount: z.number().optional().describe("Budget travel amount."),
  HasCompletionNotification: z.boolean().optional().describe("Whether the contract has completion notification."),
  CompletionNotificationPercentage: z.number().optional().describe("Completion notification percentage."),
  IsMileageBillable: z.boolean().optional().describe("Whether mileage is billable."),
  IsDefaultExpenses: z.boolean().optional().describe("Whether expenses are default."),
} as const;

// POST /contract/create-time-material-basic-contract — adds budget-overrun notification.
export const timeMaterialContractShape = {
  ...contractCommon,
  HasBudgetOverrunNotification: z.boolean().optional().describe("Whether the contract has budget-overrun notification."),
} as const;

// POST /contract/create-fixed-price-basic-contract — adds payment-plan / target-rate / revenue-distribution fields.
export const fixedPriceContractShape = {
  ...contractCommon,
  TargetHourlyRate: z.number().optional().describe("Target hourly rate."),
  PaymentPlanAmount: z.number().optional().describe("Payment-plan amount."),
  RevenueExprAmount: z.number().optional().describe("Revenue expr amount."),
  RevenueTravelAmount: z.number().optional().describe("Revenue travel amount."),
  IsExpensesLinked: z.boolean().optional().describe("Whether expenses are linked to revenue distribution."),
  IsTravelLinked: z.boolean().optional().describe("Whether travel is linked to revenue distribution."),
} as const;

// POST /payment — PaymentApiCreateModel. A payment is a payment-plan line on a contract.
export const createPaymentShape = {
  ...modeField,
  ProjectID: z.number().int().optional().describe("ProjectID the payment belongs to."),
  ProjectSubContractID: z.number().int().optional().describe("ContractID the payment is on (see list_contracts)."),
  TaskID: z.number().int().optional().describe("TaskID the payment is tied to (per-task revenue recognition)."),
  Name: z.string().optional().describe("Payment name."),
  Comment: z.string().optional().describe("Comment."),
  Amount: z.number().optional().describe("Payment amount."),
  InvoiceDate: z.string().optional().describe("Invoice date, ISO 8601."),
  IsReadyForInvoicing: z.boolean().optional().describe("Whether this payment is ready for invoicing."),
  IsFixedPricePayment: z.boolean().optional().describe("Whether the payment is fixed price."),
  ProductNumber: z.string().optional().describe("Product number."),
  DiscountPercentage: z.number().optional().describe("Discount percentage."),
  Quantity: z.number().optional().describe("Quantity."),
  UnitType: z
    .number()
    .int()
    .optional()
    .describe("UnitType enum (InvoiceUnitTypes): 0=Undefined, 1=Hours, 2=Minutes, 3=Days, 4=Km, 5=Pieces, 6=Liters, 7=Meters, 8=Kilograms (confirmed via the gate, 2026-06-16)."),
} as const;
