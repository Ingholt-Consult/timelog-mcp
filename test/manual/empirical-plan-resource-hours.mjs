// Empirical gate for the BUILT Phase 3 resource-planning flow (plan_resource_hours /
// get_resource_plan, ADR 0009). Mirrors the tool's path against the live v2 Resource
// Planner so the undocumented routes can be re-verified after API changes:
//   1. resolve resourceId   ← POST /api/v2/resource-planner/partial-group-by-employee
//   2. resolve workItemId    ← POST /api/v2/resource-planner/partial-group-by-work-item
//      + read the CURRENT plan for the task (what preview surfaces)
//   3. (guarded) book-hours  → POST /api/v2/resource-planner/book-hours, then re-read
//
// Reads write nothing. ONE real plan is guarded behind DO_PLAN_HOURS=1 and — there is
// NO DELETE — must be cleared manually in the Resource Planner UI (or re-planned to 0).
//
// Usage (from repo root, PowerShell). Load .env stripping quotes (see CLAUDE.md):
//   Get-Content .env | Where-Object { $_ -match '=' } | ForEach-Object { $k,$v = $_ -split '=',2; Set-Item "Env:$($k.Trim())" ($v.Trim().Trim('"').Trim("'")) }
//
//   # Dry — resolve ids + read the current plan (no write):
//   node test/manual/empirical-plan-resource-hours.mjs
//
//   # ONE real plan (default UserID 29 / TaskID 4961 on test project 1034):
//   $env:DO_PLAN_HOURS="1"; node test/manual/empirical-plan-resource-hours.mjs
//   # optional overrides: PLAN_USER_ID, PLAN_TASK_ID, PLAN_VALUE (default 2),
//   #                     PLAN_START (2026-06-22), PLAN_END (2026-06-23)

const baseUrl = process.env.TIMELOG_BASE_URL?.replace(/\/+$/, "");
const pat = process.env.TIMELOG_PAT;
if (!baseUrl || !pat) {
  console.error("Set TIMELOG_BASE_URL and TIMELOG_PAT");
  process.exit(1);
}
const headers = { Authorization: `Bearer ${pat}`, "content-type": "application/json", accept: "application/json" };
const rp = `${baseUrl.replace(/\/v\d+$/, "")}/v2/resource-planner`;

const userId = Number(process.env.PLAN_USER_ID ?? 29);
const taskId = Number(process.env.PLAN_TASK_ID ?? 4961);
const value = process.env.PLAN_VALUE ?? "2";
const startsAt = `${process.env.PLAN_START ?? "2026-06-22"}T00:00:00`;
const endsAt = `${process.env.PLAN_END ?? "2026-06-23"}T00:00:00`;

async function call(label, url, body) {
  const res = await fetch(url, { method: "POST", headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  console.log(`\n=== ${label} (${res.status}) ===  POST ${url}`);
  if (res.status !== 200) console.log(text ? text.slice(0, 1000) : "(empty body)");
  return text;
}

// Flatten Model.properties + nested children (same walk the tool uses).
function flatten(text) {
  let root;
  try { root = JSON.parse(text)?.Model?.properties; } catch { return []; }
  const out = [];
  const walk = (n) => { if (!n || typeof n !== "object") return; out.push(n); for (const c of n.children ?? []) walk(c); };
  walk(root);
  return out;
}

const period =
  `periodstartsat=${startsAt.slice(0, 10)}&periodendsat=${endsAt.slice(0, 10)}` +
  `&periodtypes=month&unittypes=hours&reportingtypes=utilization&EmployeeIds=${userId}&IsEmployeeInclusive=true`;

// 1. resourceId (UserID → opaque, constant per employee).
const resText = await call("partial-group-by-employee", `${rp}/partial-group-by-employee?groupedby=groupbyresource&${period}`, {});
const resNode = flatten(resText).find((n) => Number(n.resourceSourceReferenceId) === userId && String(n.resourceId ?? "0") !== "0");
const resourceId = resNode?.resourceId;
console.log(`  >> UserID ${userId} → resourceId ${resourceId ?? "(NOT FOUND — is the employee a resource in this period?)"}`);

// 2. workItemId + the CURRENT plan for the task (what preview shows).
const wiText = await call("partial-group-by-work-item", `${rp}/partial-group-by-work-item?groupedby=groupbyworkitem&${period}`, {});
const wiNode = flatten(wiText).find((n) => Number(n.workItemSourceReferenceId) === taskId);
const workItemId = wiNode?.workItemId;
if (wiNode) {
  const per = Object.entries(wiNode.values ?? {}).map(([k, v]) => `${k}=${v.value}`).join(" ");
  console.log(`  >> TaskID ${taskId} → workItemId ${workItemId} | TotalBooked=${wiNode.TotalBooked} | per-period ${per}`);
} else {
  console.log(`  >> TaskID ${taskId} NOT FOUND — must be planned for the employee (allocation) and hit the period.`);
}

// 3. OPTIONAL real plan — only with DO_PLAN_HOURS=1 and both ids resolved.
if (process.env.DO_PLAN_HOURS === "1") {
  if (!resourceId || !workItemId) {
    console.error("\nCannot plan: resourceId/workItemId not resolved (see above).");
    process.exit(1);
  }
  await call("book-hours: REAL (REPLACE)", `${rp}/book-hours`, {
    resourceId, workItemId, unitType: "hours", value, startsAt, endsAt,
  });
  console.log(`\nPlanned value=${value} over ${startsAt.slice(0, 10)}..${endsAt.slice(0, 10)} (REPLACE; ${value}h spread evenly per day).`);
  const afterText = await call("partial-group-by-work-item AFTER", `${rp}/partial-group-by-work-item?groupedby=groupbyworkitem&${period}`, {});
  const after = flatten(afterText).find((n) => Number(n.workItemSourceReferenceId) === taskId);
  const per = Object.entries(after?.values ?? {}).map(([k, v]) => `${k}=${v.value}`).join(" ");
  console.log(`  >> TaskID ${taskId} now: TotalBooked=${after?.TotalBooked} | per-period ${per}`);
  console.log("\n>>> Verify in the Resource Planner UI and REMOVE/zero it manually (no DELETE).");
}

console.log("\nDone. Reads only unless DO_PLAN_HOURS=1.");
