# Zona Tracker

App wellness single-file HTML, hostata su GitHub Pages.

## File principale

`zona-tracker.html` — tutta l'app è in questo unico file (HTML + CSS + JS).
`auth-callback.html` — pagina di callback per il login (usata come fallback per browser esterni).

## URL pubblico

https://ignaziof321621.github.io/benessere-forma/zona-tracker.html

## Repository

https://github.com/IgnazioF321621/benessere-forma

## Stack tecnico

- HTML/CSS/JavaScript puro
- Nessun framework, nessun build step
- File principali: `zona-tracker.html`, `auth-callback.html`

## Servizi esterni

| Servizio | URL | Scopo |
|---|---|---|
| Cloudflare Worker | `zona-ai.ignaziof23.workers.dev` | Proxy verso Groq API (llama-3.3-70b-versatile) |
| Supabase | `https://qxiyeiahpoiliwpqslpr.supabase.co` | Database + Auth |

## Autenticazione

**Metodo attuale: OTP a 6 cifre via email** (da aprile 2026)

Flusso:
1. Utente inserisce email → `signInWithOtp({ email, options: { shouldCreateUser: true } })`
2. Supabase invia email con codice a 6 cifre (NON un link)
3. Utente inserisce il codice nella PWA → `verifyOtp({ email, token, type: 'email' })`
4. Login completato direttamente nella PWA, senza uscire dall'app ✅

**`auth-callback.html`** rimane nel repo come fallback, ma non viene più usato nel flusso principale.

**Rate limit Supabase:** durante i test intensivi si può raggiungere il limite OTP. Aspettare 1 ora per il reset.

## Bootstrap auth (`zona-tracker.html`)

Il bootstrap (in fondo al file, dentro `setTimeout(..., 1800)`) gestisce questi casi in ordine:
1. `?test=1` → modalità test locale
2. Hash con `#access_token=...&refresh_token=...` → flusso implicito
3. Query param `?code=...` → flusso PKCE
4. `getSession()` → sessione esistente
5. Nessuna sessione → mostra schermata auth
6. `onAuthStateChange` → ascolta eventi SIGNED_IN / SIGNED_OUT / TOKEN_REFRESHED
7. `visibilitychange` → polling sessione quando la PWA torna in foreground

## Schema Supabase

### Tabella `meals`
| Colonna | Tipo | Note |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` NOT NULL | FK → auth.users |
| `date` | `date` NOT NULL | YYYY-MM-DD |
| `time` | `text` | HH:MM |
| `slot` | `text` | colazione / pranzo / cena / snack |
| `description` | `text` NOT NULL | |
| `kcal` | `integer` | stimato AI |
| `protein / carbs / fat` | `integer` | grammi |
| `notes` | `text` | nullable |

RLS abilitata — policy: `auth.uid() = user_id`.

### Tabella `nutrilite_catalog`
25 prodotti Nutrilite pre-inseriti. RLS SELECT pubblica. Nessun `user_id`.

### Tabella `profiles`
Dati utente: `height_cm`, `weight_kg`, `goal_weight_kg`, `target_kcal/protein/carbs/fat`, `sex`, `age`, `activity_level`, `train_start_date` (opzionale).

### Tabella `supplements`
Integratori per user_id, editabili inline.

### Tabella `supplements_log`
Tracciamento assunzioni giornaliere per data e nome integratore.
UNIQUE constraint su `(user_id, date, supplement_name)` — aggiunto aprile 2026 dopo cleanup duplicati.

### Tabella `fasting_days`
Giorni di digiuno per user_id.

### Tabella `training_logs` (aprile 2026)
| Colonna | Tipo | Note |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` NOT NULL | FK → auth.users |
| `date` | `date` NOT NULL | |
| `session_id` | `text` | upperA / upperB / lowerA / lowerB / recovery |
| `exercise_name` | `text` | |
| `set_number` | `integer` | |
| `reps` | `integer` | |
| `resistance` | `text` | es. "elastico 20lbs" |
| `rir_actual` | `integer` | |
| `notes` | `text` | |

RLS abilitata — policy: `auth.uid() = user_id`.

