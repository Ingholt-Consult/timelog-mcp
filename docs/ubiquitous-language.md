# Ubiquitous language — TimeLog MCP

Fælles sprog for projektet: ét begreb, tre navne. Hvert domæne-begreb har et
**engelsk navn** (det navn TimeLogs produkt og REST API bruger — og som koden
skal bruge), et **dansk UI-navn** (den label brugeren ser i TimeLog i browseren
på dansk), og et **API-felt/identifier** (det felt-navn API'et faktisk sender/
modtager). Formålet er, at kode, API og den danske produkt-UI kan tales om uden
oversættelsesfejl.

## Sådan læses og bruges sproget

- **Kode skrives på engelsk.** Variabel-, funktions-, type- og feltnavne følger
  TimeLogs engelske API-model (`ProjectTypeID`, `CustomerID` osv.). Dette er en
  fast regel — også selvom brugeren arbejder i den danske UI.
- **UI-tekst og samtale med brugeren er på dansk.** Når en tool-beskrivelse,
  fejlbesked eller dialog vises for brugeren, bruges det danske UI-navn (Projekt,
  Kunde, Opgave), så det matcher det, brugeren ser i TimeLog.
- **API-feltet er sandheden om wire-formatet.** Bemærk at TimeLog ofte bruger
  forskellige navne ved læsning og skrivning (fx projektnummer er `No` ved
  læsning, men `ProjectNo` ved skrivning). Det fremgår af kolonnen.
- **`CONTEXT.md` er den autoritative kode-glossary.** Denne fil udvider den med
  de danske UI-termer og dækker hele produktet bredt; ved konflikt om et
  kode-navn vinder [`../CONTEXT.md`](../CONTEXT.md). Produkt-referencen
  ([`timelog/`](timelog/README.md)) og API-referencen
  ([`timelog-api/`](timelog-api/README.md)) er kilderne bag termerne.
- **MCP'ens fokus** er **Projekter** og **Medarbejdere / ressourcer** (se
  [`timelog/README.md`](timelog/README.md)); disse to domæner er markeret som
  primære nedenfor. De øvrige områder er med for sammenhængens skyld.

---

## Projekter (primært domæne)

| Engelsk (kode/API) | Dansk UI | API-felt / id | Betydning og noter |
|---|---|---|---|
| Project | Projekt | `ProjectID` (int), `ID` (uuid) | Den centrale enhed i TimeLog — det denne server administrerer. Tilhører en Kunde, drives af en Projektleder, klassificeres af type, kategori og status. |
| Project Type | Projekttype | `ProjectTypeID` | Inddeler projekter i overordnede forretningsområder. Read-only liste (`GET /projecttype`); sættes på projektet via update. Serverens vigtigste oprydnings-mål (masse-ændring af type). _Undgå:_ project kind, kategori (Kategori er et andet begreb). |
| Project Category | Projektkategori | `ProjectCategoryID` | Selvstændig klassifikation af projektets formål, adskilt fra Projekttype. Begge findes uafhængigt på et projekt. _Undgå:_ type. |
| Project Status | Projektstatus | `ProjectStatus` (enum 0–6) | Projektets ordre-/leverancemæssige tilstand (fx Tilbud, Godkendt, I gang, På hold, Afsluttet, Arkiv, Annulleret). Styrer om der må tidsregistreres. Ændres via eget endpoint (`UpdateStatus`), ikke via felt-update. _Undgå:_ state. |
| Project Stage | Projektfase | (UI-begreb) | De faser et projekt gennemløber (PRINCE2 "stages"), fx Idé > Business case > Udvikling > Implementering. Konfigurerbar (modsat status). Ikke et kerne-felt på API-skrivemodellen. |
| Project Manager | Projektleder | `ProjectManagerID` | Den medarbejder der er ansvarlig for at drive projektet og modtager projekt-notifikationer. Adskilt fra Kundeansvarlig. |
| Account Manager | Kundeansvarlig | `AccountManagerID` | Den medarbejder der er ansvarlig for kunderelationen på projektet. Adskilt fra Projektleder. |
| Partner | Partner | `PartnerID` | Tredjepart tilknyttet projektet. Read-only fra serverens synsvinkel (ikke i felt-update-modellen — se ADR 0005). _Undgå:_ underleverandør (eget API-begreb), leverandør. |
| Language | Sprog | `LanguageID` | Sproget sat på projektet, brugt til projekt-vendt output som fakturaer. Write-only: returneres ikke af `GET /project/{id}`, så read-modify-write kan ikke bevare det (ADR 0005). |
| P.O. number | P.O.-nummer | (felt) | Valgfrit indkøbsordrenummer på projektet, redigerbart. |
| Project number | Projektnummer | `No` (read) / `ProjectNo` (write) | Auto-genereret fra en nummerserie i Systemadministration. Bemærk read/write-navneforskellen. |
| Budget | Budget | `BudgetWorkHours`, `BudgetWorkAmount` | Overordnede budgettal (timer og beløb) på projektet, kan ændres løbende. |
| Forecast % | Forecast % | (felt) | Sandsynlighed for succes — et fremdriftsfelt på projektet. |
| Estimate to Complete (ETC) | ETC (Estimate to Complete) | (felt) | Estimat for resterende arbejde til færdiggørelse. |
| Project Template | Projektskabelon | `ProjectTemplateID` | Genbrugelig skabelon med opgave-/underopgavestruktur og kontrakt-tilknytning. Et projekt oprettes fra én (`POST /project/create-from-template`). **Read-only i API'et** — at bygge/gemme en skabelon er en UI-only handling (se [`../CONTEXT.md`](../CONTEXT.md) › No template write). _Undgå:_ blueprint. |

