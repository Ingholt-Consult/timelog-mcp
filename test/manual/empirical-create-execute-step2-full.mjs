// Empirical gate — STEP 2 (full, end-to-end). Creates ONE real project from a
// template with a complete, valid body, then verifies the template's tasks +
// contracts arrived. Irreversible (no DELETE) — archive the project afterwards.
//
// SELF-GATED: borrows valid CustomerID/ProjectManagerID/ProjectTypeID/CurrencyID
// from the existing test project 1034, runs a DRY validate first, and only
// EXECUTES if validate returns 200. A failing validate stops before any write.
//
//   node test/manual/empirical-create-execute-step2-full.mjs

const baseUrl = process.env.TIMELOG_BASE_URL?.replace(/\/+$/, "");
const pat = process.env.TIMELOG_PAT;
if (!baseUrl || !pat) {
  console.error("Set TIMELOG_BASE_URL and TIMELOG_PAT");
  process.exit(1);
}

const SOURCE_PROJECT_ID = 1034; // borrow coherent classification values from here
const PROJECT_NAME = "API-TEST 2026-06-16 e2e from-template (arkivér)";
const PROJECT_NO = "API-TEST-2026-06-16"; // create-from-template does NOT auto-generate it (30171)
const START = "2026-06-16T00:00:00";
const END = "2026-12-31T00:00:00";

function unwrap(resp) {
  const e = resp?.Entities;
  if (Array.isArray(e)) return e.map((x) => x.Properties ?? x);
  if (Array.isArray(resp)) return resp;
  return resp ? [resp] : [];
}
function props(resp) {
  return resp?.Properties ?? resp ?? {};
}
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

// 1. Borrow valid values from project 1034.
const src = await api("GET", `/project/${SOURCE_PROJECT_ID}`, undefined);
const p = props(src.json);
console.log(`Source project ${SOURCE_PROJECT_ID} fields:`, {
  CustomerID: p.CustomerID,
  ProjectManagerID: p.ProjectManagerID,
  ProjectTypeID: p.ProjectTypeID,
  CurrencyID: p.CurrencyID,
});

// CurrencyID is not on the project record (and a random currency like AED=39 has
// no price list in this account -> "Price list with id N not found"). Use the
// account currency DKK=35, looked up by its ABB so it stays correct.
let currencyId = p.CurrencyID;
if (!currencyId) {
  const rows = unwrap((await api("GET", "/currency/1?$pagesize=200", undefined)).json);
  currencyId = rows.find((c) => c.CurrencyABB === "DKK")?.CurrencyID ?? 35;
  console.log(`CurrencyID not on the project; using DKK -> ${currencyId}`);
}

// 2. Pick a small template.
const tpl = unwrap((await api("GET", "/project-template/get-all", undefined)).json);
const chosen = tpl.find((t) => String(t.Name).includes("Småsag")) ?? tpl[0];
console.log("Templates:", tpl.map((t) => ({ id: t.ProjectTemplateID, name: t.Name })));

// ProjectCategoryID > 0 is a business-rule requirement (60013), not flagged by
// model validation. 1034 carries null, so pick a real category.
const cats = unwrap((await api("GET", "/ProjectCategory?$pagesize=100", undefined)).json);
const categoryId = cats[0]?.ProjectCategoryID ?? cats[0]?.CategoryID ?? cats[0]?.ID;
console.log(`ProjectCategoryID -> ${categoryId} (of ${cats.length})`);

const body = {
  ProjectTemplateID: chosen.ProjectTemplateID,
  Name: PROJECT_NAME,
  ProjectNo: PROJECT_NO,
  CustomerID: p.CustomerID,
  ProjectManagerID: p.ProjectManagerID,
  ProjectTypeID: p.ProjectTypeID,
  ProjectCategoryID: categoryId,
  CurrencyID: currencyId,
  ProjectStartDate: START,
  ProjectEndDate: END,
};
console.log(`\nProposed body (template ${chosen.ProjectTemplateID} "${chosen.Name}"):`);
console.log(JSON.stringify(body, null, 2));

// 3. DRY validate — gate the execute on this.
const validation = await api("POST", "/project/validate-create-from-template", body);
show("VALIDATE (dry)", validation);

if (validation.status !== 200) {
  console.log("\nValidate did NOT pass (status != 200). NOT executing. Fix the body above and re-run.");
  process.exit(0);
}

// 4. EXECUTE the real create.
console.log("\n>>> validate passed — EXECUTING real create...");
const created = await api("POST", "/project/create-from-template", body);
show("EXECUTE create-from-template", created);

// 5. Verify the template populated tasks + contracts.
const c = created.json;
const newId =
  c?.ProjectID ??
  c?.Properties?.ProjectID ??
  (Array.isArray(c?.Links) ? Number(String(c.Links.find((l) => l.Rel === "self")?.Href).match(/\/project\/(\d+)/)?.[1]) : undefined);

if (created.status >= 200 && created.status < 300 && newId) {
  const tasks = unwrap((await api("GET", `/task?projectID=${newId}&$pagesize=100`, undefined)).json);
  const contracts = unwrap((await api("GET", `/contract?projectID=${newId}&$pagesize=100`, undefined)).json);
  console.log(`\n--> created ProjectID = ${newId}`);
  console.log(`    tasks from template:     ${tasks.length}`);
  console.log(`    contracts from template:`, contracts.map((x) => ({ id: x.ContractID, name: x.ContractName, model: x.ContractModelType })));
  console.log(`\n*** ARCHIVE WHEN DONE: ProjectID ${newId} (status 5=Archived / 6=Cancelled). ***`);
} else {
  console.log("\nExecute did not return a usable ProjectID — inspect the response above.");
}