### Tabella `body_logs` (aprile 2026)
| Colonna | Tipo | Note |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` NOT NULL | FK → auth.users |
| `date` | `date` NOT NULL | |
| `weight_kg` | `numeric(5,2)` | |
| `waist_cm` | `numeric(5,1)` | girovita — obiettivo 89→85 cm |
| `bf_pct` | `numeric(4,1)` | body fat % |
| `muscle_kg` | `numeric(5,2)` | da bilancia smart |
| `visceral_fat` | `numeric(4,1)` | da bilancia smart |
| `hip_cm` | `numeric(5,1)` | fianchi |
| `chest_cm` | `numeric(5,1)` | petto |
| `bicep_cm` | `numeric(4,1)` | bicipite |
| `body_age` | `integer` | età corporea da bilancia smart |
| `notes` | `text` | |

RLS abilitata — policy: `auth.uid() = user_id`.

## Navigazione — struttura attuale (aprile 2026)

| Tab | ID pagina | Contenuto |
|---|---|---|
| 🏠 Home | `home` | Dashboard: ring kcal + 3 tile modulo live |
| 🌿 Nutrition | `oggi` | Sub-nav: Oggi / Integratori / Storico / Piano |
| ⚡ Training | `training` | Sub-nav: Sessione / Piano / Progressione — **visibile solo se `train_start_date` impostata** |
| ◐ Body | `body` | Sub-nav: Misure / Tendenza |

**Implementazione:**
- Bottom nav mobile 4 voci (SVG outline/filled)
- Top nav desktop 4 voci (emoji)
- `showPage(id)` — navigazione centrale (redirect a Home se Training non abilitato)
- `renderPage(id)` — dispatch alle render functions
- `hasTraining()` — gate: `!!ST.profile.train_start_date`
- `updateTrainingNav()` — mostra/nasconde tab Training in top e bottom nav
- Al login l'app apre direttamente Home

## Funzionalità implementate

### Auth
- OTP a 6 cifre via email (schermata 2 step: email → codice)
- Onboarding 5 step per nuovi utenti → calcolo TDEE automatico (Mifflin-St Jeor); step obiettivo con **6 pill** (chiavi `OBJ_ADAPT`)
- Modal impostazioni profilo con esami del sangue; selezione obiettivo tramite **griglia 6 pill** (non più `<select>`)
- Modal peso con ricalcolo TDEE

### Home
- Ring calorie SVG con colore zona
- Barre macro (P/C/G)
- Tile modulo live (Training visibile solo se `train_start_date` impostata):
  - **Nutrition**: kcal, macro, stato zona — cliccabile → Oggi
  - **Training**: prossima sessione / ultima completata / "Inizia [data]" se start futura — badge ✓ FATTO o Inizia→ con streak ⚡ — cliccabile → Training
  - **Body**: peso live, trend, vita cm — cliccabile → Body

### Nutrition (sub-nav: Oggi / Integratori / Storico / Piano)
- **Oggi**: hero ring, macro bars, timeline pasti+integratori, log pasto AI, badge zona, badge Giorno Perfetto; ogni pasto ha pulsante ✏️ modifica e 🗑️ elimina
- **Integratori**: lista raggruppata per orario, editing inline, catalogo Nutrilite
- **Storico**: report 7/14/30 giorni, grafico calorie
- **Piano**: target 40·30·30, piano AI, priorità cliniche

### Training (sub-nav: Sessione / Piano / Progressione)
- **Sessione**:
  - Lista sessioni: Upper A/B (Forza/Ipertrofia), Lower A/B, Active Recovery
  - Dettaglio sessione: blocco attivazione 5 min + esercizi
  - Log serie inline per ogni esercizio: reps + resistenza + RIR → salva su `training_logs`
  - Badge S1/S2/... su card dopo il log, ✓ DONE quando tutte le serie completate
- **Piano**:
  - Split settimanale Lun-Dom con giorno corrente evidenziato
  - Ciclo 4 settimane (CARICO × 3 + SCARICO × 1) con settimana corrente (se `train_start_date` impostata)
  - Progressione doppia: 3 step + esempio pratico
- **Progressione**:
  - Chips esercizi scrollabili (17 esercizi unici)
  - Storico log per esercizio raggruppato per data — caricato da Supabase

### Body (sub-nav: Misure / Tendenza)
- **Misure**:
  - Hero peso attuale + trend vs misura precedente
  - Barra progress obiettivo peso (oldest log → goal)
  - Barra progress vita (89 → 85 cm)
  - Griglia composizione inline (BMI, BF%, massa magra/grassa, grasso viscerale, body age) — visibile solo se dati presenti
  - Form log base: Peso / Vita
  - Form log avanzato (collapsible): BF% / Massa muscolare / Grasso viscerale / Body age / Fianchi / Petto / Bicipite / Note
  - Salvataggio: insert/update manuale (no upsert — constraint UNIQUE non presente)
  - Lista ultimi 8 log
- **Tendenza**: grafici barre peso + vita ultimi 30 log (vita verde se ≤ 85 cm)

## Architettura stato (ST object)

```js
const ST = {
  user, profile, TARGET, page, activeDay, db, supps,
  // Nutrition
  logSlot, logText, logTime, logLoading, logError, logOpen,
  advice, advLoading, nextSlot, reportRange,
  // Onboarding
  onbStep, onbSex, onbActivity, onbObjective, onbDiet, onbIntolleranze, onbWorkout, onbRecoveryDay,
  // Integratori
  syncStatus, catalog, catalogSelected, catalogToRemove, suppSheet, suppFilter,
  // Training
  trainTab,         // 'sessione' | 'piano' | 'progressione'
  trainSession,     // null | 'upperA' | 'upperB' | 'lowerA' | 'lowerB' | 'recovery'
  trainLogOpen,     // null | {sessionId, exName, setNum}
  trainLoggedSets,  // {key: {reps, resistance, rir}} — reset al reload
  trainProgEx,      // esercizio selezionato in Progressione
  trainProgLogs,    // [] | null (loading)
  trainHomeData,    // {lastDate, lastSession, nextSession, streak, doneToday, notStarted?, startDate?}
  trainSaving,      // boolean
  // Body
  bodyTab,          // 'misure' | 'tendenza'
  bodyLogs,         // [] | null (loading)
  bodySaving,       // boolean
  bodyAdvOpen,      // boolean — sezione avanzata form aperta
}
```

## Funzioni chiave

| Funzione | Scopo |
|---|---|
| `showPage(id)` | Navigazione + trigger load data (guard Training se no `train_start_date`) |
| `renderPage(id)` | Dispatch render functions |
| `hasTraining()` | Gate Training: `!!ST.profile.train_start_date` |
| `updateTrainingNav()` | Mostra/nasconde tab Training in top + bottom nav |
| `renderHome()` | Home dashboard |
| `loadTrainingHomeData()` | Fetch last session + streak per tile Home (rispetta start futura) |
| `renderTraining()` | Training con 3 tab |
| `loadTrainingLogs(exName)` | Fetch storico esercizio per Progressione |
| `saveTrainingSet()` | Insert su training_logs |
| `renderBody()` | Body con 2 tab (Misure / Tendenza) |
| `loadBodyLogs()` | Fetch body_logs da Supabase (aggiorna Home o Body in base a ST.page) |
| `saveBodyLog()` | Insert/update body_logs + aggiorna profiles.weight_kg |
| `migrateObiettivo(str)` | Migra vecchi valori obiettivo (`perdita_peso`→`dimagrimento`, `massa_muscolare`→`ipertrofia`) — chiamata in `applyProfile()` e `applyLocalPrefs()` |
| `selectSetObiettivo(val)` | Evidenzia pill obiettivo nella griglia del modal impostazioni |
| `dbToggleSuppTaken(date, suppId, suppName, taken, slot)` | Delete+insert su `supplements_log` (NON upsert — usare questo pattern) |

## Modulo Training — specifiche

**Split:** Upper/Lower 4 giorni + 2 Active Recovery

| Sessione | Tipo | RIR |
|---|---|---|
| Upper A | Forza | 2 |
| Upper B | Ipertrofia | 1 |
| Lower A | Forza | 2 |
| Lower B | Ipertrofia | 1 |

**Progressione doppia:** aumenta reps fino al limite → aumenta carico → riparte dal minimo

**Periodizzazione:** 3 settimane carico + 1 settimana scarico

**Blocco attivazione (5 min obbligatori):**
1. Respirazione diaframmatica 360° — 2 min
2. Vacuum addominale — 2 min
3. Cat-Cow + rotazione toracica — 1 min

**Attrezzatura:** elastici tubo 10/20/30/40/50 lbs, barra modulare, sbarra trazioni, panca, fitball, tappetino

**Protezioni:** lombari e ginocchia

## Modulo Body — specifiche

**Obiettivo circonferenza vita:** 89 cm → < 85 cm

**Fonti dati:**
- Bilancia smart Fitdays: peso, BF%, massa muscolare, grasso viscerale, body age
- Metro: vita, fianchi, petto, bicipite

**Campi `body_logs`:** weight_kg, waist_cm, bf_pct, muscle_kg, visceral_fat, hip_cm, chest_cm, bicep_cm, body_age

**Form log — 2 sezioni:**
- Base (sempre visibile): Peso / Vita
- Avanzate (collapsible): BF% / Massa muscolare / Grasso viscerale / Fianchi / Petto / Bicipite / Body age

## Design system

- **Font:** Manrope (UI) + JetBrains Mono (numeri/label)
- **Token CSS:** `--r-sm/md/lg/pill`, `--font-sans`, `--font-mono`
- **Palette:**
  - Evergreen: `#2A7A6F` (accent globale, Zona OK)
  - Nutrition: `#3B6D11`
  - Training: `#185FA5`
  - Body: `#854F0B`
  - Fuori Zona: `#B84C2A`
