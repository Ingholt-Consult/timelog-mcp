import { z } from "zod";
import type { ToolDef } from "./types.js";
import { unwrapList } from "./unwrap.js";

export const projectReadTools: ToolDef[] = [
  {
    name: "list_projects",
    // Swagger mis-types GET /project/get-all's 200 as a single project, but the
    // API returns an array. We pass the JSON through verbatim — do not "fix" this
    // into single-object handling (see Phase 1 spec, caveat 3).
    description:
      "List projects. Optional filters: customerID (only that customer's projects) and isActive (true = active projects only). " +
      "Paging: TimeLog silently caps the list at 10 rows unless paged, so this passes pageSize (default 100) as the $pagesize " +
      "query option; set page to fetch later pages. The response's Properties carries TotalRecord/TotalPage/PageNumber so you " +
      "can tell how many pages exist. Returns the raw TimeLog project list.",
    inputSchema: {
      customerID: z.number().int().optional().describe("Only projects for this CustomerID."),
      isActive: z.boolean().optional().describe("If set, filter by active/inactive projects."),
      page: z.number().int().positive().optional().describe("1-based page number (TimeLog $page). Omit for page 1."),
      pageSize: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Rows per page (TimeLog $pagesize). Defaults to 100 to avoid the silent 10-row cap."),
    },
    handler: (client, args) =>
      client.get("/project/get-all", {
        customerID: args.customerID as number | undefined,
        isActive: args.isActive as boolean | undefined,
        $page: args.page as number | undefined,
        $pagesize: (args.pageSize as number | undefined) ?? 100,
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
    description:
      "List all Project Types (read-only classification) to resolve a type name to its ProjectTypeID. Returns the full list, sorted by name.",
    inputSchema: {},
    handler: async (client) => {
      // TimeLog list endpoints silently cap at 10 rows unless paged with $-options;
      // $pagesize=100 returns the full list (see CONTEXT.md > API conventions).
      const types = unwrapList(await client.get("/ProjectType", { $pagesize: 100 }));
      return types.sort((a, b) => String(a.Name ?? "").localeCompare(String(b.Name ?? ""), "da"));
    },
  },
  {
    name: "list_project_categories",
    description:
      "List all Project Categories (read-only classification, distinct from Project Type). Resolve a category name to its ProjectCategoryID.",
    inputSchema: {},
    handler: (client) => client.get("/ProjectCategory", { $pagesize: 100 }),
  },
  {
    name: "list_departments",
    description: "List all Departments. Resolve a department name to its DepartmentID.",
    inputSchema: {},
    handler: (client) => client.get("/department", { $pagesize: 100 }),
  },
];
