import type { ToolDef } from "./types.js";

export const relationReadTools: ToolDef[] = [
  {
    name: "list_customers",
    description: "List all Customers. Resolve a customer name to its CustomerID.",
    inputSchema: {},
    handler: (client) => client.get("/customer"),
  },
  {
    name: "list_contacts",
    description: "List all Contacts (contact persons). Resolve a contact's ShownName to its ContactID.",
    inputSchema: {},
    handler: (client) => client.get("/contact"),
  },
  {
    name: "list_users",
    description:
      "List all Users (employees). Resolve a person's name/initials to a UserID for ProjectManagerID / AccountManagerID.",
    inputSchema: {},
    handler: (client) => client.get("/user"),
  },
  {
    name: "list_employee_types",
    description: "List all Employee Types (read-only classification).",
    inputSchema: {},
    handler: (client) => client.get("/employee-type"),
  },
  {
    name: "whoami",
    description: "Show the User the current Personal Access Token acts as. Use to confirm which account/identity is connected.",
    inputSchema: {},
    handler: (client) => client.get("/user/me"),
  },
];
