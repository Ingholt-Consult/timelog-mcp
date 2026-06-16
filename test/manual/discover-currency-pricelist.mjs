// Read-only discovery: find the CurrencyID/price-list the account actually uses,
// so create-from-template stops failing with "Price list with id N is not found".
// All GETs — nothing is written.
//   node test/manual/discover-currency-pricelist.mjs

const baseUrl = process.env.TIMELOG_BASE_URL?.replace(/\/+$/, "");
const pat = process.env.TIMELOG_PAT;
if (!baseUrl || !pat) {
  console.error("Set TIMELOG_BASE_URL and TIMELOG_PAT");
  process.exit(1);
}

function unwrap(resp) {
  const e = resp?.Entities;
  if (Array.isArray(e)) return e.map((x) => x.Properties ?? x);
  if (Array.isArray(resp)) return resp;
  return resp ? [resp] : [];
}
function props(resp) {
  return resp?.Properties ?? resp ?? {};
}
async function get(path) {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${pat}`, accept: "application/json" },
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, json };
}

// 1. FULL field list of project 1034 — is currency/price-list hidden here?
const proj = await get("/project/1034");
console.log("=== project 1034 — ALL fields ===");
console.log(JSON.stringify(props(proj.json), null, 2));

// 2. Currencies — try the documented /currency/{status} route, find DKK/default.
for (const path of ["/currency/1?$pagesize=200", "/currency/0?$pagesize=200", "/currency?$pagesize=200"]) {
  const r = await get(path);
  const rows = unwrap(r.json);
  console.log(`\n=== GET ${path} (${r.status}) — ${rows.length} rows ===`);
  console.log(
    rows.slice(0, 60).map((c) => ({
      id: c.CurrencyID ?? c.ID,
      code: c.Code ?? c.IsoCode ?? c.Abbreviation,
      name: c.Name,
      isDefault: c.IsDefault ?? c.IsBaseCurrency,
    })),
  );
  if (rows.length) break; // first route that returns rows wins
}

// 3. The real project's hourly rates almost certainly carry a valid CurrencyID /
//    price-list reference. Dump them raw.
for (const contractID of [2244, 2245]) {
  const r = await get(`/contract-hourly-rate?contractID=${contractID}&$pagesize=100`);
  console.log(`\n=== GET /contract-hourly-rate?contractID=${contractID} (${r.status}) ===`);
  console.log(JSON.stringify(unwrap(r.json), null, 2));
}

console.log("\nDone (all reads). Look for the CurrencyID whose price list exists (likely DKK).");
