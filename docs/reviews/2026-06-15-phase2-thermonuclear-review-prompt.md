# Prompt: thermo-nuclear code quality review af Phase 2

Kopiér blokken nedenfor ind i en ny Claude Code-session i dette repo.

---

```
Kør /thermo-nuclear-code-quality-review på Phase 2-arbejdet i dette repo.

REPO: C:\Users\Morten R Thomsen\Documents\Claude\Projects\timelog_mcp
BRANCH: phase2-construction (base: main)

REVIEW-SCOPE — kun ændringerne på denne branch:
    git diff main..phase2-construction
Ignorér plan-filen docs/superpowers/plans/2026-06-15-timelog-mcp-phase2.md (det er bare planen).
Fokusér på src/, test/, CONTEXT.md, README.md, docs/runbooks/.

HVAD ER BYGGET:
En localhost MCP-server (TypeScript ESM, @modelcontextprotocol/sdk, Zod, Vitest) der
administrerer TimeLog-projekter via TimeLogs REST API v1. Phase 2 tilføjer 13 værktøjer:
- 8 reads: src/tools/constructionReads.ts (templates, tasks, task types, contracts, payments, hourly rates)
- 5 preview/execute writes: src/tools/constructionWrites.ts (create project-from-template,
  task/sub-task, T&M-kontrakt, fixed-price-kontrakt, payment)
Delte dele: src/client.ts fik post(); src/tools/unwrap.ts (unwrapList); src/tools/preview.ts
(runWrite preview/execute-router + bodyFromArgs); src/constructionSchemas.ts (Zod input-shapes);
registrering i src/registerTools.ts.
Domæne-glossar + konventioner i CONTEXT.md. Designspec: docs/superpowers/specs/2026-06-12-timelog-mcp-phase2-design.md.

BEVIDSTE BESLUTNINGER — IKKE bugs, lad være med at rapportere dem som fejl:
- Alle create-model-felter er .optional(): TimeLogs swagger 'required'-lister er tomme og
  beviseligt upålidelige; rigtige krav fastlægges af en senere empirisk gate (ikke kørt endnu).
- Håndhævelse af preview-før-execute er SOFT (kun via tool-beskrivelser) — ejerens valg, intet token.
- Preview-enrichment (navneopslag) er bevidst best-effort; runWrite sluger summarizer-fejl.
- Ingen DELETE/update/bulk-værktøjer (ADR 0003) — API'et har ingen DELETE; rettelser sker via arkivering.
- Template-write findes ikke i API'et; substituttet er "byg kildeprojekt → gem som skabelon i UI".
- Deployment: localhost, per-admin egen PAT (ADR 0001).

ALLEREDE KENDTE OPFØLGNINGSPUNKTER (rapportér gerne nyt, men disse er noteret):
- Empirisk gate skal afklare: ContractTypeID, enums PaymentRecognitionModel/ContractStatus/UnitType,
  og de reelt påkrævede felter pr. endpoint. Se docs/runbooks/empirical-create-tests.md.
- /customer-responsens form (raw array vs TAFList) er ikke endeligt afklaret; list_customers og
  enrichment-opslaget behandler den lidt forskelligt — afstemmes når gaten er kørt.

STATUS: 64/64 tests grønne, `npm run build` (tsc) ren. Find gerne det de eksisterende tests og
to tidligere review-runder ikke fangede — korrekthed, edge cases, sikkerhed på den uigenkaldelige
skrivesti, og kvalitet/simplifikation. Vær skeptisk og citér file:line.
```

---

## Kontekst (til dig selv, ikke en del af prompten)

- Branchen `phase2-construction` er **ikke merget eller pushet** — den ligger urørt og klar til review. HEAD var `b07834e` da prompten blev skrevet (2026-06-15).
- Arbejdet er allerede gennemgået af en spec-compliance-review og en code-quality-review undervejs; den thermo-nuclear-runde er en ekstra, hårdere kontrol før merge.
