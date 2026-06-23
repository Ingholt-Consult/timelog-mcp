import { describe, it, expect, vi } from "vitest";
import { resourceWriteTools } from "../../src/tools/resourceWrites.js";
import type { TimeLogClient } from "../../src/client.js";

function byName(name: string) {
  const tool = resourceWriteTools.find((t) => t.name === name);
  if (!tool) throw new Error(`tool ${name} not found`);
  return tool;
}

const byResourceResp = {
  Model: {
    properties: {
      resourceSourceReferenceId: 0,
      children: [
        { resourceSourceReferenceId: 29, resourceId: "RES-29", resourceType: "Employee", children: [] },
      ],
    },
  },
};
const byWorkItemResp = {
  Model: {
    properties: {
      workItemSourceReferenceId: 0,
      children: [
        { workItemSourceReferenceId: 4961, workItemId: "WI-4961", name: "Task 4961", TotalBooked: 3, values: { "2026-06": { value: 1.5 } }, children: [] },
      ],
    },
  },
};

// Dispatch the v2 reads/writes by path so the handler's resolution flow can run.
function makeClient() {
  const calls: { path: string; body: unknown }[] = [];
  const postV2 = vi.fn(async (path: string, body: unknown) => {
    calls.push({ path, body });
    if (path.includes("partial-group-by-employee")) return byResourceResp;
    if (path.includes("partial-group-by-work-item")) return byWorkItemResp;
    if (path.includes("book-hours")) return "OK";
    return null;
  });
  return { client: { postV2 } as unknown as TimeLogClient, postV2, calls };
}

const fullArgs = (mode: string) => ({
  mode,
  UserID: 29,
  TaskID: 4961,
  value: 8,
  startsAt: "2026-06-22T00:00:00",
  endsAt: "2026-06-26T00:00:00",
});

describe("resource write tools", () => {
  it("exposes plan_resource_hours (and no longer book_workload)", () => {
    expect(resourceWriteTools.map((t) => t.name)).toEqual(["plan_resource_hours"]);
  });

  it("preview resolves the opaque ids, shows the current plan, echoes the payload, and never books", async () => {
    const { client, postV2, calls } = makeClient();

    const result = (await byName("plan_resource_hours").handler(client, fullArgs("preview"))) as {
      mode: string;
      resolved: { resourceId: string; workItemId: string };
      currentPlan: unknown;
      payload: Record<string, unknown>;
      note: string;
    };

    // No write: book-hours is never POSTed in preview.
    expect(calls.some((c) => c.path.includes("book-hours"))).toBe(false);
    expect(postV2).toHaveBeenCalledWith(
      "/resource-planner/partial-group-by-employee",
      {},
      expect.objectContaining({ groupedby: "groupbyresource", EmployeeIds: 29 }),
    );
    expect(result.mode).toBe("preview");
    expect(result.resolved).toEqual({ resourceId: "RES-29", workItemId: "WI-4961" });
    // The current plan row for the target Task is surfaced so the REPLACE is visible.
    expect(result.currentPlan).toMatchObject({ TaskID: 4961, TotalBooked: 3 });
    // The payload is exactly what execute would send (value coerced to string).
    expect(result.payload).toEqual({
      resourceId: "RES-29",
      workItemId: "WI-4961",
      unitType: "hours",
      value: "8",
      startsAt: "2026-06-22T00:00:00",
      endsAt: "2026-06-26T00:00:00",
    });
    expect(result.note).toMatch(/erstatter|replace/i);
  });

  it("execute books the resolved hours via book-hours and returns the result", async () => {
    const { client, calls } = makeClient();

    const result = await byName("plan_resource_hours").handler(client, fullArgs("execute"));

    const book = calls.find((c) => c.path.includes("book-hours"));
    expect(book?.body).toEqual({
      resourceId: "RES-29",
      workItemId: "WI-4961",
      unitType: "hours",
      value: "8",
      startsAt: "2026-06-22T00:00:00",
      endsAt: "2026-06-26T00:00:00",
    });
    expect(result).toBe("OK");
  });

  it("defaults to preview when mode is omitted", async () => {
    const { client, calls } = makeClient();
    const { mode, ...noMode } = fullArgs("preview");

    await byName("plan_resource_hours").handler(client, noMode);

    expect(calls.some((c) => c.path.includes("book-hours"))).toBe(false);
  });

  it("surfaces a clear error when the Task is not planned for the Employee", async () => {
    const { client } = makeClient();

    await expect(
      byName("plan_resource_hours").handler(client, { ...fullArgs("preview"), TaskID: 1234 }),
    ).rejects.toThrow(/1234/);
  });
});
