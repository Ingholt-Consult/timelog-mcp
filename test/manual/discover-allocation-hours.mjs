// The TimeLog UI sets allocated hours via an INTERNAL web-MVC endpoint, NOT REST:
//   POST /ProjectManagement/Allocation/SaveAllocationSingleField/9408?taskId=4961&projectId=1034
//   body: { allocation9408_HoursAllocated: "2,00" }   (cookie auth, Danish decimal)
// 9408 = the AllocationID — the row our `POST /api/v1/allocation {UserId:29,
// TaskId:4961}` created (MRT resource on 4961 at 0h). The REST create model is only
// {UserId, TaskId} (no hours). Question: does REST v1 expose that allocation row by
// id, and any way to set hours? GET /allocation (collection) was 405 (method), but a
// GET-by-id may behave differently. All reads — writes nothing.
//
// Usage (from repo root, PowerShell). Load .env stripping quotes (see CLAUDE.md):
//   Get-Content .env | Where-Object { $_ -match '=' } | ForEach-Object { $k,$v = $_ -split '=',2; Set-Item "Env:$($k.Trim())" ($v.Trim().Trim('"').Trim("'")) }
//   node test/manual/discover-allocation-hours.mjs
//   # override the id if different: $env:ALLOC_ID="9408"; node ...

const baseUrl = process.env.TIMELOG_BASE_URL?.replace(/\/+$/, "");
const pat = process.env.TIMELOG_PAT;
if (!baseUrl || !pat) {
  console.error("Set TIMELOG_BASE_URL and TIMELOG_PAT");
  process.exit(1);
}
const headers = { Authorization: `Bearer ${pat}`, accept: "application/json" };
const allocId = process.env.ALLOC_ID ?? "9408";

async function get(label, path) {
  const res = await fetch(`${baseUrl}${path}`, { headers });
  const text = await res.text();
  console.log(`\n=== ${label} (${res.status}) ===  ${baseUrl}${path}`);
  console.log(text ? text.slice(0, 1200) : "(empty body)");
}

// 1. The allocation row by id — does a GET-by-id work where the collection GET 405'd?
await get(`/allocation/${allocId}`, `/allocation/${allocId}`);

// 2. Allocations scoped to the task / project (read paths that might exist).
await get("/allocation?taskId=4961", `/allocation?taskId=4961`);
await get("/task/4961/allocation", `/task/4961/allocation`);
await get("/project/1034/allocation", `/project/1034/allocation`);

console.log(
  `\nDone (read-only). If /allocation/${allocId} returns the row, note its fields` +
    "\n(HoursAllocated?) and whether a sibling PUT/POST could set hours via REST.",
);
