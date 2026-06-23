import { describe, it, expect, vi } from "vitest";
import {
  flattenPlannerNodes,
  resolveResourceId,
  resolveWorkItemId,
  fetchResourcePlan,
  bookHours,
} from "../../src/tools/resourcePlanner.js";
import type { TimeLogClient } from "../../src/client.js";

const period = { startsAt: "2026-06-22T00:00:00", endsAt: "2026-06-30T00:00:00" };

// A resource-grouped response: root (total) → resource nodes (resourceSourceReferenceId = UserID).
const byResourceResp = {
  Model: {
    properties: {
      resourceSourceReferenceId: 0,
      children: [
        {
          resourceSourceReferenceId: 29,
          resourceId: "512272789219049472",
          resourceType: "Employee",
          name: "MRT",
          TotalBooked: 5,
          values: { "2026-06": { value: 5 } },
          children: [],
        },
      ],
    },
  },
};

// A work-item-grouped response: root (total) → work-item nodes (workItemSourceReferenceId = TaskID).
const byWorkItemResp = {
  Model: {
    properties: {
      workItemSourceReferenceId: 0,
      children: [
        {
          workItemSourceReferenceId: 4961,
          workItemId: "512272894517051410",
          name: "Task 4961",
          TotalBooked: 3,
          values: { "2026-06": { value: 1.5 } },
          children: [],
        },
      ],
    },
  },
};

describe("flattenPlannerNodes", () => {
  it("walks Model.properties and all nested children", () => {
    const nested = {
      Model: { properties: { id: "root", children: [{ id: "a", children: [{ id: "b" }] }, { id: "c" }] } },
    };
    expect(flattenPlannerNodes(nested).map((n) => n.id)).toEqual(["root", "a", "b", "c"]);
  });

  it("returns [] for an unrecognised shape", () => {
    expect(flattenPlannerNodes(null)).toEqual([]);
    expect(flattenPlannerNodes({})).toEqual([]);
  });
});

describe("resolveResourceId", () => {
  it("reads partial-group-by-employee (groupbyresource) and returns the opaque resourceId for the UserID", async () => {
    const postV2 = vi.fn(async () => byResourceResp);
    const client = { postV2 } as unknown as TimeLogClient;

    const resourceId = await resolveResourceId(client, 29, period);

    expect(resourceId).toBe("512272789219049472");
    expect(postV2).toHaveBeenCalledWith(
      "/resource-planner/partial-group-by-employee",
      {},
      {
        groupedby: "groupbyresource",
        periodstartsat: "2026-06-22",
        periodendsat: "2026-06-30",
        periodtypes: "month",
        unittypes: "hours",
        reportingtypes: "utilization",
        EmployeeIds: 29,
        IsEmployeeInclusive: true,
      },
    );
  });

  it("throws a clear error naming the UserID when no resource row matches", async () => {
    const postV2 = vi.fn(async () => byResourceResp);
    const client = { postV2 } as unknown as TimeLogClient;

    await expect(resolveResourceId(client, 999, period)).rejects.toThrow(/999/);
  });
});

describe("resolveWorkItemId", () => {
  it("reads partial-group-by-work-item (groupbyworkitem) filtered by UserID and returns the workItemId for the TaskID", async () => {
    const postV2 = vi.fn(async () => byWorkItemResp);
    const client = { postV2 } as unknown as TimeLogClient;

    const workItemId = await resolveWorkItemId(client, 29, 4961, period);

    expect(workItemId).toBe("512272894517051410");
    expect(postV2).toHaveBeenCalledWith(
      "/resource-planner/partial-group-by-work-item",
      {},
      expect.objectContaining({ groupedby: "groupbyworkitem", EmployeeIds: 29, IsEmployeeInclusive: true }),
    );
  });

  it("throws a clear error naming the TaskID when the work item is not in the planner", async () => {
    const postV2 = vi.fn(async () => byWorkItemResp);
    const client = { postV2 } as unknown as TimeLogClient;

    await expect(resolveWorkItemId(client, 29, 1234, period)).rejects.toThrow(/1234/);
  });
});

describe("fetchResourcePlan", () => {
  it("returns normalized work-item rows (TaskID, workItemId, TotalBooked, per-period values), skipping the total row", async () => {
    const postV2 = vi.fn(async () => byWorkItemResp);
    const client = { postV2 } as unknown as TimeLogClient;

    const rows = await fetchResourcePlan(client, 29, period);

    expect(rows).toEqual([
      {
        TaskID: 4961,
        workItemId: "512272894517051410",
        name: "Task 4961",
        TotalBooked: 3,
        values: { "2026-06": { value: 1.5 } },
      },
    ]);
  });

  it("forwards period/reporting overrides to the read", async () => {
    const postV2 = vi.fn(async () => byWorkItemResp);
    const client = { postV2 } as unknown as TimeLogClient;

    await fetchResourcePlan(client, 29, period, { periodTypes: "week", reportingTypes: "eac" });

    expect(postV2).toHaveBeenCalledWith(
      "/resource-planner/partial-group-by-work-item",
      {},
      expect.objectContaining({ periodtypes: "week", reportingtypes: "eac", unittypes: "hours" }),
    );
  });
});

describe("bookHours", () => {
  it("POSTs book-hours with unitType=hours and value coerced to the proven string wire shape", async () => {
    const postV2 = vi.fn(async () => "OK");
    const client = { postV2 } as unknown as TimeLogClient;

    const result = await bookHours(client, {
      resourceId: "512272789219049472",
      workItemId: "512272894517051410",
      value: 8,
      startsAt: "2026-06-22T00:00:00",
      endsAt: "2026-06-26T00:00:00",
    });

    expect(postV2).toHaveBeenCalledWith("/resource-planner/book-hours", {
      resourceId: "512272789219049472",
      workItemId: "512272894517051410",
      unitType: "hours",
      value: "8",
      startsAt: "2026-06-22T00:00:00",
      endsAt: "2026-06-26T00:00:00",
    });
    expect(result).toBe("OK");
  });
});
