// Dry exploration of the Phase 2 validate-* endpoints. Creates NOTHING (provided
// Step 0 of the runbook confirms validate is dry). Prints each validation outcome
// so you can learn required fields / binding from the errors.
//
// Usage (from repo root, PowerShell):
//   $env:TIMELOG_BASE_URL="https://app5.timelog.com/ingholtconsult2/api/v1"
//   $env:TIMELOG_PAT="<token>"
//   node test/manual/empirical-create-validate.mjs

const baseUrl = process.env.TIMELOG_BASE_URL?.replace(/\/+$/, "");
const pat = process.env.TIMELOG_PAT;
if (!baseUrl || !pat) {
  console.error("Set TIMELOG_BASE_URL and TIMELOG_PAT");
  process.exit(1);
}

async function validate(label, path, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${pat}`, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  console.log(`\n=== ${label} (${res.status}) ===`);
  console.log(text || "(empty body)");
}

// Progressively reveal required fields by sending near-empty bodies.
await validate("project: empty", "/project/validate-create-from-template", {});
await validate("project: template only", "/project/validate-create-from-template", { ProjectTemplateID: 0 });

await validate("task: empty", "/task/validate-new-task", {});
await validate("task: project only", "/task/validate-new-task", { ProjectID: 0 });

await validate("TM contract: empty", "/contract/validate-time-material-basic-contract", {});
await validate("FP contract: empty", "/contract/validate-fixed-price-basic-contract", {});

await validate("payment: empty", "/payment/validate-new-payment", {});

console.log("\nDone. Confirm in the TimeLog UI that nothing was created.");
