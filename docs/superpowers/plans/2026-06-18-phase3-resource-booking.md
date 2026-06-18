# Phase 3 — Resource Booking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Execution deviations (2026-06-18, from the empirical gate):** (1) The capacity
> projection carries capacity only, not booked hours, so the `overbooking` flag was
> dropped — preview surfaces the booked Employee's capacity rows and the agent
> judges. (2) `employee-projection` is a paging TAFList that caps at 10 without
> `$pagesize`, so `get_employee_workload` pages (`$pagesize` 1000) and unwraps; a
> shared `fetchEmployeeProjection` helper serves both the read tool and the booking
> preview. (3) Allocation is **unresolved, not closed** — `/allocation` returns 405
> (route exists), so ADR 0007 defers it pending a non-GET probe rather than
> declaring it out of scope. Runbook: `docs/runbooks/empirical-book-workload.md`.

**Goal:** Add two MCP tools — `get_employee_workload` (read Employee Kapacitet/Arbejdsbyrde) and `book_workload` (create a Booking on a Task) — following the established Phase 1/2 patterns, with a synthetic capacity-based preview for the irreversible booking write.

**Architecture:** New `resourceReads.ts` / `resourceWrites.ts` tool modules plus a `resourceSchemas.ts` Zod shape, mirroring the construction modules. Because `POST /workload/book` has no `validate-*` twin, a new `runBooking` helper synthesises the preview by reading `employee-projection` instead of delegating to a validate endpoint (unlike `runWrite`). An empirical gate runs first to confirm the real field binding and booking semantics before the schema descriptions are locked.

**Tech Stack:** TypeScript (ESM, `.js` import specifiers), Zod, Vitest, `@modelcontextprotocol/sdk`. Live API: TimeLog REST v1.

## Global Constraints

- **Code in English, user-facing text (tool descriptions, notes) in Danish** — per CLAUDE.md and `docs/ubiquitous-language.md`.
- **Domain terms:** Booking (`BookWorkload`), Kapacitet/Capacity, Arbejdsbyrde/Workload — distinct from Allokering (Task budget). Use these exact terms in descriptions.
- **One resource per call, no bulk** (ADR 0003) — `book_workload` books one Booking; multiple bookings are orchestrated in conversation.
- **Default to preview** (ADR 0004) — every write tool's `mode` defaults to `"preview"`.
- **Preview surfaces only what the agent does not already hold** (ADR 0006) — capacity is new info and IS surfaced; Task/Employee names are NOT re-resolved.
- **Trust the empirical gate, not the swagger** — required fields and enums come from live HATEOAS `Actions[].Fields[].Enums` / validation behaviour, not swagger `required` lists.
- **Field casing is `EmployeeId` / `TaskId`** (lowercase `d`) on the booking model — unlike the `...ID` convention elsewhere. Preserve verbatim; the gate confirms.
- **No DELETE / no undo** for a Booking — the preview note must make this unmistakable.
- **`npm`/`npx`/`node` runs happen from the controller**, not subagents (memory: subagent-npx-restriction). Build = `npm run build`, tests = `npx vitest run <path>`.
- **Live/empirical calls** target test project **1034 "TEST Aggersvolg Gods"** (CustomerID 1100); base URL `https://app5.timelog.com/ingholtconsult2/api/v1` via `TIMELOG_BASE_URL` + `TIMELOG_PAT`. DKK = CurrencyID 35.
- **Branch:** `phase3-resource-booking` (already created; the design spec is committed there).

---

### Task 1: Empirical gate for `/workload/book` (manual investigation)

This is a live investigation, not a TDD task. It writes findings into a runbook so the schema descriptions in Task 2 are grounded, exactly as Phase 2 did (`docs/runbooks/empirical-create-tests.md`). Run from the controller.

**Files:**
- Create: `test/manual/empirical-book-workload.mjs`
- Create: `docs/runbooks/empirical-book-workload.md`

**Interfaces:**
- Produces (for later tasks): the confirmed required-field list, the `Hours`-over-period semantics, the 200-vs-202 behaviour, and a yes/no on whether any Allokering endpoint exists. Task 2 folds these into schema descriptions; Task 7 records them in CONTEXT.md / ADR 0007.

