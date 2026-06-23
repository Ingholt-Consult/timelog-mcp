import { describe, it, expect } from "vitest";
import { z } from "zod";
import { planResourceHoursShape, getResourcePlanShape } from "../src/resourceSchemas.js";

describe("planResourceHoursShape", () => {
  const schema = z.object(planResourceHoursShape);

  it("defaults mode to preview", () => {
    const parsed = schema.parse({
      UserID: 29,
      TaskID: 4961,
      value: 8,
      startsAt: "2026-06-22T00:00:00",
      endsAt: "2026-06-26T00:00:00",
    });
    expect(parsed.mode).toBe("preview");
  });

  it("requires UserID, TaskID, value, startsAt, endsAt", () => {
    expect(() => schema.parse({ UserID: 29 })).toThrow();
  });

  it("uses the v1-id naming (UserID/TaskID) and the v2 value/startsAt/endsAt fields", () => {
    expect(Object.keys(planResourceHoursShape).sort()).toEqual(
      ["UserID", "TaskID", "value", "startsAt", "endsAt", "mode"].sort(),
    );
  });
});

describe("getResourcePlanShape", () => {
  const schema = z.object(getResourcePlanShape);

  it("requires UserID, startsAt, endsAt", () => {
    expect(() => schema.parse({ UserID: 29 })).toThrow();
    expect(
      schema.parse({ UserID: 29, startsAt: "2026-06-01T00:00:00", endsAt: "2026-06-30T00:00:00" }),
    ).toMatchObject({ UserID: 29 });
  });

  it("allows optional reporting overrides", () => {
    const parsed = schema.parse({
      UserID: 29,
      startsAt: "2026-06-01T00:00:00",
      endsAt: "2026-06-30T00:00:00",
      periodTypes: "week",
      reportingTypes: "eac",
    });
    expect(parsed.periodTypes).toBe("week");
    expect(parsed.reportingTypes).toBe("eac");
  });
});
