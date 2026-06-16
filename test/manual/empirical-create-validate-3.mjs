// Empirical gate — round 3. Closes the round-2 gaps:
//  (a) payment field requirements + UnitType enum, by validating against the
//      FIXED-PRICE contract 2244 (T&M 2245 rejected payments), and by reading the
//      payment endpoint's HATEOAS Actions/Fields/Enums.
//  (b) whether a SUCCESSFUL validate is dry (round 2 only saw failing ones).
//
// All calls are GET reads or validate-* (dry). Nothing is created.
//   node test/manual/empirical-create-validate-3.mjs

const baseUrl = process.env.TIMELOG_BASE_URL?.replace(/\/+$/, "");
const pat = process.env.TIMELOG_PAT;
if (!baseUrl || !pat) {
  console.error("Set TIMELOG_BASE_URL and TIMELOG_PAT");
  process.exit(1);
}

const PROJECT_ID = 1034;
const FP_CONTRACT_ID = 2244; // "Fastpris - Standardkontrakt" (ContractModelType 2)

async function api(method, path, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { Authorization: `Bearer ${pat}`, "content-type": "application/json", accept: "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
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

function show(label, r) {
  console.log(`\n=== ${label} (${r.status}) ===`);
  console.log(typeof r.json === "string" ? r.json : JSON.stringify(r.json, null, 2));
}

// 1. Read existing payments on the FP contract — Actions reveal UnitType enum.
show(`GET /payment?contractID=${FP_CONTRACT_ID}`, await api("GET", `/payment?contractID=${FP_CONTRACT_ID}&$pagesize=100`));

// 2. Validate a payment on the FP contract with a VALID invoice date.
show(
  "payment validate: FP contract + name + amount + valid date",
  await api("POST", "/payment/validate-new-payment", {
    ProjectID: PROJECT_ID,
    ProjectSubContractID: FP_CONTRACT_ID,
    Name: "API-TEST rate",
    Amount: 1000,
    InvoiceDate: "2026-06-30T00:00:00",
  }),
);

console.log("\nDone. GET + validate-* only. If the validate above returned OK/200, check the");
console.log("TimeLog UI: no payment must appear on contract 2244 (confirms successful validate is dry).");
