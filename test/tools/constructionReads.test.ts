import { describe, it, expect, vi } from "vitest";
import { constructionReadTools } from "../../src/tools/constructionReads.js";
import type { TimeLogClient } from "../../src/client.js";

function byName(name: string) {
  const tool = constructionReadTools.find((t) => t.name === name);
  if (!tool) throw new Error(`tool ${name} not found`);
  return tool;
}

describe("construction read tools", () => {
  it("exposes the eight expected tools", () => {
    expect(constructionReadTools.map((t) => t.name).sort()).toEqual(
      [
        "get_contract",
        "get_task",
        "list_contract_hourly_rates",
        "list_contracts",
        "list_payments",
        "list_project_templates",
        "list_task_types",
        "list_tasks",
      ].sort(),
    );
  });

  it("list_tasks filters by projectID and unwraps the rows", async () => {
    const get = vi.fn(async () => ({ Entities: [{ Properties: { TaskID: 5 } }] }));
    const client = { get } as unknown as TimeLogClient;
    const result = await byName("list_tasks").handler(client, { projectID: 7 });
    expect(get).toHaveBeenCalledWith("/task", { projectID: 7, $pagesize: 1000 });
    expect(result).toEqual([{ TaskID: 5 }]);
  });

  it("list_task_types pages with $pagesize and unwraps", async () => {
    const get = vi.fn(async () => ({ Entities: [{ Properties: { TaskTypeID: 1, Name: "1.1 Idéoplæg" } }] }));
    const client = { get } as unknown as TimeLogClient;
    const result = await byName("list_task_types").handler(client, {});
    expect(get).toHaveBeenCalledWith("/TaskType", { $pagesize: 1000 });
    expect(result).toEqual([{ TaskTypeID: 1, Name: "1.1 Idéoplæg" }]);
  });

  it("list_contracts filters by projectID", async () => {
    const get = vi.fn(async () => ({ Entities: [] }));
    const client = { get } as unknown as TimeLogClient;
    await byName("list_contracts").handler(client, { projectID: 7 });
    expect(get).toHaveBeenCalledWith("/contract", { projectID: 7, $pagesize: 1000 });
  });

  it("list_payments filters by contractID", async () => {
    const get = vi.fn(async () => ({ Entities: [] }));
    const client = { get } as unknown as TimeLogClient;
    await byName("list_payments").handler(client, { contractID: 12 });
    expect(get).toHaveBeenCalledWith("/payment", { contractID: 12, $pagesize: 1000 });
  });

  it("list_contract_hourly_rates filters by contractID", async () => {
    const get = vi.fn(async () => ({ Entities: [] }));
    const client = { get } as unknown as TimeLogClient;
    await byName("list_contract_hourly_rates").handler(client, { contractID: 12 });
    expect(get).toHaveBeenCalledWith("/contract-hourly-rate", { contractID: 12, $pagesize: 1000 });
  });

  it("get_task fetches a single task by id (raw)", async () => {
    const get = vi.fn(async () => ({ Properties: { TaskID: 5 } }));
    const client = { get } as unknown as TimeLogClient;
    await byName("get_task").handler(client, { taskID: 5 });
    expect(get).toHaveBeenCalledWith("/task/5");
  });

  it("get_contract fetches a single contract by id (raw)", async () => {
    const get = vi.fn(async () => ({ Properties: { ContractID: 9 } }));
    const client = { get } as unknown as TimeLogClient;
    await byName("get_contract").handler(client, { contractID: 9 });
    expect(get).toHaveBeenCalledWith("/contract/9");
  });

  it("list_project_templates pages and unwraps", async () => {
    const get = vi.fn(async () => ({ Entities: [{ Properties: { ProjectTemplateID: 7, Name: "Fastpris – Småsag" } }] }));
    const client = { get } as unknown as TimeLogClient;
    const result = await byName("list_project_templates").handler(client, {});
    expect(get).toHaveBeenCalledWith("/project-template/get-all", { $pagesize: 1000 });
    expect(result).toEqual([{ ProjectTemplateID: 7, Name: "Fastpris – Småsag" }]);
  });
});
