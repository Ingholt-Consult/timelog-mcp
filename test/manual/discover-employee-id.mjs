// /workload/book rejects EmployeeId = a real, active UserID (tried 64=Ole and
// 29=mrt, the PAT owner) with "No user with UserID: X exist" (500, ErrorCode
// 37040). So booking's `EmployeeId` is NOT a UserID. Two hypotheses to separate,
// all reads here (writes nothing):
//   H1 — a distinct EmployeeID/ResourceID id space (on the user detail or a
//        /employee endpoint).
//   H2 — booking requires the user to already be a RESOURCE on the task (i.e.
//        allocated first); the generic error just means "not a resource on 4961".
//
// Usage (from repo root, PowerShell). Load .env stripping quotes (see CLAUDE.md):
//   Get-Content .env | Where-Object { $_ -match '=' } | ForEach-Object { $k,$v = $_ -split '=',2; Set-Item "Env:$($k.Trim())" ($v.Trim().Trim('"').Trim("'")) }
//   node test/manual/discover-employee-id.mjs

const baseUrl = process.env.TIMELOG_BASE_URL?.replace(/\/+$/, "");
const pat = process.env.TIMELOG_PAT;
if (!baseUrl || !pat) {
  console.error("Set TIMELOG_BASE_URL and TIMELOG_PAT");
  process.exit(1);
}
const headers = { Authorization: `Bearer ${pat}`, accept: "application/json" };

async function get(label, path, query) {
  let url = `${baseUrl}${path}`;
  if (query) {
    const qs = Object.entries(query).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&");
    if (qs) url += `?${qs}`;
  }
  const res = await fetch(url, { headers });
  const text = await res.text();
  console.log(`\n=== ${label} (${res.status}) ===`);
  console.log(text ? text.slice(0, 3000) : "(empty body)");
  return text;
}

// H1a. User detail — does it carry an EmployeeID/ResourceID the list omitted?
await get("/user/29 (detail — mrt)", "/user/29");

// H1b. Is there a plain /employee endpoint at all? (Contract lists only User.)
await get("/employee (does it exist?)", "/employee", { $pagesize: 5 });

// H1c. Resource Planner often keys on a resource entity — probe a couple of guesses.
await get("/resource (guess)", "/resource", { $pagesize: 5 });

// H2. Task detail — does a Task expose its allocated resources / employee ids?
//     If 4961 lists resources, that id is what booking wants (and shows nobody is
//     a resource yet on a fresh test task → supports allocate-before-book).
await get("/task/4961 (detail — resources?)", "/task/4961");

console.log(
  "\nDone (read-only). Look for: an EmployeeID/ResourceID on the user detail (≠ UserID 29)," +
    "\nwhether /employee or /resource exists, and whether the task detail lists allocated resources.",
);
