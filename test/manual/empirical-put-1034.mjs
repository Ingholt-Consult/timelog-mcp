// Empirical PUT preservation test against project 1034 (ADR 0002 runbook).
// Changes ONE field (ProjectTypeID) and verifies the other fields are preserved.
// Read-only by default. Pass --write to actually PUT.
// Run: node --env-file=.env test/manual/empirical-put-1034.mjs [--write]
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

// GET /project/{id} wraps the record in { Properties: {...}, Links, Actions }.
const props = (resp) => resp?.Properties ?? resp;

const before = props(await client.get(`/project/${PROJECT_ID}`));
console.log("=== BEFORE (Properties) ===");
console.log(JSON.stringify(before, null, 2));

if (!DO_WRITE) {
  console.log("\n(read-only — pass --write to perform the PUT)");
  process.exit(0);
}

const body = { ProjectTypeID: NEW_PROJECT_TYPE_ID };
console.log("\n=== PUT BODY (only this field) ===");
console.log(JSON.stringify(body, null, 2));
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
if (changed.length === 0) console.log("  (nothing changed — unexpected)");

console.log("\n=== VERDICT ===");
const onlyTypeChanged = changed.length === 1 && changed[0] === "ProjectTypeID";
if (onlyTypeChanged && after.ProjectTypeID === NEW_PROJECT_TYPE_ID) {
  console.log("PASS — only ProjectTypeID changed (preserved); partial update is correct (ADR 0002 holds).");
} else {
  console.log("FAIL/REVIEW — unexpected field changes:", changed.join(", "));
}
