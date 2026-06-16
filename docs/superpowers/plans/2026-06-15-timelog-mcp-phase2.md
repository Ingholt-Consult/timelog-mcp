# TimeLog MCP — Phase 2 (project construction) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add tools that let an administrator construct a project in conversation — create it from a template, add tasks/sub-tasks, add contracts, and add payment-plan lines — each write previewed before it runs.

**Architecture:** Mirror the Phase 1 tool/handler pattern. Eight new read tools resolve names↔IDs; five new write tools each take `mode: "preview" | "execute"` (default `preview`) and route through one shared `runWrite` helper — preview POSTs to the paired `validate-*` endpoint (which writes nothing) and returns the validation outcome plus a selectively name-enriched summary; execute POSTs to the real create endpoint. Enforcement is soft (tool descriptions instruct preview-first). Template *creation/editing* is deliberately **not** built — the REST API has no template-write endpoint; the substitute is a documented "build a source project, then save it as a template in the UI" workflow (see CONTEXT.md › No template write).

**Tech Stack:** TypeScript (ESM), `@modelcontextprotocol/sdk`, Zod, Vitest. TimeLog REST API v1 over the existing `TimeLogClient`.

---

## Decisions locked in (from grill-with-docs, 2026-06-15)

- **Template-write is out** — API exposes only `GET /project-template/get-all`. Substitute: scaffold a source project with the Phase 2 tools, then "Gem som skabelon" manually in the UI. No new tool — documentation + a hint in the relevant tool descriptions.
- **Empirical gate is minimized** — validate-heavy. Lean on the dry `validate-*` calls to learn field binding/required fields from validation errors; do the bare minimum of *real* creates (one project-from-template, optionally one task) on an **internal, customer-less** test project so nothing reaches invoicing. Avoid real contract/payment creates if validate yields enough. Archive afterwards.
- **Preview enrichment is selective** — resolve only the cheap, high-value names (template, customer, task type, contract name, project name). Everything else stays as raw IDs. Enrichment lookups are best-effort: a failed lookup must never fail the preview.
- **`TimeLogClient` gains `post()`** — small new client method; the only architectural addition.

## File structure

| File | Responsibility |
|---|---|
| `src/client.ts` *(modify)* | Add `post<T>(path, body)` alongside `get`/`put`. |
| `src/tools/unwrap.ts` *(create)* | Shared `unwrapList(resp)` — turns a TAFList / plain array / unknown into a flat row array. Replaces the private copy in `projectReads.ts`. |
| `src/tools/projectReads.ts` *(modify)* | Import `unwrapList` from `./unwrap.js` instead of its local `unwrapEntities`. |
| `src/constructionSchemas.ts` *(create)* | Zod raw shapes for the 5 create models + the shared `mode` field, with per-field `.describe()`. |
| `src/tools/preview.ts` *(create)* | `WriteMode` type, `bodyFromArgs(args)`, and the `runWrite(client, opts)` preview/execute router. |
| `src/tools/constructionReads.ts` *(create)* | The 8 read tools. |
| `src/tools/constructionWrites.ts` *(create)* | The 5 write tools + their selective-enrichment summarizers. |
| `src/registerTools.ts` *(modify)* | Add `constructionReadTools` and `constructionWriteTools` to `allTools`. |
| `README.md` *(modify)* | Update the capability table; document the save-as-template-in-UI workflow. |
| `docs/runbooks/empirical-create-tests.md` *(create)* | The minimized empirical gate with a result log. |
| `test/manual/empirical-create-validate.mjs` *(create)* | Validate-exploration script (dry; learns required fields from validation errors). |
| `test/client.test.ts` *(modify)* | Add a `post` test. |
| `test/tools/constructionReads.test.ts` *(create)* | Read-tool tests. |
| `test/tools/preview.test.ts` *(create)* | `runWrite` router tests. |
| `test/tools/constructionWrites.test.ts` *(create)* | Write-tool tests (preview vs execute, task routing, enrichment non-fatal). |

## API facts this plan relies on (from the swagger, verified 2026-06-15)

All paths below are relative to the configured base URL (`…/api/v1`), exactly as Phase 1 calls them (no `/v{version}` prefix in code).

| Tool | Execute (POST) | Preview (POST validate) | Body model |
|---|---|---|---|
| `create_project_from_template` | `/project/create-from-template` | `/project/validate-create-from-template` | `ProjectApiCreateModel` |
| `create_task` | `/task` **or** `/task/create-sub-task` (when `ParentTaskID` set) | `/task/validate-new-task` (both) | `TaskApiCreateModel` |
| `create_time_material_contract` | `/contract/create-time-material-basic-contract` | `/contract/validate-time-material-basic-contract` | `TimeMaterialBasicContractApiCreateModel` |
| `create_fixed_price_contract` | `/contract/create-fixed-price-basic-contract` | `/contract/validate-fixed-price-basic-contract` | `FixedPriceBasicContractApiCreateModel` |
| `create_payment` | `/payment` | `/payment/validate-new-payment` | `PaymentApiCreateModel` |

- Every create/validate endpoint is a collection POST — **no path params**; everything (incl. `ProjectID`) lives in the body.
- `required` is empty on every create model in the swagger and is **untrustworthy** (Phase 1 proved the swagger lies about binding). All schema fields are therefore `.optional()`; real requirements come from the empirical gate.
- A **Contract** is a `ProjectSubContract` internally: payments and tasks link to a contract via `ProjectSubContractID`, while the read list is keyed `?contractID=`. The gate confirms these are the same identifier.
- Create endpoints return `200` with an often-empty body — `client.post` already maps empty → `null`.

---

## Task 1: Add `post()` to TimeLogClient

**Files:**
- Modify: `src/client.ts:55-57`
- Test: `test/client.test.ts`

- [ ] **Step 1: Write the failing test**

Add inside the `describe("TimeLogClient", …)` block in `test/client.test.ts`:

```ts
  it("POSTs a JSON body and returns parsed JSON", async () => {
    const f = fakeFetch(200, { ProjectID: 99 });
    const client = new TimeLogClient({ baseUrl: "https://x/api/v1", pat: "tok", fetchImpl: f });

    const data = await client.post("/project/create-from-template", { Name: "New" });

    const [, init] = f.mock.calls[0];
    expect((init as RequestInit).method).toBe("POST");
    expect((init as RequestInit).body).toBe(JSON.stringify({ Name: "New" }));
    expect(data).toEqual({ ProjectID: 99 });
  });

  it("POST maps an empty 200 body to null", async () => {
    const f = vi.fn(async () => new Response("", { status: 200 }));
    const client = new TimeLogClient({ baseUrl: "https://x/api/v1", pat: "tok", fetchImpl: f });

    expect(await client.post("/task", { TaskName: "x" })).toBeNull();
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run test/client.test.ts`
Expected: FAIL — `client.post is not a function`.

- [ ] **Step 3: Add the `post` method**

In `src/client.ts`, immediately after the `put` method (line 55-57), add:

