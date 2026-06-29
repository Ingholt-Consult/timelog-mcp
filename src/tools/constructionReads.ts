import { z } from "zod";
import type { ToolDef } from "./types.js";
import { unwrapList } from "./unwrap.js";

// List endpoints silently cap at 10 rows unless paged with $-options. These are
// whole-list lookups (e.g. a large project's task tree can exceed 100 tasks), so we
// page with a generous $pagesize to fetch the full list in one call and avoid silent
// truncation (see CONTEXT.md › API conventions). Single-record reads pass the raw
// wrapped { Properties: {...} } through, consistent with get_project.
const WHOLE_LIST_PAGESIZE = 1000;

export const constructionReadTools: ToolDef[] = [
  {
    name: "list_project_templates",
    description:
      "List the account's Project Templates (read-only). Resolve a template name (e.g. 'Fastpris – Småsag') to its ProjectTemplateID for create_project_from_template. NOTE: the API cannot create, edit, or delete templates — that is a UI-only action.",
    inputSchema: {},
    handler: async (client) => unwrapList(await client.get("/project-template/get-all", { $pagesize: WHOLE_LIST_PAGESIZE })),
  },
  {
    name: "list_tasks",
    description:
      "List the task tree of a project (GET /task?projectID=). Source of ParentTaskID when adding a sub-task and of existing TaskIDs.",
    inputSchema: {
      projectID: z.number().int().describe("ProjectID whose tasks to list."),
    },
    handler: async (client, args) =>
      unwrapList(await client.get("/task", { projectID: args.projectID as number, $pagesize: WHOLE_LIST_PAGESIZE })),
  },
  {
    name: "get_task",
    description: "Get a single Task's full record by TaskID.",
    inputSchema: {
      taskID: z.number().int().describe("The TaskID to fetch."),
    },
    handler: (client, args) => client.get(`/task/${args.taskID as number}`),
  },
  {
    name: "list_task_types",
    description:
      "List all Task Types — the firm's ydelsesfaser (e.g. '1.1 Idéoplæg' … '4.8 Certificering KK3'). Resolve a task-type name to its TaskTypeID.",
    inputSchema: {},
    handler: async (client) => unwrapList(await client.get("/TaskType", { $pagesize: WHOLE_LIST_PAGESIZE })),
  },
  {
    name: "list_contracts",
    description: "List a project's Contracts (GET /contract?projectID=). Source of ContractID / ProjectSubContractID.",
    inputSchema: {
      projectID: z.number().int().describe("ProjectID whose contracts to list."),
    },
    handler: async (client, args) =>
      unwrapList(await client.get("/contract", { projectID: args.projectID as number, $pagesize: WHOLE_LIST_PAGESIZE })),
  },
  {
    name: "get_contract",
    description: "Get a single Contract's full record by ContractID.",
    inputSchema: {
      contractID: z.number().int().describe("The ContractID to fetch."),
    },
    handler: (client, args) => client.get(`/contract/${args.contractID as number}`),
  },
  {
    name: "list_payments",
    description:
      "List a Contract's payment-plan lines (GET /payment?contractID=). The contractID here is the same identifier as a payment's ProjectSubContractID.",
    inputSchema: {
      contractID: z.number().int().describe("ContractID whose payments to list."),
    },
    handler: async (client, args) =>
      unwrapList(await client.get("/payment", { contractID: args.contractID as number, $pagesize: WHOLE_LIST_PAGESIZE })),
  },
  {
    name: "list_contract_hourly_rates",
    description:
      "List a Contract's Hourly Rates (GET /contract-hourly-rate?contractID=). Resolve an HourlyRateID that a Task references for its budget.",
    inputSchema: {
      contractID: z.number().int().describe("ContractID whose hourly rates to list."),
    },
    handler: async (client, args) =>
      unwrapList(await client.get("/contract-hourly-rate", { contractID: args.contractID as number, $pagesize: WHOLE_LIST_PAGESIZE })),
  },
];
