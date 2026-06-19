// Find the EmployeeID id space that POST /workload/book wants. UserID (29, 64) is
// rejected with "No user with UserID: X exist" even after the user is a resource on
// the task. /user, /user/me and the projection all expose UserID only; /employee and
// /resource are 404. The booking's `EmployeeId` is a separate EmployeeID. This probe
// fetches the live swagger (authoritative route + model list) and tries endpoints
// that might expose an EmployeeID. All reads — writes nothing.
//
// Usage (from repo root, PowerShell). Load .env stripping quotes (see CLAUDE.md):
//   Get-Content .env | Where-Object { $_ -match '=' } | ForEach-Object { $k,$v = $_ -split '=',2; Set-Item "Env:$($k.Trim())" ($v.Trim().Trim('"').Trim("'")) }
//   node test/manual/discover-swagger-employeeid.mjs

const baseUrl = process.env.TIMELOG_BASE_URL?.replace(/\/+$/, "");
const pat = process.env.TIMELOG_PAT;
if (!baseUrl || !pat) {
  console.error("Set TIMELOG_BASE_URL and TIMELOG_PAT");
  process.exit(1);
}
const headers = { Authorization: `Bearer ${pat}`, accept: "application/json" };
// baseUrl = https://app5.timelog.com/ingholtconsult2/api/v1  → derive the api root.
const apiRoot = baseUrl.replace(/\/v\d+$/, "");

async function get(label, url) {
  const res = await fetch(url, { headers });
  const text = await res.text();
  console.log(`\n=== ${label} (${res.status}) ===  ${url}`);
  console.log(text ? text.slice(0, 1500) : "(empty body)");
  return { status: res.status, text };
}

// 1. Swagger — the authoritative list of routes + the BookWorkload model. Try the
//    common locations; the first 200 with JSON is the one to read.
const swaggerCandidates = [
  `${apiRoot}/swagger/v1/swagger.json`,
  `${apiRoot}/swagger/docs/v1`,
  `${baseUrl}/swagger.json`,
  `${apiRoot}/swagger.json`,
  `${apiRoot}/v1/swagger.json`,
];
let swaggerText = "";
for (const url of swaggerCandidates) {
  const r = await get("swagger?", url);
  if (r.status === 200 && r.text.trim().startsWith("{")) {
    swaggerText = r.text;
    break;
  }
}
if (swaggerText) {
  // Surface anything mentioning employee/booking so we see the id source fast.
  const hits = swaggerText
    .split(/[\n,]/)
    .filter((l) => /employee|bookworkload|allocation|resourceplanner/i.test(l))
    .slice(0, 60);
  console.log("\n--- swagger lines mentioning employee/booking/allocation ---");
  console.log(hits.join("\n") || "(none)");
}

// 2. Endpoints that might carry an EmployeeID distinct from UserID.
await get("/department", `${baseUrl}/department?$pagesize=5`);
await get("/normalworkingtime", `${baseUrl}/normalworkingtime?$pagesize=5`);

console.log("\nDone (read-only). Goal: an endpoint/field giving the EmployeeID that /workload/book's EmployeeId wants.");