```ts
  post<T = unknown>(path: string, body: unknown): Promise<T> {
    return this.request<T>("POST", path, undefined, body);
  }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run test/client.test.ts`
Expected: PASS (all client tests green).

- [ ] **Step 5: Commit**

```bash
git add src/client.ts test/client.test.ts
git commit -m "feat(client): add POST method for Phase 2 create/validate endpoints"
```

---

## Task 2: Extract the shared `unwrapList` helper

The list-row unwrap logic currently lives privately in `projectReads.ts`. The Phase 2 reads and the enrichment summarizers need it too. Extract it once (DRY).

**Files:**
- Create: `src/tools/unwrap.ts`
- Modify: `src/tools/projectReads.ts:4-9`
- Test: `test/tools/unwrap.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/tools/unwrap.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run test/tools/unwrap.test.ts`
Expected: FAIL — cannot find module `../../src/tools/unwrap.js`.

- [ ] **Step 3: Create the helper**

Create `src/tools/unwrap.ts`:

```ts
// TimeLog list ("TAFList") endpoints wrap rows as { Entities: [{ Properties: {...} }] }.
// A few endpoints are mis-typed in the swagger and return a plain array instead.
// This normalises both into a flat row array; unknown shapes yield [].
export function unwrapList(resp: unknown): Record<string, unknown>[] {
  const entities = (resp as { Entities?: { Properties?: Record<string, unknown> }[] })?.Entities;
  if (Array.isArray(entities)) {
    return entities.map((e) => (e.Properties ?? e)) as Record<string, unknown>[];
  }
  if (Array.isArray(resp)) return resp as Record<string, unknown>[];
  return [];
}
```

- [ ] **Step 4: Point `projectReads.ts` at the shared helper**

In `src/tools/projectReads.ts`, delete the local `unwrapEntities` function (lines 4-9) and its only call site's name. Replace the top of the file:

```ts
import { z } from "zod";
import type { ToolDef } from "./types.js";
import { unwrapList } from "./unwrap.js";
```

Then in `list_project_types`'s handler, change `unwrapEntities(` to `unwrapList(`:

```ts
      const types = unwrapList(await client.get("/ProjectType", { $pagesize: 100 }));
```

- [ ] **Step 5: Run the full suite to verify nothing regressed**

Run: `npm test`
Expected: PASS — all existing tests plus `unwrap.test.ts` green.

- [ ] **Step 6: Commit**

```bash
git add src/tools/unwrap.ts src/tools/projectReads.ts test/tools/unwrap.test.ts
git commit -m "refactor: extract shared unwrapList helper from projectReads"
```

---

## Task 3: Construction read tools

The 8 reads that resolve names↔IDs and feed preview enrichment. List tools page with `$pagesize=100` and unwrap; single-record tools pass the raw wrapped record through (consistent with `get_project`).

**Files:**
- Create: `src/tools/constructionReads.ts`
- Test: `test/tools/constructionReads.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/tools/constructionReads.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { constructionReadTools } from "../../src/tools/constructionReads.js";
import type { TimeLogClient } from "../../src/client.js";

function byName(name: string) {
  const tool = constructionReadTools.find((t) => t.name === name);
  if (!tool) throw new Error(`tool ${name} not found`);
  return tool;
}

describe("construction read tools", () => {
  it("exposes the eight expected tools", () => {
    expect(constructionReadTools.map((t) => t.name).sort()).toEqual(
      [
        "get_contract",
        "get_task",
        "list_contract_hourly_rates",
        "list_contracts",
        "list_payments",
        "list_project_templates",
        "list_task_types",
        "list_tasks",
      ].sort(),
    );
  });

  it("list_tasks filters by projectID and unwraps the rows", async () => {
    const get = vi.fn(async () => ({ Entities: [{ Properties: { TaskID: 5 } }] }));
    const client = { get } as unknown as TimeLogClient;

    const result = await byName("list_tasks").handler(client, { projectID: 7 });

    expect(get).toHaveBeenCalledWith("/task", { projectID: 7, $pagesize: 100 });
    expect(result).toEqual([{ TaskID: 5 }]);
  });

  it("list_task_types pages with $pagesize and unwraps", async () => {
    const get = vi.fn(async () => ({ Entities: [{ Properties: { TaskTypeID: 1, Name: "1.1 Idéoplæg" } }] }));
    const client = { get } as unknown as TimeLogClient;

    const result = await byName("list_task_types").handler(client, {});

    expect(get).toHaveBeenCalledWith("/TaskType", { $pagesize: 100 });
    expect(result).toEqual([{ TaskTypeID: 1, Name: "1.1 Idéoplæg" }]);
  });

  it("list_contracts filters by projectID", async () => {
    const get = vi.fn(async () => ({ Entities: [] }));
    const client = { get } as unknown as TimeLogClient;

    await byName("list_contracts").handler(client, { projectID: 7 });

    expect(get).toHaveBeenCalledWith("/contract", { projectID: 7, $pagesize: 100 });
  });

  it("list_payments filters by contractID", async () => {
    const get = vi.fn(async () => ({ Entities: [] }));
    const client = { get } as unknown as TimeLogClient;

    await byName("list_payments").handler(client, { contractID: 12 });

    expect(get).toHaveBeenCalledWith("/payment", { contractID: 12, $pagesize: 100 });
  });

  it("list_contract_hourly_rates filters by contractID", async () => {
    const get = vi.fn(async () => ({ Entities: [] }));
    const client = { get } as unknown as TimeLogClient;

    await byName("list_contract_hourly_rates").handler(client, { contractID: 12 });

    expect(get).toHaveBeenCalledWith("/contract-hourly-rate", { contractID: 12, $pagesize: 100 });
  });

  it("get_task fetches a single task by id (raw)", async () => {
    const get = vi.fn(async () => ({ Properties: { TaskID: 5 } }));
    const client = { get } as unknown as TimeLogClient;

    await byName("get_task").handler(client, { taskID: 5 });

    expect(get).toHaveBeenCalledWith("/task/5");
  });

  it("get_contract fetches a single contract by id (raw)", async () => {
    const get = vi.fn(async () => ({ Properties: { ContractID: 9 } }));
    const client = { get } as unknown as TimeLogClient;

    await byName("get_contract").handler(client, { contractID: 9 });

    expect(get).toHaveBeenCalledWith("/contract/9");
  });

  it("list_project_templates pages and unwraps", async () => {
    const get = vi.fn(async () => ({ Entities: [{ Properties: { ProjectTemplateID: 7, Name: "Fastpris – Småsag" } }] }));
    const client = { get } as unknown as TimeLogClient;

    const result = await byName("list_project_templates").handler(client, {});

    expect(get).toHaveBeenCalledWith("/project-template/get-all", { $pagesize: 100 });
    expect(result).toEqual([{ ProjectTemplateID: 7, Name: "Fastpris – Småsag" }]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run test/tools/constructionReads.test.ts`
