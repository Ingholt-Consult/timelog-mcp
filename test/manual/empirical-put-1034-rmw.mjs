// Empirical PUT test, read-modify-write variant (ADR 0002 follow-up).
// Finding: PUT /project/{id} is a FULL replace, not a partial update — sending
// only the changed field nulls everything else (400 because Name/CustomerID/
// ProjectManagerID are required). This GETs the project, merges ProjectTypeID,
// and PUTs the full update model.
// Run: node --env-file=.env test/manual/empirical-put-1034-rmw.mjs [--write]
import { TimeLogClient } from "../../dist/client.js";

const PROJECT_ID = 1034;
const DO_WRITE = process.argv.includes("--write");
const NEW_PROJECT_TYPE_ID = 257; // "Notat"

const baseUrl = (process.env.TIMELOG_BASE_URL ?? "").replace(/\/+$/, "");
const pat = process.env.TIMELOG_PAT;
if (!baseUrl || !pat) {
  console.error("Missing TIMELOG_BASE_URL or TIMELOG_PAT (use --env-file=.env).");
  process.exit(1);
}
const client = new TimeLogClient({ baseUrl, pat });
const props = (resp) => resp?.Properties ?? resp;

const before = props(await client.get(`/project/${PROJECT_ID}`));
console.log("=== BEFORE (Properties) ===");
console.log(JSON.stringify(before, null, 2));

// Build the FULL update model from the current record. Note the field rename:
// GET exposes `No`, the update model wants `ProjectNo`. LanguageID is NOT
// returned by GET, so it cannot be preserved here (documented limitation).
const body = {
  Name: before.Name,
  ProjectNo: before.No,
  CustomerID: before.CustomerID,
  ContactID: before.ContactID,
  Description: before.Description,
  ProjectManagerID: before.ProjectManagerID,
  ProjectTypeID: NEW_PROJECT_TYPE_ID, // the one intended change
  ProjectCategoryID: before.ProjectCategoryID,
  BudgetWorkHours: before.BudgetWorkHours,
  BudgetWorkAmount: before.BudgetWorkAmount,
};
console.log("\n=== PUT BODY (full model, ProjectTypeID merged) ===");
console.log(JSON.stringify(body, null, 2));

if (!DO_WRITE) {
  console.log("\n(read-only — pass --write to perform the PUT)");
  process.exit(0);
}

const putResult = await client.put(`/project/${PROJECT_ID}`, body);
console.log("PUT returned:", JSON.stringify(putResult, null, 2));

const after = props(await client.get(`/project/${PROJECT_ID}`));
console.log("\n=== AFTER (Properties) ===");
console.log(JSON.stringify(after, null, 2));

console.log("\n=== DIFF (changed fields) ===");
const keys = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])].sort();
const changed = [];
for (const k of keys) {
  const b = JSON.stringify(before?.[k]);
  const a = JSON.stringify(after?.[k]);
  if (b !== a) {
    changed.push(k);
    console.log(`  CHANGED ${k}: ${b} -> ${a}`);
  }
}
if (changed.length === 0) console.log("  (nothing changed)");

console.log("\n=== VERDICT ===");
const onlyTypeChanged = changed.length === 1 && changed[0] === "ProjectTypeID";
if (onlyTypeChanged && after.ProjectTypeID === NEW_PROJECT_TYPE_ID) {
  console.log("PASS — read-modify-write set ProjectTypeID and preserved all other fields.");
} else {
  console.log("REVIEW — changed fields:", changed.join(", ") || "(none)");
}
