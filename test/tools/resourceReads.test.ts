import { describe, it, expect, vi } from "vitest";
import { resourceReadTools } from "../../src/tools/resourceReads.js";
import type { TimeLogClient } from "../../src/client.js";

function byName(name: string) {
  const tool = resourceReadTools.find((t) => t.name === name);
  if (!tool) throw new Error(`tool ${name} not found`);
  return tool;
}

describe("resource read tools", () => {
  it("exposes get_employee_workload", () => {
    expect(resourceReadTools.map((t) => t.name)).toEqual(["get_employee_workload"]);
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