- **Sub-nav:** `.nutrition-subnav` + `.nsn-pill` — riusato per tutti i moduli
- **Tile Home:** helper `tile(ink, body, right, onclick)` + `tHead(title, sub, ink)`

## Deploy

```bash
cd ~/benessere-forma
git add zona-tracker.html
git commit -m "Descrizione"
git push origin main
```

GitHub Pages si aggiorna automaticamente (1-2 minuti).

## Worktree

Il worktree attivo è:
`/Users/ignaziofiorito/benessere-forma/.claude/worktrees/optimistic-ellis-36865b/zona-tracker.html`

Copiare nel repo principale prima del commit:
```bash
cp /Users/ignaziofiorito/benessere-forma/.claude/worktrees/optimistic-ellis-36865b/zona-tracker.html ~/benessere-forma/zona-tracker.html
```

## Funzioni chiave aggiuntive (aprile 2026)

| Funzione | Scopo |
|---|---|
| `prefsKey()` | Chiave localStorage `zt_prefs_<userId>` per prefs locali |
| `saveLocalPrefs()` | Salva obiettivo/dieta/intolleranze in localStorage |
| `applyLocalPrefs()` | Ripristina prefs locali dopo ogni applyProfile, ricalcola ST.TARGET |
| `calcAdaptedTargets(obArr, kcal)` | Calcola macro adattivi per obiettivo — usa `OBJ_ADAPT` globale |
| `updatePianoTargetCard()` | Aggiorna card target in Piano al toggle obiettivo (live) |
| `renderPiano()` | Renderizza Piano inclusa card target inline |
| `nutriSubNav(active)` | Sub-nav Nutrition riusabile su tutte e 4 le pagine |

