import { describe, it, expect, vi } from "vitest";
import { runWrite, bodyFromArgs } from "../../src/tools/preview.js";
import type { TimeLogClient } from "../../src/client.js";

describe("bodyFromArgs", () => {
  it("strips mode and drops undefined fields", () => {
    expect(bodyFromArgs({ mode: "execute", Name: "x", CustomerID: undefined, BudgetHours: 0 })).toEqual({
      Name: "x",
      BudgetHours: 0,
    });
  });
});

describe("runWrite", () => {
  const opts = (mode: "preview" | "execute") => ({
    mode,
    validatePath: "/project/validate-create-from-template",
    executePath: "/project/create-from-template",
    body: { Name: "API-TEST", ProjectTemplateID: 9 },
  });

  it("preview POSTs the validate endpoint and never the execute endpoint", async () => {
    const post = vi.fn(async () => ({ ok: true }));
    const client = { post } as unknown as TimeLogClient;

    const result = (await runWrite(client, opts("preview"))) as { mode: string; validation: { ok: boolean } };

    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith("/project/validate-create-from-template", { Name: "API-TEST", ProjectTemplateID: 9 });
    expect(result.mode).toBe("preview");
    expect(result.validation.ok).toBe(true);
  });

  it("preview surfaces a validation failure instead of throwing", async () => {
    const post = vi.fn(async () => {
      throw new Error("TimeLog API POST /project/validate-create-from-template failed: 400 {\"msg\":\"bad\"}");
    });
    const client = { post } as unknown as TimeLogClient;

    const result = (await runWrite(client, opts("preview"))) as { validation: { ok: boolean; error?: string } };

    expect(result.validation.ok).toBe(false);
    expect(result.validation.error).toMatch(/400/);
  });

  it("preview runs the summarizer but a summarizer failure does not fail the preview", async () => {
    const post = vi.fn(async () => ({ ok: true }));
    const summarize = vi.fn(async () => {
      throw new Error("enrichment lookup failed");
    });
    const client = { post } as unknown as TimeLogClient;

    const result = (await runWrite(client, { ...opts("preview"), summarize })) as { summary?: unknown };

    expect(summarize).toHaveBeenCalled();
    expect(result.summary).toBeUndefined();
  });

  it("execute POSTs the real create endpoint and returns its result", async () => {
    const post = vi.fn(async () => ({ ProjectID: 1234 }));
    const client = { post } as unknown as TimeLogClient;

    const result = await runWrite(client, opts("execute"));

    expect(post).toHaveBeenCalledWith("/project/create-from-template", { Name: "API-TEST", ProjectTemplateID: 9 });
    expect(result).toEqual({ ProjectID: 1234 });
  });
});
