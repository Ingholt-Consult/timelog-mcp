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
});
