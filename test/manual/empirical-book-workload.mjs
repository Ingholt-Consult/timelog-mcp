// Dry/careful exploration of POST /workload/book and GET /employee-projection.
// /workload/book has NO validate-* twin and NO DELETE, so this does the MINIMUM:
// it first reads (employee-projection — safe), then probes /workload/book with
// near-empty bodies to learn required fields from the error messages, and only
// at the very end (guarded behind DO_REAL_BOOKING=1) creates ONE real booking on
// test project 1034 that must then be removed manually in the UI.
//
// Usage (from repo root, PowerShell):
//   $env:TIMELOG_BASE_URL="https://app5.timelog.com/ingholtconsult2/api/v1"
//   $env:TIMELOG_PAT="<token>"
//   node test/manual/empirical-book-workload.mjs
//   # then, only when ready for the single real write:
//   $env:DO_REAL_BOOKING="1"; node test/manual/empirical-book-workload.mjs

const baseUrl = process.env.TIMELOG_BASE_URL?.replace(/\/+$/, "");
const pat = process.env.TIMELOG_PAT;
if (!baseUrl || !pat) {
  console.error("Set TIMELOG_BASE_URL and TIMELOG_PAT");
  process.exit(1);
}
const headers = { Authorization: `Bearer ${pat}`, "content-type": "application/json", accept: "application/json" };

async function call(label, method, path, { query, body } = {}) {
  let url = `${baseUrl}${path}`;
  if (query) {
    const qs = Object.entries(query).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&");
    if (qs) url += `?${qs}`;
  }
  const res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  console.log(`\n=== ${label} (${res.status}) ===`);
  console.log(text ? text.slice(0, 4000) : "(empty body)");
  return { status: res.status, text };
}

// 1. Read capacity — safe, learns the projection response shape.
await call("projection: period (all employees)", "GET", "/employee-projection/get-in-period", {
  query: { startDate: "2026-06-22T00:00:00", endDate: "2026-06-26T00:00:00", includeAllEmployees: true },
});

// 2. Learn /workload/book required fields from progressively-empty bodies.
//    These are EXPECTED to 4xx/5xx and write nothing — confirm in the UI afterwards.
await call("book: empty", "POST", "/workload/book", { body: {} });
await call("book: ids only", "POST", "/workload/book", { body: { EmployeeId: 0, TaskId: 0 } });

// 3. HATEOAS: read any list/get that exposes the workload 'Actions' (field/enum source).
await call("book: GET probe for Actions", "GET", "/workload", {});

// 4. Probe whether Allocation has any route (stub hypothesis).
await call("allocation probe", "GET", "/allocation", {});

// 5. ONE real booking — only when explicitly enabled. Remove it manually in the UI.
if (process.env.DO_REAL_BOOKING === "1") {
  await call("book: REAL (task on project 1034)", "POST", "/workload/book", {
    body: { EmployeeId: 0 /* set a real UserID */, TaskId: 0 /* set a real TaskID on 1034 */, Hours: 1, StartDate: "2026-06-22T00:00:00", EndDate: "2026-06-22T00:00:00" },
  });
  await call("projection: AFTER booking", "GET", "/employee-projection/get-in-period", {
    query: { startDate: "2026-06-22T00:00:00", endDate: "2026-06-26T00:00:00", includeAllEmployees: true },
  });
}

console.log("\nDone. Confirm in the TimeLog UI what (if anything) was created, and remove any real booking manually.");
