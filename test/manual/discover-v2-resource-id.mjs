// Find the v2 read that lists EMPLOYEE/RESOURCE rows with their opaque resourceId
// keyed by UserID. `group-by-employee-total-row` returns only the footer total
// (class "plantotalrowvalues", no resourceId). `partial-group-by-resource` 404'd.
// The rows route is likely `partial-group-by-employee` (mirroring the working
// `partial-group-by-work-item`). All reads (POST, params in query) — writes nothing.
// We need: a row with resourceSourceReferenceId = 29 → its resourceId
// (expected 512272789219049472 from the book-hours capture).
//
// Usage (from repo root, PowerShell). Load .env stripping quotes (see CLAUDE.md):
//   Get-Content .env | Where-Object { $_ -match '=' } | ForEach-Object { $k,$v = $_ -split '=',2; Set-Item "Env:$($k.Trim())" ($v.Trim().Trim('"').Trim("'")) }
//   node test/manual/discover-v2-resource-id.mjs

const baseUrl = process.env.TIMELOG_BASE_URL?.replace(/\/+$/, "");
const pat = process.env.TIMELOG_PAT;
if (!baseUrl || !pat) {
  console.error("Set TIMELOG_BASE_URL and TIMELOG_PAT");
  process.exit(1);
}
const headers = { Authorization: `Bearer ${pat}`, "content-type": "application/json", accept: "application/json" };
const rp = `${baseUrl.replace(/\/v\d+$/, "")}/v2/resource-planner`;
const period = "periodstartsat=2026-06-19&periodendsat=2026-07-19&periodtypes=month&unittypes=hours&reportingtypes=utilization&EmployeeIds=29&IsEmployeeInclusive=true";

// Print any node carrying a resource mapping (resourceSourceReferenceId / resourceId).
function reportResources(text) {
  let root;
  try { root = JSON.parse(text); } catch { return; }
  const hits = [];
  const walk = (n) => {
    if (!n || typeof n !== "object") return;
    if (n.resourceSourceReferenceId !== undefined && Number(n.resourceSourceReferenceId) !== 0) {
      hits.push(`resourceSourceReferenceId=${n.resourceSourceReferenceId} → resourceId=${n.resourceId} (${n.name ?? n.resourceType ?? "?"})`);
    }
    for (const c of n.children ?? []) walk(c);
  };
  walk(root?.Model?.properties);
  console.log(hits.length ? "  >> " + hits.join("\n  >> ") : "  >> (no resource rows with a non-zero resourceSourceReferenceId)");
}

async function probe(label, path, grouped) {
  const url = `${rp}/${path}?groupedby=${grouped}&${period}`;
  const res = await fetch(url, { method: "POST", headers, body: "{}" });
  const text = await res.text();
  console.log(`\n=== ${label} (${res.status}) ===  POST ${url}`);
  console.log(text ? text.slice(0, 1800) : "(empty body)");
  if (res.status === 200) reportResources(text);
}

await probe("partial-group-by-employee", "partial-group-by-employee", "groupbyresource");
await probe("partial-group-by-resource (retry)", "partial-group-by-resource", "groupbyresource");
await probe("group-by-employee", "group-by-employee", "groupbyresource");
await probe("partial-group-by-work-item w/ groupbyresource", "partial-group-by-work-item", "groupbyresource");

console.log("\nDone (read-only). Want a row: resourceSourceReferenceId=29 → resourceId (expect 512272789219049472).");
