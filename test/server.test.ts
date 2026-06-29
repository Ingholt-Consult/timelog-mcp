import { describe, it, expect, afterEach } from "vitest";
import type { AddressInfo } from "node:net";
import { resolvePat, transportOptions, createApp } from "../src/server.js";

describe("transportOptions", () => {
  it("enables DNS-rebinding protection with the configured hosts when allowedHosts is set", () => {
    expect(transportOptions({ baseUrl: "https://x/api/v1", allowedHosts: ["timelog-mcp.ingholt.dk"] })).toEqual({
      sessionIdGenerator: undefined,
      enableDnsRebindingProtection: true,
      allowedHosts: ["timelog-mcp.ingholt.dk"],
    });
  });

  it("leaves protection off when no allowedHosts are configured (local runs)", () => {
    expect(transportOptions({ baseUrl: "https://x/api/v1" })).toEqual({ sessionIdGenerator: undefined });
  });
});

describe("GET /health", () => {
  const servers: { close: () => void }[] = [];
  afterEach(() => servers.forEach((s) => s.close()));

  it("responds 200 with status ok and needs no PAT", async () => {
    process.env.TIMELOG_BASE_URL = "https://x/api/v1";
    const server = createApp().listen(0);
    servers.push(server);
    const { port } = server.address() as AddressInfo;

    const res = await fetch(`http://127.0.0.1:${port}/health`);

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "ok" });
  });
});

describe("resolvePat", () => {
  it("prefers the Authorization Bearer header", () => {
    expect(resolvePat("Bearer abc", { TIMELOG_PAT: "env-tok" })).toBe("abc");
  });

  it("falls back to TIMELOG_PAT env", () => {
    expect(resolvePat(undefined, { TIMELOG_PAT: "env-tok" })).toBe("env-tok");
  });

  it("returns null when neither is present", () => {
    expect(resolvePat(undefined, {})).toBeNull();
  });

  it("ignores a non-Bearer Authorization header", () => {
    expect(resolvePat("Basic xyz", { TIMELOG_PAT: "env-tok" })).toBe("env-tok");
  });
});