- [ ] **Step 1: Write the exploration script**

Create `test/manual/empirical-book-workload.mjs`:

```js
// Dry/careful exploration of POST /workload/book and GET /employee-projection.
// /workload/book has NO validate-* twin and NO DELETE, so this does the MINIMUM:
// it first reads (employee-projection — safe), then probes /workload/book with
// near-empty bodies to learn required fields from the error messages, and only
// at the very end (guarded behind DO_REAL_BOOKING=1) creates ONE real booking on
// test project 1034 that must then be removed manually in the UI.
//
// Usage (from repo root, PowerShell):
//   $env:TIMELOG_BASE_URL="https://app5.timelog.com/ingholtconsult2/api/v1"
//   $env:TIMELOG_PAT="<token>"
//   node test/manual/empirical-book-workload.mjs
//   # then, only when ready for the single real write:
//   $env:DO_REAL_BOOKING="1"; node test/manual/empirical-book-workload.mjs

const baseUrl = process.env.TIMELOG_BASE_URL?.replace(/\/+$/, "");
const pat = process.env.TIMELOG_PAT;
if (!baseUrl || !pat) {
  console.error("Set TIMELOG_BASE_URL and TIMELOG_PAT");
  process.exit(1);
}
const headers = { Authorization: `Bearer ${pat}`, "content-type": "application/json", accept: "application/json" };

async function call(label, method, path, { query, body } = {}) {
  let url = `${baseUrl}${path}`;
  if (query) {
    const qs = Object.entries(query).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&");
    if (qs) url += `?${qs}`;
  }
  const res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  console.log(`\n=== ${label} (${res.status}) ===`);
  console.log(text ? text.slice(0, 4000) : "(empty body)");
  return { status: res.status, text };
}

// 1. Read capacity — safe, learns the projection response shape.
await call("projection: period (all employees)", "GET", "/employee-projection/get-in-period", {
  query: { startDate: "2026-06-22T00:00:00", endDate: "2026-06-26T00:00:00", includeAllEmployees: true },
});

// 2. Learn /workload/book required fields from progressively-empty bodies.
//    These are EXPECTED to 4xx/5xx and write nothing — confirm in the UI afterwards.
await call("book: empty", "POST", "/workload/book", { body: {} });
await call("book: ids only", "POST", "/workload/book", { body: { EmployeeId: 0, TaskId: 0 } });

// 3. HATEOAS: read any list/get that exposes the workload 'Actions' (field/enum source).
await call("book: GET probe for Actions", "GET", "/workload", {});

// 4. Probe whether Allocation has any route (stub hypothesis).
await call("allocation probe", "GET", "/allocation", {});

// 5. ONE real booking — only when explicitly enabled. Remove it manually in the UI.
if (process.env.DO_REAL_BOOKING === "1") {
  await call("book: REAL (task on project 1034)", "POST", "/workload/book", {
    body: { EmployeeId: 0 /* set a real UserID */, TaskId: 0 /* set a real TaskID on 1034 */, Hours: 1, StartDate: "2026-06-22T00:00:00", EndDate: "2026-06-22T00:00:00" },
  });
  await call("projection: AFTER booking", "GET", "/employee-projection/get-in-period", {
    query: { startDate: "2026-06-22T00:00:00", endDate: "2026-06-26T00:00:00", includeAllEmployees: true },
  });
}

console.log("\nDone. Confirm in the TimeLog UI what (if anything) was created, and remove any real booking manually.");
```

- [ ] **Step 2: Run the read + dry probes (no real write)**

Run (from the controller, PowerShell):
```
$env:TIMELOG_BASE_URL="https://app5.timelog.com/ingholtconsult2/api/v1"; $env:TIMELOG_PAT="<token>"; node test/manual/empirical-book-workload.mjs
```
Expected: the projection call returns 200 with a body; the empty `/workload/book` calls return 4xx/5xx error text naming missing fields; the `/allocation` probe returns 404/empty (supporting the stub hypothesis).

- [ ] **Step 3: Inspect the projection response shape**

