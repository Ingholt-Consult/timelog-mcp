import { z } from "zod";
import { modeField } from "./constructionSchemas.js";

// POST /workload/book — WorkloadApiCreateModel. A Booking places hours for an
// Employee on a Task across a period; it feeds the Resource Planner
// (Ressourceplanlæggeren) and is DISTINCT from Allokering (a Task's budget hours).
// NOTE: this endpoint has NO validate-* twin and NO DELETE — see runBooking and
// ADR 0007. Field names use the EmployeeId / TaskId casing the booking model uses
// (not the ...ID convention). Required fields confirmed by the empirical gate
// (docs/runbooks/empirical-book-workload.md): all five below, each must be > 0 /
// a valid date.
export const bookWorkloadShape = {
  ...modeField,
  EmployeeId: z.number().int().describe("UserID of the Employee (Medarbejder) to book (see list_users). Required, must be > 0."),
  TaskId: z.number().int().describe("TaskID to book hours on (see list_tasks). Required, must be > 0 — the Opgave must accept time (status 'I gang', not a summation task)."),
  Hours: z.number().describe("Hours (timer) to book for the period. Required, must be > 0."),
  StartDate: z.string().describe("Booking start date, ISO 8601 (e.g. 2026-06-22T00:00:00). Required."),
  EndDate: z.string().describe("Booking end date, ISO 8601. Required."),
} as const;
