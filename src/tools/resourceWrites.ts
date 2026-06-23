import type { ToolDef } from "./types.js";
import type { WriteMode } from "./preview.js";
import { planResourceHoursShape } from "../resourceSchemas.js";
import {
  resolveResourceId,
  fetchResourcePlan,
  bookHoursBody,
  bookHours,
  workItemNotFound,
  type PlannerPeriod,
} from "./resourcePlanner.js";

// Missing mode is treated as preview (the SDK defaults it, but be defensive).
function modeOf(args: Record<string, unknown>): WriteMode {
  return args.mode === "execute" ? "execute" : "preview";
}

const REPLACE_NOTE =
  "Dette ERSTATTER den planlagte tid for denne Medarbejder+Opgave i perioden (ikke additivt; " +
  "value = total fordelt jævnt pr. dag). Der er INGEN DELETE — ryd ved at planlægge value 0 " +
  "(ubekræftet) eller i Ressourceplanlæggeren. Bekræft før du kører execute.";

export const resourceWriteTools: ToolDef[] = [
  {
    name: "plan_resource_hours",
    description:
      "Plan hours for an Employee (Medarbejder) on a Task (Opgave) over a period in the Ressourceplanlægger (preview-and-confirm). Resolves the opaque Resource Planner ids from UserID/TaskID itself. value = TOTAL hours, distributed EVENLY per day across [startsAt, endsAt], and REPLACES any existing plan for this Employee+Opgave+period (not additive). mode=preview (default) writes NOTHING: it resolves the ids, reads the CURRENT plan for the Task, and returns that plus the exact payload and a warning that there is no DELETE. mode=execute books the hours (POST /api/v2/resource-planner/book-hours). One plan per call. The Opgave must already be planned for the Employee (allocated). This is the Resource Planner — distinct from the dead /workload/book Booking.",
    inputSchema: planResourceHoursShape,
    handler: async (client, args) => {
      const userId = args.UserID as number;
      const taskId = args.TaskID as number;
      const value = args.value as number;
      const period: PlannerPeriod = { startsAt: args.startsAt as string, endsAt: args.endsAt as string };

      // Resolve the opaque v2 ids from the v1 ids: resourceId per employee, workItemId
      // per task. One employee-grouped read + one work-item-grouped read.
      const [resourceId, plan] = await Promise.all([
        resolveResourceId(client, userId, period),
        fetchResourcePlan(client, userId, period),
      ]);
      const currentPlan = plan.find((r) => r.TaskID === taskId);
      if (!currentPlan) throw workItemNotFound(userId, taskId, period);
      const workItemId = currentPlan.workItemId;

      const input = { resourceId, workItemId, value, startsAt: period.startsAt, endsAt: period.endsAt };

      if (modeOf(args) === "execute") {
        return bookHours(client, input);
      }
      return {
        mode: "preview",
        resolved: { resourceId, workItemId },
        currentPlan,
        payload: bookHoursBody(input),
        note: REPLACE_NOTE,
      };
    },
  },
];
