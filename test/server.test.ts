import { describe, it, expect } from "vitest";
import { resolvePat } from "../src/server.js";

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
