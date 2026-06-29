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

  it("list_projects passes filters and defaults $pagesize to 100 so it is not capped at 10", async () => {
    const get = vi.fn(async () => [{ ProjectID: 1 }]);
    const client = { get } as unknown as TimeLogClient;

    const result = await byName("list_projects").handler(client, { customerID: 42, isActive: true });

    expect(get).toHaveBeenCalledWith("/project/get-all", {
      customerID: 42,
      isActive: true,
      $page: undefined,
      $pagesize: 100,
    });
    expect(result).toEqual([{ ProjectID: 1 }]);
  });

  it("list_projects maps page/pageSize to TimeLog's $page/$pagesize query options", async () => {
    const get = vi.fn(async () => ({ Entities: [] }));
    const client = { get } as unknown as TimeLogClient;

    await byName("list_projects").handler(client, { page: 3, pageSize: 50 });

    expect(get).toHaveBeenCalledWith("/project/get-all", {
      customerID: undefined,
      isActive: undefined,
      $page: 3,
      $pagesize: 50,
    });
  });

  it("get_project requests the project by id", async () => {
    const get = vi.fn(async () => ({ ProjectID: 7 }));
    const client = { get } as unknown as TimeLogClient;

    await byName("get_project").handler(client, { projectID: 7 });

    expect(get).toHaveBeenCalledWith("/project/7");
  });

  it("list_project_types fetches the full list via $pagesize and returns the unwrapped rows sorted by name", async () => {
    const get = vi.fn(async () => ({
      Entities: [
        { Properties: { ProjectTypeID: 249, Name: "Ombyg" } },
        { Properties: { ProjectTypeID: 246, Name: "Nybyg" } },
      ],
    }));
    const client = { get } as unknown as TimeLogClient;

    const result = (await byName("list_project_types").handler(client, {})) as {
      ProjectTypeID: number;
      Name: string;
    }[];

    expect(get).toHaveBeenCalledWith("/ProjectType", { $pagesize: 1000 });
    // Unwrapped from Entities[].Properties and sorted by name (Nybyg before Ombyg).
    expect(result.map((t) => t.ProjectTypeID)).toEqual([246, 249]);
  });
});
