// Empirical gate — round 2. Uses the existing test project (1034) and its two
// contracts to (a) READ real records so we can see the actual enum values
// (ContractStatus, ContractTypeID, PaymentRecognitionModel, …), and (b) push the
// task/payment validate-* calls past the round-1 500s by supplying real IDs.
//
// Every call here is a GET (read) or a validate-* POST (dry). Nothing is created.
//
// Usage (same env as round 1, from the phase2 worktree):
//   node test/manual/empirical-create-validate-2.mjs

const baseUrl = process.env.TIMELOG_BASE_URL?.replace(/\/+$/, "");
const pat = process.env.TIMELOG_PAT;
if (!baseUrl || !pat) {
  console.error("Set TIMELOG_BASE_URL and TIMELOG_PAT");
  process.exit(1);
}

const PROJECT_ID = 1034;

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

// --- 1. READ the real records on project 1034 (resolves enum meanings) ---

const contractsResp = await api("GET", `/contract?projectID=${PROJECT_ID}&$pagesize=100`);
show(`GET /contract?projectID=${PROJECT_ID}`, contractsResp);
const contracts = unwrap(contractsResp.json);
const firstContractId = contracts[0]?.ContractID ?? contracts[0]?.ProjectSubContractID;
console.log(`\n--> ContractIDs seen: ${contracts.map((c) => c.ContractID ?? c.ProjectSubContractID).join(", ")}`);
console.log(`--> using firstContractId = ${firstContractId}`);

const tasksResp = await api("GET", `/task?projectID=${PROJECT_ID}&$pagesize=100`);
show(`GET /task?projectID=${PROJECT_ID}`, tasksResp);
const tasks = unwrap(tasksResp.json);
const aTaskTypeId = tasks.find((t) => t.TaskTypeID)?.TaskTypeID;
console.log(`\n--> a TaskTypeID seen on real tasks = ${aTaskTypeId}`);

const ttResp = await api("GET", `/TaskType?$pagesize=100`);
const taskTypes = unwrap(ttResp.json);
console.log(`\n--> ${taskTypes.length} task types; sample:`, taskTypes.slice(0, 3).map((t) => ({ TaskTypeID: t.TaskTypeID, Name: t.Name })));
const taskTypeId = aTaskTypeId ?? taskTypes[0]?.TaskTypeID;

// --- 2. TASK validate — escalate with a real ProjectID ---

show("task validate: ProjectID only (real project)", await api("POST", "/task/validate-new-task", { ProjectID: PROJECT_ID }));
show("task validate: + TaskName", await api("POST", "/task/validate-new-task", { ProjectID: PROJECT_ID, TaskName: "API-TEST opgave" }));
show(
  "task validate: + TaskName + TaskTypeID",
  await api("POST", "/task/validate-new-task", { ProjectID: PROJECT_ID, TaskName: "API-TEST opgave", TaskTypeID: taskTypeId }),
);

// --- 3. PAYMENT validate — with a real contract ---

show(
  "payment validate: real contract + name + amount",
  await api("POST", "/payment/validate-new-payment", {
    ProjectID: PROJECT_ID,
    ProjectSubContractID: firstContractId,
    Name: "API-TEST rate",
    Amount: 1000,
  }),
);
show(
  "payment validate: contract link only",
  await api("POST", "/payment/validate-new-payment", { ProjectID: PROJECT_ID, ProjectSubContractID: firstContractId }),
);

console.log("\nDone. All calls were GET reads or validate-* (dry). Nothing should have been created.");
