# TimeLog MCP — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a localhost MCP server (TypeScript) exposing 12 tools — 10 reads across TimeLog's project and employee domains plus 2 project-field write tools — so a project administrator can inspect and clean up projects via Claude.

**Architecture:** A thin `TimeLogClient` wraps the REST API (Bearer auth, base URL, JSON, error mapping) and knows nothing about MCP. Tool modules consume the client and expose validated MCP tools. The server layer wires tools into a stateless Streamable HTTP transport, resolving the PAT per request from the `Authorization` header or the `TIMELOG_PAT` env var. Reads return the API JSON verbatim; writes validate input with zod and (pending the empirical PUT test) send only changed fields.

**Tech Stack:** TypeScript (ESM, NodeNext), `@modelcontextprotocol/sdk`, `zod`, native `fetch`, `express` (Streamable HTTP host), `vitest`. TDD against an injected `fetch` mock.

---

## File structure

```
timelog_mcp/
  package.json              # deps, scripts (build, test, dev)
  tsconfig.json             # ESM NodeNext, strict
  vitest.config.ts          # test runner
  .env.example              # TIMELOG_BASE_URL, TIMELOG_PAT
  src/
    config.ts               # load + validate env config
    client.ts               # TimeLogClient: get/put, auth, error mapping
    schemas.ts              # zod input schemas for the write tools
    tools/
      projectReads.ts       # 5 project read tools
      relationReads.ts      # 5 relation/employee read tools
      projectWrites.ts      # update_project, update_project_status
    registerTools.ts        # registers all tools onto an McpServer given a client
    server.ts               # express + Streamable HTTP, PAT-per-request
    index.ts                # entrypoint (reads PORT, starts server)
  test/
    config.test.ts
    client.test.ts
    tools/projectReads.test.ts
    tools/relationReads.test.ts
    tools/projectWrites.test.ts
  docs/
    runbooks/
      empirical-put-test.md # manual ADR 0002 verification procedure
```

**Responsibilities:**
- `config.ts` — pure: read `process.env`, return a validated `{ baseUrl }`; PAT is resolved per request, not here.
- `client.ts` — the only file that talks HTTP. Constructed with `{ baseUrl, pat, fetchImpl }` so tests inject a fake fetch.
- `tools/*.ts` — each exports an array of tool definitions `{ name, description, inputSchema, handler }`; handlers take `(client, args)`.
- `registerTools.ts` — maps tool definitions onto `server.registerTool`, wrapping handlers to produce MCP `content`.
- `server.ts` — HTTP host; per request resolves PAT, builds a client, builds a fresh `McpServer`, registers tools, handles the request statelessly.

---

## Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.env.example`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "timelog-mcp",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc",
    "dev": "node --watch --loader ts-node/esm src/index.ts",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "express": "^4.19.2",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.14.0",
    "ts-node": "^10.9.2",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": false,
    "resolveJsonModule": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
  },
});
```

- [ ] **Step 4: Create `.env.example`**

```
TIMELOG_BASE_URL=https://app5.timelog.com/ingholtconsult2/api/v1
TIMELOG_PAT=
PORT=8787
```

- [ ] **Step 5: Install dependencies**

Run: `npm install`
Expected: `node_modules/` created, no error. (`.gitignore` already ignores `.env`; confirm it also ignores `node_modules` — add the line if missing.)

- [ ] **Step 6: Commit**

```bash
git add package.json tsconfig.json vitest.config.ts .env.example .gitignore package-lock.json
git commit -m "chore: scaffold TimeLog MCP project"
```

---

## Task 2: Config loader

**Files:**
- Create: `src/config.ts`
- Test: `test/config.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/config.test.ts`
Expected: FAIL — cannot find module `../src/config.js`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/config.ts
export interface Config {
  baseUrl: string;
}

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const raw = env.TIMELOG_BASE_URL;
  if (!raw) {
    throw new Error("TIMELOG_BASE_URL is required");
  }
  return { baseUrl: raw.replace(/\/+$/, "") };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/config.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/config.ts test/config.test.ts
git commit -m "feat: config loader for base URL"
```

---

## Task 3: TimeLogClient

**Files:**
- Create: `src/client.ts`
- Test: `test/client.test.ts`

