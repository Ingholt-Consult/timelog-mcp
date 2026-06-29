import type { TimeLogClient, QueryParams } from "../client.js";

// The V2 Resource Planner (ADR 0009). The opaque v2 ids (resourceId/workItemId) that
// book-hours needs are resolved per call from the v1 ids the agent holds (UserID/TaskID)
// via two undocumented-but-PAT-authed reads. Both are POST with params in the query and
// an empty body; the response is a tree under Model.properties whose nodes carry the
// v1↔v2 mapping plus per-period figures. See docs/runbooks/empirical-book-workload.md.

const RESOURCE_PLANNER = "/resource-planner";

export interface PlannerPeriod {
  startsAt: string; // ISO 8601, e.g. 2026-06-22T00:00:00
  endsAt: string;
}

// The reportingtypes/periodtypes/unittypes the read aggregates by. Defaults match the
// proven gate call (month / hours / utilization); override to pull other figures
// (e.g. a different reportingtypes) without hardcoding unverified field names.
export interface PlannerReadOptions {
  periodTypes?: string;
  unitTypes?: string;
  reportingTypes?: string;
}

interface PlannerNode {
  children?: PlannerNode[];
  [key: string]: unknown;
}

function plannerQuery(
  userId: number,
  period: PlannerPeriod,
  groupedby: string,
  opts?: PlannerReadOptions,
): QueryParams {
  return {
    groupedby,
    // The gate used date-only period bounds; the planner buckets by periodtypes anyway.
    periodstartsat: period.startsAt.slice(0, 10),
    periodendsat: period.endsAt.slice(0, 10),
    periodtypes: opts?.periodTypes ?? "month",
    unittypes: opts?.unitTypes ?? "hours",
    reportingtypes: opts?.reportingTypes ?? "utilization",
    EmployeeIds: userId,
    IsEmployeeInclusive: true,
  };
}

// Flatten the planner tree (Model.properties + every nested child) into a row list so
// callers can scan for the node carrying the id / figures they need.
export function flattenPlannerNodes(resp: unknown): Record<string, unknown>[] {
  const root = (resp as { Model?: { properties?: PlannerNode } })?.Model?.properties;
  const out: Record<string, unknown>[] = [];
  const walk = (node?: PlannerNode): void => {
    if (!node || typeof node !== "object") return;
    out.push(node);
    for (const child of node.children ?? []) walk(child);
  };
  walk(root);
  return out;
}

// UserID → opaque resourceId (constant per employee). Reads the resource grouping.
export async function resolveResourceId(
  client: TimeLogClient,
  userId: number,
  period: PlannerPeriod,
  opts?: PlannerReadOptions,
): Promise<string> {
  const resp = await client.postV2(
    `${RESOURCE_PLANNER}/partial-group-by-employee`,
    {},
    plannerQuery(userId, period, "groupbyresource", opts),
  );
  for (const node of flattenPlannerNodes(resp)) {
    if (
      Number(node.resourceSourceReferenceId) === userId &&
      node.resourceId != null &&
      String(node.resourceId) !== "0"
    ) {
      return String(node.resourceId);
    }
  }
  throw new Error(
    `Ingen ressource fundet for UserID ${userId} i Ressourceplanlæggeren for perioden ` +
      `${period.startsAt.slice(0, 10)}..${period.endsAt.slice(0, 10)}. ` +
      `Medarbejderen skal være ressource på en opgave i perioden (se allocation).`,
  );
}

export function workItemNotFound(userId: number, taskId: number, period: PlannerPeriod): Error {
  return new Error(
    `TaskID ${taskId} findes ikke i Ressourceplanlæggeren for UserID ${userId} i perioden ` +
      `${period.startsAt.slice(0, 10)}..${period.endsAt.slice(0, 10)}. ` +
      `Opgaven skal være planlagt for medarbejderen (se allocation) og ramme perioden.`,
  );
}

// TaskID → opaque workItemId, filtered to the employee. Reads the work-item grouping.
export async function resolveWorkItemId(
  client: TimeLogClient,
  userId: number,
  taskId: number,
  period: PlannerPeriod,
  opts?: PlannerReadOptions,
): Promise<string> {
  const row = (await fetchResourcePlan(client, userId, period, opts)).find((r) => r.TaskID === taskId);
  if (!row) throw workItemNotFound(userId, taskId, period);
  return row.workItemId;
}

export interface ResourcePlanRow {
  TaskID: number;
  workItemId: string;
  name: unknown;
  TotalBooked: unknown;
  // The raw per-period figures the planner returns for the chosen reportingtypes.
  values: unknown;
}

// An employee's plan as work-item rows: TaskID ↔ workItemId, total, and the per-period
// figures (booked / actual / EAC per the chosen reportingtypes). Skips the total row.
export async function fetchResourcePlan(
  client: TimeLogClient,
  userId: number,
  period: PlannerPeriod,
  opts?: PlannerReadOptions,
): Promise<ResourcePlanRow[]> {
  const resp = await client.postV2(
    `${RESOURCE_PLANNER}/partial-group-by-work-item`,
    {},
    plannerQuery(userId, period, "groupbyworkitem", opts),
  );
  return flattenPlannerNodes(resp)
    .filter((n) => n.workItemSourceReferenceId != null && Number(n.workItemSourceReferenceId) !== 0)
    .map((n) => ({
      TaskID: Number(n.workItemSourceReferenceId),
      workItemId: String(n.workItemId),
      name: n.name,
      TotalBooked: n.TotalBooked,
      values: n.values,
    }));
}

// book-hours clamps the period start to *today*, so a window whose END is before today
// inverts and the API rejects it with a misleading 500 "end date is before start date"
// (proven 2026-06-29). Guard up front with a clear message — applies to preview and
// execute. A period that merely STARTS in the past but ends today/later is fine (the
// clamp just moves the start forward). Date-only comparison; `today` is injected for tests.
export function assertPlannablePeriod(period: PlannerPeriod, today: Date): void {
  const end = period.endsAt.slice(0, 10);
  const todayStr = today.toISOString().slice(0, 10);
  if (end < todayStr) {
    throw new Error(
      `Kan ikke planlægge i en periode der slutter før i dag (${end} < ${todayStr}). ` +
        `Ressourceplanlæggeren afviser fortidige perioder — vælg en periode der ligger i dag eller frem.`,
    );
  }
}

export interface BookHoursInput {
  resourceId: string;
  workItemId: string;
  value: number;
  startsAt: string;
  endsAt: string;
}

// The exact book-hours wire body. Built in one place so the preview shows precisely what
// execute sends. The one proven-working call sent `value` as a string — keep that shape.
export function bookHoursBody(input: BookHoursInput): Record<string, unknown> {
  return {
    resourceId: input.resourceId,
    workItemId: input.workItemId,
    unitType: "hours",
    value: String(input.value),
    startsAt: input.startsAt,
    endsAt: input.endsAt,
  };
}

// POST /resource-planner/book-hours — value = TOTAL hours spread EVENLY per day over
// [startsAt, endsAt]; idempotent REPLACE per resource+workItem+period (ADR 0009).
export async function bookHours(client: TimeLogClient, input: BookHoursInput): Promise<unknown> {
  return client.postV2(`${RESOURCE_PLANNER}/book-hours`, bookHoursBody(input));
}
