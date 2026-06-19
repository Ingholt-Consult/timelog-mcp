// Is /api/v2 live, and does the V2 ResourcePlannerController expose routes? The
// swagger declares V2.Employee.Controllers.ResourcePlannerController and
// V1.ProjectManagement.Controllers.AllocationController as tags but documents NO
// paths for them. /allocation (V1) already works live; this probes whether V2 and a
// resource-planner route are reachable. All GETs — writes nothing.
//
// Usage (from repo root, PowerShell). Load .env stripping quotes (see CLAUDE.md):
//   Get-Content .env | Where-Object { $_ -match '=' } | ForEach-Object { $k,$v = $_ -split '=',2; Set-Item "Env:$($k.Trim())" ($v.Trim().Trim('"').Trim("'")) }
//   node test/manual/discover-v2-resourceplanner.mjs

const baseUrl = process.env.TIMELOG_BASE_URL?.replace(/\/+$/, "");
const pat = process.env.TIMELOG_PAT;
if (!baseUrl || !pat) {
  console.error("Set TIMELOG_BASE_URL and TIMELOG_PAT");
  process.exit(1);
}
const headers = { Authorization: `Bearer ${pat}`, accept: "application/json" };
const apiRoot = baseUrl.replace(/\/v\d+$/, ""); // .../api
const v2 = `${apiRoot}/v2`;

async function get(label, url, extraHeaders) {
  const res = await fetch(url, { headers: { ...headers, ...extraHeaders } });
  const text = await res.text();
  console.log(`\n=== ${label} (${res.status}) ===  ${url}`);
  console.log(text ? text.slice(0, 900) : "(empty body)");
  return res.status;
}

const period = "startDate=2026-06-22T00:00:00&endDate=2026-06-26T00:00:00";

// 1. Is /api/v2 live at all? Hit a route that exists in v1 under v2.
//    200 → v2 serves it; 405 UnsupportedApiVersion → v2 not enabled for it;
//    404 → no such route; 401 → auth (token still fine for v1, so unlikely).
await get("v2 liveness: /v2/user/me", `${v2}/user/me`);

// 2. V2 ResourcePlanner — guess the route names (no paths in swagger).
await get("v2 resource-planner/get-in-period", `${v2}/resource-planner/get-in-period?${period}`);
await get("v2 resource-planner", `${v2}/resource-planner?${period}`);
await get("v2 resourceplanner", `${v2}/resourceplanner?${period}`);
await get("v2 resource-planner/allocation", `${v2}/resource-planner/allocation?${period}`);

// 3. Allocation under v2 (it is V1 in swagger, but V2 may also serve it / read it).
await get("v2 allocation (GET)", `${v2}/allocation`);
await get("v1 allocation via api-version:2 header", `${baseUrl}/allocation`, { "api-version": "2", "x-api-version": "2" });

console.log("\nDone (read-only). Looking for: a 200 under /v2 (v2 is live) and any reachable resource-planner route.");
