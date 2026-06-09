# Write tools act on one project; no bulk tool

Each write tool (`update_project`, `update_project_status`) mutates exactly one
project per call. There is deliberately **no bulk/mass-update tool**. Mass changes
(the headline use case) are orchestrated in the conversation: a read tool lists
the matching projects, the user confirms the list, then the per-project writes run
with a result reported for each.

## Why

The mass-change use case is irreversible and high-impact. The TimeLog API has no
bulk endpoint anyway, so a "bulk tool" would just be a server-side loop — a
runaway hazard with no human checkpoint. Keeping writes single-project makes the
per-call granularity itself the safety mechanism, and puts the confirmation where
a human actually sees it: the conversation (list → confirm → run → per-project
report).

## Consequences

- A future engineer may be tempted to "optimize" by adding a bulk tool; this is a
  deliberate no. Mass operations stay conversation-orchestrated.
- Batch runs should report success/failure per project so a partial failure is
  visible and resumable.
