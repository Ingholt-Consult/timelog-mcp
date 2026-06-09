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

  it("list_project_types hits /ProjectType", async () => {
    const get = vi.fn(async () => []);
    const client = { get } as unknown as TimeLogClient;

    await byName("list_project_types").handler(client, {});

    expect(get).toHaveBeenCalledWith("/ProjectType");
  });
});