## Projektplan og opgaver (primært domæne)

| Engelsk (kode/API)      | Dansk UI                       | API-felt / id                     | Betydning og noter                                                                                                                                           |
| ----------------------- | ------------------------------ | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Project plan            | Projektplan                    | —                                 | Strukturen hvor arbejdet brydes ned i opgaver; understøtter op til fem hierarki-niveauer. Et projekt skal have mindst én opgave før der kan tidsregistreres. |
| Task                    | Opgave                         | `TaskID` (int), `ID` (uuid)       | En arbejdsenhed i projektplanen. Har en Opgavetype, en status, evt. budget med en Timepris og evt. link til en Kontrakt. _Undgå:_ aktivitet, item.           |
| Sub-task                | Underopgave                    | `ParentTaskID`                    | En opgave indlejret under en forælder-opgave. Samme model som Opgave; adskilt kun ved at have en forælder. _Undgå:_ child task.                              |
| Task Type               | Opgavetype                     | `TaskTypeID`                      | Klassifikation af en opgave — firmaets ydelsesfaser (fx 1.1 Idéoplæg → 4.8 Certificering KK3). Read-only liste (`GET /tasktype`). _Undgå:_ fase, kategori.   |
| Task status             | Opgavestatus                   | `taskStatus` (enum)               | Opgavens tilstand (fx Ikke startet, I gang). Skal være "I gang" for at tillade tidsregistrering.                                                             |
| WBS number              | WBS-nummer                     | `No` (read) / `TaskNo` (write)    | Work Breakdown Structure-nummer, auto-genereret og manuelt redigerbart til at omorganisere opgaver (fx 1.2 gør opgaven til underopgave af opgave 1).         |
| Milestone               | Milepæl                        | —                                 | Markerer vigtige projektdatoer/deadlines, kræver en ansvarlig medarbejder, vises i tidsregistrering og udløser notifikation 14 dage før deadline.            |
| Budget (hours)          | Budget (t)                     | `BudgetHours`, `BudgetAmount`     | Timer/beløb allokeret til en opgave, med en valgt Timepris.                                                                                                  |
| Billable / non-billable | Fakturerbar / ikke-fakturerbar | `IsBillable`, `IsDefaultBillable` | Om opgavens/registreringens tid er beregnet til at faktureres til kunden.                                                                                    |
| Ready for invoicing     | Klar til fakturering           | `IsReadyForInvoicing`             | Markering der gør en post tilgængelig for fakturering.                                                                                                       |

## Medarbejdere og ressourceplanlægning (primært domæne)

