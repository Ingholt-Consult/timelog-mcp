import type { ToolDef } from "./types.js";
import type { TimeLogClient } from "../client.js";
import { runWrite, bodyFromArgs, type WriteMode } from "./preview.js";
import { unwrapList } from "./unwrap.js";
import {
  createProjectFromTemplateShape,
  createTaskShape,
  timeMaterialContractShape,
  fixedPriceContractShape,
  createPaymentShape,
} from "../constructionSchemas.js";

// Missing mode is treated as preview (the SDK defaults it, but be defensive).
function modeOf(args: Record<string, unknown>): WriteMode {
  return args.mode === "execute" ? "execute" : "preview";
}

// --- selective enrichment helpers (best-effort; runWrite swallows their errors) ---

async function findById(
  client: TimeLogClient,
  path: string,
  idKey: string,
  id: unknown,
): Promise<Record<string, unknown> | undefined> {
  if (id === undefined || id === null) return undefined;
  const rows = unwrapList(await client.get(path, { $pagesize: 100 }));
  return rows.find((r) => Number(r[idKey]) === Number(id));
}

async function getOneName(client: TimeLogClient, path: string, nameKey: string): Promise<unknown> {
  const resp = (await client.get(path)) as { Properties?: Record<string, unknown> } | Record<string, unknown>;
  const p = ((resp as { Properties?: Record<string, unknown> })?.Properties ?? resp) as Record<string, unknown>;
  return p?.[nameKey];
}

export const constructionWriteTools: ToolDef[] = [
  {
    name: "create_project_from_template",
    description:
      "Create a project from a Project Template (preview-and-confirm). Provide ProjectTemplateID plus any overrides. mode=preview (default) validates and shows what would be created; mode=execute creates it. NOTE: to build a NEW template, scaffold a source project here and then save it as a template in TimeLog's UI — the API has no template-write endpoint.",
    inputSchema: createProjectFromTemplateShape,
    handler: (client, args) => {
      const body = bodyFromArgs(args);
      return runWrite(client, {
        mode: modeOf(args),
        validatePath: "/project/validate-create-from-template",
        executePath: "/project/create-from-template",
        body,
        summarize: async (c, b) => {
          const tpl = await findById(c, "/project-template/get-all", "ProjectTemplateID", b.ProjectTemplateID);
          const cust = await findById(c, "/customer", "CustomerID", b.CustomerID);
          return {
            template: tpl ? { id: b.ProjectTemplateID, name: tpl.Name } : b.ProjectTemplateID,
            customer: cust ? { id: b.CustomerID, name: cust.Name ?? cust.ShownName } : (b.CustomerID ?? "internal"),
            name: b.Name,
          };
        },
      });
    },
  },
  {
    name: "create_task",
    description:
      "Create a Task, or a Sub-task when ParentTaskID is set (preview-and-confirm). mode=preview (default) validates against validate-new-task; mode=execute creates against /task (main) or /task/create-sub-task (sub-task). One task per call — orchestrate a task tree in the conversation.",
    inputSchema: createTaskShape,
    handler: (client, args) => {
      const body = bodyFromArgs(args);
      const isSubTask = body.ParentTaskID !== undefined && body.ParentTaskID !== null;
      return runWrite(client, {
        mode: modeOf(args),
        validatePath: "/task/validate-new-task",
        executePath: isSubTask ? "/task/create-sub-task" : "/task",
        body,
        summarize: async (c, b) => {
          const tt = await findById(c, "/TaskType", "TaskTypeID", b.TaskTypeID);
          const summary: Record<string, unknown> = {
            task: b.TaskName,
            kind: isSubTask ? "sub-task" : "task",
            parentTaskID: b.ParentTaskID ?? null,
            taskType: tt ? { id: b.TaskTypeID, name: tt.Name } : b.TaskTypeID,
          };
          if (b.ProjectSubContractID !== undefined && b.ProjectSubContractID !== null) {
            summary.contract = {
              id: b.ProjectSubContractID,
              name: await getOneName(c, `/contract/${b.ProjectSubContractID}`, "Name"),
            };
          }
          return summary;
        },
      });
    },
  },
  {
    name: "create_time_material_contract",
    description:
      "Create a Time & Material (TimeMaterialBasic) contract on a project (preview-and-confirm). mode=preview (default) validates; mode=execute creates. For fixed-price use create_fixed_price_contract instead.",
    inputSchema: timeMaterialContractShape,
    handler: (client, args) => {
      const body = bodyFromArgs(args);
      return runWrite(client, {
        mode: modeOf(args),
        validatePath: "/contract/validate-time-material-basic-contract",
        executePath: "/contract/create-time-material-basic-contract",
        body,
        summarize: async (c, b) => ({
          contractModel: "TimeMaterialBasic",
          contractName: b.ContractName,
          project: { id: b.ProjectID, name: await getOneName(c, `/project/${b.ProjectID}`, "Name") },
        }),
      });
    },
  },
  {
    name: "create_fixed_price_contract",
    description:
      "Create a Fixed-Price (FixedPriceBasic) contract on a project (preview-and-confirm). Carries payment-plan/target-rate fields. mode=preview (default) validates; mode=execute creates. For T&M use create_time_material_contract instead.",
    inputSchema: fixedPriceContractShape,
    handler: (client, args) => {
      const body = bodyFromArgs(args);
      return runWrite(client, {
        mode: modeOf(args),
        validatePath: "/contract/validate-fixed-price-basic-contract",
        executePath: "/contract/create-fixed-price-basic-contract",
        body,
        summarize: async (c, b) => ({
          contractModel: "FixedPriceBasic",
          contractName: b.ContractName,
          project: { id: b.ProjectID, name: await getOneName(c, `/project/${b.ProjectID}`, "Name") },
        }),
      });
    },
  },
  {
    name: "create_payment",
    description:
      "Add a payment-plan line (Payment) to a contract (preview-and-confirm). ProjectSubContractID is the ContractID. mode=preview (default) validates against validate-new-payment; mode=execute creates. One payment per call.",
    inputSchema: createPaymentShape,
    handler: (client, args) => {
      const body = bodyFromArgs(args);
      return runWrite(client, {
        mode: modeOf(args),
        validatePath: "/payment/validate-new-payment",
        executePath: "/payment",
        body,
        summarize: async (c, b) => {
          const summary: Record<string, unknown> = { payment: b.Name, amount: b.Amount };
          if (b.ProjectSubContractID !== undefined && b.ProjectSubContractID !== null) {
            summary.contract = {
              id: b.ProjectSubContractID,
              name: await getOneName(c, `/contract/${b.ProjectSubContractID}`, "Name"),
            };
          }
          if (b.TaskID !== undefined && b.TaskID !== null) {
            summary.task = { id: b.TaskID, name: await getOneName(c, `/task/${b.TaskID}`, "TaskName") };
          }
          return summary;
        },
      });
    },
  },
];
