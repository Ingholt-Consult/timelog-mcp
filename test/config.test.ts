import { describe, it, expect } from "vitest";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("returns the base URL from env, trimming a trailing slash", () => {
    const cfg = loadConfig({ TIMELOG_BASE_URL: "https://x/api/v1/" });
    expect(cfg.baseUrl).toBe("https://x/api/v1");
  });

  it("throws when TIMELOG_BASE_URL is missing", () => {
    expect(() => loadConfig({})).toThrow(/TIMELOG_BASE_URL/);
  });

  it("parses ALLOWED_HOSTS into a trimmed list for DNS-rebinding protection", () => {
    const cfg = loadConfig({
      TIMELOG_BASE_URL: "https://x/api/v1",
      ALLOWED_HOSTS: "timelog-mcp.ingholt.dk, localhost:8787 ",
    });
    expect(cfg.allowedHosts).toEqual(["timelog-mcp.ingholt.dk", "localhost:8787"]);
  });

  it("leaves allowedHosts undefined when ALLOWED_HOSTS is unset (local runs stay open)", () => {
    const cfg = loadConfig({ TIMELOG_BASE_URL: "https://x/api/v1" });
    expect(cfg.allowedHosts).toBeUndefined();
  });
});
