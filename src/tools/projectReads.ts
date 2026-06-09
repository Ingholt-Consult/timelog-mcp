import { z } from "zod";
import type { ToolDef } from "./types.js";

export const projectReadTools: ToolDef[] = [
  {
    name: "list_projects",
    // Swagger mis-types GET /project/get-all's 200 as a single project, but the
    // API returns an array. We pass the JSON through verbatim — do not "fix" this
    // into single-object handling (see Phase 1 spec, caveat 3).
    description:
      "List projects. Optional filters: customerID (only that customer's projects) and isActive (true = active projects only). Returns the raw TimeLog project list.",
    inputSchema: {
      customerID: z.number().int().optional().describe("Only projects for this CustomerID."),
      isActive: z.boolean().optional().describe("If set, filter by active/inactive projects."),
    },
    handler: (client, args) =>
      client.get("/project/get-all", {
        customerID: args.customerID as number | undefined,
        isActive: args.isActive as boolean | undefined,
      }),
  },
  {
    name: "get_project",
    description: "Get a single project's full record by ProjectID.",
    inputSchema: {
      projectID: z.number().int().describe("The ProjectID to fetch."),
    },
    handler: (client, args) => client.get(`/project/${args.projectID as number}`),
  },
  {
    name: "list_project_types",
    description: "List all Project Types (read-only classification). Use to resolve a type name to its ProjectTypeID.",
    inputSchema: {},
    handler: (client) => client.get("/ProjectType"),
  },
  {
    name: "list_project_categories",
    description:
      "List all Project Categories (read-only classification, distinct from Project Type). Resolve a category name to its ProjectCategoryID.",
    inputSchema: {},
    handler: (client) => client.get("/ProjectCategory"),
  },
  {
    name: "list_departments",
    description: "List all Departments. Resolve a department name to its DepartmentID.",
    inputSchema: {},
    handler: (client) => client.get("/department"),
  },
];
