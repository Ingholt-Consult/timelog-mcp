// The v2 resource planner bridges the v1 ids ↔ the opaque v2 ids, and is PAT-authed.
//   READ:  POST /api/v2/resource-planner/partial-group-by-work-item?...&EmployeeIds=29
//          → rows carry workItemSourceReferenceId = TaskID (4961) and the opaque
//            workItemId; resourceSourceReferenceId = UserID and the opaque resourceId.
//   WRITE: POST /api/v2/resource-planner/book-hours {resourceId, workItemId, value,
//          startsAt, endsAt, unitType:"hours"}  (PAT works — empty body 500'd on
//          "ResourceId cannot be null", not 401).
//
// Goal here: get the resourceId for UserID 29 (the work-item grouping returned
// resourceId "0"), then optionally prove a real book-hours end to end via PAT.
//
// Usage (from repo root, PowerShell). Load .env stripping quotes (see CLAUDE.md):
//   Get-Content .env | Where-Object { $_ -match '=' } | ForEach-Object { $k,$v = $_ -split '=',2; Set-Item "Env:$($k.Trim())" ($v.Trim().Trim('"').Trim("'")) }
//   # reads only:
//   node test/manual/discover-v2-resource-mapping.mjs
//   # prove a real booking once RESOURCE_ID is known (1h, small period; remove in UI):
//   $env:DO_BOOK_HOURS="1"; $env:RESOURCE_ID="<opaque resourceId for UserID 29>"; node test/manual/discover-v2-resource-mapping.mjs

const baseUrl = process.env.TIMELOG_BASE_URL?.replace(/\/+$/, "");
const pat = process.env.TIMELOG_PAT;
if (!baseUrl || !pat) {
  console.error("Set TIMELOG_BASE_URL and TIMELOG_PAT");
  process.exit(1);
}
const headers = { Authorization: `Bearer ${pat}`, "content-type": "application/json", accept: "application/json" };
const rp = `${baseUrl.replace(/\/v\d+$/, "")}/v2/resource-planner`;

async function call(label, method, url, body) {
  const res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  console.log(`\n=== ${label} (${res.status}) ===  ${method} ${url}`);
  console.log(text ? text.slice(0, 2500) : "(empty body)");
  return text;
}

// Recursively find the row for a TaskID (workItemSourceReferenceId) and print its
// per-period values + TotalBooked — precise measurement, no UI eyeballing.
function reportTask(text, taskId) {
  let root;
  try {
    root = JSON.parse(text);
  } catch {
    return;
  }
  const found = [];
  const walk = (n) => {
    if (!n || typeof n !== "object") return;
    if (String(n.workItemSourceReferenceId) === String(taskId)) found.push(n);
    for (const c of n.children ?? []) walk(c);
  };
  walk(root?.Model?.properties);
  for (const n of found) {
    const per = Object.entries(n.values ?? {}).map(([k, v]) => `${k}=${v.value}`).join(" ");
    console.log(`  >> Task ${taskId}: TotalBooked=${n.TotalBooked} | per-period ${per} | workItemId=${n.workItemId}`);
  }
  if (!found.length) console.log(`  >> Task ${taskId} not in this response (expand/period?).`);
}

const period = "periodstartsat=2026-06-19&periodendsat=2026-07-19&periodtypes=month&unittypes=hours&reportingtypes=utilization&EmployeeIds=29&IsEmployeeInclusive=true";

// 1. Reproduce the work-item grouping (confirms PAT works on the read + workItemId↔TaskID).
//    Prints task 4961's booked total so a book-hours delta can be measured precisely.
const beforeRead = await call("group-by-work-item (EmployeeIds=29)", "POST", `${rp}/partial-group-by-work-item?groupedby=groupbyworkitem&${period}`, {});
reportTask(beforeRead, 4961);

// 2. Group by RESOURCE → expect rows where resourceSourceReferenceId = 29 and
//    resourceId = the opaque id we need for book-hours. Try the sibling route first,
//    then the same route with groupedby=groupbyresource.
await call("group-by-resource (sibling route)", "POST", `${rp}/partial-group-by-resource?groupedby=groupbyresource&${period}`, {});
await call("work-item route w/ groupbyresource", "POST", `${rp}/partial-group-by-work-item?groupedby=groupbyresource&${period}`, {});

// 3. OPTIONAL real booking — only with DO_BOOK_HOURS=1 and a known RESOURCE_ID.
//    1 hour, a single day, no hubConnectionId (test whether the hub id is required).
if (process.env.DO_BOOK_HOURS === "1") {
  const resourceId = process.env.RESOURCE_ID;
  const workItemId = process.env.WORK_ITEM_ID ?? "512272894517051410"; // task 4961
  if (!resourceId) {
    console.error("\nSet RESOURCE_ID to the opaque resourceId for UserID 29 (from step 2).");
    process.exit(1);
  }
  // value/period are env-overridable so the hours-spread semantics can be measured:
  // book a known value over a clean period, then read the UI delta. NOTE book-hours
  // is ADDITIVE (value 1 over 06-22→06-23 added 0.66h, not 1, on top of existing).
  const value = process.env.BOOK_VALUE ?? "1";
  const startsAt = `${process.env.BOOK_START ?? "2026-06-22"}T00:00:00`;
  const endsAt = `${process.env.BOOK_END ?? "2026-06-23"}T00:00:00`;
  await call("book-hours: REAL", "POST", `${rp}/book-hours`, {
    resourceId,
    workItemId,
    unitType: "hours",
    value,
    startsAt,
    endsAt,
  });
  console.log(`\nBooked value=${value} over ${startsAt.slice(0, 10)}..${endsAt.slice(0, 10)} (ADDITIVE).`);
  // Re-read to measure the exact delta on task 4961.
  const afterRead = await call("group-by-work-item AFTER booking", "POST", `${rp}/partial-group-by-work-item?groupedby=groupbyworkitem&${period}`, {});
  reportTask(afterRead, 4961);
  console.log("  >> Compare TotalBooked before vs after → that delta is what value mapped to.");
  console.log("\n>>> If 200: PAT can book resource-planner hours WITHOUT a SignalR hub. Check the Resource Planner UI and REMOVE it manually.");
}

console.log("\nDone. Reads only unless DO_BOOK_HOURS=1. Looking for: resourceSourceReferenceId=29 → its resourceId.");