Expected: FAIL — cannot find module `../../src/tools/constructionReads.js`.

- [ ] **Step 3: Implement the read tools**

Create `src/tools/constructionReads.ts`:

```ts
import { z } from "zod";
import type { ToolDef } from "./types.js";
import { unwrapList } from "./unwrap.js";

// List endpoints silently cap at 10 rows unless paged with $-options; $pagesize=100
// returns the full list (see CONTEXT.md › API conventions). Single-record reads pass
// the raw wrapped { Properties: {...} } through, consistent with get_project.
export const constructionReadTools: ToolDef[] = [
  {
    name: "list_project_templates",
    description:
      "List the account's Project Templates (read-only). Resolve a template name (e.g. 'Fastpris – Småsag') to its ProjectTemplateID for create_project_from_template. NOTE: the API cannot create, edit, or delete templates — that is a UI-only action.",
    inputSchema: {},
    handler: async (client) => unwrapList(await client.get("/project-template/get-all", { $pagesize: 100 })),
  },
  {
    name: "list_tasks",
    description:
      "List the task tree of a project (GET /task?projectID=). Source of ParentTaskID when adding a sub-task and of existing TaskIDs.",
    inputSchema: {
      projectID: z.number().int().describe("ProjectID whose tasks to list."),
    },
    handler: async (client, args) =>
      unwrapList(await client.get("/task", { projectID: args.projectID as number, $pagesize: 100 })),
  },
  {
    name: "get_task",
    description: "Get a single Task's full record by TaskID.",
    inputSchema: {
      taskID: z.number().int().describe("The TaskID to fetch."),
    },
    handler: (client, args) => client.get(`/task/${args.taskID as number}`),
  },
  {
    name: "list_task_types",
    description:
      "List all Task Types — the firm's ydelsesfaser (e.g. '1.1 Idéoplæg' … '4.8 Certificering KK3'). Resolve a task-type name to its TaskTypeID.",
    inputSchema: {},
    handler: async (client) => unwrapList(await client.get("/TaskType", { $pagesize: 100 })),
  },
  {
    name: "list_contracts",
    description: "List a project's Contracts (GET /contract?projectID=). Source of ContractID / ProjectSubContractID.",
    inputSchema: {
      projectID: z.number().int().describe("ProjectID whose contracts to list."),
    },
    handler: async (client, args) =>
      unwrapList(await client.get("/contract", { projectID: args.projectID as number, $pagesize: 100 })),
  },
  {
    name: "get_contract",
    description: "Get a single Contract's full record by ContractID.",
    inputSchema: {
      contractID: z.number().int().describe("The ContractID to fetch."),
    },
    handler: (client, args) => client.get(`/contract/${args.contractID as number}`),
  },
  {
    name: "list_payments",
    description:
      "List a Contract's payment-plan lines (GET /payment?contractID=). The contractID here is the same identifier as a payment's ProjectSubContractID.",
    inputSchema: {
      contractID: z.number().int().describe("ContractID whose payments to list."),
    },
    handler: async (client, args) =>
      unwrapList(await client.get("/payment", { contractID: args.contractID as number, $pagesize: 100 })),
  },
  {
    name: "list_contract_hourly_rates",
    description:
      "List a Contract's Hourly Rates (GET /contract-hourly-rate?contractID=). Resolve an HourlyRateID that a Task references for its budget.",
    inputSchema: {
      contractID: z.number().int().describe("ContractID whose hourly rates to list."),
    },
    handler: async (client, args) =>
      unwrapList(await client.get("/contract-hourly-rate", { contractID: args.contractID as number, $pagesize: 100 })),
  },
];
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run test/tools/constructionReads.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tools/constructionReads.ts test/tools/constructionReads.test.ts
git commit -m "feat(tools): add 8 Phase 2 construction read tools"
```

---

## Task 4: Construction schemas

Zod raw shapes mirroring the 5 create models. Every field is `.optional()` (swagger `required` is empty and untrustworthy — the gate determines real requirements). A shared `mode` field defaults to `"preview"`.

**Files:**
- Create: `src/constructionSchemas.ts`
- Test: `test/constructionSchemas.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/constructionSchemas.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run test/constructionSchemas.test.ts`
Expected: FAIL — cannot find module `../src/constructionSchemas.js`.

- [ ] **Step 3: Implement the schemas**

Create `src/constructionSchemas.ts`:

