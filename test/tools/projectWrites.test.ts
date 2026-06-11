import { describe, it, expect, vi } from "vitest";
import { projectWriteTools } from "../../src/tools/projectWrites.js";
import type { TimeLogClient } from "../../src/client.js";

function byName(name: string) {
  const tool = projectWriteTools.find((t) => t.name === name);
  if (!tool) throw new Error(`tool ${name} not found`);
  return tool;
}

describe("project write tools", () => {
  it("exposes update_project and update_project_status", () => {
    expect(projectWriteTools.map((t) => t.name).sort()).toEqual(["update_project", "update_project_status"]);
  });

  // A representative GET /project/{id} response (wrapped, with `No` not `ProjectNo`).
  const currentProject = {
    Properties: {
      ProjectID: 7,
      Name: "Aggersvolg",
      No: "A-25XX",
      CustomerID: 1100,
      ContactID: 403,
      Description: "desc",
      ProjectManagerID: 14,
      ProjectTypeID: 262,
      ProjectCategoryID: null,
      BudgetWorkHours: 0,
      BudgetWorkAmount: 100,
      // fields outside the update model that must NOT be sent back
      DepartmentID: 99,
      StartDate: "2025-11-20T00:00:00",
    },
  };

  it("update_project read-modify-writes: merges the change onto the full model (PUT is a full replace)", async () => {
    const get = vi.fn(async () => currentProject);
    const put = vi.fn(async () => ({ ok: true }));
    const client = { get, put } as unknown as TimeLogClient;

    await byName("update_project").handler(client, { projectID: 7, ProjectTypeID: 3 });

    expect(get).toHaveBeenCalledWith("/project/7");
    expect(put).toHaveBeenCalledWith("/project/7", {
      Name: "Aggersvolg",
      ProjectNo: "A-25XX", // mapped from `No`
      CustomerID: 1100,
      ContactID: 403,
      Description: "desc",
      ProjectManagerID: 14,
      ProjectTypeID: 3, // the change
      ProjectCategoryID: null,
      BudgetWorkHours: 0,
      BudgetWorkAmount: 100,
    });
    // DepartmentID / StartDate are not part of the update model.
    const sent = put.mock.calls[0][1] as Record<string, unknown>;
    expect(sent).not.toHaveProperty("DepartmentID");
    expect(sent).not.toHaveProperty("StartDate");
  });

  it("update_project merges multiple changed fields and ignores undefined", async () => {
    const get = vi.fn(async () => currentProject);
    const put = vi.fn(async () => ({}));
    const client = { get, put } as unknown as TimeLogClient;

    await byName("update_project").handler(client, {
      projectID: 7,
      Name: "Renamed",
      ProjectManagerID: 42,
      Description: undefined,
    });

    const sent = put.mock.calls[0][1] as Record<string, unknown>;
    expect(sent.Name).toBe("Renamed");
    expect(sent.ProjectManagerID).toBe(42);
    expect(sent.Description).toBe("desc"); // undefined arg → current value preserved
  });

  it("update_project rejects a call with no fields to change, without reading or writing", async () => {
    const get = vi.fn(async () => currentProject);
    const put = vi.fn(async () => ({}));
    const client = { get, put } as unknown as TimeLogClient;

    await expect(byName("update_project").handler(client, { projectID: 9 })).rejects.toThrow(/no fields/i);
    expect(get).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
  });

  it("update_project_status PUTs the status model to the status endpoint", async () => {
    const put = vi.fn(async () => ({}));
    const client = { put } as unknown as TimeLogClient;

    await byName("update_project_status").handler(client, {
      projectID: 5,
      ProjectStatus: 2,
      AllowTimeTracking: true,
    });

    expect(put).toHaveBeenCalledWith("/project/5/status", { ProjectStatus: 2, AllowTimeTracking: true });
  });
});
