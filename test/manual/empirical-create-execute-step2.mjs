// Empirical gate — STEP 2 (the first REAL create; irreversible, no DELETE).
//
// Decisive experiment: execute create-from-template with a MINIMAL body
// (ProjectTemplateID + Name only). The dry validate demanded Name, CustomerID>0,
// ProjectManagerID, ProjectTypeID, CurrencyID, ProjectStartDate, ProjectEndDate.
// If execute SUCCEEDS here, the template supplies those (keep schema fields
// optional). If it FAILS with the same errors, execute is as strict as validate
// (make them required).
//
// Worst case: one archivable "API-TEST" project. Archive it afterwards.
//   node test/manual/empirical-create-execute-step2.mjs

const baseUrl = process.env.TIMELOG_BASE_URL?.replace(/\/+$/, "");
const pat = process.env.TIMELOG_PAT;
if (!baseUrl || !pat) {
  console.error("Set TIMELOG_BASE_URL and TIMELOG_PAT");
  process.exit(1);
}

const PROJECT_NAME = "API-TEST 2026-06-16 from-template (arkivér)";

function unwrap(resp) {
  const e = resp?.Entities;
  if (Array.isArray(e)) return e.map((x) => x.Properties ?? x);
  if (Array.isArray(resp)) return resp;
  return resp ? [resp] : [];
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

// 1. Pick a small template.
const tplResp = await api("GET", "/project-template/get-all", undefined);
const templates = unwrap(tplResp.json);
console.log("Templates:", templates.map((t) => ({ id: t.ProjectTemplateID, name: t.Name })));
const chosen = templates.find((t) => String(t.Name).includes("Småsag")) ?? templates[0];
if (!chosen) {
  console.error("No project templates found — aborting.");
  process.exit(1);
}
const templateId = chosen.ProjectTemplateID;

// 2. Show the exact body, then EXECUTE the minimal create.
const body = { ProjectTemplateID: templateId, Name: PROJECT_NAME };
console.log(`\n>>> ABOUT TO EXECUTE (real create) POST /project/create-from-template`);
console.log(`    template: ${templateId} "${chosen.Name}"`);
console.log(`    body: ${JSON.stringify(body)}`);

const created = await api("POST", "/project/create-from-template", body);
show("EXECUTE create-from-template", created);

// 3. If a project was created, verify the template brought tasks + contracts.
const c = created.json;
const newId =
  c?.ProjectID ??
  c?.Properties?.ProjectID ??
  (Array.isArray(c?.Links) ? Number(String(c.Links.find((l) => l.Rel === "self")?.Href).match(/\/project\/(\d+)/)?.[1]) : undefined);

if (created.status >= 200 && created.status < 300 && newId) {
  console.log(`\n--> created ProjectID = ${newId}. Verifying template population...`);
  const t = await api("GET", `/task?projectID=${newId}&$pagesize=100`, undefined);
  console.log(`tasks: ${unwrap(t.json).length}`);
  const ct = await api("GET", `/contract?projectID=${newId}&$pagesize=100`, undefined);
  console.log(`contracts:`, unwrap(ct.json).map((x) => ({ id: x.ContractID, name: x.ContractName, model: x.ContractModelType })));
  console.log(`\n*** ARCHIVE THIS PROJECT when done: ProjectID ${newId} (status 5=Archived or 6=Cancelled). ***`);
} else {
  console.log("\nNo project created (or no ID returned). Compare the errors above to the dry validate errors.");
}
