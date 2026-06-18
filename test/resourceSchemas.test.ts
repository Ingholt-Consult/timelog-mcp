import { describe, it, expect } from "vitest";
import { z } from "zod";
import { bookWorkloadShape } from "../src/resourceSchemas.js";

describe("bookWorkloadShape", () => {
  const schema = z.object(bookWorkloadShape);

  it("defaults mode to preview", () => {
    const parsed = schema.parse({ EmployeeId: 12, TaskId: 34, Hours: 8, StartDate: "2026-06-22T00:00:00", EndDate: "2026-06-26T00:00:00" });
    expect(parsed.mode).toBe("preview");
  });

  it("requires EmployeeId, TaskId, Hours, StartDate, EndDate", () => {
    expect(() => schema.parse({ EmployeeId: 12 })).toThrow();
  });

  it("keeps the EmployeeId / TaskId casing", () => {
    expect(Object.keys(bookWorkloadShape).sort()).toEqual(
      ["EmployeeId", "EndDate", "Hours", "StartDate", "TaskId", "mode"].sort(),
    );
  });
});
