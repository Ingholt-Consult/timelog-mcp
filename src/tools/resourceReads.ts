import { z } from "zod";
import type { ToolDef } from "./types.js";
import type { TimeLogClient } from "../client.js";
import { unwrapList } from "./unwrap.js";
import { getResourcePlanShape } from "../resourceSchemas.js";
import { fetchResourcePlan } from "./resourcePlanner.js";

// GET /employee-projection/get-in-period returns Kapacitet/Arbejdsbyrde per
// Employee per day for the period. The empirical gate (2026-06-18) found it is a
// paging TAFList that silently caps at 10 rows without $pagesize, carries CAPACITY
// only (NormalWorkingHours per Date per UserID — NOT already-booked hours), and has
// no employee filter. We page with a generous $pagesize and unwrap the rows; for a
// very large window the caller should narrow the dates.
const PROJECTION_PAGESIZE = 1000;

// Backs get_employee_workload: pages with a generous $pagesize and unwraps the rows.
export async function fetchEmployeeProjection(
  client: TimeLogClient,
  args: { startDate: string; endDate: string; includeAllEmployees?: boolean },
): Promise<Record<string, unknown>[]> {
  return unwrapList(
    await client.get("/employee-projection/get-in-period", {
      startDate: args.startDate,
      endDate: args.endDate,
      includeAllEmployees: args.includeAllEmployees,
      $pagesize: PROJECTION_PAGESIZE,
    }),
  );
}

export const resourceReadTools: ToolDef[] = [
  {
    name: "get_employee_workload",
    description:
      "List Employees' Kapacitet (normal arbejdstid pr. dag) over a period (GET /employee-projection/get-in-period). Use to see who has working hours scheduled, e.g. 'hvem er på arbejde i uge 30?'. NOTE: this returns capacity (NormalWorkingHours) and closed/approval flags per day — NOT how many hours are already booked, so it cannot by itself show free vs. overbooked. Returns the projection rows; narrow the period if it is large.",
    inputSchema: {
      startDate: z.string().describe("Period start, ISO 8601 (e.g. 2026-06-22T00:00:00)."),
      endDate: z.string().describe("Period end, ISO 8601."),
      includeAllEmployees: z
        .boolean()
        .optional()
        .describe("If true, include all Employees; otherwise only those assigned in the period."),
    },
    handler: (client, args) =>
      fetchEmployeeProjection(client, {
        startDate: args.startDate as string,
        endDate: args.endDate as string,
        includeAllEmployees: args.includeAllEmployees as boolean | undefined,
      }),
  },
  {
    name: "get_resource_plan",
    description:
      "Show an Employee's (Medarbejder) plan in the Ressourceplanlægger over a period (v2 partial-group-by-work-item). Returns one row per planned Task (Opgave) with the TaskID, the opaque workItemId, the total booked, and the per-period figures (booked/actual/EAC per the chosen reportingtypes). Unlike get_employee_workload (capacity only), this shows the actually planned hours. Defaults: periodtypes=month, unittypes=hours, reportingtypes=utilization.",
    inputSchema: getResourcePlanShape,
    handler: (client, args) =>
      fetchResourcePlan(
        client,
        args.UserID as number,
        { startsAt: args.startsAt as string, endsAt: args.endsAt as string },
        {
          periodTypes: args.periodTypes as string | undefined,
          unitTypes: args.unitTypes as string | undefined,
          reportingTypes: args.reportingTypes as string | undefined,
        },
      ),
  },
];
