import { describe, it, expect } from "vitest";
import { allTools } from "../src/registerTools.js";

describe("allTools registry", () => {
  it("includes every Phase 2 read and write tool", () => {
    const names = allTools.map((t) => t.name);
    for (const expected of [
      "list_project_templates",
      "list_tasks",
      "get_task",
      "list_task_types",
      "list_contracts",
      "get_contract",
      "list_payments",
      "list_contract_hourly_rates",
      "create_project_from_template",
      "create_task",
      "create_time_material_contract",
      "create_fixed_price_contract",
      "create_payment",
    ]) {
      expect(names).toContain(expected);
    }
  });

  it("includes the Phase 3 resource tools", () => {
    const names = allTools.map((t) => t.name);
    for (const expected of ["get_employee_workload", "book_workload"]) {
      expect(names).toContain(expected);
    }
  });

  it("has no duplicate tool names", () => {
    const names = allTools.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
