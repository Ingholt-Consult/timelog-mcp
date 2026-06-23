import { z } from "zod";
import { modeField } from "./constructionSchemas.js";

// POST /api/v2/resource-planner/book-hours (the Resource Planner — Ressourceplanlægger,
// ADR 0009). Input is in the v1 ids the agent holds (UserID/TaskID); the tool resolves
// the opaque v2 resourceId/workItemId itself. `value` = TOTAL hours spread EVENLY per
// day across [startsAt, endsAt] and is an idempotent REPLACE (not additive). There is
// NO validate-* twin and NO DELETE — preview reads the current plan instead of a dry
// verdict (ADR 0006), and clearing means re-planning with value 0 / the UI.
export const planResourceHoursShape = {
  ...modeField,
  UserID: z.number().int().describe("UserID of the Employee (Medarbejder) to plan (see list_users). Required, > 0."),
  TaskID: z.number().int().describe("TaskID to plan hours on (see list_tasks). Required, > 0 — the Opgave must be planned for the Employee in the Resource Planner (allocated)."),
  value: z.number().describe("TOTAL hours (timer) for the whole period — distributed EVENLY per day across [startsAt, endsAt]. REPLACES any existing plan for this Employee+Opgave+period (not additive). Required."),
  startsAt: z.string().describe("Period start, ISO 8601 (e.g. 2026-06-22T00:00:00). Required."),
  endsAt: z.string().describe("Period end, ISO 8601. Required."),
} as const;

// Read params for get_resource_plan — an Employee's plan over a period via the v2
// partial-group-by-work-item read. Reporting overrides let the caller pull other
// figures (e.g. a different reportingtypes) without changing code.
export const getResourcePlanShape = {
  UserID: z.number().int().describe("UserID of the Employee (Medarbejder) whose plan to read (see list_users). Required, > 0."),
  startsAt: z.string().describe("Period start, ISO 8601 (e.g. 2026-06-01T00:00:00). Required."),
  endsAt: z.string().describe("Period end, ISO 8601. Required."),
  periodTypes: z.string().optional().describe("How periods are bucketed (default 'month'; e.g. 'week', 'day')."),
  unitTypes: z.string().optional().describe("Unit of the figures (default 'hours')."),
  reportingTypes: z.string().optional().describe("Which figures to report (default 'utilization')."),
} as const;
