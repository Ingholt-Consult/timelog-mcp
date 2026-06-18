# CLAUDE.md — timelog_mcp

En MCP-server der lader Claude administrere projekter i firmaets TimeLog-konto
via TimeLogs REST API (v1). Første use case: oprydning i projektindstillinger —
især masse-ændring af projekttyper.

## Sprog og begreber

- **Ubiquitous language:** [`docs/ubiquitous-language.md`](docs/ubiquitous-language.md)
  kobler hvert domæne-begreb sammen i tre spor — engelsk (kode/API), dansk UI
  (det brugeren ser i TimeLog), og API-felt/id. Slå begreber op her, så kode,
  API og den danske produkt-UI tales om uden oversættelsesfejl.
- **Autoritativ kode-glossary + API-konventioner:** [`CONTEXT.md`](CONTEXT.md).
  Ved konflikt om et kode-navn vinder `CONTEXT.md`.
- **Kode på engelsk, UI-tekst og brugerdialog på dansk** (se ordlisten for
  par-vis mapping).

## Referencer

- Produkt-reference (TimeLog-features): [`docs/timelog/`](docs/timelog/README.md)
- REST API v1-reference (felt-navne, enums, kvirks): [`docs/timelog-api/`](docs/timelog-api/README.md)
- Arkitektur-beslutninger: [`docs/adr/`](docs/adr/)
