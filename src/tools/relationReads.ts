import { z } from "zod";
import type { ToolDef } from "./types.js";

// TimeLog list endpoints silently cap at 10 rows unless paged with $-options.
// These are name->ID lookups (a real account has hundreds of customers/contacts),
// so they expose page/pageSize and default $pagesize=1000 to fetch the whole list
// in one call for reliable name resolution (see CONTEXT.md > API conventions).
const LOOKUP_PAGESIZE = 1000;

const pagingSchema = {
  page: z.number().int().positive().optional().describe("1-based page number (TimeLog $page). Omit for page 1."),
  pageSize: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(`Rows per page (TimeLog $pagesize). Defaults to ${LOOKUP_PAGESIZE} to return the whole list in one call.`),
};

const pagingQuery = (args: Record<string, unknown>) => ({
  $page: args.page as number | undefined,
  $pagesize: (args.pageSize as number | undefined) ?? LOOKUP_PAGESIZE,
});

export const relationReadTools: ToolDef[] = [
  {
    name: "list_customers",
    description:
      "List Customers. Resolve a customer name to its CustomerID. Paged: pageSize defaults to 1000 (whole list in one call); set page/pageSize to narrow.",
    inputSchema: { ...pagingSchema },
    handler: (client, args) => client.get("/customer", pagingQuery(args)),
  },
  {
    name: "list_contacts",
    description:
      "List Contacts (contact persons). Resolve a contact's ShownName to its ContactID. Paged: pageSize defaults to 1000 (whole list in one call); set page/pageSize to narrow.",
    inputSchema: { ...pagingSchema },
    handler: (client, args) => client.get("/contact", pagingQuery(args)),
  },
  {
    name: "list_users",
    description:
      "List Users (employees). Resolve a person's name/initials to a UserID for ProjectManagerID / AccountManagerID. Paged: pageSize defaults to 1000 (whole list in one call); set page/pageSize to narrow.",
    inputSchema: { ...pagingSchema },
    handler: (client, args) => client.get("/user", pagingQuery(args)),
  },
  {
    name: "list_employee_types",
    description: "List all Employee Types (read-only classification).",
    inputSchema: {},
    // Small classification list — fetch it whole in one call (no paging needed).
    handler: (client) => client.get("/employee-type", { $pagesize: 100 }),
  },
  {
    name: "whoami",
    description: "Show the User the current Personal Access Token acts as. Use to confirm which account/identity is connected.",
    inputSchema: {},
    handler: (client) => client.get("/user/me"),
  },
];
