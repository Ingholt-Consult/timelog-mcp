import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  modeField,
  createProjectFromTemplateShape,
  createTaskShape,
  timeMaterialContractShape,
  fixedPriceContractShape,
  createPaymentShape,
} from "../src/constructionSchemas.js";

describe("construction schemas", () => {
  it("mode defaults to preview", () => {
    const parsed = z.object(modeField).parse({});
    expect(parsed.mode).toBe("preview");
  });

  it("mode only accepts preview | execute", () => {
    expect(z.object(modeField).safeParse({ mode: "delete" }).success).toBe(false);
  });

  // The empirical gate (2026-06-16) proved which fields are required at execute;
  // they are no longer .optional(). An empty body must now fail, and a full body
  // parses with mode defaulting to preview.
  it("create_project_from_template enforces the gate-proven required fields", () => {
    const schema = z.object(createProjectFromTemplateShape);
    expect(schema.safeParse({}).success).toBe(false);
    const full = {
      ProjectTemplateID: 9,
      Name: "API-TEST",
      ProjectNo: "API-TEST-001",
      CustomerID: 1100,
      ProjectManagerID: 5,
      ProjectTypeID: 262,
      ProjectCategoryID: 7,
      CurrencyID: 35,
      ProjectStartDate: "2026-06-16T00:00:00",
      ProjectEndDate: "2026-12-31T00:00:00",
    };
    const ok = schema.parse(full);
    expect(ok.mode).toBe("preview");
    expect(ok.ProjectTemplateID).toBe(9);
    // dropping any one required field fails (ProjectNo and ProjectCategoryID included)
    const { ProjectNo, ...missingNo } = full;
    expect(schema.safeParse(missingNo).success).toBe(false);
    const { ProjectCategoryID, ...missingCategory } = full;
    expect(schema.safeParse(missingCategory).success).toBe(false);
  });

  it("create_task requires ProjectID/TaskName/budget/HourlyRateID/dates, ParentTaskID optional", () => {
    const schema = z.object(createTaskShape);
    expect(schema.safeParse({}).success).toBe(false);
    const full = {
      ProjectID: 1034,
      TaskName: "API-TEST opgave",
      BudgetHours: 10,
      BudgetAmount: 10000,
      HourlyRateID: 1,
      StartDate: "2026-06-16T00:00:00",
      EndDate: "2026-06-30T00:00:00",
    };
    expect(schema.safeParse(full).success).toBe(true);
    // ParentTaskID is optional (its presence routes to the sub-task endpoint)
    expect(Object.keys(createTaskShape)).toContain("ParentTaskID");
    expect(Object.keys(createTaskShape)).toContain("TaskTypeID");
  });

  it("contract shapes require ProjectID/ContractName/ContractStatus and differ where the models differ", () => {
    const tm = z.object(timeMaterialContractShape);
    const fp = z.object(fixedPriceContractShape);
    expect(tm.safeParse({}).success).toBe(false);
    const base = { ProjectID: 1034, ContractName: "API-TEST", ContractStatus: 2 };
    expect(tm.safeParse(base).success).toBe(true);
    expect(fp.safeParse(base).success).toBe(true);
    // ContractStatus 0 is invalid (enum is 1..4)
    expect(tm.safeParse({ ...base, ContractStatus: 0 }).success).toBe(false);
    expect(Object.keys(timeMaterialContractShape)).toContain("HasBudgetOverrunNotification");
    expect(Object.keys(fixedPriceContractShape)).toContain("PaymentPlanAmount");
    expect(Object.keys(fixedPriceContractShape)).toContain("TargetHourlyRate");
    expect(Object.keys(timeMaterialContractShape)).not.toContain("PaymentPlanAmount");
  });

  it("create_payment requires ProjectID/ProjectSubContractID/Name/InvoiceDate", () => {
    const schema = z.object(createPaymentShape);
    expect(schema.safeParse({}).success).toBe(false);
    const full = {
      ProjectID: 1034,
      ProjectSubContractID: 2244,
      Name: "API-TEST rate",
      InvoiceDate: "2026-06-30T00:00:00",
    };
    expect(schema.safeParse(full).success).toBe(true);
    // Amount stays optional (the gate showed Amount 0 was accepted)
    expect(Object.keys(createPaymentShape)).toContain("Amount");
  });
});