| Engelsk (kode/API)         | Dansk UI            | API-felt / id                                                  | Betydning og noter                                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------------------------- | ------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Employee                   | Medarbejder         | (employee-profil)                                              | En person i organisationen med en profil, afdeling, normal arbejdstid, roller og rettigheder. I API-/kode-sammenhæng ofte modelleret som User (se nedenfor). _Undgå:_ member, person.                                                                                                                                                                                                                                                         |
| User                       | Bruger              | `UserID` (`FirstName`/`LastName`/`Initials`)                   | En medarbejder set fra API'et; udfylder projektroller. Personal Access Token tilhører en Bruger og handler på dennes vegne. _Undgå:_ employee i kode-felter (men "Medarbejder" i UI er fint).                                                                                                                                                                                                                                                 |
| Employee Overview          | Medarbejderoversigt | —                                                              | Søge- og administrationsflade til at finde aktive og inaktive medarbejdere.                                                                                                                                                                                                                                                                                                                                                                   |
| Employee card              | Medarbejderkort     | —                                                              | Indgangen til at redigere en medarbejder.                                                                                                                                                                                                                                                                                                                                                                                                     |
| Employee type              | Medarbejdertype     | `EmployeeType`                                                 | Attribut på medarbejderprofilen, brugt til at filtrere rapport-søgninger.                                                                                                                                                                                                                                                                                                                                                                     |
| Initials                   | Initialer           | `Initials`                                                     | Bruges til medarbejdervalg og i rapporter.                                                                                                                                                                                                                                                                                                                                                                                                    |
| Department                 | Afdeling            | `DepartmentID`                                                 | Organisatorisk enhed; påkrævet felt på medarbejderen og bruges i rapportering. Et projekt kan også tilhøre en afdeling.                                                                                                                                                                                                                                                                                                                       |
| Manager (immediate / line) | Nærmeste leder      | (felt)                                                         | Godkender tidsregistreringer og udlæg. En af godkender-rollerne i godkendelsesflowet.                                                                                                                                                                                                                                                                                                                                                         |
| Normal working time        | Normal arbejdstid   | `normalworkingtime`                                            | De planlagte timer tildelt en medarbejder; grundlaget for flex-beregning. Ændres med en "Gælder fra"-dato. _Også kaldt:_ standard arbejdstid.                                                                                                                                                                                                                                                                                                 |
| Resource Planner           | Ressourceplanlægger | (rapport)                                                      | Rapport der lader brugeren planlægge hvornår arbejdet skal udføres. **Den ægte ressourceplanlægnings-flade (ADR 0009):** skriv `POST /api/v2/resource-planner/book-hours` (`resourceId`/`workItemId`/`value`/`startsAt`/`endsAt`; `value` = total fordelt jævnt pr. dag, erstatter — ikke additiv; ingen SignalR-hub nødvendig). Læs/map v1↔v2-ids med `partial-group-by-employee` (→ `resourceId` pr. UserID) og `partial-group-by-work-item` (→ `workItemId` pr. TaskID), filtreret på `EmployeeIds=<UserID>`. v2 er live + PAT-auth; ruterne er udokumenterede (gate før brug).                                                                                                                                                                                                                                                                               |
| Allocation                 | Allokering          | `POST /allocation` (`UserId`+`TaskId`); `Budget (h)` på opgave | Tildeling af en medarbejder (ressource) til en projektopgave (trin 1: "hvor mange"). `POST /allocation` virker og tilføjer medarbejderen som ressource på opgaven (0 timer; bekræftet empirisk 2026-06-19). Føder Ressourceplanlæggeren. _Brug:_ "allokere", "allokering af timer". Det er **det skrivbare ressource-koncept** i v1.                                                                                                          |
| Booking                    | Booking             | `BookWorkload` (`workload`)                                    | **Niche, IKKE generel ressourceplanlægning** — en manuel timepost eller timer fanget fra en **Outlook-aftale** (Tracker for Outlook). _Ikke et dagligt TimeLog-UI-ord._ `POST /workload/book` er **ikke-funktionel via API'et**: afviser alle `UserID`-værdier med `ErrorCode 37040` "No user with UserID" (empirisk 2026-06-19). _Undgå:_ at bruge "booking" om at planlægge/allokere ressourcer — det er Allokering + Ressourceplanlægning. |
| Workload                   | Arbejdsbyrde        | `workload`                                                     | Den aggregerede mængde planlagt arbejde for en medarbejder over en periode.                                                                                                                                                                                                                                                                                                                                                                   |
| Unregistered hours         | Uregistrerede timer | —                                                              | Timer der endnu ikke er registreret i forhold til det allokerede.                                                                                                                                                                                                                                                                                                                                                                             |
| Reference day              | Referencedag        | —                                                              | Grundlaget for beregning af mandag-dage, konfigureret i Systemadministration.                                                                                                                                                                                                                                                                                                                                                                 |
| Resource group             | Ressourcegruppe     | —                                                              | En gruppe medarbejdere der kan arbejde på projektets opgaver uden at være individuelt allokeret et bestemt antal timer pr. opgave. Medlemmer kan få individuelle timepriser på projektet.                                                                                                                                                                                                                                                     |
| Capacity                   | Kapacitet           | —                                                              | Den tilgængelige arbejdstid en medarbejder har til rådighed, brugt i ressourceplanlægningen.                                                                                                                                                                                                                                                                                                                                                  |
| Saved filter view          | Gemt filtervisning  | —                                                              | Navngiven filteropsætning i Ressourceplanlæggeren, kan sættes som standardvisning.                                                                                                                                                                                                                                                                                                                                                            |

