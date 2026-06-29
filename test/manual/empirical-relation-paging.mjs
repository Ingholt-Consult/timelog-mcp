// Empirical gate: confirm the $page/$pagesize paging convention works on the
// relation list endpoints (/customer, /contact, /user) the way list_customers /
// list_contacts / list_users now assume. The convention is proven against
// /ProjectType and /project/get-all; this verifies the same holds here so the
// tools don't silently return only the first 10 rows on a real account.
//
// For each endpoint it does two reads:
//   1. no paging      -> TimeLog should silently cap at 10 rows
//   2. $pagesize=100   -> should return min(TotalRecord, 100) rows
// PASS = when TotalRecord > 10, the unpaged read returns 10 and the paged read
// returns more. Read-only (no writes).
//
// Usage (from repo root, PowerShell). Load .env stripping quotes (see CLAUDE.md):
//   Get-Content .env | Where-Object { $_ -match '=' } | ForEach-Object { $k,$v = $_ -split '=',2; Set-Item "Env:$($k.Trim())" ($v.Trim().Trim('"').Trim("'")) }
//   node test/manual/empirical-relation-paging.mjs

const baseUrl = process.env.TIMELOG_BASE_URL?.replace(/\/+$/, "");
const pat = process.env.TIMELOG_PAT;
if (!baseUrl || !pat) {
  console.error("Set TIMELOG_BASE_URL and TIMELOG_PAT (load .env first — see CLAUDE.md).");
  process.exit(1);
}
const headers = { Authorization: `Bearer ${pat}`, accept: "application/json" };

async function get(path, query) {
  let url = `${baseUrl}${path}`;
  if (query) {
    const qs = Object.entries(query)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join("&");
    if (qs) url += `?${qs}`;
  }
  const res = await fetch(url, { headers });
  const text = await res.text();
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

// TAFList shape: { Properties: { TotalRecord, TotalPage, PageNumber }, Entities: [...] }
function summarise(resp) {
  const rows = Array.isArray(resp?.Entities) ? resp.Entities : Array.isArray(resp) ? resp : [];
  const total = resp?.Properties?.TotalRecord;
  return { count: rows.length, total };
}

const endpoints = [
  ["list_customers", "/customer"],
  ["list_contacts", "/contact"],
  ["list_users", "/user"],
];

let allPass = true;

for (const [tool, path] of endpoints) {
  console.log(`\n=== ${tool}  (GET ${path}) ===`);
  try {
    const unpaged = summarise(await get(path));
    const paged = summarise(await get(path, { $pagesize: 100 }));

    console.log(`  no paging      : ${unpaged.count} rows (TotalRecord=${unpaged.total ?? "?"})`);
    console.log(`  $pagesize=100  : ${paged.count} rows (TotalRecord=${paged.total ?? "?"})`);

    const total = paged.total ?? unpaged.total;
    if (typeof total !== "number") {
      console.log("  ?  INCONCLUSIVE: no TotalRecord in response — inspect the raw shape.");
      allPass = false;
    } else if (total <= 10) {
      console.log(`  ~  only ${total} records on the account — under the cap, paging can't be observed here.`);
    } else if (unpaged.count === 10 && paged.count > 10) {
      console.log(`  PASS: unpaged capped at 10, $pagesize=100 lifted it to ${paged.count} of ${total}.`);
    } else {
      console.log(`  FAIL: expected unpaged=10 and paged>10 (TotalRecord=${total}).`);
      allPass = false;
    }
  } catch (e) {
    console.log(`  ERROR: ${e.message}`);
    allPass = false;
  }
}

console.log(`\n${allPass ? "ALL CHECKS PASSED (or inconclusive on small lists)." : "SOME CHECKS FAILED — read above."}`);
console.log("Read-only gate; nothing was written.");
