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

  it("update_project PUTs only the provided fields, excluding projectID from the body", async () => {
    const put = vi.fn(async () => ({ ok: true }));
    const client = { put } as unknown as TimeLogClient;

    await byName("update_project").handler(client, { projectID: 7, ProjectTypeID: 3 });

    expect(put).toHaveBeenCalledWith("/project/7", { ProjectTypeID: 3 });
  });

  it("update_project sends multiple changed fields but nothing undefined", async () => {
    const put = vi.fn(async () => ({}));
    const client = { put } as unknown as TimeLogClient;

    await byName("update_project").handler(client, {
      projectID: 9,
      Name: "Renamed",
      ProjectManagerID: 42,
      Description: undefined,
    });

    expect(put).toHaveBeenCalledWith("/project/9", { Name: "Renamed", ProjectManagerID: 42 });
  });

  it("update_project rejects a call with no fields to change", async () => {
    const put = vi.fn(async () => ({}));
    const client = { put } as unknown as TimeLogClient;

    await expect(byName("update_project").handler(client, { projectID: 9 })).rejects.toThrow(/no fields/i);
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