## Vocabolario obiettivi — fonte unica (`OBJ_ADAPT`)

Le 6 chiavi valide sono: `dimagrimento`, `ricomposizione`, `ipertrofia`, `forza_performance`, `longevita`, `mantenimento`.

**`OBJ_MIGRATE`** mappa i vecchi valori ai nuovi: `{ perdita_peso: 'dimagrimento', massa_muscolare: 'ipertrofia' }`.
`migrateObiettivo()` viene chiamata all'ingresso di ogni path che legge `profile.obiettivo` (da Supabase o localStorage).

Tutti i punti di input (onboarding step 3, modal impostazioni, Piano → toggle pill) usano le stesse 6 chiavi.

## Macro adattivi per obiettivo (`OBJ_ADAPT`, riga ~3614)

```js
const OBJ_ADAPT = {
  dimagrimento:      { pct:[38,32,30], label:'Dimagrimento', ... },
  ricomposizione:    { pct:[38,34,28], label:'Ricomposizione', ... },
  ipertrofia:        { pct:[40,35,25], label:'Ipertrofia', ... },
  forza_performance: { pct:[42,33,25], label:'Forza & Performance', ... },
  longevita:         { pct:[40,30,30], label:'Longevità', ... },
  mantenimento:      { pct:[40,30,30], label:'Mantenimento', ... },
};
// pct = [%carbo, %prot, %fat]
```

