import type { ToolDef } from "./types.js";
import { updateProjectShape, updateProjectStatusShape, updateProjectBodyKeys } from "../schemas.js";

export const projectWriteTools: ToolDef[] = [
  {
    name: "update_project",
    description:
      "Update fields on ONE existing project (PUT /project/{id}). Provide projectID plus only the fields to change; omitted fields are left untouched. Cannot create/delete projects or set StartDate/EndDate. One project per call — orchestrate mass changes in the conversation.",
    inputSchema: updateProjectShape,
    handler: async (client, args) => {
      const projectID = args.projectID as number;
      const body: Record<string, unknown> = {};
      for (const key of updateProjectBodyKeys) {
        if (args[key] !== undefined) body[key] = args[key];
      }
      if (Object.keys(body).length === 0) {
        throw new Error("update_project called with no fields to change.");
      }
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
