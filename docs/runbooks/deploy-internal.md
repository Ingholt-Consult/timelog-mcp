# Deploy: intern, always-on TimeLog MCP-server

Sådan kører TimeLog MCP-serveren permanent på en intern Windows-maskine (fx
filserveren), så kollegaer kan bruge den fra Claude uden at klone repoet eller
starte noget op selv. Skrevet til drift (IT) — ikke til udvikling.

## Hvad serveren er (og ikke er)

En lille **Node.js-netværkstjeneste**. Den lytter på `POST /mcp`, oversætter
MCP-kald til kald mod TimeLogs REST API og sender svaret retur. Den

- **rører ikke filsystemet** — ingen brug for adgang til drev/shares,
- **gemmer ingen hemmeligheder** — hver bruger sender sin egen TimeLog-PAT i
  `Authorization`-headeren pr. request; serveren lagrer den ikke og logger den ikke,
- **ringer kun udad** til `app5.timelog.com` (TimeLogs API) over HTTPS,
- er **stateless** — én MCP-server pr. request, ingen session-state på disk.

Den kan derfor dele en maskine med andre roller (fx en filserver) uden at kunne
påvirke dem, og kan køre under en begrænset (non-admin) konto.

## Forudsætninger

| Krav | Detalje |
|---|---|
| Node.js | LTS (≥ 20.12 — bruger `process.loadEnvFile`). `node:22` anbefales. |
| Intern port | Én port (default `8787`), eller `443` hvis reverse proxy står foran. |
| DNS | En intern A-record, fx `timelog-mcp.ingholt.dk` → maskinens interne IP. |
| TLS-cert | Til den interne hostname (se Caddy nedenfor, eller eksisterende IIS). |
| Udgående 443 | Til `app5.timelog.com`. |

## Miljøvariabler

| Variabel | Påkrævet | Værdi |
|---|---|---|
| `TIMELOG_BASE_URL` | **Ja** | `https://app5.timelog.com/ingholtconsult2/api/v1` |
| `PORT` | Nej | Lytteport (default `8787`). |
| `ALLOWED_HOSTS` | Anbefalet | Komma-separeret host-allowlist, der slår DNS-rebinding-beskyttelse til på `/mcp`. Sæt til den udadvendte hostname, fx `timelog-mcp.ingholt.dk`. Uden den er beskyttelsen slået fra (fint lokalt, men sæt den i drift). |
| `TIMELOG_PAT` | **Nej** | Lad være tom. Hver bruger sender sin egen PAT i headeren — en server-PAT her ville gøre alle handlinger til én delt identitet. |

## Vej A — Native Node + Windows Service (NSSM) — anbefalet på filserveren

1. **Hent koden og byg** (et sted serveren kan læse, fx `C:\Services\timelog-mcp`):
   ```powershell
   git clone https://github.com/Ingholt-Consult/timelog-mcp.git C:\Services\timelog-mcp
   cd C:\Services\timelog-mcp
   npm ci
   npm run build
   ```
2. **Installér [NSSM](https://nssm.cc/)** (Non-Sucking Service Manager) og opret tjenesten:
   ```powershell
   nssm install TimeLogMCP "C:\Program Files\nodejs\node.exe" "C:\Services\timelog-mcp\dist\index.js"
   nssm set TimeLogMCP AppDirectory "C:\Services\timelog-mcp"
   nssm set TimeLogMCP AppEnvironmentExtra "TIMELOG_BASE_URL=https://app5.timelog.com/ingholtconsult2/api/v1" "PORT=8787" "ALLOWED_HOSTS=timelog-mcp.ingholt.dk"
   nssm set TimeLogMCP Start SERVICE_AUTO_START
   nssm set TimeLogMCP AppStdout "C:\Services\timelog-mcp\logs\out.log"
   nssm set TimeLogMCP AppStderr "C:\Services\timelog-mcp\logs\err.log"
   nssm start TimeLogMCP
   ```
   Kør evt. tjenesten under en dedikeret, begrænset servicekonto (`nssm set TimeLogMCP ObjectName <konto> <kodeord>`). Den behøver ingen adgang til drev/shares.
3. NSSM genstarter automatisk processen ved crash, og `SERVICE_AUTO_START` starter den ved reboot.

## Vej B — Docker (alternativ, hvis maskinen kører containere)

```powershell
docker build -t timelog-mcp .
docker run -d --name timelog-mcp --restart unless-stopped -p 8787:8787 `
  -e TIMELOG_BASE_URL=https://app5.timelog.com/ingholtconsult2/api/v1 `
  -e ALLOWED_HOSTS=timelog-mcp.ingholt.dk `
  timelog-mcp
```
Imaget har en indbygget `HEALTHCHECK` mod `/health` og kører som non-root.

## TLS / reverse proxy

MCP-klienter vil have HTTPS for et ikke-localhost endpoint, og PAT'er flyder i
headers — så afslut TLS foran tjenesten. To muligheder:

**Caddy** (enklest — automatisk cert). Selv for en intern-only hostname kan Caddy
hente et gyldigt Let's Encrypt-cert via DNS-01-challenge mod `ingholt.dk`:
```
timelog-mcp.ingholt.dk {
    reverse_proxy 127.0.0.1:8787
    # tls med DNS-provider-modul til ingholt.dk's DNS (se Caddy DNS-01 docs)
}
```

**IIS** (hvis allerede installeret): opret et site bundet til `timelog-mcp.ingholt.dk`
med certifikatet, og brug Application Request Routing (ARR) som reverse proxy mod
`http://127.0.0.1:8787`.

Sæt `ALLOWED_HOSTS=timelog-mcp.ingholt.dk` så transporten kun accepterer requests
med den rigtige Host-header.

## Verifikation

```powershell
# Sundhed (ingen PAT — skal svare {"status":"ok"}):
curl https://timelog-mcp.ingholt.dk/health

# Fuldt MCP-kald med en rigtig PAT (bekræfter identiteten):
#   tilføj som klient (se onboarding) og kør whoami-værktøjet fra Claude.
```

## Onboarding af kollegaer

Hver kollega gør dette **én gang** (ingen clone, ingen node):

1. Hent en personlig token: TimeLog → **Systemadministration → Personal Access Tokens**.
2. Tilføj serveren i Claude Code:
   ```
   claude mcp add --transport http timelog https://timelog-mcp.ingholt.dk/mcp \
     --header "Authorization: Bearer <din-TimeLog-PAT>"
   ```
   (I Claude Desktop: tilføj en custom connector med samme URL og header.)
3. Test med fx *"hvem er jeg i TimeLog?"* (kører `whoami`).

PAT'en ligger kun i den enkeltes egen Claude-config og bliver sendt direkte til
serveren pr. kald — den deles ikke og lagres ikke centralt.

## Opdatering til en ny version

```powershell
cd C:\Services\timelog-mcp
git pull
npm ci
npm run build
nssm restart TimeLogMCP      # eller: docker build … && docker restart timelog-mcp
```

## Sikkerhedsnoter

- **PAT'en logges aldrig** — tjenesten logger ikke `Authorization`-headeren, og
  startup-loggen indeholder kun port/URL.
- **Per-bruger auth** — ingen delt hemmelighed på serveren; en kompromitteret PAT
  fornys i TimeLog uden at røre serveren.
- **Mindste rettigheder** — kør under en non-admin konto uden drev-/share-adgang.
- **Intern-only** — hold porten på firmanetværket; intet behov for at udstille den
  mod internettet, når brugerne er på LAN/VPN.