## Tid og fravær

| Engelsk (kode/API)  | Dansk UI                 | API-felt / id                          | Betydning og noter                                                                                                                                                                                                                        |
| ------------------- | ------------------------ | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Time registration   | Tidsregistrering         | `timeregistration`                     | En medarbejders tidspost mod en opgave. Selve handlingen og posten.                                                                                                                                                                       |
| Timesheet           | Tidsregistrering (siden) | `timesheetstatus`, `approvaltimesheet` | Siden/arket hvor brugeren registrerer sin tid for ugen (eller dag/14 dage/måned). I dansk UI hedder selve siden "Tidsregistrering".                                                                                                       |
| Fast track          | Fast track               | —                                      | Hurtig-indtastningsmetode: søg en opgave/kunde/projekt, indtast dato, timer og evt. kommentar.                                                                                                                                            |
| Stopwatch           | Stopur                   | `timetracker`                          | Start/stop en registrering live; kun ét kan køre ad gangen, nulstilles ved midnat.                                                                                                                                                        |
| Timestamp           | Tidsstempel              | `StartTime`, `EndTime`                 | Eksakt start- og sluttid på en arbejdsperiode ved siden af registreringens varighed (Amount).                                                                                                                                             |
| Comment             | Kommentar                | `Comment`, `AdditionalComment`         | Uddybende tekst på en tidsregistrering.                                                                                                                                                                                                   |
| Submit for approval | Send til godkendelse     | `Submit*` (`approvaltimesheet`)        | Send tid til godkendelse for en dag, uge eller måned.                                                                                                                                                                                     |
| Absence             | Fravær                   | —                                      | Ikke-produktiv tid registreret på samme timeseddel som projekt-tid.                                                                                                                                                                       |
| Absence code        | Fraværskode              | `absencecode`                          | Den post medarbejderen bruger til at registrere fravær (fx ferie, sygdom). Har et navn (label), en sorteringsværdi og en beskrivelse, og er klassificeret af en fraværstype (Sygdom, Ferie, Fravær ikke-kompenseret, Fravær kompenseret). |
| Personal expense    | Personligt udlæg         | `employeeexpense`                      | Et udlæg medarbejderen har betalt på virksomhedens vegne; refunderes med lønnen.                                                                                                                                                          |
| Travel expense      | Rejseafregning           | (travel)                               | Registrering af en medarbejders rejse, der grupperer flere udgiftsposter under én rejse.                                                                                                                                                  |
| Mileage             | Kørsel                   | `mileageregistration`, `mileagerate`   | Kørselsregistrering knyttet til et projekt; genererer automatisk en tilsvarende projektudgift.                                                                                                                                            |
| Project expense     | Projektudgift            | `projectexpense`                       | En udgift bogført på et projekt (fx fra et udlæg eller kørsel), kan faktureres kunden.                                                                                                                                                    |

## Kontrakter, betaling og fakturering

| Engelsk (kode/API) | Dansk UI | API-felt / id | Betydning og noter |
|---|---|---|---|
| Contract | Kontrakt | `ContractID` (`contractmodel`) | Rammen der styrer hvordan en kunde faktureres og hvordan omsætning indtægtsføres. Et projekt kan have flere. _Undgå:_ aftale. |
| Contract Model | Kontraktmodel | `ContractModelID` | Kontraktens art. I brug i kontoen: TimeMaterialBasic (1) og FixedPriceBasic (2). _Undgå:_ contract type (`ContractTypeID` er et separat felt). |
| Time & material | Tid og materiale | — | Kontrakttype faktureret efter faktisk forbrug af tid og materialer. |
| Fixed price | Fast pris | — | Kontrakttype med fast samlet beløb og en betalingsplan knyttet til leverancer. |
| Payment | Betaling | `PaymentID` (`payment`) | En linje i en kontrakts betalingsplan — fx et fast-pris-milepælsbeløb. Listes pr. kontrakt. _Undgå:_ faktura, installment. |
| Payment plan | Betalingsplan | — | Plan over betalinger knyttet til leverancer (fx 40% forud, 50% ved første levering, 10% ved afslutning). |
| Hourly Rate | Timepris | `HourlyRateID` (`hourlyrate`) | En faktureringssats en opgave refererer for sit budget; opslås pr. kontrakt. _Undgå:_ pris, tarif. |
| Price list | Prisliste | — | Standard eller kunde-specifik liste af timepriser organiseret i prisgrupper. |
| Invoice | Faktura | — | Bygges af faktureringspotentialet på projekter (tidsregistreringer, kørsel, rejser, udlæg, betalinger). Bevæger sig fra Kladde (Draft) til Bogført (Booked). |
| Credit note | Kreditnota | — | Bruges til at udligne en faktura bogført med forkerte oplysninger. |
| Debtor | Debitor | — | En kunde der skylder penge; "Debitorliste – Fakturaer" viser faktureringspotentiale og udestående pr. kunde. |
| Invoice potential | Faktureringspotentiale | — | Registreringer klar til fakturering, men endnu ikke placeret på en faktura. |
| Revenue recognition | Indtægtsføring | — | Hvordan og hvornår omsætning bogføres på en kontrakt. |
| Work in progress (WIP) | Igangværende arbejde | — | Den disponible saldo på forudbetalte kontrakter. |

