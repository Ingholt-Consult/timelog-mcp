// The Resource Planner "plan WHEN allocated hours fall" (the user's step 2) uses a
// V2 endpoint that the browser hit successfully:
//   POST https://app5.timelog.com/ingholtconsult2/api/v2/resource-planner/book-hours  → 200
//   body: { resourceId, workItemId, unitType:"hours", value:"3",
//           startsAt, endsAt, hubConnectionId }   (cookie auth in the browser)
// resourceId/workItemId are large OPAQUE ids (e.g. 512272789219049472), NOT UserID/
// TaskID. This means v2 IS live (earlier "v2 not live" was wrong — wrong route guesses
// + /user/me is not a v2 controller). Open questions, probed here mostly read-only:
//   Q1 does our PAT (Bearer) authenticate against v2? (else it's cookie-only → unusable)
//   Q2 what does book-hours validate? (empty body → 400 model error if PAT works)
//   Q3 is there a v2 read that lists resourceId / workItemId so we can map UserID/TaskID?
//
// Only the empty-body POST touches book-hours and it should 400 (writes nothing).
//
// Usage (from repo root, PowerShell). Load .env stripping quotes (see CLAUDE.md):
//   Get-Content .env | Where-Object { $_ -match '=' } | ForEach-Object { $k,$v = $_ -split '=',2; Set-Item "Env:$($k.Trim())" ($v.Trim().Trim('"').Trim("'")) }
//   node test/manual/discover-v2-book-hours.mjs

const baseUrl = process.env.TIMELOG_BASE_URL?.replace(/\/+$/, "");
const pat = process.env.TIMELOG_PAT;
if (!baseUrl || !pat) {
  console.error("Set TIMELOG_BASE_URL and TIMELOG_PAT");
  process.exit(1);
}
const headers = { Authorization: `Bearer ${pat}`, "content-type": "application/json", accept: "application/json" };
const apiRoot = baseUrl.replace(/\/v\d+$/, ""); // .../api
const rp = `${apiRoot}/v2/resource-planner`;

async function call(label, method, url, body) {
  const res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  console.log(`\n=== ${label} (${res.status}) ===  ${method} ${url}`);
  console.log(text ? text.slice(0, 1200) : "(empty body)");
  return res.status;
}

// Q1+Q2: does PAT auth on v2, and what does book-hours validate? Empty body → expect
// 400 (PAT ok, writes nothing) | 401 (cookie-only) | 404 (wrong route).
await call("book-hours: empty body", "POST", `${rp}/book-hours`, {});

// Q3: find a v2 read that exposes resourceId / workItemId. Guess the planner's reads.
await call("rp root (GET)", "GET", rp);
await call("rp/resources (GET)", "GET", `${rp}/resources`);
await call("rp/work-items (GET)", "GET", `${rp}/work-items`);
await call("rp/get-resources (GET)", "GET", `${rp}/get-resources`);
const period = "startsAt=2026-06-01T00:00:00&endsAt=2026-06-30T00:00:00";
await call("rp/get-in-period (GET)", "GET", `${rp}/get-in-period?${period}`);

console.log(
  "\nDone. Steps write nothing (empty body → 400 expected). Read off:" +
    "\n - book-hours status: 400 = PAT works on v2; 401 = cookie-only; 404 = route name wrong." +
    "\n - any GET returning resourceId/workItemId we can map from UserID/TaskID.",
);
