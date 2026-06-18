import { z } from "zod";
import type { ToolDef } from "./types.js";
import { unwrapList } from "./unwrap.js";

// GET /employee-projection/get-in-period returns Kapacitet/Arbejdsbyrde per
// Employee per day for the period. The empirical gate (2026-06-18) found it is a
// paging TAFList that silently caps at 10 rows without $pagesize, carries CAPACITY
// only (NormalWorkingHours per Date per UserID — NOT already-booked hours), and has
// no employee filter. We page with a generous $pagesize and unwrap the rows; for a
// very large window the caller should narrow the dates.
const PROJECTION_PAGESIZE = 1000;

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
    handler: async (client, args) =>
      unwrapList(
        await client.get("/employee-projection/get-in-period", {
          startDate: args.startDate as string,
          endDate: args.endDate as string,
          includeAllEmployees: args.includeAllEmployees as boolean | undefined,
          $pagesize: PROJECTION_PAGESIZE,
        }),
      ),
  },
];