## Kunder og CRM

| Engelsk (kode/API) | Dansk UI | API-felt / id | Betydning og noter |
|---|---|---|---|
| Customer | Kunde | `CustomerID` (`customer`) | Den virksomhed et projekt og dets fakturaer tilhører. Skal findes før et projekt kan oprettes. _Undgå:_ client, account. |
| Contact | Kontaktperson | `ContactID` (`ID`/`ShownName`) | En person tilknyttet en kunde-virksomhed. Et projekt refererer én via `ContactID`. _Undgå:_ person. |
| Customer status | Kundestatus | `customerstatus` | Markerer virksomheden som kunde, partner eller leverandør. |
| Customer number | Kundenummer | (felt) | Kan tildeles automatisk (nummerserie) eller manuelt. |
| Owner | Ansvarlig | (felt) | Den aktive medarbejder der angiver ansvar for kunden. |
| CRM | CRM | — | Tilkøbsmodul; kundevendt flade under "Mine kunder". |
| Group (segmentation) | Gruppe | — | Konfigurerbart felt til at segmentere CRM-data på kunder, kontakter og salgsmuligheder. |
| Pipeline | Pipeline | — | Aktuelle salg og en vægtet prognose for estimeret salg over en periode. |
| Opportunity | Salgsmulighed | — | Et potentielt salg sporet gennem pipelinen via sin salgsmuligheds-status. |

## Godkendelse, løn og administration

| Engelsk (kode/API) | Dansk UI | API-felt / id | Betydning og noter |
|---|---|---|---|
| Approval | Godkendelse | (approval processes) | Workflow der styrer om tidsregistreringer og udlæg kræver godkendelse og i hvor mange trin. |
| Salary management | Lønadministration | (salary) | Tildeling af feriedage og sporing af saldi for flex, barsel og ikke-kompenseret fravær. |
| Salary account | Lønkonto | `salaryaccount` | De individuelle konti saldi spores på (fx afspadsering). |
| Salary group | Løngruppe | `salarygroup` | Grupperer medarbejdere så løn- og fraværskode-opsætning kan variere (fx ved flere overenskomster). |
| Balance | Saldo | — | Virker som en bankkonto: virksomheden indsætter (tildeling), medarbejderen hæver via fraværsregistreringer. |
| Flex | Flex | — | Flextids-saldo der følger af normal arbejdstid vs. registreret tid. |
| Vacation | Ferie | — | Fraværstype; planlagt og afholdt ferie vises i feriekalenderen. |
| Role | Rolle | `role` | Forbindelsen mellem medarbejdere og systemfunktionalitet (rollebaseret adgangsstyring). En medarbejder har mindst én rolle. |
| Legal entity | Juridisk enhed | `legalentity` | Et separat selskab/forretningsenhed (TimeLog MLE — Multiple Legal Entities). |
| Personal Access Token (PAT) | Personal Access Token | (Bearer-token) | Den per-bruger legitimation der autentificerer mod REST API'et. Handler på vegne af den Bruger den tilhører. _Undgå:_ API key, secret. |

---

## Kilder

- Produkt-reference (dansk/engelske produkt-features): [`timelog/`](timelog/README.md)
- REST API v1-reference (felt-navne, enums, kvirks): [`timelog-api/`](timelog-api/README.md)
- Autoritativ kode-glossary + API-konventioner: [`../CONTEXT.md`](../CONTEXT.md)

Danske UI-termer er bekræftet med projektejeren hvor de afveg fra en direkte
oversættelse: Kundeansvarlig (Account Manager), Projektfase (Project Stage),
Tidsregistrering som navn på selve timeseddel-siden (Timesheet), Booking
(uoversat) i Ressourceplanlæggeren, og Fraværskode (Absence code).