## Preferenze Piano — architettura (aprile 2026)

- `obiettivo`, `dieta`, `intolleranze` salvati in `localStorage` (`zt_prefs_<userId>`), NON su Supabase
- Le colonne `obiettivo`, `dieta`, `intolleranze` potrebbero NON esistere nella tabella `profiles` su Supabase
- `savePianoPrefs()` salva prima in localStorage, poi aggiorna su Supabase solo `target_protein/carbs/fat`
- `applyLocalPrefs()` viene chiamata da `applyProfile()` — sovrascrive il profilo con le prefs locali; applica `migrateObiettivo()` in lettura
- `togglePianoObiettivo()` e `togglePianoIntol()` chiamano `saveLocalPrefs()` immediatamente
- Il vocabolario obiettivo è **unificato** — tutte le schermate usano le stesse 6 chiavi `OBJ_ADAPT` (vedi sezione sopra)

## Service Worker (`sw.js`)

- Network-first per `zona-tracker.html` (sempre fetch fresco dal server)
- Cache-first per CDN esterni (Supabase JS, jsdelivr)
- Registrato in fondo a `zona-tracker.html`, controlla aggiornamenti ogni 3 min
- Auto-reload della pagina quando trova una nuova versione del SW

## Prossimi step

- [x] Bottom Nav con icone SVG (4 tab)
- [x] Home dashboard (ring + macro + 3 tile)
- [x] Sub-nav Nutrition (Oggi/Integratori/Storico/Piano)
- [x] Modulo Training — Sessione (lista + dettaglio + log serie)
- [x] Modulo Training — Piano (split settimanale + ciclo 4 settimane)
- [x] Modulo Training — Progressione (storico per esercizio)
- [x] Home tile Training live (next session + streak)
- [x] Modulo Body — Misure (form base + avanzati collapsibili, progress bars, griglia composizione)
- [x] Modulo Body — Tendenza (grafici barre peso + vita)
- [x] Home tile Body live
- [x] `train_start_date` in profilo → ciclo 4 settimane live + gate visibilità Training
- [x] Piano → Preferenze alimentari (obiettivo, dieta, intolleranze)
- [x] Piano → Macro adattivi per obiettivo (OBJ_ADAPT, calcAdaptedTargets)
- [x] Service Worker PWA per aggiornamenti automatici
- [x] Vocabolario obiettivi unificato (6 chiavi OBJ_ADAPT, migrazione automatica da vecchi valori)
- [x] Card target Piano mostra obiettivo corretto (fix: `migrateObiettivo` + vocabolario unificato)
- [x] Timeline oggi: pasti e integratori compaiono correttamente dopo reload
- [x] Pulsante 🗑️ elimina pasto visibile nella timeline
- [x] `supplements_log` UNIQUE constraint + pattern delete+insert (no più duplicati)
- [ ] **Pannello admin** (gestione utenti, assegnazione programmi)
- [ ] Fix backfill macro integratori vecchi

## Bug noti

- `trainLoggedSets` si azzera al reload (in-memory only) — i badge serie spariscono dopo refresh
- `updateSuppSlotTime` presente ma non testata in produzione
- Alcuni integratori vecchi mostrano macro `—` (backfill SQL pendente)
- `body_logs` non ha constraint UNIQUE(user_id, date) su Supabase — il salvataggio usa insert/update manuale

## Note

- L'unico file da toccare normalmente è `zona-tracker.html`
- Il client Supabase si chiama `supa` (non `supabase`)
- La regola d'oro: un passo alla volta, Ignazio conferma con "ok/fatto" prima di procedere
