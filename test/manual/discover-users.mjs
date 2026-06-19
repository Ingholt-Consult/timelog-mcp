// Find a VALID, bookable UserID for /workload/book. The booking gate hit
// "No user with UserID: 64 exist" (500, ErrorCode 37040) even though the
// employee-projection listed UserID 64 — so the projection's UserID is NOT the
// same id space as a bookable EmployeeId. The authoritative source is /user
// (list) and /user/me (the logged-in user, guaranteed valid). Read-only.
//
// Usage (from repo root, PowerShell). Load .env stripping quotes (see CLAUDE.md):
//   Get-Content .env | Where-Object { $_ -match '=' } | ForEach-Object { $k,$v = $_ -split '=',2; Set-Item "Env:$($k.Trim())" ($v.Trim().Trim('"').Trim("'")) }
//   node test/manual/discover-users.mjs

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
  console.log(text ? text.slice(0, 2000) : "(empty body)");
  return text;
}

// 1. The logged-in user — its id is the safest BOOK_EMPLOYEE_ID (it exists).
await get("/user/me", "/user/me");

// 2. All users — print UserID + name + email so a real, active id can be picked.
const usersText = await get("/user (list)", "/user", { $pagesize: 100 });
try {
  const rows = (JSON.parse(usersText).Entities ?? []).map((e) => e.Properties ?? e);
  console.log("\n--- UserID | name | email | active? (pick a real id for BOOK_EMPLOYEE_ID) ---");
  for (const u of rows) {
    const id = u.UserID ?? u.UserId ?? u.ID ?? "?";
    const name = u.FullName ?? u.Name ?? `${u.FirstName ?? ""} ${u.LastName ?? ""}`.trim();
    const email = u.Email ?? u.Initials ?? "";
    const active = u.IsActive ?? u.Active ?? "?";
    console.log(`${id} | ${name} | ${email} | active=${active}`);
  }
} catch {
  console.log("(could not parse user list — read the raw JSON above)");
}

console.log(
  "\nDone (read-only). Re-run the booking with a real id, e.g.:" +
    '\n  $env:DO_REAL_BOOKING="1"; $env:BOOK_EMPLOYEE_ID="<UserID>"; $env:BOOK_TASK_ID="4961"; node test/manual/empirical-book-workload.mjs',
);
