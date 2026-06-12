import { describe, it, expect, vi } from "vitest";
import { projectReadTools } from "../../src/tools/projectReads.js";
import type { TimeLogClient } from "../../src/client.js";

function byName(name: string) {
  const tool = projectReadTools.find((t) => t.name === name);
  if (!tool) throw new Error(`tool ${name} not found`);
  return tool;
}

describe("project read tools", () => {
  it("exposes the five expected tools", () => {
    expect(projectReadTools.map((t) => t.name).sort()).toEqual(
      ["get_project", "list_departments", "list_project_categories", "list_project_types", "list_projects"].sort(),
    );
  });

  it("list_projects passes customerID and isActive to client.get", async () => {
    const get = vi.fn(async () => [{ ProjectID: 1 }]);
    const client = { get } as unknown as TimeLogClient;

    const result = await byName("list_projects").handler(client, { customerID: 42, isActive: true });

    expect(get).toHaveBeenCalledWith("/project/get-all", { customerID: 42, isActive: true });
    expect(result).toEqual([{ ProjectID: 1 }]);
  });

  it("get_project requests the project by id", async () => {
    const get = vi.fn(async () => ({ ProjectID: 7 }));
    const client = { get } as unknown as TimeLogClient;

    await byName("get_project").handler(client, { projectID: 7 });

    expect(get).toHaveBeenCalledWith("/project/7");
  });

  it("list_project_types merges the live /ProjectType result with the local cache", async () => {
    const get = vi.fn(async () => ({
      Entities: [
        { Properties: { ProjectTypeID: 246, Name: "Nybyg" } },
        { Properties: { ProjectTypeID: 999, Name: "Live-only type" } },
      ],
    }));
    const client = { get } as unknown as TimeLogClient;

    const result = (await byName("list_project_types").handler(client, {})) as {
      liveCount: number;
      projectTypes: { ProjectTypeID: number; Name: string; source: string }[];
    };

    expect(get).toHaveBeenCalledWith("/ProjectType", { $pagesize: 100 });
    expect(result.liveCount).toBe(2);
    // A cache-only type (Ombyg/nybyg = 262) is present even though the live API omitted it.
    expect(result.projectTypes.find((t) => t.ProjectTypeID === 262)?.source).toBe("cache");
    // A type in both live and cache is marked "both".
    expect(result.projectTypes.find((t) => t.ProjectTypeID === 246)?.source).toBe("both");
    // A live-only type is still included.
    expect(result.projectTypes.find((t) => t.ProjectTypeID === 999)?.source).toBe("live");
  });
});
