import { describe, it, expect, vi } from "vitest";
import { resourceWriteTools } from "../../src/tools/resourceWrites.js";
import type { TimeLogClient } from "../../src/client.js";

function byName(name: string) {
  const tool = resourceWriteTools.find((t) => t.name === name);
  if (!tool) throw new Error(`tool ${name} not found`);
  return tool;
}

const fullArgs = (mode: string) => ({
  mode,
  EmployeeId: 64,
  TaskId: 34,
  Hours: 8,
  StartDate: "2026-06-22T00:00:00",
  EndDate: "2026-06-26T00:00:00",
});

describe("resource write tools", () => {
  it("exposes book_workload", () => {
    expect(resourceWriteTools.map((t) => t.name)).toEqual(["book_workload"]);
  });

  it("preview reads the period projection (never posts) and filters capacity to the booked Employee", async () => {
    const post = vi.fn(async () => ({}));
    const get = vi.fn(async () => ({
      Entities: [
        { Properties: { UserID: 64, Date: "2026-06-22T00:00:00", NormalWorkingHours: 7.5 } },
        { Properties: { UserID: 65, Date: "2026-06-22T00:00:00", NormalWorkingHours: 7.5 } },
      ],
    }));
    const client = { post, get } as unknown as TimeLogClient;

    const result = (await byName("book_workload").handler(client, fullArgs("preview"))) as {
      mode: string; capacity: { ok: boolean; projection: Record<string, unknown>[] }; payload: Record<string, unknown>;
    };

    expect(post).not.toHaveBeenCalled();
    expect(get).toHaveBeenCalledWith("/employee-projection/get-in-period", {
      startDate: "2026-06-22T00:00:00",
      endDate: "2026-06-26T00:00:00",
      includeAllEmployees: true,
      $pagesize: 1000,
    });
    expect(result.mode).toBe("preview");
    // Only the booked Employee's (UserID 64) capacity rows are surfaced.
    expect(result.capacity.projection).toEqual([
      { UserID: 64, Date: "2026-06-22T00:00:00", NormalWorkingHours: 7.5 },
    ]);
    expect(result.payload).toEqual({
      EmployeeId: 64, TaskId: 34, Hours: 8, StartDate: "2026-06-22T00:00:00", EndDate: "2026-06-26T00:00:00",
    });
  });

  it("execute posts the booking body (no mode) to /workload/book", async () => {
    const post = vi.fn(async () => ({ accepted: true }));
    const get = vi.fn();
    const client = { post, get } as unknown as TimeLogClient;

    const result = await byName("book_workload").handler(client, fullArgs("execute"));

    expect(post).toHaveBeenCalledWith("/workload/book", {
      EmployeeId: 64, TaskId: 34, Hours: 8, StartDate: "2026-06-22T00:00:00", EndDate: "2026-06-26T00:00:00",
    });
    expect(get).not.toHaveBeenCalled();
    expect(result).toEqual({ accepted: true });
  });

  it("defaults to preview when mode is omitted", async () => {
    const post = vi.fn(async () => ({}));
    const get = vi.fn(async () => ({ Entities: [] }));
    const client = { post, get } as unknown as TimeLogClient;

    const { mode, ...noMode } = fullArgs("preview");
    await byName("book_workload").handler(client, noMode);

    expect(post).not.toHaveBeenCalled();
    expect(get).toHaveBeenCalledTimes(1);
  });
});
