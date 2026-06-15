import { describe, it, expect } from "vitest";
import { unwrapList } from "../../src/tools/unwrap.js";

describe("unwrapList", () => {
  it("unwraps a TAFList's Entities[].Properties", () => {
    const resp = { Entities: [{ Properties: { ID: 1 } }, { Properties: { ID: 2 } }] };
    expect(unwrapList(resp)).toEqual([{ ID: 1 }, { ID: 2 }]);
  });

  it("passes a plain array through unchanged", () => {
    expect(unwrapList([{ ID: 1 }])).toEqual([{ ID: 1 }]);
  });

  it("returns [] for shapes with neither Entities nor an array", () => {
    expect(unwrapList({ Properties: { ID: 1 } })).toEqual([]);
    expect(unwrapList(null)).toEqual([]);
  });
});
