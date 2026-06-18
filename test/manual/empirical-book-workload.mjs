// Dry/careful exploration of POST /workload/book, GET /employee-projection, and the
// /allocation route. /workload/book has NO validate-* twin and NO DELETE, so reads
// and empty-body probes come first; ONE real booking is guarded behind
// DO_REAL_BOOKING=1 and must be removed manually in the Resource Planner UI.
//
// Usage (from repo root, PowerShell). Load .env stripping quotes (see CLAUDE.md):
//   Get-Content .env | Where-Object { $_ -match '=' } | ForEach-Object { $k,$v = $_ -split '=',2; Set-Item "Env:$($k.Trim())" ($v.Trim().Trim('"').Trim("'")) }
//
//   # Round 2a — dry (reads + /allocation method probes + task list for 1034):
//   node test/manual/empirical-book-workload.mjs
//
//   # Round 2b — ONE real booking (pick an in-progress TaskID from round 2a):
//   $env:DO_REAL_BOOKING="1"; $env:BOOK_TASK_ID="<TaskID on 1034>"; node test/manual/empirical-book-workload.mjs
//   # optional overrides: BOOK_EMPLOYEE_ID (default 64), BOOK_HOURS (default 2),
//   #                     BOOK_START (default 2026-06-22), BOOK_END (default 2026-06-23)

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

// 1. Read capacity — safe, confirms auth + projection shape.
await call("projection: period (all employees)", "GET", "/employee-projection/get-in-period", {
  query: { startDate: "2026-06-22T00:00:00", endDate: "2026-06-26T00:00:00", includeAllEmployees: true },
});

// 2. List tasks on test project 1034 so you can pick a real, in-progress TaskID.
const tasks = await call("tasks on project 1034", "GET", "/task", { query: { projectID: 1034, $pagesize: 100 } });
try {
  const rows = (JSON.parse(tasks.text).Entities ?? []).map((e) => e.Properties ?? e);
  console.log("\n--- TaskID | status | name (pick an in-progress / 'I gang' task) ---");
  for (const t of rows) {
    console.log(`${t.TaskID} | status=${t.TaskStatus ?? t.taskStatus ?? t.Status ?? "?"} | ${t.Name ?? t.TaskName ?? ""}`);
  }
} catch {
  console.log("(could not parse task list)");
}

// 3. /workload/book required-field probe (empty body → 400, writes nothing).
await call("book: empty", "POST", "/workload/book", { body: {} });

// 4. /allocation method probes — does a WRITE route exist? GET returned 405 before
//    (route exists, GET unsupported). Empty bodies should 400/405 and write nothing.
await call("allocation: GET", "GET", "/allocation", {});
await call("allocation: POST empty", "POST", "/allocation", { body: {} });
await call("allocation: PUT empty", "PUT", "/allocation", { body: {} });

// 5. ONE real booking — only when explicitly enabled. Remove it manually in the UI.
if (process.env.DO_REAL_BOOKING === "1") {
  const employeeId = Number(process.env.BOOK_EMPLOYEE_ID ?? 64);
  const taskId = Number(process.env.BOOK_TASK_ID ?? 0);
  const hours = Number(process.env.BOOK_HOURS ?? 2);
  const start = `${process.env.BOOK_START ?? "2026-06-22"}T00:00:00`;
  const end = `${process.env.BOOK_END ?? "2026-06-23"}T00:00:00`;
  if (!taskId) {
    console.error("\nSet BOOK_TASK_ID to a real in-progress TaskID on project 1034 (see the list above).");
    process.exit(1);
  }
  await call("book: REAL", "POST", "/workload/book", {
    body: { EmployeeId: employeeId, TaskId: taskId, Hours: hours, StartDate: start, EndDate: end },
  });
  console.log(
    `\nBooked ${hours}h for EmployeeId ${employeeId} on TaskId ${taskId} over ${start.slice(0, 10)}..${end.slice(0, 10)}.` +
      "\n>>> Now open the Resource Planner in TimeLog and check: did it place all hours on the start day," +
      "\n    or spread them across the period? Then REMOVE the booking manually (no API delete).",
  );
}

console.log("\nDone. Confirm in the TimeLog UI what (if anything) was created, and remove any real booking manually.");
