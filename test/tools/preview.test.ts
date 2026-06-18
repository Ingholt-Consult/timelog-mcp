import { describe, it, expect, vi } from "vitest";
import { runWrite, runBooking, bodyFromArgs } from "../../src/tools/preview.js";
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

  it("preview returns the exact payload that would be sent", async () => {
    const post = vi.fn(async () => ({ ok: true }));
    const client = { post } as unknown as TimeLogClient;

    const result = (await runWrite(client, opts("preview"))) as { payload: Record<string, unknown> };

    expect(result.payload).toEqual({ Name: "API-TEST", ProjectTemplateID: 9 });
  });

  it("execute POSTs the real create endpoint and returns its result", async () => {
    const post = vi.fn(async () => ({ ProjectID: 1234 }));
    const client = { post } as unknown as TimeLogClient;

    const result = await runWrite(client, opts("execute"));

    expect(post).toHaveBeenCalledWith("/project/create-from-template", { Name: "API-TEST", ProjectTemplateID: 9 });
    expect(result).toEqual({ ProjectID: 1234 });
  });
});

describe("runBooking", () => {
  const baseOpts = (mode: "preview" | "execute") => ({
    mode,
    bookPath: "/workload/book",
    body: { EmployeeId: 12, TaskId: 34, Hours: 8, StartDate: "2026-06-22T00:00:00", EndDate: "2026-06-26T00:00:00" },
    previewCapacity: async () => ({ Entities: [{ Properties: { UserID: 12, NormalWorkingHours: 7.5 } }] }),
  });

  it("preview fetches capacity, never posts to the book endpoint, and echoes the payload", async () => {
    const post = vi.fn(async () => ({}));
    const client = { post } as unknown as TimeLogClient;
    const cap = vi.fn(baseOpts("preview").previewCapacity);

    const result = (await runBooking(client, { ...baseOpts("preview"), previewCapacity: cap })) as {
      mode: string; capacity: { ok: boolean }; note: string; payload: Record<string, unknown>;
    };

    expect(post).not.toHaveBeenCalled();
    expect(cap).toHaveBeenCalledTimes(1);
    expect(result.mode).toBe("preview");
    expect(result.capacity.ok).toBe(true);
    expect(result.note).toMatch(/fortrydes/i);
    expect(result.payload).toEqual(baseOpts("preview").body);
  });

  it("preview surfaces a capacity-read failure instead of throwing", async () => {
    const post = vi.fn(async () => ({}));
    const client = { post } as unknown as TimeLogClient;
    const cap = async () => { throw new Error("TimeLog API GET /employee-projection/get-in-period failed: 500"); };

    const result = (await runBooking(client, { ...baseOpts("preview"), previewCapacity: cap })) as {
      capacity: { ok: boolean; error?: string };
    };

    expect(result.capacity.ok).toBe(false);
    expect(result.capacity.error).toMatch(/500/);
  });

  it("execute posts to the book endpoint and returns its result", async () => {
    const post = vi.fn(async () => ({ accepted: true }));
    const client = { post } as unknown as TimeLogClient;

    const result = await runBooking(client, baseOpts("execute"));

    expect(post).toHaveBeenCalledWith("/workload/book", baseOpts("execute").body);
    expect(result).toEqual({ accepted: true });
  });
});
