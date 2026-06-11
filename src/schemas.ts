import { z } from "zod";

// PUT /project/{id} — ProjectApiUpdateModel. Provide only the fields to change;
// the handler reads the project and merges them, because PUT is a FULL replace,
// not a partial update (verified empirically — see ADR 0005). These are the 11
// fields the API's update model actually accepts. DepartmentID, AccountManagerID,
// and PartnerID are NOT in the update model and cannot be changed here.
export const updateProjectShape = {
  projectID: z.number().int().describe("ProjectID of the project to update."),
  Name: z.string().optional().describe("Project name."),
  ProjectNo: z.string().optional().describe("Project number."),
  CustomerID: z.number().int().optional().describe("Owning CustomerID."),
  ContactID: z.number().int().optional().describe("ContactID of the customer contact."),
  Description: z.string().optional().describe("Project description."),
  ProjectManagerID: z.number().int().optional().describe("UserID of the Project Manager."),
  ProjectTypeID: z.number().int().optional().describe("ProjectTypeID (classification)."),
  ProjectCategoryID: z.number().int().optional().describe("ProjectCategoryID (classification)."),
  BudgetWorkHours: z.number().optional().describe("Budgeted work hours."),
  BudgetWorkAmount: z.number().optional().describe("Budgeted work amount."),
  LanguageID: z
    .number()
    .int()
    .optional()
    .describe("LanguageID for project-facing output. NOTE: GET /project/{id} does not return this, so read-modify-write cannot preserve it — pass it explicitly if it must be retained."),
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
      "Lifecycle status as a raw integer 0–6, confirmed via the project's embedded action: 0=Quote, 1=Approved, 2=InProgress, 3=OnHold, 4=Completed, 5=Archived, 6=Cancelled.",
    ),
  AllowTimeTracking: z.boolean().describe("Whether time tracking is allowed on the project."),
} as const;

// Fields that are part of the update body (everything except the path param projectID).
export const updateProjectBodyKeys = Object.keys(updateProjectShape).filter((k) => k !== "projectID");
