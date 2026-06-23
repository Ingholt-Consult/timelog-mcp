import { describe, it, expect, vi } from "vitest";
import { resourceReadTools } from "../../src/tools/resourceReads.js";
import type { TimeLogClient } from "../../src/client.js";

function byName(name: string) {
  const tool = resourceReadTools.find((t) => t.name === name);
  if (!tool) throw new Error(`tool ${name} not found`);
  return tool;
}

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

describe("resource read tools", () => {
  it("exposes get_employee_workload and get_resource_plan", () => {
    expect(resourceReadTools.map((t) => t.name).sort()).toEqual(
      ["get_employee_workload", "get_resource_plan"].sort(),
    );
  });

  it("get_resource_plan reads the v2 work-item plan for the Employee and returns normalized rows", async () => {
    const postV2 = vi.fn(async () => byWorkItemResp);
    const client = { postV2 } as unknown as TimeLogClient;

    const result = await byName("get_resource_plan").handler(client, {
      UserID: 29,
      startsAt: "2026-06-01T00:00:00",
      endsAt: "2026-06-30T00:00:00",
    });

    expect(postV2).toHaveBeenCalledWith(
      "/resource-planner/partial-group-by-work-item",
      {},
      expect.objectContaining({
        groupedby: "groupbyworkitem",
        EmployeeIds: 29,
        periodstartsat: "2026-06-01",
        periodendsat: "2026-06-30",
        periodtypes: "month",
      }),
    );
    expect(result).toEqual([
      { TaskID: 4961, workItemId: "WI-4961", name: "Task 4961", TotalBooked: 3, values: { "2026-06": { value: 1.5 } } },
    ]);
  });

  it("get_resource_plan forwards reporting overrides", async () => {
    const postV2 = vi.fn(async () => byWorkItemResp);
    const client = { postV2 } as unknown as TimeLogClient;

    await byName("get_resource_plan").handler(client, {
      UserID: 29,
      startsAt: "2026-06-01T00:00:00",
      endsAt: "2026-06-30T00:00:00",
      periodTypes: "week",
      reportingTypes: "eac",
    });

    expect(postV2).toHaveBeenCalledWith(
      "/resource-planner/partial-group-by-work-item",
      {},
      expect.objectContaining({ periodtypes: "week", reportingtypes: "eac" }),
    );
  });

  it("get_employee_workload pages with $pagesize, passes the period params, and unwraps the rows", async () => {
    // employee-projection is a TAFList that silently caps at 10 without $pagesize
    // (gate 2026-06-18); pass $pagesize and unwrap Entities[].Properties.
    const get = vi.fn(async () => ({
      Properties: { TotalRecord: "2" },
      Entities: [
        { Properties: { UserID: 64, Date: "2026-06-22T00:00:00", NormalWorkingHours: 7.5 } },
        { Properties: { UserID: 65, Date: "2026-06-22T00:00:00", NormalWorkingHours: 7.5 } },
      ],
    }));
    const client = { get } as unknown as TimeLogClient;

    const result = await byName("get_employee_workload").handler(client, {
      startDate: "2026-06-22T00:00:00",
      endDate: "2026-06-26T00:00:00",
      includeAllEmployees: true,
    });

    expect(get).toHaveBeenCalledWith("/employee-projection/get-in-period", {
      startDate: "2026-06-22T00:00:00",
      endDate: "2026-06-26T00:00:00",
      includeAllEmployees: true,
      $pagesize: 1000,
    });
    expect(result).toEqual([
      { UserID: 64, Date: "2026-06-22T00:00:00", NormalWorkingHours: 7.5 },
      { UserID: 65, Date: "2026-06-22T00:00:00", NormalWorkingHours: 7.5 },
    ]);
  });

  it("get_employee_workload omits includeAllEmployees when not given", async () => {
    const get = vi.fn(async () => ({ Entities: [] }));
    const client = { get } as unknown as TimeLogClient;

    await byName("get_employee_workload").handler(client, {
      startDate: "2026-06-22T00:00:00",
      endDate: "2026-06-26T00:00:00",
    });

    expect(get).toHaveBeenCalledWith("/employee-projection/get-in-period", {
      startDate: "2026-06-22T00:00:00",
      endDate: "2026-06-26T00:00:00",
      includeAllEmployees: undefined,
      $pagesize: 1000,
    });
  });
});