The client injects `Authorization: Bearer <pat>` on every call, builds URLs from `baseUrl + path`, appends query params, parses JSON, and on non-2xx throws an `Error` carrying status and response body. `fetchImpl` is injectable for tests.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from "vitest";
import { TimeLogClient } from "../src/client.js";

function fakeFetch(status: number, body: unknown) {
  return vi.fn(async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );
}

describe("TimeLogClient", () => {
  it("GETs with Bearer auth and returns parsed JSON", async () => {
    const f = fakeFetch(200, [{ ProjectID: 1 }]);
    const client = new TimeLogClient({ baseUrl: "https://x/api/v1", pat: "tok", fetchImpl: f });

    const data = await client.get("/project/get-all");

    expect(data).toEqual([{ ProjectID: 1 }]);
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://x/api/v1/project/get-all");
    expect((init as RequestInit).headers).toMatchObject({ Authorization: "Bearer tok" });
  });

  it("appends defined query params and skips undefined ones", async () => {
    const f = fakeFetch(200, []);
    const client = new TimeLogClient({ baseUrl: "https://x/api/v1", pat: "tok", fetchImpl: f });

    await client.get("/project/get-all", { customerID: 42, isActive: undefined });

    expect(f.mock.calls[0][0]).toBe("https://x/api/v1/project/get-all?customerID=42");
  });

  it("PUTs a JSON body", async () => {
    const f = fakeFetch(200, { ok: true });
    const client = new TimeLogClient({ baseUrl: "https://x/api/v1", pat: "tok", fetchImpl: f });

    await client.put("/project/7", { Name: "New" });

    const [, init] = f.mock.calls[0];
    expect((init as RequestInit).method).toBe("PUT");
    expect((init as RequestInit).body).toBe(JSON.stringify({ Name: "New" }));
  });

  it("throws with status and body on non-2xx", async () => {
    const f = fakeFetch(404, { message: "not found" });
    const client = new TimeLogClient({ baseUrl: "https://x/api/v1", pat: "tok", fetchImpl: f });

    await expect(client.get("/project/999")).rejects.toThrow(/404/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/client.test.ts`
Expected: FAIL — cannot find module `../src/client.js`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/client.ts
export type FetchImpl = typeof fetch;

export interface TimeLogClientOptions {
  baseUrl: string;
  pat: string;
  fetchImpl?: FetchImpl;
}

export type QueryParams = Record<string, string | number | boolean | undefined>;

export class TimeLogClient {
  private readonly baseUrl: string;
  private readonly pat: string;
  private readonly fetchImpl: FetchImpl;

  constructor(opts: TimeLogClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.pat = opts.pat;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  private buildUrl(path: string, query?: QueryParams): string {
    let url = `${this.baseUrl}${path}`;
    if (query) {
      const qs = Object.entries(query)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&");
      if (qs) url += `?${qs}`;
    }
    return url;
  }

  private async request<T>(method: string, path: string, query?: QueryParams, body?: unknown): Promise<T> {
    const res = await this.fetchImpl(this.buildUrl(path, query), {
      method,
      headers: {
        Authorization: `Bearer ${this.pat}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`TimeLog API ${method} ${path} failed: ${res.status} ${text}`);
    }
    return (text ? JSON.parse(text) : null) as T;
  }

  get<T = unknown>(path: string, query?: QueryParams): Promise<T> {
    return this.request<T>("GET", path, query);
  }

  put<T = unknown>(path: string, body: unknown): Promise<T> {
    return this.request<T>("PUT", path, undefined, body);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/client.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/client.ts test/client.test.ts
git commit -m "feat: TimeLogClient REST wrapper with Bearer auth"
```

---

## Task 4: Tool-definition shape

**Files:**
- Create: `src/tools/types.ts`

Defines the shared shape every tool module exports, so `registerTools.ts` can treat them uniformly. No test (type-only module).

- [ ] **Step 1: Create `src/tools/types.ts`**

```ts
import { z } from "zod";
import type { TimeLogClient } from "../client.js";

export interface ToolDef {
  name: string;
  description: string;
  // zod raw shape; empty object for tools with no input
  inputSchema: z.ZodRawShape;
  handler: (client: TimeLogClient, args: Record<string, unknown>) => Promise<unknown>;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/tools/types.ts
git commit -m "feat: shared ToolDef shape"
```

---

## Task 5: Project read tools

**Files:**
- Create: `src/tools/projectReads.ts`
- Test: `test/tools/projectReads.test.ts`

Five read tools. Each returns the API JSON verbatim. `list_projects` is the only one with inputs (`customerID?`, `isActive?`).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from "vitest";
import { projectReadTools } from "../../src/tools/projectReads.js";
import type { TimeLogClient } from "../../src/client.js";

function byName(name: string) {
  const tool = projectReadTools.find((t) => t.name === name);
  if (!tool) throw new Error(`tool ${name} not found`);
  return tool;
}

describe("project read tools", () => {
  it("exposes the five expected tools", () => {
    expect(projectReadTools.map((t) => t.name).sort()).toEqual(
      ["get_project", "list_departments", "list_project_categories", "list_project_types", "list_projects"].sort(),
    );
  });

  it("list_projects passes customerID and isActive to client.get", async () => {
    const get = vi.fn(async () => [{ ProjectID: 1 }]);
    const client = { get } as unknown as TimeLogClient;

    const result = await byName("list_projects").handler(client, { customerID: 42, isActive: true });

    expect(get).toHaveBeenCalledWith("/project/get-all", { customerID: 42, isActive: true });
    expect(result).toEqual([{ ProjectID: 1 }]);
  });

  it("get_project requests the project by id", async () => {
    const get = vi.fn(async () => ({ ProjectID: 7 }));
    const client = { get } as unknown as TimeLogClient;

    await byName("get_project").handler(client, { projectID: 7 });

    expect(get).toHaveBeenCalledWith("/project/7");
  });

  it("list_project_types hits /ProjectType", async () => {
    const get = vi.fn(async () => []);
    const client = { get } as unknown as TimeLogClient;

    await byName("list_project_types").handler(client, {});

    expect(get).toHaveBeenCalledWith("/ProjectType");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/tools/projectReads.test.ts`
Expected: FAIL — cannot find module `projectReads.js`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/tools/projectReads.ts
import { z } from "zod";
import type { ToolDef } from "./types.js";

export const projectReadTools: ToolDef[] = [
  {
    name: "list_projects",
    description:
      "List projects. Optional filters: customerID (only that customer's projects) and isActive (true = active projects only). Returns the raw TimeLog project list.",
    inputSchema: {
      customerID: z.number().int().optional().describe("Only projects for this CustomerID."),
      isActive: z.boolean().optional().describe("If set, filter by active/inactive projects."),
    },
    handler: (client, args) =>
      client.get("/project/get-all", {
        customerID: args.customerID as number | undefined,
        isActive: args.isActive as boolean | undefined,
      }),
  },
  {
    name: "get_project",
    description: "Get a single project's full record by ProjectID.",
    inputSchema: {
      projectID: z.number().int().describe("The ProjectID to fetch."),
    },
    handler: (client, args) => client.get(`/project/${args.projectID as number}`),
  },
  {
    name: "list_project_types",
    description: "List all Project Types (read-only classification). Use to resolve a type name to its ProjectTypeID.",
    inputSchema: {},
    handler: (client) => client.get("/ProjectType"),
  },
  {
    name: "list_project_categories",
    description:
      "List all Project Categories (read-only classification, distinct from Project Type). Resolve a category name to its ProjectCategoryID.",
    inputSchema: {},
    handler: (client) => client.get("/ProjectCategory"),
  },
  {
    name: "list_departments",
    description: "List all Departments. Resolve a department name to its DepartmentID.",
    inputSchema: {},
    handler: (client) => client.get("/department"),
  },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/tools/projectReads.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/tools/projectReads.ts test/tools/projectReads.test.ts
git commit -m "feat: project read tools"
```

---

## Task 6: Relation and employee read tools

**Files:**
- Create: `src/tools/relationReads.ts`
- Test: `test/tools/relationReads.test.ts`

Five read tools, all input-less: `list_customers`, `list_contacts`, `list_users`, `list_employee_types`, `whoami`.

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/tools/relationReads.test.ts`
Expected: FAIL — cannot find module `relationReads.js`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/tools/relationReads.ts
import type { ToolDef } from "./types.js";

export const relationReadTools: ToolDef[] = [
  {
    name: "list_customers",
    description: "List all Customers. Resolve a customer name to its CustomerID.",
    inputSchema: {},
    handler: (client) => client.get("/customer"),
  },
  {
    name: "list_contacts",
    description: "List all Contacts (contact persons). Resolve a contact's ShownName to its ContactID.",
    inputSchema: {},
    handler: (client) => client.get("/contact"),
  },
  {
    name: "list_users",
    description:
      "List all Users (employees). Resolve a person's name/initials to a UserID for ProjectManagerID / AccountManagerID.",
    inputSchema: {},
    handler: (client) => client.get("/user"),
  },
  {
    name: "list_employee_types",
    description: "List all Employee Types (read-only classification).",
    inputSchema: {},
    handler: (client) => client.get("/employee-type"),
  },
  {
    name: "whoami",
    description: "Show the User the current Personal Access Token acts as. Use to confirm which account/identity is connected.",
    inputSchema: {},
    handler: (client) => client.get("/user/me"),
  },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/tools/relationReads.test.ts`
Expected: PASS (6 cases).

- [ ] **Step 5: Commit**

```bash
git add src/tools/relationReads.ts test/tools/relationReads.test.ts
git commit -m "feat: relation and employee read tools"
```

---

## Task 7: Write-tool zod schemas

**Files:**
- Create: `src/schemas.ts`
- Test: covered via the write-tool tests in Task 8.

The 14 updatable project fields, all optional, plus the status model.

- [ ] **Step 1: Create `src/schemas.ts`**

```ts
import { z } from "zod";

// PUT /project/{id} — ProjectApiUpdateModel. All fields optional; send only what changes.
export const updateProjectShape = {
  projectID: z.number().int().describe("ProjectID of the project to update."),
  Name: z.string().optional().describe("Project name."),
  ProjectNo: z.string().optional().describe("Project number."),
  CustomerID: z.number().int().optional().describe("Owning CustomerID."),
  ContactID: z.number().int().optional().describe("ContactID of the customer contact."),
  Description: z.string().optional().describe("Project description."),
  DepartmentID: z.number().int().optional().describe("Owning DepartmentID."),
  ProjectManagerID: z.number().int().optional().describe("UserID of the Project Manager."),
  AccountManagerID: z.number().int().optional().describe("UserID of the Account Manager."),
  PartnerID: z.number().int().optional().describe("PartnerID associated with the project."),
  ProjectTypeID: z.number().int().optional().describe("ProjectTypeID (classification)."),
  ProjectCategoryID: z.number().int().optional().describe("ProjectCategoryID (classification)."),
  BudgetWorkHours: z.number().optional().describe("Budgeted work hours."),
  BudgetWorkAmount: z.number().optional().describe("Budgeted work amount."),
  LanguageID: z.number().int().optional().describe("LanguageID for project-facing output."),
} as const;

// PUT /project/{id}/status — ProjectStatusApiUpdateModel.
export const updateProjectStatusShape = {
  projectID: z.number().int().describe("ProjectID whose status to change."),
  ProjectStatus: z
    .number()
    .int()
    .min(0)
    .max(6)
    .describe(
      "Lifecycle status as a raw integer 0–6. WARNING: the label for each value is NOT yet confirmed for this account — verify in the TimeLog UI before relying on a specific number.",
    ),
  AllowTimeTracking: z.boolean().describe("Whether time tracking is allowed on the project."),
} as const;

// Fields that are part of the update body (everything except the path param projectID).
export const updateProjectBodyKeys = Object.keys(updateProjectShape).filter((k) => k !== "projectID");
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/schemas.ts
git commit -m "feat: zod schemas for project write tools"
```

---

## Task 8: Project write tools

**Files:**
- Create: `src/tools/projectWrites.ts`
- Test: `test/tools/projectWrites.test.ts`

`update_project` separates the path param (`projectID`) from the body, and sends **only the fields the caller provided** (partial update — the ADR 0002 default, to be confirmed by the empirical test in Task 11). `update_project_status` sends the two-field status model.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from "vitest";
import { projectWriteTools } from "../../src/tools/projectWrites.js";
import type { TimeLogClient } from "../../src/client.js";

function byName(name: string) {
  const tool = projectWriteTools.find((t) => t.name === name);
  if (!tool) throw new Error(`tool ${name} not found`);
  return tool;
}

describe("project write tools", () => {
  it("exposes update_project and update_project_status", () => {
    expect(projectWriteTools.map((t) => t.name).sort()).toEqual(["update_project", "update_project_status"]);
  });

  it("update_project PUTs only the provided fields, excluding projectID from the body", async () => {
    const put = vi.fn(async () => ({ ok: true }));
    const client = { put } as unknown as TimeLogClient;

    await byName("update_project").handler(client, { projectID: 7, ProjectTypeID: 3 });

    expect(put).toHaveBeenCalledWith("/project/7", { ProjectTypeID: 3 });
  });

  it("update_project sends multiple changed fields but nothing undefined", async () => {
    const put = vi.fn(async () => ({}));
    const client = { put } as unknown as TimeLogClient;

    await byName("update_project").handler(client, {
      projectID: 9,
      Name: "Renamed",
      ProjectManagerID: 42,
      Description: undefined,
    });

    expect(put).toHaveBeenCalledWith("/project/9", { Name: "Renamed", ProjectManagerID: 42 });
  });

  it("update_project rejects a call with no fields to change", async () => {
    const put = vi.fn(async () => ({}));
    const client = { put } as unknown as TimeLogClient;

    await expect(byName("update_project").handler(client, { projectID: 9 })).rejects.toThrow(/no fields/i);
    expect(put).not.toHaveBeenCalled();
  });

  it("update_project_status PUTs the status model to the status endpoint", async () => {
    const put = vi.fn(async () => ({}));
    const client = { put } as unknown as TimeLogClient;

    await byName("update_project_status").handler(client, {
      projectID: 5,
      ProjectStatus: 2,
      AllowTimeTracking: true,
    });

    expect(put).toHaveBeenCalledWith("/project/5/status", { ProjectStatus: 2, AllowTimeTracking: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/tools/projectWrites.test.ts`
Expected: FAIL — cannot find module `projectWrites.js`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/tools/projectWrites.ts
import type { ToolDef } from "./types.js";
import { updateProjectShape, updateProjectStatusShape, updateProjectBodyKeys } from "../schemas.js";

export const projectWriteTools: ToolDef[] = [
  {
    name: "update_project",
    description:
      "Update fields on ONE existing project (PUT /project/{id}). Provide projectID plus only the fields to change; omitted fields are left untouched. Cannot create/delete projects or set StartDate/EndDate. One project per call — orchestrate mass changes in the conversation.",
    inputSchema: updateProjectShape,
    handler: async (client, args) => {
      const projectID = args.projectID as number;
      const body: Record<string, unknown> = {};
      for (const key of updateProjectBodyKeys) {
        if (args[key] !== undefined) body[key] = args[key];
      }
      if (Object.keys(body).length === 0) {
        throw new Error("update_project called with no fields to change.");
      }
      return client.put(`/project/${projectID}`, body);
    },
  },
  {
    name: "update_project_status",
    description:
      "Set the lifecycle status of ONE project (PUT /project/{id}/status). ProjectStatus is a raw integer 0–6 whose labels are NOT yet confirmed — verify in the UI. AllowTimeTracking toggles whether time can be registered.",
    inputSchema: updateProjectStatusShape,
    handler: async (client, args) => {
      const projectID = args.projectID as number;
      return client.put(`/project/${projectID}/status`, {
        ProjectStatus: args.ProjectStatus as number,
        AllowTimeTracking: args.AllowTimeTracking as boolean,
      });
    },
  },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/tools/projectWrites.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/schemas.ts src/tools/projectWrites.ts test/tools/projectWrites.test.ts
git commit -m "feat: project field write tools (partial update)"
```

---

## Task 9: Tool registration

**Files:**
- Create: `src/registerTools.ts`
- Test: none (thin wiring; exercised by the server smoke test in Task 10 and verified via `tsc`).

Maps every `ToolDef` onto an `McpServer`, wrapping the handler so its return value is serialized into MCP text content, and errors become `isError` content rather than thrown exceptions (so the model sees the failure).

- [ ] **Step 1: Create `src/registerTools.ts`**

```ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TimeLogClient } from "./client.js";
import type { ToolDef } from "./tools/types.js";
import { projectReadTools } from "./tools/projectReads.js";
import { relationReadTools } from "./tools/relationReads.js";
import { projectWriteTools } from "./tools/projectWrites.js";

export const allTools: ToolDef[] = [...projectReadTools, ...relationReadTools, ...projectWriteTools];

export function registerTools(server: McpServer, client: TimeLogClient, tools: ToolDef[] = allTools): void {
  for (const tool of tools) {
    server.registerTool(
      tool.name,
      { description: tool.description, inputSchema: tool.inputSchema },
      async (args: Record<string, unknown>) => {
        try {
          const data = await tool.handler(client, args ?? {});
          return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return { content: [{ type: "text" as const, text: message }], isError: true };
        }
      },
    );
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors. (If the SDK's `registerTool` signature differs in the installed version, adapt the option key — `inputSchema` takes a zod raw shape in current SDK versions.)

- [ ] **Step 3: Commit**

```bash
git add src/registerTools.ts
git commit -m "feat: register tools onto an McpServer"
```

---

## Task 10: HTTP server with per-request PAT

**Files:**
- Create: `src/server.ts`, `src/index.ts`
- Test: `test/server.test.ts`

Stateless Streamable HTTP: each POST `/mcp` resolves the PAT (Authorization header `Bearer ...`, else `TIMELOG_PAT` env), builds a `TimeLogClient`, a fresh `McpServer`, registers tools, and handles the request. A request with no resolvable PAT gets `401`.

- [ ] **Step 1: Write the failing test (PAT resolution)**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/server.test.ts`
Expected: FAIL — cannot find module `../src/server.js`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/server.ts
import express, { type Request, type Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { TimeLogClient } from "./client.js";
import { loadConfig } from "./config.js";
import { registerTools } from "./registerTools.js";

export function resolvePat(
  authHeader: string | undefined,
  env: Record<string, string | undefined>,
): string | null {
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }
  return env.TIMELOG_PAT ?? null;
}

export function createApp() {
  const config = loadConfig();
  const app = express();
  app.use(express.json());

  app.post("/mcp", async (req: Request, res: Response) => {
    const pat = resolvePat(req.header("authorization"), process.env);
    if (!pat) {
      res.status(401).json({ error: "No PAT: set TIMELOG_PAT or send Authorization: Bearer <pat>." });
      return;
    }

    const client = new TimeLogClient({ baseUrl: config.baseUrl, pat });
    const server = new McpServer({ name: "timelog-mcp", version: "0.1.0" });
    registerTools(server, client);

    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  return app;
}
```

```ts
// src/index.ts
import { createApp } from "./server.js";

const port = Number(process.env.PORT ?? 8787);
createApp().listen(port, () => {
  console.error(`TimeLog MCP listening on http://localhost:${port}/mcp`);
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/server.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Build and smoke-test the boot**

Run: `npm run build && node dist/index.js`
Expected: prints `TimeLog MCP listening on http://localhost:8787/mcp`. Stop with Ctrl-C. (No PAT needed to boot; PAT is per request.)

- [ ] **Step 6: Run the full suite**

Run: `npx vitest run`
Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/server.ts src/index.ts test/server.test.ts
git commit -m "feat: streamable HTTP server with per-request PAT"
```

---

## Task 11: Empirical PUT test (manual gate — ADR 0002)

**Files:**
- Create: `docs/runbooks/empirical-put-test.md`

This is the gate from ADR 0002: confirm a partial `PUT /project/{id}` preserves omitted fields before trusting `update_project`. It is a **manual** procedure, not an automated test.

- [ ] **Step 1: Write the runbook**

```markdown
# Runbook: empirical PUT preservation test (ADR 0002)

Goal: confirm that `PUT /project/{id}` with only one field set leaves the other
13 fields unchanged. If it does not, the partial-update implementation is wrong
and must be replaced with read-modify-write.

## Steps

1. Pick a disposable test project in TimeLog. Note its ProjectID and record its
   current ProjectTypeID, ProjectManagerID, Description, and BudgetWorkHours from
   the UI (or via `get_project`).
2. Start the server (`npm run build && node dist/index.js`) with a real
   `TIMELOG_PAT` in `.env` belonging to a user with project-admin rights.
3. Call `update_project` with ONLY `{ projectID, Description: "PUT-TEST <timestamp>" }`.
4. Reload the project in the TimeLog UI.
5. Verify: Description changed; ProjectTypeID, ProjectManagerID, BudgetWorkHours,
   and all other fields are UNCHANGED.

## Outcomes

- **Preserved** → partial update is correct. Record the result here and proceed.
- **Reset/blanked** → STOP. Supersede ADR 0002 with a new ADR, and change
  `update_project`'s handler to read-modify-write: GET the project, merge the
  changed field into the full field set, then PUT all 14 fields. The tool's
  external signature does not change.

## Result log

- YYYY-MM-DD: <outcome, who ran it>
```

- [ ] **Step 2: Run the procedure**

Follow the runbook against a real test project. Record the outcome in the Result log.

- [ ] **Step 3: If fields were reset, fix the handler**

Only if the test failed: write a failing test in `test/tools/projectWrites.test.ts` asserting `update_project` first GETs then PUTs the merged full body, change the handler to read-modify-write, and supersede ADR 0002. (If the test passed, skip this step.)

- [ ] **Step 4: Commit**

```bash
git add docs/runbooks/empirical-put-test.md
git commit -m "docs: empirical PUT preservation runbook and result"
```

---

## Task 12: Capability documentation (deliverable)

**Files:**
- Create: `README.md`

The can / cannot table the spec requires, plus how to configure and run.

- [ ] **Step 1: Write `README.md`**

````markdown
# TimeLog MCP (Phase 1)

A localhost MCP server for administering TimeLog projects via the REST API (v1).

## Configure

Copy `.env.example` to `.env` and set:

- `TIMELOG_BASE_URL` — e.g. `https://app5.timelog.com/ingholtconsult2/api/v1`
- `TIMELOG_PAT` — a Personal Access Token for a user with project-administration rights
- `PORT` — optional, defaults to 8787

## Run

```bash
npm install
npm run build
node dist/index.js
```

The server listens on `http://localhost:<PORT>/mcp` (Streamable HTTP). The PAT is
read from `TIMELOG_PAT`, or per request from an `Authorization: Bearer <pat>` header.

## Capabilities

| Can | Cannot (Phase 1) |
|---|---|
| List projects (filter by customer / active) | Create or delete projects |
| Read one project in full | Create/update tasks or contracts |
| List project types, categories, departments | Touch time registrations, expenses, invoicing |
| List customers, contacts, users, employee types | Create employees / change working time |
| Show the connected user (`whoami`) | Set StartDate / EndDate (not in the API update model) |
| Update project fields (14 fields, one project per call) | Bulk-update many projects in one call |
| Set project status (0–6) and time-tracking toggle | Resource booking / allocation |

Mass changes are orchestrated in conversation: list → confirm the set → one
update per project → per-project result. See `docs/superpowers/specs/` for the
design and `docs/adr/` for the boundary decisions.

> **Status labels:** `ProjectStatus` is a raw integer 0–6; the label per value is
> not yet confirmed for this account. Verify in the UI before relying on a number.
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: Phase 1 capability table and run instructions"
```

---

## Self-review notes (already applied)

- **Spec coverage:** all 12 tools (Tasks 5, 6, 8), partial-update semantics + empirical gate (Tasks 8, 11), ADR 0003 single-resource/no-bulk (no bulk tool exists; enforced by tool shape), per-request PAT from header or env / ADR 0001 (Task 10), status raw-integer warning (Tasks 7, 8, 12), `get-all` array parsing (client returns parsed JSON; reads pass it through), zod capability descriptions + README can/cannot (all tools, Task 12). `hourly-rate`/`cost-price` deliberately absent.
- **Type consistency:** `ToolDef` (Task 4) is the single handler signature used by every tool module and by `registerTools`. `updateProjectBodyKeys` (Task 7) drives the body-building loop in Task 8.
- **No placeholders:** every code and test step contains complete content.
```
