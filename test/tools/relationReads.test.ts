import { describe, it, expect, vi } from "vitest";
import { relationReadTools } from "../../src/tools/relationReads.js";
import type { TimeLogClient } from "../../src/client.js";

function byName(name: string) {
  const tool = relationReadTools.find((t) => t.name === name);
  if (!tool) throw new Error(`tool ${name} not found`);
  return tool;
}

describe("relation read tools", () => {
  it("exposes the five expected tools", () => {
    expect(relationReadTools.map((t) => t.name).sort()).toEqual(
      ["list_contacts", "list_customers", "list_employee_types", "list_users", "whoami"].sort(),
    );
  });

  it.each([
    ["list_customers", "/customer"],
    ["list_contacts", "/contact"],
    ["list_users", "/user"],
    ["list_employee_types", "/employee-type"],
    ["whoami", "/user/me"],
  ])("%s hits %s", async (name, path) => {
    const get = vi.fn(async () => ({}));
    const client = { get } as unknown as TimeLogClient;

    await byName(name).handler(client, {});

    expect(get).toHaveBeenCalledWith(path);
  });
});