```ts
import { z } from "zod";

// Shared preview/execute switch. Default preview: a write tool must be asked
// explicitly to execute. See docs/adr/0004 (preview-and-confirm tier).
export const modeField = {
  mode: z
    .enum(["preview", "execute"])
    .default("preview")
    .describe(
      "preview (default): POSTs to the validate-* endpoint, writes NOTHING, and returns the validation outcome plus a summary of what would be created. execute: performs the real create. Always preview first, show the user, and only execute after an explicit yes.",
    ),
} as const;

// POST /project/create-from-template — ProjectApiCreateModel (18 fields). All
// optional: the swagger declares none required and is untrustworthy; the empirical
// gate determines the real requirements. Dates are ISO 8601 strings.
export const createProjectFromTemplateShape = {
  ...modeField,
  ProjectTemplateID: z.number().int().optional().describe("Template to build from (see list_project_templates)."),
  Name: z.string().optional().describe("Project name."),
  ProjectNo: z.string().optional().describe("Project number (usually auto-generated; omit unless overriding)."),
  CustomerID: z.number().int().optional().describe("Owning CustomerID; omit for an internal project."),
  Description: z.string().optional().describe("Project description."),
  ProjectManagerID: z.number().int().optional().describe("UserID of the Project Manager."),
  ProjectStartDate: z.string().optional().describe("Project start date, ISO 8601 (e.g. 2026-06-15T00:00:00)."),
  ProjectEndDate: z.string().optional().describe("Project end date, ISO 8601."),
  ProjectTypeID: z.number().int().optional().describe("ProjectTypeID (classification)."),
  ProjectCategoryID: z.number().int().optional().describe("ProjectCategoryID (classification)."),
  CurrencyID: z.number().int().optional().describe("CurrencyID."),
  LegalEntityID: z.number().int().optional().describe("LegalEntityID."),
  DepartmentID: z.number().int().optional().describe("DepartmentID."),
  AccountManagerID: z.number().int().optional().describe("UserID of the Account Manager."),
  PartnerID: z.number().int().optional().describe("PartnerID."),
  ContactID: z.number().int().optional().describe("Customer ContactID."),
  InvoicingCustomerReferenceID: z.number().int().optional().describe("Customer reference ID on invoicing settings."),
  LanguageID: z.number().int().optional().describe("LanguageID used for the invoice."),
} as const;

// POST /task (main task) or POST /task/create-sub-task — TaskApiCreateModel (21
// fields). Setting ParentTaskID routes create_task to the sub-task endpoint.
export const createTaskShape = {
  ...modeField,
  ProjectID: z.number().int().optional().describe("ProjectID the task belongs to."),
  ParentTaskID: z
    .number()
    .int()
    .optional()
    .describe("If set, the task is created as a SUB-TASK of this TaskID (routes to /task/create-sub-task)."),
  TaskName: z.string().optional().describe("Task name."),
  TaskNo: z.string().optional().describe("Task number (WBS); usually auto-generated."),
  Description: z.string().optional().describe("Task description."),
  TaskTypeID: z.number().int().optional().describe("TaskTypeID — ydelsesfase (see list_task_types)."),
  StartDate: z.string().optional().describe("Start date, ISO 8601."),
  EndDate: z.string().optional().describe("End date, ISO 8601."),
  BudgetHours: z.number().optional().describe("Budgeted hours."),
  BudgetAmount: z.number().optional().describe("Budgeted amount."),
  HourlyRateID: z.number().int().optional().describe("HourlyRateID for the budget (see list_contract_hourly_rates)."),
  ProjectSubContractID: z.number().int().optional().describe("ContractID to link the task to (see list_contracts)."),
  IsBillable: z.boolean().optional().describe("Whether the task is billable."),
  IsReadyForInvoicing: z.boolean().optional().describe("Whether the task is ready for invoicing."),
  AdditionalTextIsRequired: z.boolean().optional().describe("Whether additional text is required on registration."),
  PaymentRecognitionModel: z
    .number()
    .int()
    .min(0)
    .max(2)
    .optional()
    .describe("PaymentRecognitionModel enum (0|1|2) — meaning unconfirmed; verify via the empirical gate."),
  PaymentAmount: z.number().optional().describe("Payment amount (TDR task)."),
  TaskHourlyRate: z.number().optional().describe("Hourly rate of a TDR task."),
  PaymentProductNo: z.string().optional().describe("Payment product no. (TDR task)."),
  PaymentName: z.string().optional().describe("Payment name (TDR task)."),
  PaymentInvoiceDate: z.string().optional().describe("Payment invoice date, ISO 8601 (TDR task)."),
} as const;

// Fields shared by both contract create models.
const contractCommon = {
  ...modeField,
  ProjectID: z.number().int().optional().describe("ProjectID the contract belongs to."),
  ContractName: z.string().optional().describe("Contract name."),
  ContractStatus: z
    .number()
    .int()
    .min(1)
    .max(4)
    .optional()
    .describe("ContractStatus enum (1|2|3|4) — labels unconfirmed; verify via the gate."),
  ContractOwnerUserID: z.number().int().optional().describe("UserID of the contract owner."),
  ContractTypeID: z
    .number()
    .int()
    .optional()
    .describe("ContractTypeID — no list endpoint exists; meaning resolved by the empirical gate."),
  BudgetWorkAmount: z.number().optional().describe("Budget work amount."),
  BudgetWorkHour: z.number().optional().describe("Budget work hours."),
  BudgetExpensesAmount: z.number().optional().describe("Budget expenses amount."),
  BudgetTravelAmount: z.number().optional().describe("Budget travel amount."),
  HasCompletionNotification: z.boolean().optional().describe("Whether the contract has completion notification."),
  CompletionNotificationPercentage: z.number().optional().describe("Completion notification percentage."),
  IsMileageBillable: z.boolean().optional().describe("Whether mileage is billable."),
  IsDefaultExpenses: z.boolean().optional().describe("Whether expenses are default."),
} as const;

// POST /contract/create-time-material-basic-contract — adds budget-overrun notification.
export const timeMaterialContractShape = {
  ...contractCommon,
  HasBudgetOverrunNotification: z.boolean().optional().describe("Whether the contract has budget-overrun notification."),
} as const;

// POST /contract/create-fixed-price-basic-contract — adds payment-plan / target-rate / revenue-distribution fields.
export const fixedPriceContractShape = {
  ...contractCommon,
  TargetHourlyRate: z.number().optional().describe("Target hourly rate."),
  PaymentPlanAmount: z.number().optional().describe("Payment-plan amount."),
  RevenueExprAmount: z.number().optional().describe("Revenue expr amount."),
  RevenueTravelAmount: z.number().optional().describe("Revenue travel amount."),
  IsExpensesLinked: z.boolean().optional().describe("Whether expenses are linked to revenue distribution."),
  IsTravelLinked: z.boolean().optional().describe("Whether travel is linked to revenue distribution."),
} as const;

// POST /payment — PaymentApiCreateModel. A payment is a payment-plan line on a contract.
export const createPaymentShape = {
  ...modeField,
  ProjectID: z.number().int().optional().describe("ProjectID the payment belongs to."),
  ProjectSubContractID: z.number().int().optional().describe("ContractID the payment is on (see list_contracts)."),
  TaskID: z.number().int().optional().describe("TaskID the payment is tied to (per-task revenue recognition)."),
  Name: z.string().optional().describe("Payment name."),
  Comment: z.string().optional().describe("Comment."),
  Amount: z.number().optional().describe("Payment amount."),
  InvoiceDate: z.string().optional().describe("Invoice date, ISO 8601."),
  IsReadyForInvoicing: z.boolean().optional().describe("Whether this payment is ready for invoicing."),
  IsFixedPricePayment: z.boolean().optional().describe("Whether the payment is fixed price."),
  ProductNumber: z.string().optional().describe("Product number."),
  DiscountPercentage: z.number().optional().describe("Discount percentage."),
  Quantity: z.number().optional().describe("Quantity."),
  UnitType: z
    .number()
    .int()
    .optional()
    .describe("UnitType enum (0,1,2,3,4,6,7,8,9) — labels unconfirmed; verify via the gate."),
} as const;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run test/constructionSchemas.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/constructionSchemas.ts test/constructionSchemas.test.ts
git commit -m "feat(schemas): add Phase 2 create-model Zod shapes with preview mode"
```

---

## Task 5: Preview/execute router (`runWrite`)

The shared heart of every write tool. Preview POSTs to the validate endpoint, never throws on a validation failure (it surfaces the failure as the outcome), and runs best-effort enrichment. Execute POSTs to the real create endpoint.

