import { z } from "zod";

// PUT /project/{id} — ProjectApiUpdateModel. All fields optional; send only what changes.
export const updateProjectShape = {
  projectID: z.number().int().describe("ProjectID of the project to update."),
  Name: z.string().optional().describe("Project name."),
  ProjectNo: z.string().optional().describe("Project number."),
  CustomerID: z.number().int().optional().describe("Owning CustomerID."),
  ContactID: z.number().int().optional().describe("ContactID of the customer contact."),
  Description: z.string().optional().describe("Project description."),
  DepartmentID: z.number().int().optional().describe("Owning DepartmentID."),
  ProjectManagerID: z.number().int().optional().describe("UserID of the Project Manager."),
  AccountManagerID: z.number().int().optional().describe("UserID of the Account Manager."),
  PartnerID: z.number().int().optional().describe("PartnerID associated with the project."),
  ProjectTypeID: z.number().int().optional().describe("ProjectTypeID (classification)."),
  ProjectCategoryID: z.number().int().optional().describe("ProjectCategoryID (classification)."),
  BudgetWorkHours: z.number().optional().describe("Budgeted work hours."),
  BudgetWorkAmount: z.number().optional().describe("Budgeted work amount."),
  LanguageID: z.number().int().optional().describe("LanguageID for project-facing output."),
} as const;

// PUT /project/{id}/status — ProjectStatusApiUpdateModel.
export const updateProjectStatusShape = {
  projectID: z.number().int().describe("ProjectID whose status to change."),
  ProjectStatus: z
    .number()
    .int()
    .min(0)
    .max(6)
    .describe(
      "Lifecycle status as a raw integer 0–6. WARNING: the label for each value is NOT yet confirmed for this account — verify in the TimeLog UI before relying on a specific number.",
    ),
  AllowTimeTracking: z.boolean().describe("Whether time tracking is allowed on the project."),
} as const;

// Fields that are part of the update body (everything except the path param projectID).
export const updateProjectBodyKeys = Object.keys(updateProjectShape).filter((k) => k !== "projectID");
