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

  // These name->ID lookups can exceed the silent 10-row cap (a real account has
  // hundreds of customers/contacts), so they expose page/pageSize and default
  // $pagesize=1000 to fetch the whole list in one call for reliable resolution.
  it.each([
    ["list_customers", "/customer"],
    ["list_contacts", "/contact"],
    ["list_users", "/user"],
  ])("%s defaults $pagesize to 1000 so name resolution sees the whole list", async (name, path) => {
    const get = vi.fn(async () => ({}));
    const client = { get } as unknown as TimeLogClient;

    await byName(name).handler(client, {});

    expect(get).toHaveBeenCalledWith(path, { $page: undefined, $pagesize: 1000 });
  });

  it.each([
    ["list_customers", "/customer"],
    ["list_contacts", "/contact"],
    ["list_users", "/user"],
  ])("%s maps page/pageSize to $page/$pagesize", async (name, path) => {
    const get = vi.fn(async () => ({}));
    const client = { get } as unknown as TimeLogClient;

    await byName(name).handler(client, { page: 2, pageSize: 25 });

    expect(get).toHaveBeenCalledWith(path, { $page: 2, $pagesize: 25 });
  });

  it("list_employee_types fetches the whole small list with $pagesize=100", async () => {
    const get = vi.fn(async () => ({}));
    const client = { get } as unknown as TimeLogClient;

    await byName("list_employee_types").handler(client, {});

    expect(get).toHaveBeenCalledWith("/employee-type", { $pagesize: 100 });
  });

  it("whoami hits /user/me as a single resource", async () => {
    const get = vi.fn(async () => ({}));
    const client = { get } as unknown as TimeLogClient;

    await byName("whoami").handler(client, {});

    expect(get).toHaveBeenCalledWith("/user/me");
  });
});