**Files:**
- Create: `src/tools/preview.ts`
- Test: `test/tools/preview.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/tools/preview.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { runWrite, bodyFromArgs } from "../../src/tools/preview.js";
import type { TimeLogClient } from "../../src/client.js";

describe("bodyFromArgs", () => {
  it("strips mode and drops undefined fields", () => {
    expect(bodyFromArgs({ mode: "execute", Name: "x", CustomerID: undefined, BudgetHours: 0 })).toEqual({
      Name: "x",
      BudgetHours: 0,
    });
  });
});

describe("runWrite", () => {
  const opts = (mode: "preview" | "execute") => ({
    mode,
    validatePath: "/project/validate-create-from-template",
    executePath: "/project/create-from-template",
    body: { Name: "API-TEST", ProjectTemplateID: 9 },
  });

  it("preview POSTs the validate endpoint and never the execute endpoint", async () => {
    const post = vi.fn(async () => ({ ok: true }));
    const client = { post } as unknown as TimeLogClient;

    const result = (await runWrite(client, opts("preview"))) as { mode: string; validation: { ok: boolean } };

    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith("/project/validate-create-from-template", { Name: "API-TEST", ProjectTemplateID: 9 });
    expect(result.mode).toBe("preview");
    expect(result.validation.ok).toBe(true);
  });

  it("preview surfaces a validation failure instead of throwing", async () => {
    const post = vi.fn(async () => {
      throw new Error("TimeLog API POST /project/validate-create-from-template failed: 400 {\"msg\":\"bad\"}");
    });
    const client = { post } as unknown as TimeLogClient;

    const result = (await runWrite(client, opts("preview"))) as { validation: { ok: boolean; error?: string } };

    expect(result.validation.ok).toBe(false);
    expect(result.validation.error).toMatch(/400/);
  });

  it("preview runs the summarizer but a summarizer failure does not fail the preview", async () => {
    const post = vi.fn(async () => ({ ok: true }));
    const summarize = vi.fn(async () => {
      throw new Error("enrichment lookup failed");
    });
    const client = { post } as unknown as TimeLogClient;

    const result = (await runWrite(client, { ...opts("preview"), summarize })) as { summary?: unknown };

    expect(summarize).toHaveBeenCalled();
    expect(result.summary).toBeUndefined();
  });

  it("execute POSTs the real create endpoint and returns its result", async () => {
    const post = vi.fn(async () => ({ ProjectID: 1234 }));
    const client = { post } as unknown as TimeLogClient;

    const result = await runWrite(client, opts("execute"));

    expect(post).toHaveBeenCalledWith("/project/create-from-template", { Name: "API-TEST", ProjectTemplateID: 9 });
    expect(result).toEqual({ ProjectID: 1234 });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run test/tools/preview.test.ts`
Expected: FAIL — cannot find module `../../src/tools/preview.js`.

- [ ] **Step 3: Implement the router**

Create `src/tools/preview.ts`:

```ts
import type { TimeLogClient } from "../client.js";

export type WriteMode = "preview" | "execute";

// A summarizer enriches the preview with display names; it is best-effort and its
// failure must never fail the preview.
export type Summarizer = (client: TimeLogClient, body: Record<string, unknown>) => Promise<Record<string, unknown>>;

export interface RunWriteOptions {
  mode: WriteMode;
  validatePath: string;
  executePath: string;
  body: Record<string, unknown>;
  summarize?: Summarizer;
}

// Build the POST body from tool args: drop the `mode` switch and any undefined fields.
export function bodyFromArgs(args: Record<string, unknown>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(args)) {
    if (k === "mode") continue;
    if (v !== undefined) body[k] = v;
  }
  return body;
}

export async function runWrite(client: TimeLogClient, opts: RunWriteOptions): Promise<unknown> {
  if (opts.mode === "execute") {
    return client.post(opts.executePath, opts.body);
  }
  // preview: hit the dry validate endpoint; surface failures rather than throwing.
  let validation: Record<string, unknown>;
  try {
    validation = { ok: true, response: await client.post(opts.validatePath, opts.body) };
  } catch (err) {
    validation = { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  let summary: Record<string, unknown> | undefined;
  if (opts.summarize) {
    try {
      summary = await opts.summarize(client, opts.body);
    } catch {
      summary = undefined; // enrichment is best-effort
    }
  }
  return { mode: "preview", validation, summary, payload: opts.body };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run test/tools/preview.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tools/preview.ts test/tools/preview.test.ts
git commit -m "feat(tools): add preview/execute router (runWrite) for Phase 2 writes"
```

---

## Task 6: Construction write tools

The 5 write tools. Each builds its body with `bodyFromArgs`, attaches a selective-enrichment summarizer, and delegates to `runWrite`. `create_task` routes to the sub-task endpoint when `ParentTaskID` is set; both routes preview against `validate-new-task`.

**Files:**
- Create: `src/tools/constructionWrites.ts`
- Test: `test/tools/constructionWrites.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/tools/constructionWrites.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { constructionWriteTools } from "../../src/tools/constructionWrites.js";
import type { TimeLogClient } from "../../src/client.js";

function byName(name: string) {
  const tool = constructionWriteTools.find((t) => t.name === name);
  if (!tool) throw new Error(`tool ${name} not found`);
  return tool;
}

describe("construction write tools", () => {
  it("exposes the five expected tools", () => {
    expect(constructionWriteTools.map((t) => t.name).sort()).toEqual(
      [
        "create_fixed_price_contract",
        "create_payment",
        "create_project_from_template",
        "create_task",
        "create_time_material_contract",
      ].sort(),
    );
  });

  it("create_project_from_template preview hits validate, never create", async () => {
    const post = vi.fn(async () => ({ ok: true }));
    const get = vi.fn(async () => ({ Entities: [] })); // enrichment lookups
    const client = { post, get } as unknown as TimeLogClient;

    await byName("create_project_from_template").handler(client, {
      mode: "preview",
      ProjectTemplateID: 9,
      Name: "API-TEST fastpris",
      CustomerID: 1100,
    });

    const postedPaths = post.mock.calls.map((c) => c[0]);
    expect(postedPaths).toContain("/project/validate-create-from-template");
    expect(postedPaths).not.toContain("/project/create-from-template");
  });

  it("create_project_from_template execute hits the create endpoint with the body (no mode)", async () => {
    const post = vi.fn(async () => ({ ProjectID: 555 }));
    const client = { post } as unknown as TimeLogClient;

    const result = await byName("create_project_from_template").handler(client, {
      mode: "execute",
      ProjectTemplateID: 9,
      Name: "API-TEST fastpris",
    });

    expect(post).toHaveBeenCalledWith("/project/create-from-template", {
      ProjectTemplateID: 9,
      Name: "API-TEST fastpris",
    });
    expect(result).toEqual({ ProjectID: 555 });
  });

  it("create_task with no ParentTaskID executes against /task", async () => {
    const post = vi.fn(async () => ({}));
    const client = { post } as unknown as TimeLogClient;

    await byName("create_task").handler(client, { mode: "execute", ProjectID: 7, TaskName: "Hovedopgave" });

    expect(post).toHaveBeenCalledWith("/task", { ProjectID: 7, TaskName: "Hovedopgave" });
  });

  it("create_task with ParentTaskID executes against /task/create-sub-task", async () => {
    const post = vi.fn(async () => ({}));
    const client = { post } as unknown as TimeLogClient;

    await byName("create_task").handler(client, {
      mode: "execute",
      ProjectID: 7,
      ParentTaskID: 42,
      TaskName: "Underopgave",
    });

    expect(post).toHaveBeenCalledWith("/task/create-sub-task", { ProjectID: 7, ParentTaskID: 42, TaskName: "Underopgave" });
  });

  it("create_task preview always validates against /task/validate-new-task (both routes)", async () => {
    const post = vi.fn(async () => ({ ok: true }));
    const get = vi.fn(async () => ({ Entities: [] }));
    const client = { post, get } as unknown as TimeLogClient;

    await byName("create_task").handler(client, { mode: "preview", ProjectID: 7, ParentTaskID: 42, TaskName: "Sub" });

    expect(post).toHaveBeenCalledWith("/task/validate-new-task", { ProjectID: 7, ParentTaskID: 42, TaskName: "Sub" });
    expect(post.mock.calls.map((c) => c[0])).not.toContain("/task/create-sub-task");
  });

  it("create_time_material_contract execute hits its create endpoint", async () => {
    const post = vi.fn(async () => ({}));
    const client = { post } as unknown as TimeLogClient;

    await byName("create_time_material_contract").handler(client, {
      mode: "execute",
      ProjectID: 7,
      ContractName: "T&M",
    });

    expect(post).toHaveBeenCalledWith("/contract/create-time-material-basic-contract", { ProjectID: 7, ContractName: "T&M" });
  });

  it("create_fixed_price_contract execute hits its create endpoint", async () => {
    const post = vi.fn(async () => ({}));
    const client = { post } as unknown as TimeLogClient;

    await byName("create_fixed_price_contract").handler(client, {
      mode: "execute",
      ProjectID: 7,
      ContractName: "Fastpris",
      PaymentPlanAmount: 100000,
    });

    expect(post).toHaveBeenCalledWith("/contract/create-fixed-price-basic-contract", {
      ProjectID: 7,
      ContractName: "Fastpris",
      PaymentPlanAmount: 100000,
    });
  });

  it("create_payment execute hits /payment", async () => {
    const post = vi.fn(async () => ({}));
    const client = { post } as unknown as TimeLogClient;

    await byName("create_payment").handler(client, {
      mode: "execute",
      ProjectSubContractID: 12,
      Name: "Rate 1",
      Amount: 40000,
    });

    expect(post).toHaveBeenCalledWith("/payment", { ProjectSubContractID: 12, Name: "Rate 1", Amount: 40000 });
  });

  it("defaults to preview when mode is omitted", async () => {
    const post = vi.fn(async () => ({ ok: true }));
    const get = vi.fn(async () => ({ Entities: [] }));
    const client = { post, get } as unknown as TimeLogClient;

    // The tool handler receives args already parsed by the SDK against inputSchema,
    // so mode is defaulted upstream; here we assert the handler treats a missing
    // mode as preview too (defensive).
    await byName("create_payment").handler(client, { ProjectSubContractID: 12, Name: "Rate 1", Amount: 40000 });

    expect(post).toHaveBeenCalledWith("/payment/validate-new-payment", expect.any(Object));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run test/tools/constructionWrites.test.ts`
