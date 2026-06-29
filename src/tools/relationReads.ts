import { z } from "zod";
import type { ToolDef } from "./types.js";

// TimeLog list endpoints silently cap at 10 rows unless paged with $-options.
// Customers/contacts/users can exceed that on a real account, so these expose
// page/pageSize and default $pagesize=100 (see CONTEXT.md > API conventions).
const pagingSchema = {
  page: z.number().int().positive().optional().describe("1-based page number (TimeLog $page). Omit for page 1."),
  pageSize: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Rows per page (TimeLog $pagesize). Defaults to 100 to avoid the silent 10-row cap."),
};

const pagingQuery = (args: Record<string, unknown>) => ({
  $page: args.page as number | undefined,
  $pagesize: (args.pageSize as number | undefined) ?? 100,
});

export const relationReadTools: ToolDef[] = [
  {
    name: "list_customers",
    description:
      "List Customers. Resolve a customer name to its CustomerID. Paged: pageSize defaults to 100; set page for later pages.",
    inputSchema: { ...pagingSchema },
    handler: (client, args) => client.get("/customer", pagingQuery(args)),
  },
  {
    name: "list_contacts",
    description:
      "List Contacts (contact persons). Resolve a contact's ShownName to its ContactID. Paged: pageSize defaults to 100; set page for later pages.",
    inputSchema: { ...pagingSchema },
    handler: (client, args) => client.get("/contact", pagingQuery(args)),
  },
  {
    name: "list_users",
    description:
      "List Users (employees). Resolve a person's name/initials to a UserID for ProjectManagerID / AccountManagerID. Paged: pageSize defaults to 100; set page for later pages.",
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
