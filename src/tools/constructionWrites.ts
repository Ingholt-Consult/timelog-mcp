import type { ToolDef } from "./types.js";
import { runWrite, bodyFromArgs, type WriteMode } from "./preview.js";
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

export const constructionWriteTools: ToolDef[] = [
  {
    name: "create_project_from_template",
    description:
      "Create a project from a Project Template (preview-and-confirm). Provide ProjectTemplateID plus any overrides. mode=preview (default) validates and returns the validation outcome plus the exact payload that would be sent; mode=execute creates it. NOTE: to build a NEW template, scaffold a source project here and then save it as a template in TimeLog's UI — the API has no template-write endpoint.",
    inputSchema: createProjectFromTemplateShape,
    handler: (client, args) =>
      runWrite(client, {
        mode: modeOf(args),
        validatePath: "/project/validate-create-from-template",
        executePath: "/project/create-from-template",
        body: bodyFromArgs(args),
      }),
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
      });
    },
  },
  {
    name: "create_time_material_contract",
    description:
      "Create a Time & Material (TimeMaterialBasic) contract on a project (preview-and-confirm). mode=preview (default) validates; mode=execute creates. For fixed-price use create_fixed_price_contract instead.",
    inputSchema: timeMaterialContractShape,
    handler: (client, args) =>
      runWrite(client, {
        mode: modeOf(args),
        validatePath: "/contract/validate-time-material-basic-contract",
        executePath: "/contract/create-time-material-basic-contract",
        body: bodyFromArgs(args),
      }),
  },
  {
    name: "create_fixed_price_contract",
    description:
      "Create a Fixed-Price (FixedPriceBasic) contract on a project (preview-and-confirm). Carries payment-plan/target-rate fields. mode=preview (default) validates; mode=execute creates. For T&M use create_time_material_contract instead.",
    inputSchema: fixedPriceContractShape,
    handler: (client, args) =>
      runWrite(client, {
        mode: modeOf(args),
        validatePath: "/contract/validate-fixed-price-basic-contract",
        executePath: "/contract/create-fixed-price-basic-contract",
        body: bodyFromArgs(args),
      }),
  },
  {
    name: "create_payment",
    description:
      "Add a payment-plan line (Payment) to a contract (preview-and-confirm). ProjectSubContractID is the ContractID. mode=preview (default) validates against validate-new-payment; mode=execute creates. One payment per call.",
    inputSchema: createPaymentShape,
    handler: (client, args) =>
      runWrite(client, {
        mode: modeOf(args),
        validatePath: "/payment/validate-new-payment",
        executePath: "/payment",
        body: bodyFromArgs(args),
      }),
  },
];
