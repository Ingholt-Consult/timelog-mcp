import { describe, it, expect, vi } from "vitest";
import { TimeLogClient } from "../src/client.js";

function fakeFetch(status: number, body: unknown) {
  return vi.fn(async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );
}

describe("TimeLogClient", () => {
  it("GETs with Bearer auth and returns parsed JSON", async () => {
    const f = fakeFetch(200, [{ ProjectID: 1 }]);
    const client = new TimeLogClient({ baseUrl: "https://x/api/v1", pat: "tok", fetchImpl: f });

    const data = await client.get("/project/get-all");

    expect(data).toEqual([{ ProjectID: 1 }]);
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://x/api/v1/project/get-all");
    expect((init as RequestInit).headers).toMatchObject({ Authorization: "Bearer tok" });
  });

  it("appends defined query params and skips undefined ones", async () => {
    const f = fakeFetch(200, []);
    const client = new TimeLogClient({ baseUrl: "https://x/api/v1", pat: "tok", fetchImpl: f });

    await client.get("/project/get-all", { customerID: 42, isActive: undefined });

    expect(f.mock.calls[0][0]).toBe("https://x/api/v1/project/get-all?customerID=42");
  });

  it("PUTs a JSON body", async () => {
    const f = fakeFetch(200, { ok: true });
    const client = new TimeLogClient({ baseUrl: "https://x/api/v1", pat: "tok", fetchImpl: f });

    await client.put("/project/7", { Name: "New" });

    const [, init] = f.mock.calls[0];
    expect((init as RequestInit).method).toBe("PUT");
    expect((init as RequestInit).body).toBe(JSON.stringify({ Name: "New" }));
  });

  it("throws with status and body on non-2xx", async () => {
    const f = fakeFetch(404, { message: "not found" });
    const client = new TimeLogClient({ baseUrl: "https://x/api/v1", pat: "tok", fetchImpl: f });

    await expect(client.get("/project/999")).rejects.toThrow(/404/);
  });
});
