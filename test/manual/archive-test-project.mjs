// Cleanup: archive the Step 2 test project. PUT /project/{id}/status with
// ProjectStatus 5 = Archived (OrderStatus enum: 0 Quote..5 Archived, 6 Cancelled).
// Verify the project in the UI FIRST, then run this.
//   node test/manual/archive-test-project.mjs

const baseUrl = process.env.TIMELOG_BASE_URL?.replace(/\/+$/, "");
const pat = process.env.TIMELOG_PAT;
if (!baseUrl || !pat) {
  console.error("Set TIMELOG_BASE_URL and TIMELOG_PAT");
  process.exit(1);
}

const PROJECT_ID = 1179;
const STATUS = 5; // 5 = Archived (use 6 for Cancelled)

const res = await fetch(`${baseUrl}/project/${PROJECT_ID}/status`, {
  method: "PUT",
  headers: { Authorization: `Bearer ${pat}`, "content-type": "application/json", accept: "application/json" },
  body: JSON.stringify({ ProjectStatus: STATUS, AllowTimeTracking: false }),
});
const text = await res.text();
console.log(`PUT /project/${PROJECT_ID}/status -> ${res.status}`);
console.log(text || "(empty body)");
console.log(`\nDone. Confirm in the UI that project ${PROJECT_ID} is now Archived.`);
