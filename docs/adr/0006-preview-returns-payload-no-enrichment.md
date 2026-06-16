# Preview returns the payload, not server-enriched display names

A write tool's `preview` mode returns `{ mode, validation, payload }` — the
outcome of the dry `validate-*` call and the exact body that would be sent. It
does **not** look up and attach display names (template name, customer name,
project name, …) for the IDs in the payload.

## Why

The original Phase 2 design (see `docs/superpowers/specs/2026-06-12-…-design.md`
§ Preview/execute) had each write tool run a best-effort "summarizer" that
re-fetched the supplied IDs and echoed their names back into the preview. On
review (2026-06-15, thermo-nuclear) that layer was deleted, because it was the
worst of both worlds:

- It re-resolved IDs the **caller had just supplied**. The agent resolves a name
  to an ID (via `list_project_templates`, `list_customers`, …) immediately before
  calling the write tool, so it already holds the name and composes the
  human-facing confirmation itself. The server re-fetching the same name added a
  round-trip to answer a question the caller already knew the answer to.
- It used **two different lookup strategies** for one job — a full-list scan
  (`findById`, capped at `$pagesize=100`, so it silently failed to resolve any ID
  past the first page) and a single-record GET (`getOneName`) — roughly 80 lines
  coupling the write tools to six read endpoints.
- It was **best-effort and swallowed its own errors**: any failure returned
  `summary: undefined` with no signal, so the feature could quietly do nothing.

Deleting it removes that coupling and that silent-failure surface. The preview
still gives the human everything needed to confirm an irreversible write: the
validation result and the verbatim payload (IDs and all). Turning IDs into names
for the confirmation message is the agent's job, from context it already has.

## Consequences

- `runWrite` no longer accepts a `summarize` option; `preview.ts` no longer
  defines a `Summarizer` type. `constructionWrites.ts` has no `findById` /
  `getOneName` helpers — each write tool is a thin `runWrite(...)` call.
- Preview output shape is `{ mode: "preview", validation, payload }`.
- This is a **closed decision, not deferred work.** There is no stub, flag, or
  hook left behind for a later phase to re-introduce server-side enrichment. If a
  future need for it appears, it should be re-argued from scratch, not resumed.
- Unaffected: the soft preview-before-execute convention (ADR 0003 family,
  tool descriptions) and the preview-default `mode` switch are unchanged.
