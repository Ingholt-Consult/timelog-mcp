// Phase 2 scoping exploration — READ ONLY, no writes.
// Answers: which project templates, contract models, and existing contracts
// does the account already have? Informs which contract-create tools we need.
// Run: node --env-file=.env test/manual/explore-phase2-reads.mjs
import { TimeLogClient } from "../../dist/client.js";

const baseUrl = (process.env.TIMELOG_BASE_URL ?? "").replace(/\/+$/, "");
const pat = process.env.TIMELOG_PAT;
if (!baseUrl || !pat) {
  console.error("Missing TIMELOG_BASE_URL or TIMELOG_PAT (use --env-file=.env).");
  process.exit(1);
}
const client = new TimeLogClient({ baseUrl, pat });

const rows = (resp) => (resp?.Entities ?? []).map((e) => e?.Properties ?? e);

async function dump(title, path) {
  try {
    const resp = await client.get(path);
    const list = rows(resp);
    console.log(`\n=== ${title} (${path}) — ${resp?.Properties?.TotalRecord ?? list.length} records ===`);
    for (const r of list) console.log(JSON.stringify(r));
  } catch (err) {
    console.log(`\n=== ${title} (${path}) — ERROR: ${err.message} ===`);
  }
}

await dump("Project templates", "/project-template/get-all?$pagesize=100");
await dump("Contract models", "/ContractModel?$pagesize=100");
await dump("Existing contracts", "/contract?$pagesize=100");
await dump("Task types", "/TaskType?$pagesize=100");
await dump("Payment methods (status 0)", "/payment-method/0?$pagesize=100");
await dump("Payment terms", "/payment-term?$pagesize=100");
