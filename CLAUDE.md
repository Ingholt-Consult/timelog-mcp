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

## Manuelle / live tests (empiriske gates)

Subagenter kan **ikke** køre `npm`/`npx`/`node` her, og `.env` er adgangs-spærret
for Claude — så de manuelle scripts i `test/manual/` (empiriske gates mod det
levende API) køres af **brugeren** i en egen PowerShell. Sådan guides det:

1. **Sæt miljøvariablerne fra `.env` (strip anførselstegn!).** Værdierne i `.env`
   står med `"…"` om sig, og de anførselstegn skal væk — ellers sendes tokenet som
   `"B4…"` inkl. citationstegn og API'et svarer **401 Authorization has been
   denied**. Denne one-liner loader `.env` korrekt:

   ```powershell
   Get-Content .env | Where-Object { $_ -match '=' } | ForEach-Object { $k,$v = $_ -split '=',2; Set-Item "Env:$($k.Trim())" ($v.Trim().Trim('"').Trim("'")) }
   ```

2. **Tjek at de er sat rent** (PAT maskeres):

   ```powershell
   "TIMELOG_BASE_URL = '$env:TIMELOG_BASE_URL'"
   if ($env:TIMELOG_PAT) { "TIMELOG_PAT = SAT (længde $($env:TIMELOG_PAT.Length), starter med '$($env:TIMELOG_PAT.Substring(0,[Math]::Min(6,$env:TIMELOG_PAT.Length)))…')" } else { "TIMELOG_PAT = IKKE SAT" }
   ```

   `TIMELOG_BASE_URL` skal være `https://app5.timelog.com/ingholtconsult2/api/v1`.
   PAT'en må **ikke** starte med `"`. Får du stadig 401 efter en ren load, er
   tokenet sandsynligvis udløbet (forny i TimeLog → Systemadministration →
   Personal Access Tokens).

3. **Kør scriptet** (fra repo-roden), fx:

   ```powershell
   node test/manual/empirical-book-workload.mjs
   ```

   Test-projekt på kontoen: **1034 "TEST Aggersvolg Gods"** (CustomerID 1100).
   Der er **ingen DELETE** i API'et — alt der skrives skal ryddes manuelt i UI'en.

## Referencer

- Produkt-reference (TimeLog-features): [`docs/timelog/`](docs/timelog/README.md)
- REST API v1-reference (felt-navne, enums, kvirks): [`docs/timelog-api/`](docs/timelog-api/README.md)
- Arkitektur-beslutninger: [`docs/adr/`](docs/adr/)
- Empiriske gate-runbooks: [`docs/runbooks/`](docs/runbooks/)
