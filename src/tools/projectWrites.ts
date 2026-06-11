import type { ToolDef } from "./types.js";
import { updateProjectShape, updateProjectStatusShape, updateProjectBodyKeys } from "../schemas.js";

// GET /project/{id} wraps the record in { Properties: {...} } and exposes the
// project number as `No`, while the update model wants `ProjectNo`. This maps a
// fetched record onto the full 10-field base of the update model (LanguageID is
// not returned by GET, so it is intentionally absent — see ADR 0005).
function baseUpdateModelFromProject(record: unknown): Record<string, unknown> {
  const p = ((record as { Properties?: Record<string, unknown> })?.Properties ?? record) as Record<string, unknown>;
  return {
    Name: p.Name,
    ProjectNo: p.No,
    CustomerID: p.CustomerID,
    ContactID: p.ContactID,
    Description: p.Description,
    ProjectManagerID: p.ProjectManagerID,
    ProjectTypeID: p.ProjectTypeID,
    ProjectCategoryID: p.ProjectCategoryID,
    BudgetWorkHours: p.BudgetWorkHours,
    BudgetWorkAmount: p.BudgetWorkAmount,
  };
}

export const projectWriteTools: ToolDef[] = [
  {
    name: "update_project",
    description:
      "Update fields on ONE existing project (PUT /project/{id}). Provide projectID plus only the fields to change; the tool reads the project first and merges your changes, because PUT is a FULL replace — sending a field on its own would null everything else. Cannot create/delete projects or set StartDate/EndDate. LanguageID is not returned by the API, so it is only sent if you pass it. One project per call — orchestrate mass changes in the conversation.",
    inputSchema: updateProjectShape,
    handler: async (client, args) => {
      const projectID = args.projectID as number;
      const changes: Record<string, unknown> = {};
      for (const key of updateProjectBodyKeys) {
        if (args[key] !== undefined) changes[key] = args[key];
      }
      if (Object.keys(changes).length === 0) {
        throw new Error("update_project called with no fields to change.");
      }
      // Read-modify-write: PUT replaces the whole model, so merge changes onto the
      // current record rather than sending the changed fields alone (ADR 0005).
      const current = await client.get(`/project/${projectID}`);
      const body = { ...baseUpdateModelFromProject(current), ...changes };
      return client.put(`/project/${projectID}`, body);
    },
  },
  {
    name: "update_project_status",
    description:
      "Set the lifecycle status of ONE project (PUT /project/{id}/status). ProjectStatus is a raw integer 0–6 whose labels are NOT yet confirmed — verify in the UI. AllowTimeTracking toggles whether time can be registered.",
    inputSchema: updateProjectStatusShape,
    handler: async (client, args) => {
      const projectID = args.projectID as number;
      return client.put(`/project/${projectID}/status`, {
        ProjectStatus: args.ProjectStatus as number,
        AllowTimeTracking: args.AllowTimeTracking as boolean,
      });
    },
  },
];
