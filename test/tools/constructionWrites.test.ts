import { describe, it, expect, vi } from "vitest";
import { constructionWriteTools } from "../../src/tools/constructionWrites.js";
import type { TimeLogClient } from "../../src/client.js";

function byName(name: string) {
  const tool = constructionWriteTools.find((t) => t.name === name);
  if (!tool) throw new Error(`tool ${name} not found`);
  return tool;
}

describe("construction write tools", () => {
  it("exposes the five expected tools", () => {
    expect(constructionWriteTools.map((t) => t.name).sort()).toEqual(
      [
        "create_fixed_price_contract",
        "create_payment",
        "create_project_from_template",
        "create_task",
        "create_time_material_contract",
      ].sort(),
    );
  });

  it("create_project_from_template preview hits validate, never create", async () => {
    const post = vi.fn(async () => ({ ok: true }));
    const get = vi.fn(async () => ({ Entities: [] })); // enrichment lookups
    const client = { post, get } as unknown as TimeLogClient;

    await byName("create_project_from_template").handler(client, {
      mode: "preview",
      ProjectTemplateID: 9,
      Name: "API-TEST fastpris",
      CustomerID: 1100,
    });

    const postedPaths = post.mock.calls.map((c) => c[0]);
    expect(postedPaths).toContain("/project/validate-create-from-template");
    expect(postedPaths).not.toContain("/project/create-from-template");
  });

  it("create_project_from_template execute hits the create endpoint with the body (no mode)", async () => {
    const post = vi.fn(async () => ({ ProjectID: 555 }));
    const client = { post } as unknown as TimeLogClient;

    const result = await byName("create_project_from_template").handler(client, {
      mode: "execute",
      ProjectTemplateID: 9,
      Name: "API-TEST fastpris",
    });

    expect(post).toHaveBeenCalledWith("/project/create-from-template", {
      ProjectTemplateID: 9,
      Name: "API-TEST fastpris",
    });
    expect(result).toEqual({ ProjectID: 555 });
  });

  it("create_task with no ParentTaskID executes against /task", async () => {
    const post = vi.fn(async () => ({}));
    const client = { post } as unknown as TimeLogClient;

    await byName("create_task").handler(client, { mode: "execute", ProjectID: 7, TaskName: "Hovedopgave" });

    expect(post).toHaveBeenCalledWith("/task", { ProjectID: 7, TaskName: "Hovedopgave" });
  });

  it("create_task with ParentTaskID executes against /task/create-sub-task", async () => {
    const post = vi.fn(async () => ({}));
    const client = { post } as unknown as TimeLogClient;

    await byName("create_task").handler(client, {
      mode: "execute",
      ProjectID: 7,
      ParentTaskID: 42,
      TaskName: "Underopgave",
    });

    expect(post).toHaveBeenCalledWith("/task/create-sub-task", { ProjectID: 7, ParentTaskID: 42, TaskName: "Underopgave" });
  });

  it("create_task preview always validates against /task/validate-new-task (both routes)", async () => {
    const post = vi.fn(async () => ({ ok: true }));
    const get = vi.fn(async () => ({ Entities: [] }));
    const client = { post, get } as unknown as TimeLogClient;

    await byName("create_task").handler(client, { mode: "preview", ProjectID: 7, ParentTaskID: 42, TaskName: "Sub" });

    expect(post).toHaveBeenCalledWith("/task/validate-new-task", { ProjectID: 7, ParentTaskID: 42, TaskName: "Sub" });
    expect(post.mock.calls.map((c) => c[0])).not.toContain("/task/create-sub-task");
  });

  it("create_time_material_contract execute hits its create endpoint", async () => {
    const post = vi.fn(async () => ({}));
    const client = { post } as unknown as TimeLogClient;

    await byName("create_time_material_contract").handler(client, {
      mode: "execute",
      ProjectID: 7,
      ContractName: "T&M",
    });

    expect(post).toHaveBeenCalledWith("/contract/create-time-material-basic-contract", { ProjectID: 7, ContractName: "T&M" });
  });

  it("create_fixed_price_contract execute hits its create endpoint", async () => {
    const post = vi.fn(async () => ({}));
    const client = { post } as unknown as TimeLogClient;

    await byName("create_fixed_price_contract").handler(client, {
      mode: "execute",
      ProjectID: 7,
      ContractName: "Fastpris",
      PaymentPlanAmount: 100000,
    });

    expect(post).toHaveBeenCalledWith("/contract/create-fixed-price-basic-contract", {
      ProjectID: 7,
      ContractName: "Fastpris",
      PaymentPlanAmount: 100000,
    });
  });

  it("create_payment execute hits /payment", async () => {
    const post = vi.fn(async () => ({}));
    const client = { post } as unknown as TimeLogClient;

    await byName("create_payment").handler(client, {
      mode: "execute",
      ProjectSubContractID: 12,
      Name: "Rate 1",
      Amount: 40000,
    });

    expect(post).toHaveBeenCalledWith("/payment", { ProjectSubContractID: 12, Name: "Rate 1", Amount: 40000 });
  });

  it("defaults to preview when mode is omitted", async () => {
    const post = vi.fn(async () => ({ ok: true }));
    const get = vi.fn(async () => ({ Entities: [] }));
    const client = { post, get } as unknown as TimeLogClient;

    // The tool handler receives args already parsed by the SDK against inputSchema,
    // so mode is defaulted upstream; here we assert the handler treats a missing
    // mode as preview too (defensive).
    await byName("create_payment").handler(client, { ProjectSubContractID: 12, Name: "Rate 1", Amount: 40000 });

    expect(post).toHaveBeenCalledWith("/payment/validate-new-payment", expect.any(Object));
  });
});