Expected: FAIL — cannot find module `../../src/tools/constructionWrites.js`.

- [ ] **Step 3: Implement the write tools**

Create `src/tools/constructionWrites.ts`:

```ts
import type { ToolDef } from "./types.js";
import type { TimeLogClient } from "../client.js";
import { runWrite, bodyFromArgs, type WriteMode } from "./preview.js";
import { unwrapList } from "./unwrap.js";
import {
  createProjectFromTemplateShape,
  createTaskShape,
  timeMaterialContractShape,
  fixedPriceContractShape,
  createPaymentShape,
} from "../constructionSchemas.js";

// Missing mode is treated as preview (the SDK defaults it, but be defensive).
function modeOf(args: Record<string, unknown>): WriteMode {
  return args.mode === "execute" ? "execute" : "preview";
}

// --- selective enrichment helpers (best-effort; runWrite swallows their errors) ---

async function findById(
  client: TimeLogClient,
  path: string,
  idKey: string,
  id: unknown,
): Promise<Record<string, unknown> | undefined> {
  if (id === undefined || id === null) return undefined;
  const rows = unwrapList(await client.get(path, { $pagesize: 100 }));
  return rows.find((r) => Number(r[idKey]) === Number(id));
}

async function getOneName(client: TimeLogClient, path: string, nameKey: string): Promise<unknown> {
  const resp = (await client.get(path)) as { Properties?: Record<string, unknown> } | Record<string, unknown>;
  const p = ((resp as { Properties?: Record<string, unknown> })?.Properties ?? resp) as Record<string, unknown>;
  return p?.[nameKey];
}

export const constructionWriteTools: ToolDef[] = [
  {
    name: "create_project_from_template",
    description:
      "Create a project from a Project Template (preview-and-confirm). Provide ProjectTemplateID plus any overrides. mode=preview (default) validates and shows what would be created; mode=execute creates it. NOTE: to build a NEW template, scaffold a source project here and then save it as a template in TimeLog's UI — the API has no template-write endpoint.",
    inputSchema: createProjectFromTemplateShape,
    handler: (client, args) => {
      const body = bodyFromArgs(args);
      return runWrite(client, {
        mode: modeOf(args),
        validatePath: "/project/validate-create-from-template",
        executePath: "/project/create-from-template",
        body,
        summarize: async (c, b) => {
          const tpl = await findById(c, "/project-template/get-all", "ProjectTemplateID", b.ProjectTemplateID);
          const cust = await findById(c, "/customer", "CustomerID", b.CustomerID);
          return {
            template: tpl ? { id: b.ProjectTemplateID, name: tpl.Name } : b.ProjectTemplateID,
            customer: cust ? { id: b.CustomerID, name: cust.Name ?? cust.ShownName } : (b.CustomerID ?? "internal"),
            name: b.Name,
          };
        },
      });
    },
  },
  {
    name: "create_task",
    description:
      "Create a Task, or a Sub-task when ParentTaskID is set (preview-and-confirm). mode=preview (default) validates against validate-new-task; mode=execute creates against /task (main) or /task/create-sub-task (sub-task). One task per call — orchestrate a task tree in the conversation.",
    inputSchema: createTaskShape,
    handler: (client, args) => {
      const body = bodyFromArgs(args);
      const isSubTask = body.ParentTaskID !== undefined && body.ParentTaskID !== null;
      return runWrite(client, {
        mode: modeOf(args),
        validatePath: "/task/validate-new-task",
        executePath: isSubTask ? "/task/create-sub-task" : "/task",
        body,
        summarize: async (c, b) => {
          const tt = await findById(c, "/TaskType", "TaskTypeID", b.TaskTypeID);
          const summary: Record<string, unknown> = {
            task: b.TaskName,
            kind: isSubTask ? "sub-task" : "task",
            parentTaskID: b.ParentTaskID ?? null,
            taskType: tt ? { id: b.TaskTypeID, name: tt.Name } : b.TaskTypeID,
          };
          if (b.ProjectSubContractID !== undefined && b.ProjectSubContractID !== null) {
            summary.contract = {
              id: b.ProjectSubContractID,
              name: await getOneName(c, `/contract/${b.ProjectSubContractID}`, "Name"),
            };
          }
          return summary;
        },
      });
    },
  },
  {
    name: "create_time_material_contract",
    description:
      "Create a Time & Material (TimeMaterialBasic) contract on a project (preview-and-confirm). mode=preview (default) validates; mode=execute creates. For fixed-price use create_fixed_price_contract instead.",
    inputSchema: timeMaterialContractShape,
    handler: (client, args) => {
      const body = bodyFromArgs(args);
      return runWrite(client, {
        mode: modeOf(args),
        validatePath: "/contract/validate-time-material-basic-contract",
        executePath: "/contract/create-time-material-basic-contract",
        body,
        summarize: async (c, b) => ({
          contractModel: "TimeMaterialBasic",
          contractName: b.ContractName,
          project: { id: b.ProjectID, name: await getOneName(c, `/project/${b.ProjectID}`, "Name") },
        }),
      });
    },
  },
  {
    name: "create_fixed_price_contract",
    description:
      "Create a Fixed-Price (FixedPriceBasic) contract on a project (preview-and-confirm). Carries payment-plan/target-rate fields. mode=preview (default) validates; mode=execute creates. For T&M use create_time_material_contract instead.",
    inputSchema: fixedPriceContractShape,
    handler: (client, args) => {
      const body = bodyFromArgs(args);
      return runWrite(client, {
        mode: modeOf(args),
        validatePath: "/contract/validate-fixed-price-basic-contract",
        executePath: "/contract/create-fixed-price-basic-contract",
        body,
        summarize: async (c, b) => ({
          contractModel: "FixedPriceBasic",
          contractName: b.ContractName,
          project: { id: b.ProjectID, name: await getOneName(c, `/project/${b.ProjectID}`, "Name") },
        }),
      });
    },
  },
  {
    name: "create_payment",
    description:
      "Add a payment-plan line (Payment) to a contract (preview-and-confirm). ProjectSubContractID is the ContractID. mode=preview (default) validates against validate-new-payment; mode=execute creates. One payment per call.",
    inputSchema: createPaymentShape,
    handler: (client, args) => {
      const body = bodyFromArgs(args);
      return runWrite(client, {
        mode: modeOf(args),
        validatePath: "/payment/validate-new-payment",
        executePath: "/payment",
        body,
        summarize: async (c, b) => {
          const summary: Record<string, unknown> = { payment: b.Name, amount: b.Amount };
          if (b.ProjectSubContractID !== undefined && b.ProjectSubContractID !== null) {
            summary.contract = {
              id: b.ProjectSubContractID,
              name: await getOneName(c, `/contract/${b.ProjectSubContractID}`, "Name"),
            };
          }
          if (b.TaskID !== undefined && b.TaskID !== null) {
            summary.task = { id: b.TaskID, name: await getOneName(c, `/task/${b.TaskID}`, "TaskName") };
          }
          return summary;
        },
      });
    },
  },
];
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run test/tools/constructionWrites.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tools/constructionWrites.ts test/tools/constructionWrites.test.ts
git commit -m "feat(tools): add 5 Phase 2 construction write tools (preview/execute)"
```