From the Step 2 output, record: is `employee-projection/get-in-period` a single object, a plain array, or a TAFList (`{ Entities: [...] }`)? Note the per-row fields (e.g. `UserID`, `Date`, `NormalWorkingHours`). This decides whether `get_employee_workload` passes the body through raw (Task 4).

- [ ] **Step 4: (Optional) run ONE real booking and confirm it lands**

Only if Step 2 left the required fields or `Hours`-semantics genuinely unknown. Edit the script's real-booking body with a real `UserID` and a real in-progress `TaskID` on project 1034, then:
```
$env:DO_REAL_BOOKING="1"; node test/manual/empirical-book-workload.mjs
```
Compare the "before" and "after" projection output to see whether `Hours` spread across the date range or landed on the start day. Then **remove the booking manually in the Resource Planner UI** (no API DELETE exists).

- [ ] **Step 5: Write the runbook result log**

Create `docs/runbooks/empirical-book-workload.md` with: (a) the dry-probe required-field findings for `/workload/book`, (b) the projection response shape, (c) the `Hours`-over-period semantics, (d) 200-vs-202 behaviour, (e) the Allokering yes/no conclusion. Mirror the structure of `empirical-create-tests.md` (tables + a dated result log).

- [ ] **Step 6: Commit**

```bash
git add test/manual/empirical-book-workload.mjs docs/runbooks/empirical-book-workload.md
git commit -m "test+docs: empirical gate for /workload/book (findings recorded)"
```

---

### Task 2: `book_workload` Zod schema

**Files:**
- Create: `src/resourceSchemas.ts`
- Test: `test/resourceSchemas.test.ts`

**Interfaces:**
- Consumes: `modeField` from `src/constructionSchemas.ts` (the shared preview/execute switch).
- Produces: `bookWorkloadShape` (a `z.ZodRawShape`) — fields `mode`, `EmployeeId`, `TaskId`, `Hours`, `StartDate`, `EndDate`. Consumed by Task 5.

- [ ] **Step 1: Write the failing test**

Create `test/resourceSchemas.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/resourceSchemas.test.ts`
Expected: FAIL — cannot import `bookWorkloadShape` from `../src/resourceSchemas.js`.

- [ ] **Step 3: Write the schema**

Create `src/resourceSchemas.ts`:

```ts
import { z } from "zod";
import { modeField } from "./constructionSchemas.js";

// POST /workload/book — WorkloadApiCreateModel. A Booking places hours for an
// Employee on a Task across a period; it feeds the Resource Planner
// (Ressourceplanlæggeren) and is DISTINCT from Allokering (a Task's budget hours).
// NOTE: this endpoint has NO validate-* twin and NO DELETE — see runBooking and
// ADR 0007. Field names use the EmployeeId / TaskId casing the booking model uses
// (not the ...ID convention). Required fields + the Hours-over-period semantics are
// confirmed by the empirical gate (docs/runbooks/empirical-book-workload.md).
export const bookWorkloadShape = {
  ...modeField,
  EmployeeId: z.number().int().describe("UserID of the Employee (Medarbejder) to book (see list_users). Required."),
  TaskId: z.number().int().describe("TaskID to book hours on (see list_tasks). Required — the Opgave must accept time (status 'I gang', not a summation task)."),
  Hours: z.number().describe("Hours (timer) to book across the period. Required."),
  StartDate: z.string().describe("Booking start date, ISO 8601 (e.g. 2026-06-22T00:00:00). Required."),
  EndDate: z.string().describe("Booking end date, ISO 8601. Required."),
} as const;
```

After the gate (Task 1): reconcile the required/optional status and the `Hours` description with the runbook findings (e.g. clarify whether `Hours` spreads across the range or lands on the start day).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/resourceSchemas.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/resourceSchemas.ts test/resourceSchemas.test.ts
git commit -m "feat: book_workload Zod schema (resourceSchemas)"
```

---

### Task 3: `runBooking` synthetic-preview helper

**Files:**
- Modify: `src/tools/preview.ts` (add `runBooking` + `RunBookingOptions`; reuse existing `WriteMode` / `bodyFromArgs`)
- Test: `test/tools/preview.test.ts` (add a `runBooking` describe block)

**Interfaces:**
- Consumes: `TimeLogClient` (`post`, `get`), `WriteMode` (existing in this file).
- Produces:
  - `interface RunBookingOptions { mode: WriteMode; bookPath: string; body: Record<string, unknown>; previewCapacity: () => Promise<unknown>; }`
  - `runBooking(client: TimeLogClient, opts: RunBookingOptions): Promise<unknown>` — execute → `client.post(bookPath, body)`; preview → `{ mode: "preview", capacity, note, payload }` where `capacity` is `{ ok: true, projection }` or `{ ok: false, error }`. Consumed by Task 5.

- [ ] **Step 1: Write the failing test**

Append to `test/tools/preview.test.ts`:

```ts
import { runBooking } from "../../src/tools/preview.js";

