# Streamable HTTP transport, multi-tenant-ready, run locally for v1

We use the MCP **Streamable HTTP** transport (not stdio, the usual local default)
and design the server **multi-tenant**: the TimeLog PAT is read from the request's
`Authorization` header when present, falling back to a local `TIMELOG_PAT` env var.
For v1 each user runs the server locally (localhost, own PAT in `.env`); no shared
host is deployed yet.

## Why

The PAT is employee-specific — it acts on behalf of the User it belongs to. A
shared hosted server therefore must never bake in one PAT; each user must supply
their own. Making the server read the PAT per-request from the header keeps it
stateless and stores no secrets, so the *same code* can later be deployed
multi-tenant (Render/Railway/Fly/Azure) without a rewrite — it becomes a deploy,
not a re-architecture. We picked HTTP over stdio specifically to keep that path
open for the one or two colleagues who may need it.

## Consequences

- Local runs must bind to `127.0.0.1` and validate the `Origin` header to prevent
  DNS-rebinding attacks (MCP Streamable HTTP guidance).
- When hosted later: add TLS (host-provided) and require the per-request PAT; do
  not introduce server-side secret storage.
