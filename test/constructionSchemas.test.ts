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

  it("create_project_from_template carries the template field and mode, all optional", () => {
    const schema = z.object(createProjectFromTemplateShape);
    expect(schema.parse({}).mode).toBe("preview");
    const ok = schema.parse({ ProjectTemplateID: 9, Name: "API-TEST", CustomerID: 1100, mode: "execute" });
    expect(ok.ProjectTemplateID).toBe(9);
    expect(ok.mode).toBe("execute");
  });

  it("create_task exposes ParentTaskID (sub-task routing) and TaskTypeID", () => {
    const keys = Object.keys(createTaskShape);
    expect(keys).toContain("ParentTaskID");
    expect(keys).toContain("TaskTypeID");
    expect(keys).toContain("ProjectSubContractID");
    expect(keys).toContain("mode");
  });

  it("contract shapes differ where the models differ", () => {
    expect(Object.keys(timeMaterialContractShape)).toContain("HasBudgetOverrunNotification");
    expect(Object.keys(fixedPriceContractShape)).toContain("PaymentPlanAmount");
    expect(Object.keys(fixedPriceContractShape)).toContain("TargetHourlyRate");
    expect(Object.keys(timeMaterialContractShape)).not.toContain("PaymentPlanAmount");
  });

  it("create_payment carries Amount and the contract link", () => {
    const keys = Object.keys(createPaymentShape);
    expect(keys).toContain("Amount");
    expect(keys).toContain("ProjectSubContractID");
  });
});