describe("runBooking", () => {
  const baseOpts = (mode: "preview" | "execute") => ({
    mode,
    bookPath: "/workload/book",
    body: { EmployeeId: 12, TaskId: 34, Hours: 8, StartDate: "2026-06-22T00:00:00", EndDate: "2026-06-26T00:00:00" },
    previewCapacity: async () => ({ Entities: [{ Properties: { UserID: 12, NormalWorkingHours: 7.5 } }] }),
  });

  it("preview fetches capacity, never posts to the book endpoint, and echoes the payload", async () => {
    const post = vi.fn(async () => ({}));
    const client = { post } as unknown as TimeLogClient;
    const cap = vi.fn(baseOpts("preview").previewCapacity);

    const result = (await runBooking(client, { ...baseOpts("preview"), previewCapacity: cap })) as {
      mode: string; capacity: { ok: boolean }; note: string; payload: Record<string, unknown>;
    };

    expect(post).not.toHaveBeenCalled();
    expect(cap).toHaveBeenCalledTimes(1);
    expect(result.mode).toBe("preview");
    expect(result.capacity.ok).toBe(true);
    expect(result.note).toMatch(/fortrydes/i);
    expect(result.payload).toEqual(baseOpts("preview").body);
  });

  it("preview surfaces a capacity-read failure instead of throwing", async () => {
    const post = vi.fn(async () => ({}));
    const client = { post } as unknown as TimeLogClient;
    const cap = async () => { throw new Error("TimeLog API GET /employee-projection/get-in-period failed: 500"); };

    const result = (await runBooking(client, { ...baseOpts("preview"), previewCapacity: cap })) as {
      capacity: { ok: boolean; error?: string };
    };

    expect(result.capacity.ok).toBe(false);
    expect(result.capacity.error).toMatch(/500/);
  });

  it("execute posts to the book endpoint and returns its result", async () => {
    const post = vi.fn(async () => ({ accepted: true }));
    const client = { post } as unknown as TimeLogClient;

    const result = await runBooking(client, baseOpts("execute"));

    expect(post).toHaveBeenCalledWith("/workload/book", baseOpts("execute").body);
    expect(result).toEqual({ accepted: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/tools/preview.test.ts`
Expected: FAIL — `runBooking` is not exported.

- [ ] **Step 3: Implement `runBooking`**

Append to `src/tools/preview.ts`:

```ts
export interface RunBookingOptions {
  mode: WriteMode;
  bookPath: string;
  body: Record<string, unknown>;
  // Synthetic-preview source: read capacity for the period. /workload/book has no
  // validate-* twin (see ADR 0007), so preview surfaces capacity instead — the one
  // "dry" signal the API offers. It does NOT re-resolve Task/Employee names (ADR 0006).
  previewCapacity: () => Promise<unknown>;
}

const BOOKING_IRREVERSIBLE_NOTE =
  "En Booking kan IKKE fortrydes via API'et — der er ingen DELETE. Bekræft før du kører execute.";

export async function runBooking(client: TimeLogClient, opts: RunBookingOptions): Promise<unknown> {
  if (opts.mode === "execute") {
    return client.post(opts.bookPath, opts.body);
  }
  // preview: read capacity for the period; surface failures rather than throwing.
  let capacity: Record<string, unknown>;
  try {
    capacity = { ok: true, projection: await opts.previewCapacity() };
  } catch (err) {
    capacity = { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  return { mode: "preview", capacity, note: BOOKING_IRREVERSIBLE_NOTE, payload: opts.body };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/tools/preview.test.ts`
Expected: PASS (existing `bodyFromArgs`/`runWrite` tests + 3 new `runBooking` tests).

- [ ] **Step 5: Commit**

```bash
git add src/tools/preview.ts test/tools/preview.test.ts
git commit -m "feat: runBooking synthetic-preview helper (capacity-based, no validate twin)"
```

---

### Task 4: `get_employee_workload` read tool

**Files:**
- Create: `src/tools/resourceReads.ts`
- Test: `test/tools/resourceReads.test.ts`

**Interfaces:**
- Consumes: `TimeLogClient` (`get`), `ToolDef`.
- Produces: `resourceReadTools: ToolDef[]` containing `get_employee_workload`. Consumed by Task 6.

- [ ] **Step 1: Write the failing test**

Create `test/tools/resourceReads.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { resourceReadTools } from "../../src/tools/resourceReads.js";
import type { TimeLogClient } from "../../src/client.js";

function byName(name: string) {
  const tool = resourceReadTools.find((t) => t.name === name);
  if (!tool) throw new Error(`tool ${name} not found`);
  return tool;
}

describe("resource read tools", () => {
  it("exposes get_employee_workload", () => {
    expect(resourceReadTools.map((t) => t.name)).toEqual(["get_employee_workload"]);
  });

  it("get_employee_workload calls employee-projection with the period params and returns the raw body", async () => {
    const raw = { Entities: [{ Properties: { UserID: 12, NormalWorkingHours: 7.5 } }] };
    const get = vi.fn(async () => raw);
    const client = { get } as unknown as TimeLogClient;

    const result = await byName("get_employee_workload").handler(client, {
      startDate: "2026-06-22T00:00:00",
      endDate: "2026-06-26T00:00:00",
      includeAllEmployees: true,
    });

    expect(get).toHaveBeenCalledWith("/employee-projection/get-in-period", {
      startDate: "2026-06-22T00:00:00",
      endDate: "2026-06-26T00:00:00",
      includeAllEmployees: true,
    });
    expect(result).toEqual(raw);
  });

  it("get_employee_workload omits includeAllEmployees when not given", async () => {
    const get = vi.fn(async () => ({}));
    const client = { get } as unknown as TimeLogClient;

    await byName("get_employee_workload").handler(client, {
      startDate: "2026-06-22T00:00:00",
      endDate: "2026-06-26T00:00:00",
    });

    expect(get).toHaveBeenCalledWith("/employee-projection/get-in-period", {
      startDate: "2026-06-22T00:00:00",
      endDate: "2026-06-26T00:00:00",
      includeAllEmployees: undefined,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/tools/resourceReads.test.ts`
Expected: FAIL — cannot import `resourceReadTools`.

- [ ] **Step 3: Implement the read tool**

Create `src/tools/resourceReads.ts`:

```ts
import { z } from "zod";
import type { ToolDef } from "./types.js";

// GET /employee-projection/get-in-period returns Kapacitet/Arbejdsbyrde per
// Employee per day for the period. The response is passed through verbatim: the
// exact shape (single object vs TAFList) is confirmed by the empirical gate
// (docs/runbooks/empirical-book-workload.md); passing it raw avoids unwrapList
// silently returning [] on an unexpected shape.
export const resourceReadTools: ToolDef[] = [
  {
    name: "get_employee_workload",
    description:
      "List Employees' Kapacitet/Arbejdsbyrde (normal arbejdstid vs. planlagt arbejde) over a period (GET /employee-projection/get-in-period). Use to find who has free Kapacitet, e.g. 'hvem er ledig i uge 30?'. Returns the raw TimeLog projection.",
    inputSchema: {
      startDate: z.string().describe("Period start, ISO 8601 (e.g. 2026-06-22T00:00:00)."),
      endDate: z.string().describe("Period end, ISO 8601."),
      includeAllEmployees: z
        .boolean()
        .optional()
        .describe("If true, include all Employees; otherwise only those assigned in the period."),
    },
    handler: (client, args) =>
      client.get("/employee-projection/get-in-period", {
        startDate: args.startDate as string,
        endDate: args.endDate as string,
        includeAllEmployees: args.includeAllEmployees as boolean | undefined,
      }),
  },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/tools/resourceReads.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/tools/resourceReads.ts test/tools/resourceReads.test.ts
git commit -m "feat: get_employee_workload read tool (employee-projection)"
```

---

### Task 5: `book_workload` write tool

**Files:**
- Create: `src/tools/resourceWrites.ts`
- Test: `test/tools/resourceWrites.test.ts`

**Interfaces:**
- Consumes: `bookWorkloadShape` (Task 2), `runBooking` + `bodyFromArgs` + `WriteMode` (Task 3 / existing `preview.ts`), `ToolDef`.
- Produces: `resourceWriteTools: ToolDef[]` containing `book_workload`. Consumed by Task 6.

- [ ] **Step 1: Write the failing test**

Create `test/tools/resourceWrites.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { resourceWriteTools } from "../../src/tools/resourceWrites.js";
import type { TimeLogClient } from "../../src/client.js";

function byName(name: string) {
  const tool = resourceWriteTools.find((t) => t.name === name);
  if (!tool) throw new Error(`tool ${name} not found`);
  return tool;
}

const fullArgs = (mode: string) => ({
  mode,
  EmployeeId: 12,
  TaskId: 34,
  Hours: 8,
  StartDate: "2026-06-22T00:00:00",
  EndDate: "2026-06-26T00:00:00",
});

describe("resource write tools", () => {
  it("exposes book_workload", () => {
    expect(resourceWriteTools.map((t) => t.name)).toEqual(["book_workload"]);
  });

  it("preview reads employee-projection for the period and never posts the booking", async () => {
    const post = vi.fn(async () => ({}));
    const get = vi.fn(async () => ({ Entities: [] }));
    const client = { post, get } as unknown as TimeLogClient;

    const result = (await byName("book_workload").handler(client, fullArgs("preview"))) as {
      mode: string; payload: Record<string, unknown>;
    };

    expect(post).not.toHaveBeenCalled();
    expect(get).toHaveBeenCalledWith("/employee-projection/get-in-period", {
      startDate: "2026-06-22T00:00:00",
      endDate: "2026-06-26T00:00:00",
      includeAllEmployees: true,
    });
    expect(result.mode).toBe("preview");
    expect(result.payload).toEqual({
      EmployeeId: 12, TaskId: 34, Hours: 8, StartDate: "2026-06-22T00:00:00", EndDate: "2026-06-26T00:00:00",
    });
  });

  it("execute posts the booking body (no mode) to /workload/book", async () => {
    const post = vi.fn(async () => ({ accepted: true }));
    const get = vi.fn();
    const client = { post, get } as unknown as TimeLogClient;

    const result = await byName("book_workload").handler(client, fullArgs("execute"));

    expect(post).toHaveBeenCalledWith("/workload/book", {
      EmployeeId: 12, TaskId: 34, Hours: 8, StartDate: "2026-06-22T00:00:00", EndDate: "2026-06-26T00:00:00",
    });
    expect(get).not.toHaveBeenCalled();
    expect(result).toEqual({ accepted: true });
  });

  it("defaults to preview when mode is omitted", async () => {
    const post = vi.fn(async () => ({}));
    const get = vi.fn(async () => ({}));
    const client = { post, get } as unknown as TimeLogClient;

    const { mode, ...noMode } = fullArgs("preview");
    await byName("book_workload").handler(client, noMode);

    expect(post).not.toHaveBeenCalled();
    expect(get).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/tools/resourceWrites.test.ts`
Expected: FAIL — cannot import `resourceWriteTools`.

- [ ] **Step 3: Implement the write tool**

Create `src/tools/resourceWrites.ts`:

```ts
import type { ToolDef } from "./types.js";
import { runBooking, bodyFromArgs, type WriteMode } from "./preview.js";
import { bookWorkloadShape } from "../resourceSchemas.js";

// Missing mode is treated as preview (the SDK defaults it, but be defensive).
function modeOf(args: Record<string, unknown>): WriteMode {
  return args.mode === "execute" ? "execute" : "preview";
}

export const resourceWriteTools: ToolDef[] = [
  {
    name: "book_workload",
    description:
      "Book hours for an Employee (Medarbejder) on a Task (Opgave) over a period — a Booking in the Ressourceplanlægger (preview-and-confirm). mode=preview (default) writes NOTHING; it reads the Employee's Kapacitet/Arbejdsbyrde for the period and returns it plus the exact payload and a warning that a Booking CANNOT be undone via the API. mode=execute creates the Booking (POST /workload/book) — this may answer asynchronously (202), so a successful call does not guarantee the Booking is already visible. One Booking per call. NOTE: this is a Booking, distinct from Allokering (a Task's budget hours).",
    inputSchema: bookWorkloadShape,
    handler: (client, args) => {
      const body = bodyFromArgs(args);
      return runBooking(client, {
        mode: modeOf(args),
        bookPath: "/workload/book",
        body,
        previewCapacity: () =>
          client.get("/employee-projection/get-in-period", {
            startDate: body.StartDate as string,
            endDate: body.EndDate as string,
            includeAllEmployees: true,
          }),
      });
    },
  },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/tools/resourceWrites.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/tools/resourceWrites.ts test/tools/resourceWrites.test.ts
git commit -m "feat: book_workload write tool (synthetic capacity preview + execute)"
```

---

### Task 6: Register the new tools

**Files:**
- Modify: `src/registerTools.ts`
- Modify: `test/registerTools.test.ts`

**Interfaces:**
- Consumes: `resourceReadTools` (Task 4), `resourceWriteTools` (Task 5).
- Produces: both tool sets included in `allTools`.

- [ ] **Step 1: Write the failing test**

In `test/registerTools.test.ts`, add a new `it` block inside the `describe("allTools registry", ...)`:

```ts
  it("includes the Phase 3 resource tools", () => {
    const names = allTools.map((t) => t.name);
    for (const expected of ["get_employee_workload", "book_workload"]) {
      expect(names).toContain(expected);
    }
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/registerTools.test.ts`
Expected: FAIL — `allTools` does not contain `get_employee_workload` / `book_workload`.

- [ ] **Step 3: Wire the tools into the registry**

Edit `src/registerTools.ts`. Add the imports after the existing construction imports:

```ts
import { resourceReadTools } from "./tools/resourceReads.js";
import { resourceWriteTools } from "./tools/resourceWrites.js";
```

And extend the `allTools` array:

```ts
export const allTools: ToolDef[] = [
  ...projectReadTools,
  ...relationReadTools,
  ...projectWriteTools,
  ...constructionReadTools,
  ...constructionWriteTools,
  ...resourceReadTools,
  ...resourceWriteTools,
];
```

- [ ] **Step 4: Run the full suite**

Run: `npx vitest run`
Expected: PASS — all tests, including the new Phase 3 ones and the existing `has no duplicate tool names` check.

- [ ] **Step 5: Build to confirm types**

Run: `npm run build`
Expected: `tsc` exits 0, no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/registerTools.ts test/registerTools.test.ts
git commit -m "feat: register Phase 3 resource tools (get_employee_workload, book_workload)"
```

---

### Task 7: Documentation (CONTEXT.md, README, ADR 0007, runbook close-out)

**Files:**
- Modify: `CONTEXT.md` (new domain terms + an API-conventions note)
- Modify: `README.md` (capabilities table)
- Create: `docs/adr/0007-booking-no-validate-no-undo-allocation-out.md`
- Modify: `docs/runbooks/empirical-book-workload.md` (mark gate complete)

**Interfaces:**
- Consumes: the empirical findings from Task 1.

- [ ] **Step 1: Add domain terms to CONTEXT.md**

In `CONTEXT.md`, under the domain glossary, add entries for **Booking** (`/workload/book`; `EmployeeId`/`TaskId`/`Hours`/`StartDate`/`EndDate`; distinct from Allocation), **Workload/Capacity** (`employee-projection/get-in-period`), and an explicit note that **Allocation** (Employee→Task hours beyond the Task budget) has no v1 write endpoint (per the gate). Match the existing entry style.

- [ ] **Step 2: Add the API-conventions note to CONTEXT.md**

Under "API conventions", add a note mirroring "No template write" / "No DELETE":

> **No booking validate / no booking undo.** `POST /workload/book` has no paired
> `validate-*` endpoint and no DELETE — a Booking cannot be previewed dry or undone
> via the API. The `book_workload` preview is therefore *synthesised* from
> `GET /employee-projection/get-in-period` (capacity for the period); it surfaces
> capacity, not a server-computed verdict, consistent with ADR 0006. A mistaken
> Booking can only be removed manually in the Resource Planner UI.

- [ ] **Step 3: Write ADR 0007**

Create `docs/adr/0007-booking-no-validate-no-undo-allocation-out.md` recording: (a) `/workload/book` has no validate twin and no undo → synthetic capacity preview via `runBooking` (not `runWrite`); (b) preview surfaces capacity only, no name enrichment (consistent with ADR 0006); (c) pure Allokering is out of scope because it has no v1 endpoint (the gate confirmed the `AllocationController` stub), closed the same way template-write was — re-argue from scratch if a need appears. Follow the format of `docs/adr/0006-*.md`.

- [ ] **Step 4: Update the README capabilities table**

In `README.md`, update the title to "Phases 1–3", move "Book resources / allocate (planned for Phase 3)" out of the **Cannot** column, and add **Can** rows: "Read Employee Kapacitet/Arbejdsbyrde over a period (`get_employee_workload`)" and "Book hours for an Employee on a Task (`book_workload`, synthetic preview)". Add **Cannot** rows: "Undo a Booking (no DELETE)" and "Allokere an Employee to a Task beyond the Task budget (no v1 endpoint)". Adjust the preview paragraph to note that `book_workload` previews via a capacity read, not a `validate-*` endpoint.

- [ ] **Step 5: Mark the runbook gate complete**

In `docs/runbooks/empirical-book-workload.md`, add a dated "Gate outcome" line summarising the confirmed required fields, `Hours` semantics, 200/202 behaviour, and the Allokering conclusion.

- [ ] **Step 6: Commit**

```bash
git add CONTEXT.md README.md docs/adr/0007-booking-no-validate-no-undo-allocation-out.md docs/runbooks/empirical-book-workload.md
git commit -m "docs: Phase 3 terms, ADR 0007 (booking no-validate/no-undo, allocation out), README"
```

---

## Self-Review

**Spec coverage:**
- `get_employee_workload` read → Task 4. ✅
- `book_workload` write + synthetic preview → Tasks 2, 3, 5. ✅
- `runBooking` separate from `runWrite` → Task 3. ✅
- ADR 0006 reconciliation (capacity yes, name enrichment no) → Task 3 (`previewCapacity` only; no name lookups) + ADR 0007 (Task 7). ✅
- Empirical gate before schema lock → Task 1 precedes Task 2; Task 2 Step 3 reconciles descriptions with findings. ✅
- 202 async honesty → tool description (Task 5) + execute returns raw result; runbook records behaviour (Task 1/7). ✅
- Allokering out of scope (hypothesis → confirmed) → Task 1 probe + ADR 0007 (Task 7). ✅
- One-per-call / preview default / Danish UI text → enforced in schema (`modeField`) and descriptions. ✅
- Docs (CONTEXT terms, API note, README, ADR) → Task 7. ✅

**Refinement flagged for the owner:** the spec promised `overbooking: <yes/no>` in the preview. The plan instead surfaces the raw capacity **projection** + payload + irreversibility note, leaving the overbooking judgement to the agent in conversation. Rationale: the projection shape is gate-dependent, and surfacing the data (not a server-computed verdict) is the more ADR-0006-consistent choice. Confirm this is acceptable, or add a small `summariseCapacity(projection, requestedHours)` step after Task 1 once the shape is known.

**Placeholder scan:** no TBD/TODO; every code step shows full content. The only deferred items are explicit gate reconciliations (Task 2 Step 3, Task 7), each pointing at a concrete source (the runbook), not vague "handle later".

**Type consistency:** `runBooking` / `RunBookingOptions` (Task 3) match their use in Task 5; `bookWorkloadShape` fields (Task 2) match the bodies asserted in Tasks 3/5; `EmployeeId`/`TaskId` casing consistent throughout; `resourceReadTools` / `resourceWriteTools` names match Task 6's imports.
