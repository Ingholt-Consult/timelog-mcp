import { z } from "zod";
import type { ToolDef } from "./types.js";
import { loadClassificationCache } from "../classificationCache.js";

// The live list endpoints wrap rows as { Entities: [{ Properties: {...} }] }.
function unwrapEntities(resp: unknown): Record<string, unknown>[] {
  const entities = (resp as { Entities?: { Properties?: Record<string, unknown> }[] })?.Entities;
  if (!Array.isArray(entities)) return [];
  return entities.map((e) => e.Properties ?? {}).filter(Boolean) as Record<string, unknown>[];
}

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
    description:
      "List all Project Types (read-only classification) to resolve a type name to its ProjectTypeID. Merges the live API result with a local cache, because the TimeLog API caps the list at 10 records and has no working paging (workaround — see data/classification-cache.json).",
    inputSchema: {},
    handler: async (client) => {
      const live = unwrapEntities(await client.get("/ProjectType"));
      const cache = loadClassificationCache().projectTypes;
      const byId = new Map<number, { ProjectTypeID: number; Name: string; source: string }>();
      for (const c of cache) {
        byId.set(c.id, { ProjectTypeID: c.id, Name: c.name, source: "cache" });
      }
      for (const l of live) {
        const id = l.ProjectTypeID as number;
        const name = String(l.Name ?? "").trim();
        byId.set(id, { ProjectTypeID: id, Name: name, source: byId.has(id) ? "both" : "live" });
      }
      const projectTypes = [...byId.values()].sort((a, b) => a.Name.localeCompare(b.Name, "da"));
      return {
        note: "Merged live API result with the local cache (workaround for the TimeLog list-paging bug; the live API only returns the first 10). Update data/classification-cache.json when project types change.",
        liveCount: live.length,
        cacheCount: cache.length,
        projectTypes,
      };
    },
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
