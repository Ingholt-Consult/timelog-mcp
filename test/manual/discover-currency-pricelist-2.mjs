// Read-only discovery v2: find the numeric CurrencyID whose price list exists
// (the account uses DKK). All GETs — nothing is written.
//   node test/manual/discover-currency-pricelist-2.mjs

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

// 1. The customer's own record — likely carries the CurrencyID whose price list exists.
const cust = await get("/customer/1100");
console.log("=== customer 1100 — ALL fields ===");
console.log(JSON.stringify(props(cust.json), null, 2));

// 2. Default hourly rate — often carries HourlyRateCurrencyID + CurrencyISO.
const def = await get("/hourly-rate/default");
console.log("\n=== /hourly-rate/default ===");
console.log(JSON.stringify(props(def.json), null, 2));

// 3. Currency list — show RAW first object (real field names), then find the DKK row(s).
const cur = await get("/currency/1?$pagesize=200");
const rows = unwrap(cur.json);
console.log(`\n=== /currency/1 — raw first row (real field names) ===`);
console.log(JSON.stringify(rows[0], null, 2));
const dkk = rows.filter((r) => JSON.stringify(r).toUpperCase().includes("DKK"));
console.log(`\n=== currency rows containing "DKK" (${dkk.length}) ===`);
console.log(JSON.stringify(dkk, null, 2));

console.log("\nDone (all reads). Want: the numeric CurrencyID for DKK / the customer's currency.");
