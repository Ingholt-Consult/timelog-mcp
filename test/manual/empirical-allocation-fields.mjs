// Probe the field set of POST /allocation's `allocationCreateModel` WITHOUT writing.
//
// Dry round 2 (2026-06-19) established the route exists: POST /allocation → 400
// FluentValidation, echoing `allocationCreateModel: {"UserId":0,"TaskId":0}`,
// requiring UserId + TaskId. GET/PUT are 405 → POST-only at v1. Open question:
// does the create model carry ONLY the two ids, or does it also have optional
// fields (Hours/budget/dates) that simply didn't fail validation and so weren't
// echoed? The domain (docs/timelog/04-employees-and-resources.md) says an
// Allocation is "hours assigned to an employee on a task", which implies more.
//
// TECHNIQUE (non-destructive): send candidate fields together with INVALID ids
// (UserId/TaskId = 0). The model binder drops properties the model doesn't have
// and keeps the ones it does; the 400 error envelope echoes the bound model under
// `Parameters`. So whichever candidates appear in the echo ARE real model
// properties — and we learn this without ever passing validation (no write).
//
// There is NO DELETE and GET/PUT are 405, so a successful create can only be
// removed in the Resource Planner UI. The one real create is guarded behind
// DO_REAL_ALLOCATION=1 and is the ONLY step that writes.
//
// Usage (from repo root, PowerShell). Load .env stripping quotes (see CLAUDE.md):
//   Get-Content .env | Where-Object { $_ -match '=' } | ForEach-Object { $k,$v = $_ -split '=',2; Set-Item "Env:$($k.Trim())" ($v.Trim().Trim('"').Trim("'")) }
//
//   # Field-set probe — all dry (no write):
//   node test/manual/empirical-allocation-fields.mjs
//
//   # ONE real allocation (only if the dry probe leaves the field set ambiguous):
//   $env:DO_REAL_ALLOCATION="1"; $env:ALLOC_TASK_ID="<leaf TaskID on 1034>"; node test/manual/empirical-allocation-fields.mjs
//   # optional override: ALLOC_USER_ID (default 64). Remove the allocation manually in the UI afterwards.

const baseUrl = process.env.TIMELOG_BASE_URL?.replace(/\/+$/, "");
const pat = process.env.TIMELOG_PAT;
if (!baseUrl || !pat) {
  console.error("Set TIMELOG_BASE_URL and TIMELOG_PAT");
  process.exit(1);
}
const headers = { Authorization: `Bearer ${pat}`, "content-type": "application/json", accept: "application/json" };

async function call(label, method, path, { body } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  console.log(`\n=== ${label} (${res.status}) ===`);
  console.log(text ? text.slice(0, 4000) : "(empty body)");
  // Surface the echoed model so the bound field set is easy to read.
  try {
    const parsed = JSON.parse(text);
    if (parsed.Parameters) console.log(`--- echoed model: ${parsed.Parameters}`);
  } catch {
    /* non-JSON (e.g. 405 problem+json uses different shape) — already printed */
  }
  return { status: res.status, text };
}

// A. Baseline — reproduces dry round 2 (both ids required, echo shows the model).
await call("allocation: empty body", "POST", "/allocation", { body: {} });

// B. Only UserId set → TaskId should still be required; echo reveals full shape.
await call("allocation: UserId only", "POST", "/allocation", { body: { UserId: 64 } });

// C. Only TaskId set → UserId should still be required.
await call("allocation: TaskId only", "POST", "/allocation", { body: { TaskId: 4961 } });

// D. THE KEY PROBE — candidate fields + invalid ids (0). Whatever survives in the
//    echoed `Parameters` model is a real property of allocationCreateModel.
//    Candidates cover the plausible Allocation shape (hours/budget/period/percent).
await call("allocation: candidate fields, invalid ids", "POST", "/allocation", {
  body: {
    UserId: 0,
    TaskId: 0,
    Hours: 5,
    Minutes: 30,
    BudgetHours: 5,
    AllocatedHours: 5,
    StartDate: "2026-06-22T00:00:00",
    EndDate: "2026-06-23T00:00:00",
    Date: "2026-06-22T00:00:00",
    Percentage: 50,
    BookingType: 1,
    Comment: "probe",
    IsBillable: true,
  },
});

// E. ONE real allocation — only when explicitly enabled. Removes nothing; clean up
//    in the Resource Planner UI. Pick a LEAF, in-progress task (summation tasks
//    cannot take allocations). Reveals success status (200/201/202) + response body.
if (process.env.DO_REAL_ALLOCATION === "1") {
  const userId = Number(process.env.ALLOC_USER_ID ?? 64);
  const taskId = Number(process.env.ALLOC_TASK_ID ?? 0);
  if (!taskId) {
    console.error("\nSet ALLOC_TASK_ID to a real leaf/in-progress TaskID on project 1034.");
    process.exit(1);
  }
  await call("allocation: REAL create", "POST", "/allocation", { body: { UserId: userId, TaskId: taskId } });
  console.log(
    `\nCreated an allocation for UserId ${userId} on TaskId ${taskId} (minimal body).` +
      "\n>>> Read the response body above for the created entity's fields (AllocationID, hours, dates)," +
      "\n    then open the Resource Planner and REMOVE the allocation manually (no API delete; GET/PUT are 405).",
  );
}

console.log("\nDone. Steps A–D write nothing. Confirm in the UI and remove any real allocation manually.");
