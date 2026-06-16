# Phase 3 kickoff — resource booking / allocation

**Created:** 2026-06-16. Paste the prompt below into a fresh Claude Code session in
this repo to start Phase 3. Phase 1 + Phase 2 are complete and merged to `main`
(HEAD `d582fb1`).

## Owner action item (do this in TimeLog's UI — not a coding task)

> **I (the owner) need to build some "template-sager" — source projects I can save
> as project templates (sagsskabeloner) in TimeLog's UI.**

Why: the REST API **cannot create or edit project templates** (see ADR 0003 /
CONTEXT.md › "No template write"). The only way to get a template is to build a
project shaped exactly the way I want, then choose **"Gem som skabelon"** in the
TimeLog UI. `create_project_from_template` then builds new projects from it.

Today the account has 4 templates (IDs 6, 7, 8, 9 — Fastpris/Medgået tid ×
Småsag/Stor-mellem sag). For Phase 3 and real use I want a richer, well-structured
set of template-sager: correct task tree (ydelsesfaser), the right contracts
(T&M / fixed-price) per task, sensible budgets and hourly rates. Build these
manually, then they'll appear in `list_project_templates` for the tools to use.

This is independent of the Phase 3 coding work below, but worth doing in parallel
so there are good templates to test and operate against.

## Phase 3 kickoff prompt

```
Vi skal i gang med Phase 3 af timelog_mcp: ressourcebooking/allokering.

REPO: C:\Users\Morten R Thomsen\Documents\Claude\Projects\timelog_mcp
BRANCH: main (Phase 1 + Phase 2 er færdige og merget, HEAD = d582fb1).

START MED AT LÆSE (i denne rækkefølge), før du foreslår noget:
- CONTEXT.md — domæne-glossar + "API conventions" (paging med $pagesize, PUT er
  full-replace, ingen DELETE, HATEOAS Actions selvbeskriver write-endpoints).
- docs/adr/0001–0006 — beslutningerne (localhost+per-admin PAT; ingen bulk; PUT
  full-replace; preview-and-confirm-tier; preview returnerer payload uden enrichment).
- docs/runbooks/empirical-create-tests.md — hvordan den empiriske gate køres, og
  hvorfor swaggerens 'required'-lister IKKE skal stoles på.
- docs/timelog/04-employees-and-resources.md — produktets ressource-features
  (Resource Planner, allokeringer, kapacitet, Resource Groups).
- docs/timelog-api/ — den scrapede REST-API-reference (find ressource-/workload-/
  allokerings-endpoints her og i timelog-api-spec.json).
- src/tools/ + src/registerTools.ts + src/constructionSchemas.ts — de eksisterende
  mønstre du skal følge (ToolDef, unwrapList, $pagesize=100, preview/execute via
  runWrite, Zod-shapes med beskrivelser, dansk UI-tekst / engelsk kode).

ARBEJDSMÅDE (vigtig — samme disciplin som Phase 2):
- Start med superpowers:brainstorming (eller /grill-with-docs) for at fastlægge
  Phase 3-scope SAMMEN med mig, før der skrives kode. Jeg er domæneeksperten.
- Stol IKKE på swaggerens required-lister eller enum-gæt. Sandheden hentes
  empirisk: kør tørre validate-* / GET-kald mod live-API'et og læs HATEOAS
  'Actions[].Fields[].Enums'. Der er ingen DELETE — irreversible skriv kræver
  preview-først og min eksplicitte accept.
- Subagenter kan ikke køre npm/npx/node her; kør builds/tests/live-kald fra
  controlleren (mig/dig). .env indeholder kun TIMELOG_PAT — base-URL er
  https://app5.timelog.com/ingholtconsult2/api/v1 (sættes via TIMELOG_BASE_URL).
  Test-projekt på kontoen: 1034 "TEST Aggersvolg Gods" (CustomerID 1100). DKK =
  CurrencyID 35.
- Læs din hukommelse for projektet (MEMORY.md): subagent-npx-restriction,
  put-is-full-replace, timelog-api-quirks, project-status.

MÅL: Afklar hvad Phase 3 skal eksponere (booking/allokering — hvilke endpoints,
hvilke read- vs write-værktøjer, hvordan det passer ind i preview/execute-tieren),
lav en plan, og byg det test-først som i Phase 1/2. Begynd med brainstorming —
byg ikke noget endnu.

NB: Jeg er ved at bygge nye template-sager i TimeLog-UI'en (se
docs/handoffs/2026-06-16-phase3-kickoff.md) — det kører parallelt og blokerer
ikke Phase 3.
```
