# Guardians of the Grid
Jullie bouwen een mission control center om Achrona te beschermen tegen The Desync. 
Dit  fungeert als de ultieme digitale levenslijn door vitale statistieken live in 
kaart te brengen en afwijkingen vroegtijdig te signaleren. Dankzij jullie realtime 
data-inzichten kunnen we op tijd ingrijpen om de glitches te stoppen en de magie 
in Achrona te redden

## Project setup
Deze repository bevat een basis [Tanstack Start](https://tanstack.com/start) op basis van:
- **Language:** [Typescript](https://www.typescriptlang.org)
- **Framework:** [React](https://react.dev)
- **ORM:** [Drizzle](https://orm.drizzle.team)
- **Styling:** [Tailwind](https://tailwindcss.com)
- **Build tool:** [Vite](https://vite.dev)

Om op te starten kan je volgende commando's gebruiken. 

```bash
npm install
npm run db:setup   # maakt local.db aan en vult ze met demo-data
npm run dev
```

Pas je `src/db/schema.ts` aan? Draai dan opnieuw `npm run db:setup` (wist en vult de database opnieuw).
Faalt dat (bv. na een grote schemawijziging), gebruik dan **`npm run db:reset`**: verwijdert `local.db` en maakt alles opnieuw aan. Stop eerst de dev server.

### Demo-accounts (lokaal)
| Codename | Rol | Wachtwoord |
|---|---|---|
| `nova` | commander (Guild master) | `achrona` |
| `ember` | defender (Adventurer) | `achrona` |
| `kael` | defender (Adventurer) | `achrona` |

Nieuw account? Via **Join the guild** op de loginpagina (`/register`) maak je zelf een account aan: je start altijd als adventurer (defender) en bent meteen ingelogd. Codename: 3–20 tekens (letters, cijfers, `-`, `_`), wachtwoord min. 8 tekens.

### Thema: de guild van Achrona
In de code blijven de namen uit de opdracht; in de UI gebruiken we het guild-thema.

De hele site ziet eruit als de guild hall: kurk op de muren, een houten sidebar, perkament voor de inhoud, rode wax-zegels en Cinzel voor titels. Login en registratie zijn een vastgeprikt bericht op het quest board.

| Code | UI |
|---|---|
| glitch | monster |
| echo | sighting (observatie) |
| commander | guild master |
| defender | adventurer |
| `LEAKED` / `ASSESSING` / `CONTAINING` / `FIXED` | Scouting / Spotted / Engaged / Slain |

### Wereldkaart
- Het startscherm is een fullscreen kaart van Achrona met regio's (Whispering Woods, Ember Peaks, Mirror Lake, Gloom Marsh, Sunscar Desert, Achrona City), elk met meerdere areas waar monsters gespot worden
- Slepen = kaart bewegen, scrollen = zoomen; klik op een regio om in te zoomen
- Klik op een monster: de kaart zoomt in op het gevecht en toont de quest: rank (D–S), beloning in goud, party en wat je nu kan doen
- Een adventurer zit op max. één quest tegelijk
- Filter de kaart op quest rank (D–S) met de **Rank**-knoppen bovenaan
- Party-leden die online zijn vechten (magische bolts); wie uitgelogd is ligt te slapen naast het monster (online = heartbeat via `sessions.last_seen_at`, < 20 s oud)
- Het quest board en leaderboard staan op een aparte pagina (**Quest board** in de nav)
- De guild master klikt op een lege locatie om de standaard-rank en -beloning van die plek in te stellen
- Wordt een monster `FIXED` (Slain), dan krijgt elk party-lid de beloning van die locatie → goud + leaderboard

### Quest-workflow: van geruchten tot verslagen monster
1. **Scouting:** villagers (dorpsbewoners) melden vanzelf vreemde dingen: elke ~20 s komt er een echo binnen van bv. "Maud the baker" ("Een kind is verdwaald bij Firefly Hollow"). Villagers hebben geen account: hun echo heeft een `reporter_name` i.p.v. een `reporting_guardian_id`. Zijn er **3 meldingen op dezelfde plek binnen 10 minuten**, dan ontstaat er een scouting quest (status `LEAKED`) zonder monster: een **?** op de kaart en het quest board. De guild master kan met **Summon villager reports** meteen zo'n quest laten ontstaan (demo)
2. **Investigate:** een adventurer klikt **Investigate** (kaart, quest board of quest-pagina). De server loot in het geheim welk monster erachter zit: hoe gevaarlijker, hoe zeldzamer (gewicht per gevaar 1→5: 16 : 8 : 4 : 2 : 1, een draak is dus ~3%). Je ziet het **silhouet** van het monster en kiest uit **3 monsters** het juiste. Fout = het spoor is even koud (5 s wachten, zelfde silhouet). Juist = +25 goud scouting-beloning (bounty van het type `scout`) en de quest wordt **Spotted** (`ASSESSING`) met de **rank van het monster** (`glitches.danger` = gevaar van het monster)
3. **Reward:** de guild master kiest enkel nog de beloning (`glitches.reward`); de rank ligt vast door het monster. Pas dan kunnen adventurers accepteren. Wie zelf een monster spot via de kaart, komt meteen hier terecht
4. **Engaged:** de eerste adventurer die accepteert zet de quest automatisch op `CONTAINING`
5. **Fight:** de party verslaat het monster met een **code-puzzel**: een stukje code dat variabelen bewerkt, jij geeft de eindwaarde. Hoe hoger de rank, hoe moeilijker (D: + en −, C: ×, B: if/else, A: for-lus met %, S: swap + lus met voorwaarde). De puzzel wordt op de server gemaakt en nagekeken (het antwoord gaat nooit naar de browser). Fout = het monster slaat terug (10 s wachten, nieuwe puzzel). Juist = **Slain**: elk party-lid int de beloning

### Quest board & workflow
- **Board (workflow):** het quest board is een houten guild-prikbord met 4 kolommen = de workflow (Scouting → Spotted → Engaged → Slain). Elke quest is een WANTED-poster (of RUMOUR-poster met een vraagteken zolang het monster onbekend is) met wax-zegel (rank), beloning, sightings en party (online/slapend). Adventurers accepteren op de poster; de guild master sleept posters naar de volgende kolom (of klikt **Next step**). Slain toont de laatste 4, de rest staat in de Chronicle. Via **List** krijg je de tabel terug
- **Zoek/filters:** zoeken op monster, plaats, beschrijving, adventurer of ID; filteren op status, regio en rank; sorteren op datum, rank, beloning of sightings. Filters staan in de URL (blijven bewaard als je een quest opent en terugkeert)
- **Chronicle (PDF):** `/chronicle` is het rapport voor de Hoge Raad: alle verslagen monsters met hun sightings, wie ze versloeg en het geïnde goud. **Download PDF** opent het printvenster → "Opslaan als PDF" (altijd op wit papier)
- **Sneltoetsen:** druk op `?` voor het overzicht (o.a. `m` kaart, `q` quest board, `/` zoeken, `j`/`k` volgende/vorige quest, `d` dark mode)
- **Dark mode:** knop in de sidebar of `d`; onthouden per browser. Op de kaart valt de nacht
- **Magie van Achrona (gauge):** een meter op de kaart en het quest board: 100% zonder monsters; elk monster dat loose is trekt magie weg (meer voor een sterker monster en een hogere rank), verslaan geeft ze terug
- **Offline:** valt de verbinding met de server weg, dan blijft de laatste stand staan met een "Offline"-melding onderaan; zodra de server terug antwoordt verdwijnt die
- **Badges op het leaderboard:** 👑 Guild Treasurer, 🐉 Dragon Slayer, ⚔️ Giant Slayer, 🛡️ Veteran, 🗡️ First Blood, 👁️ Eagle Eye (hover voor uitleg)
- **Lockdown mode:** zolang er een S-klasse dreiging loose is (monster met gevaar 5 of een monster op een rank-S locatie) kleurt de app rood met een alarmbanner. Verslaan = lockdown voorbij. **View quest** in de alarmbanner vliegt op de kaart naar het gevecht; met **Decline – too strong** weiger je een quest die te zwaar is en stopt het alarm voor jou (per account, in deze browser)

### Datamodel
- `guardians` → `role_id` → `roles`; rechten per rol via `role_permissions` → `permissions`
- `sessions`: login-sessies (cookie `htf_session`, in de database enkel de SHA-256 hash van het token) + `last_seen_at` voor online-status
- `monsters`: de monster-index (bestiarium), met `danger` 1–5
- `regions` ← `locations` (x/y op de kaart, `danger` 1–5 en `reward` in goud, door de guild master)
- `glitches` → `monster_id` (leeg zolang het een scouting quest is), `location_id`, `danger` + `reward` (door de guild master); `glitches` ← `echoes` (`glitch_id`, `location_id`, `reporting_guardian_id` óf `reporter_name` voor een villager; een losse villager-melding heeft nog geen `glitch_id`)
- `glitch_assignments`: de quest-party (zelf geaccepteerd of door de guild master gestuurd)
- `bounties`: uitbetaald goud per (glitch, adventurer, soort): `slay` voor de party als het monster verslagen is, `scout` voor wie het monster identificeerde
- Een echo van een guardian zonder glitch maakt automatisch een nieuwe glitch (`GL-xxxx`, status `ASSESSING` = Spotted) van het gekozen monstertype op de gekozen locatie
- Grootte van een monster = `danger` van het monstertype + groei per extra echo

## Beoordeling
> Hoe wij beoordelen wordt voor de start van de hackathon met alle studenten gedeeld, zodat dit meteen duidelijk is voor iedereen.

- **Creativity (40%):** Biedt de applicatie nieuwe, innovatieve of creatieve oplossingen? Steekt jullie applicatie er bovenuit t.o.v. de andere deelnemers?
- **Functionality (30%):** Welke functionaliteit hebben jullie kunnen voorzien tijdens de hackathon? Is de UI intuïtief en gebruiksvriendelijk? Zijn de functionaliteiten duidelijk voor de gebruikers zonder uitleg/handleiding?
- **Presentation (30%):** Trekt jullie presentatie onze aandacht? Is de presentatie duidelijk en helder over wat jullie gebouwd hebben? Zien we in jullie presentatie de input van alle deelnemers evenwaardig terugkomen?

## Basisopdracht
> Om alle opdrachten gelijkwaardig te beoordelingen, verwachten dit als minimale setup. 
> Hierna kiezen jullie zelf welke uitbreidingen jullie willen toevoegen.

![datamodel](datamodel.png)

Maak een webapplicatie waarin guardians kunnen inloggen. Eens ingelogd, zien ze een lijst met glitches.
Guardians hebben een role.
- Role `defender` kan echoes melden. Elke echo wordt standaard aanzien als een glitch 
- Role `commander` heeft dezelfde rechten als een defender + admin rechten
- Een echo heeft een `timestamp` en een `description`. 

## Uitbreidingen (Optioneel)
> Jullie kiezen zelf wat jullie willen toevoegen. Hieronder alvast wat inspiratie

### Workflow
- **Glitch status:** Een glitch doorloopt verschillende statussen (`LEAKED` → `ASSESSING` → `CONTAINING` → `FIXED`).
- **Zoek/Filters:** Guardians kunnen zoeken op keywords + data filteren en sorteren.
- **Glitches toewijzen:** Een commander kan glitches handmatig toewijzen aan een defender, die vervolgens via echoes updates geeft over deze glitch.
- **Reporting:** Maak de belangrijkste data exporteerbaar via PDF (voor de Hoge Raad van Achrona).
- **Keyboard shortcuts:** Navigeer door de applicatie met sneltoetsen (bv. <kbd>j</kbd> en <kbd>k</kbd> om de vorige/volgende glitch te bekijken).
- **Dark mode:** Zorg dat guardians kunnen switchen tussen dark en light mode. Voorzie evt. een extra lockdown mode die aanduidt dat er een grote aanval aan de gang is.

### Real-time monitoring
- **Live updates:** Nieuwe glitches worden real-time zichtbaar op het scherm.
- **Gauge chart:** Een visuele meter die de hoeveelheid magie in Achrona toont (100% als alles in orde is).
- **Interactieve kaart:** Een kaart (map) die exact toont wáár in Achrona een glitch plaatsvindt.
- **Sensor data:** Het systeem verwerkt IoT-sensordata en toont deze in grafieken op het dashboard.
- **Responsive design:** De applicatie werkt mobile-first en is volledig geoptimaliseerd voor smartphones.
- **Offline mode:** Data blijft beschikbaar bij netwerkuitval, met een duidelijke "offline"-indicator.

### AI Automation
- **Handle duplicates:** AI groepeert gerelateerde echoes automatisch onder dezelfde glitch; admins kunnen handmatig overriden.
- **Glitch types:** AI categoriseert het type en maakt dit visueel duidelijk (bv. met iconen of kleuren).
- **AI-moderation:** AI weert nutteloze echoes en scant beschrijvingen en afbeeldingen op illegale content.
- **Auto-closable glitches:** Glitches sluiten automatisch op basis van echoes (bv. "alles terug in orde"), maar heropenen ook als er een gelijkaardig nieuw probleem binnenkomt.
- **Predictive analysis:** AI maakt zelf glitches aan op basis van data-afwijkingen (bv. data-voorraad die in 5 minuten met 40% zakt).
- **Automatische toewijzing:** AI kiest zelfstandig welke defender het best past bij de glitch.
- **Create Runbook:** AI genereert een stappenplan (runbook) om het specifieke probleem op te lossen.
- **Chatbot:** Een ingebouwde assistent die vragen van operators over actieve incidenten en alerts beantwoordt.

### User engagement
- **Image uploads:** Users kunnen foto's uploaden bij een echo om de situatie te verduidelijken.
- **Speech-to-text:** Defenders op de vlucht kunnen echoes via hun microfoon inspreken i.p.v. te typen.
- **Verstuur notificaties:** Push-notificaties, e-mails of sms-berichten bij kritieke problemen (met instelbare voorkeuren per user).
- **Leaderboard:** Een klassement met badges voor de defenders die de meeste incidenten fixen.