---

## Task 7: Register the Phase 2 tools

**Files:**
- Modify: `src/registerTools.ts:1-8`
- Test: `test/registerTools.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/registerTools.test.ts`:

```ts
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

  it("has no duplicate tool names", () => {
    const names = allTools.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run test/registerTools.test.ts`
Expected: FAIL — Phase 2 tool names not found in `allTools`.

- [ ] **Step 3: Wire the new tool arrays into the registry**

Edit `src/registerTools.ts` lines 1-8 to import and concatenate the new arrays:

```ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TimeLogClient } from "./client.js";
import type { ToolDef } from "./tools/types.js";
import { projectReadTools } from "./tools/projectReads.js";
import { relationReadTools } from "./tools/relationReads.js";
import { projectWriteTools } from "./tools/projectWrites.js";
import { constructionReadTools } from "./tools/constructionReads.js";
import { constructionWriteTools } from "./tools/constructionWrites.js";

export const allTools: ToolDef[] = [
  ...projectReadTools,
  ...relationReadTools,
  ...projectWriteTools,
  ...constructionReadTools,
  ...constructionWriteTools,
];
```

(Leave the `registerTools` function below unchanged.)

- [ ] **Step 4: Run the test and the full suite**

Run: `npx vitest run test/registerTools.test.ts && npm test`
Expected: PASS — all tests green.

- [ ] **Step 5: Type-check the build**

Run: `npm run build`
Expected: `tsc` exits 0 with no errors.

- [ ] **Step 6: Commit**

```bash
git add src/registerTools.ts test/registerTools.test.ts
git commit -m "feat: register Phase 2 construction read and write tools"
```

---

## Task 8: Documentation — README capability table + save-as-template workflow

CONTEXT.md was already updated during grilling (the construction glossary terms and the "No template write" / "No DELETE" conventions). This task updates the README.

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Read the current README capability section**

Run: `cat README.md`
Note the existing capability table / "what it can and cannot do" section so the edit matches its format.

- [ ] **Step 2: Update the capability table**

In `README.md`, extend the capabilities to reflect Phase 2. Add (matching the existing table/list style):

```markdown
### Can now (Phase 2 — project construction)

- Create a project from a template (`create_project_from_template`).
- Add tasks and sub-tasks (`create_task`).
- Add Time & Material and Fixed-Price contracts (`create_time_material_contract`, `create_fixed_price_contract`).
- Add payment-plan lines to a contract (`create_payment`).
- Read the supporting data: templates, tasks, task types, contracts, payments, hourly rates.

Every write tool runs in **preview** mode by default — it validates and shows
exactly what would be created — and only writes when called again with
`mode: "execute"` after you confirm.

### Still cannot

- Delete anything — the API has no DELETE for projects, tasks, contracts, or
  payments. A mistaken create can only be neutralised by archiving the project.
- Create or edit **project templates** — the API exposes no template-write
  endpoint. To make a new template, build a source project with the tools above
  and then save it as a template in TimeLog's UI (see below).
- Touch time registrations, expenses, or invoicing.
- Book resources (planned for Phase 3).

### Building a new project template

The REST API cannot create or edit templates. The supported path is:

1. Use `create_project_from_template` (or an existing project) plus `create_task`
   and the contract tools to construct a project shaped exactly like the template
   you want.
2. In TimeLog's web UI, open that project and choose **Save as template**.
3. The new template then appears in `list_project_templates` for future use.
```

- [ ] **Step 3: Verify the README renders sensibly**

Run: `cat README.md`
Expected: the new sections are present and consistent with the existing tone; no broken Markdown.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: README Phase 2 capabilities + save-as-template-in-UI workflow"
```

---

## Task 9: Empirical gate — runbook + validate-exploration script

The minimized, validate-heavy gate. This is **manual** (run against the live account by the operator), not part of the automated suite. It produces field-binding knowledge that may later tighten the schemas.

**Files:**
- Create: `docs/runbooks/empirical-create-tests.md`
- Create: `test/manual/empirical-create-validate.mjs`

- [ ] **Step 1: Write the runbook**

Create `docs/runbooks/empirical-create-tests.md`:

```markdown
# Empirical gate — Phase 2 create endpoints

**Strategy (grill-with-docs, 2026-06-15): minimized, validate-heavy.** The API has
no DELETE; real creates are permanent and can only be neutralised by archiving.
So learn as much as possible from the **dry** `validate-*` calls, and do the bare
minimum of real (execute) creates — on an **internal, customer-less** project so
nothing reaches invoicing.

Run against the live account (`TIMELOG_BASE_URL` + a `TIMELOG_PAT`). There is no
sandbox.

## Step 0 — confirm validate-* is dry

For each of the 5 endpoints, POST a minimal body to its `validate-*` path, then
check the TimeLog UI: **nothing must be created.** The preview step depends on
this. Use `test/manual/empirical-create-validate.mjs` (below). Record the result.

| Endpoint | validate writes nothing? | Notes |
|---|---|---|
| project/validate-create-from-template | ☐ | |
| task/validate-new-task | ☐ | |
| contract/validate-time-material-basic-contract | ☐ | |
| contract/validate-fixed-price-basic-contract | ☐ | |
| payment/validate-new-payment | ☐ | |

## Step 1 — learn required fields from validation errors (dry)

For each endpoint, POST increasingly-empty bodies to `validate-*` and read the
error messages to discover which fields are actually required and how they bind.
Record findings below — these may later tighten `src/constructionSchemas.ts`.

| Endpoint | Fields validation insists on | Field-binding surprises |
|---|---|---|
| create-from-template | | |
| validate-new-task | | |
| TM contract | | |
| FP contract | | |
| payment | | |

Open questions to resolve here:
- **ContractTypeID** — what it refers to (no list endpoint exists).
- **PaymentRecognitionModel** (task enum 0|1|2) — what each value means.
- **ContractStatus** (1–4) and **UnitType** (payment) enum labels.

## Step 2 — minimal real creates (execute)

Only what validate cannot teach. On an **internal (no CustomerID)** project named
`API-TEST <date>`:

1. `create_project_from_template` (execute) from ONE template. Verify in the UI
   that tasks, sub-tasks, and contracts arrive from the template; record which API
   fields override template defaults vs. are ignored.
2. Optionally one `create_task` (execute) on that project to confirm task binding.
3. Create real contracts/payments **only if** Step 1 left their field binding
   genuinely unknown — otherwise rely on the validate findings.

## Step 3 — cleanup

Set every `API-TEST` project to Archived (status 5) or Cancelled (status 6) via
`update_project_status`. Note that archiving hides the project but does NOT delete
the contracts/payments underneath.

## Result log

_(fill in as the gate runs — date, who, outcome per row above)_
```

- [ ] **Step 2: Write the validate-exploration script**

Create `test/manual/empirical-create-validate.mjs` (mirrors the style of the existing `test/manual/*.mjs` — reads `TIMELOG_BASE_URL`/`TIMELOG_PAT` from env, uses `fetch`):

```js
// Dry exploration of the Phase 2 validate-* endpoints. Creates NOTHING (provided
// Step 0 of the runbook confirms validate is dry). Prints each validation outcome
// so you can learn required fields / binding from the errors.
//
// Usage (from repo root, PowerShell):
//   $env:TIMELOG_BASE_URL="https://app5.timelog.com/ingholtconsult2/api/v1"
//   $env:TIMELOG_PAT="<token>"
//   node test/manual/empirical-create-validate.mjs

const baseUrl = process.env.TIMELOG_BASE_URL?.replace(/\/+$/, "");
const pat = process.env.TIMELOG_PAT;
if (!baseUrl || !pat) {
  console.error("Set TIMELOG_BASE_URL and TIMELOG_PAT");
  process.exit(1);
}

async function validate(label, path, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${pat}`, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  console.log(`\n=== ${label} (${res.status}) ===`);
  console.log(text || "(empty body)");
}

// Progressively reveal required fields by sending near-empty bodies.
await validate("project: empty", "/project/validate-create-from-template", {});
await validate("project: template only", "/project/validate-create-from-template", { ProjectTemplateID: 0 });

await validate("task: empty", "/task/validate-new-task", {});
await validate("task: project only", "/task/validate-new-task", { ProjectID: 0 });

await validate("TM contract: empty", "/contract/validate-time-material-basic-contract", {});
await validate("FP contract: empty", "/contract/validate-fixed-price-basic-contract", {});

await validate("payment: empty", "/payment/validate-new-payment", {});

console.log("\nDone. Confirm in the TimeLog UI that nothing was created.");
```

- [ ] **Step 3: Verify the script parses (syntax only — no live call here)**

Run: `node --check test/manual/empirical-create-validate.mjs`
Expected: exits 0 (no syntax error). The operator runs the live exploration separately per the runbook.

- [ ] **Step 4: Commit**

```bash
git add docs/runbooks/empirical-create-tests.md test/manual/empirical-create-validate.mjs
git commit -m "docs: minimized empirical-gate runbook + validate-exploration script"
```

---

## Final verification

- [ ] **Run the whole suite**

Run: `npm test`
Expected: PASS — every test file green (client, config, server, project reads/writes, relation reads, unwrap, constructionReads, constructionSchemas, preview, constructionWrites, registerTools).

- [ ] **Type-check**

Run: `npm run build`
Expected: `tsc` exits 0.

- [ ] **Confirm the tool count**

In conversation, after connecting, the server should expose the Phase 1 tools plus 13 new Phase 2 tools (8 reads + 5 writes), all with `mode` defaulting to preview on the writes.

---

## Spec coverage check

| Spec requirement | Task |
|---|---|
| 5 write tools, preview/execute, default preview | Tasks 4, 5, 6 |
| `create_task` shares one model, routes via ParentTaskID | Task 6 |
| Two separate contract tools (differing field sets) | Tasks 4, 6 |
| 8 read tools with `$pagesize` paging + `Properties` unwrap | Tasks 2, 3 |
| Preview = validate-* call + structured summary with looked-up names (selective) | Tasks 5, 6 |
| Execute = real create, returns new resource | Tasks 5, 6 |
| Soft enforcement via tool descriptions | Task 6 (descriptions) |
| Body models from swagger (Project/Task/contracts/Payment) | Task 4 |
| New file layout (constructionReads/Writes, constructionSchemas) | Tasks 3, 4, 6 |
| Registration in registerTools.ts | Task 7 |
| TDD against mocked REST layer | Tasks 1–7 (tests) |
| Empirical gate as manual scripts in test/manual/ | Task 9 |
| New CONTEXT.md terms + conventions | Done during grilling |
| README capability table update | Task 8 |
| **Added during grilling:** template-write infeasible → scaffold + UI workflow | Tasks 6 (description), 8 (README), CONTEXT.md |
| **Added during grilling:** `client.post()` | Task 1 |
| **Added during grilling:** minimized empirical gate | Task 9 |
```

