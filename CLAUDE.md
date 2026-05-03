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
- **Oggi**: hero ring, macro bars, timeline pasti+integratori, log pasto AI, badge zona, badge Giorno Perfetto; ogni pasto ha pulsante ✏️ modifica e 🗑️ elimina (solo desktop — su mobile solo swipe); ogni gruppo integratori ha pulsante × per eliminare il gruppo intero
- **Integratori**: lista raggruppata per orario, editing inline, catalogo Nutrilite
- **Storico**: report 7/14/30 giorni, grafico calorie
- **Piano**: target 40·30·30, piano AI, priorità cliniche

### Training (sub-nav: Sessione / Piano / Progressione)
- **Sessione**:
  - Lista sessioni: Upper A/B (Forza/Ipertrofia), Lower A/B, Active Recovery
  - Dettaglio sessione: blocco attivazione 5 min + esercizi con campo `note` in corsivo
  - Pulsante **▶** su ogni esercizio → apre modal scheda AI (`openExerciseAI`)
  - Log serie inline per ogni esercizio: reps + resistenza + RIR → salva su `training_logs`
  - Badge S1/S2/... su card dopo il log, ✓ DONE quando tutte le serie completate
  - Info icon ⓘ su badge RIR (→ `showInfoModal('rir')`) e su serie (→ `showInfoModal('serie')`)
- **Piano**:
  - Split settimanale con giorni numerici G1–G7
  - Ciclo 4 settimane (CARICO × 3 + SCARICO × 1) con settimana corrente (se `train_start_date` impostata)
  - Progressione doppia: 3 step + esempio pratico
  - Info icon ⓘ su "CICLO 4 SETTIMANE" e "PROGRESSIONE DOPPIA"
- **Progressione**:
  - Chips esercizi scrollabili
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
  exerciseAIOpen,   // null | {exName, loading?, wgerImages, wgerVideos, muscleImg, svgContent, content}
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
| `renderTraining()` | Training con 3 tab — gestisce anche modal `exerciseAIOpen` |
| `loadTrainingLogs(exName)` | Fetch storico esercizio per Progressione |
| `saveTrainingSet()` | Insert su training_logs |
| `openExerciseAI(exName, sessionType, note, svgContent)` | Apre modal scheda esercizio AI — usa `EXERCISE_MEDIA` + `callAI()` |
| `showInfoModal(key)` | Mini modal per termini tecnici (rir, serie, recupero, dup, scarico, progressione) |
| `renderBody()` | Body con 2 tab (Misure / Tendenza) |
| `loadBodyLogs()` | Fetch body_logs da Supabase (aggiorna Home o Body in base a ST.page) |
| `saveBodyLog()` | Insert/update body_logs + aggiorna profiles.weight_kg |
| `migrateObiettivo(str)` | Migra vecchi valori obiettivo (`perdita_peso`→`dimagrimento`, `massa_muscolare`→`ipertrofia`) — chiamata in `applyProfile()` e `applyLocalPrefs()` |
| `selectSetObiettivo(val)` | Evidenzia pill obiettivo nella griglia del modal impostazioni |
| `dbToggleSuppTaken(date, suppId, suppName, taken, slot)` | Delete+insert su `supplements_log` (NON upsert — usare questo pattern) |
| `deleteSuppGroup(slot)` | Elimina tutti gli integratori presi di un gruppo dalla timeline |

## Modulo Training — specifiche

**Split:** Upper/Lower 4 giorni + 2 Active Recovery — giorni numerici G1–G7

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

**Attrezzatura:** elastici a tubo con moschettoni (maniglie singole, corda doppia, barra modulare ~130 cm, barra corta), sbarra trazioni, panca, fitball, tappetino

**Protezioni:** lombari e ginocchia

### TRAINING_SESSIONS — esercizi aggiornati (3 maggio 2026)

Ogni esercizio ha: `{ name, sets, reps, eq, note }` (+ opzionale `iso:true` per esercizi isolation/isometrici, usato da `getRestSec` per calcolare il recupero). Il campo `note` viene mostrato in corsivo nella card esercizio — note ora dense (~25 parole) con setup attrezzo + esecuzione + muscoli target.

Convenzioni nomi: tutti gli esercizi con elastico riportano "con elastico" nel nome (es. "Chest press in piedi con elastico"). Nessuna ridondanza tipo "banda elastica".

| Sessione | Esercizi |
|---|---|
| Upper A (Forza) | Trazioni alla sbarra, Chest press in piedi con elastico, Shoulder press in piedi con elastico, Row in piedi con elastico, Face pull con elastico |
| Upper B (Ipertrofia) | Inverted row con elastico, Chest press inclinata su panca, Lateral raise con elastico, Row inclinato in piedi busto 45°, Curl bicipiti con elastico, Tricipiti overhead con elastico |
| Lower A (Forza) | Bulgarian split squat con elastico, Romanian deadlift con elastico, Hip thrust con elastico, Glute bridge isometrico con cavigliera |
| Lower B (Ipertrofia) | Squat con elastico e talloni rialzati, Single leg Romanian deadlift con elastico, Hip thrust con elastico TUT alto, Leg curl con elastico sulla fitball, Calf raise con elastico |
| Recovery | Mobilità articolare, Stretching, Vacuum + respirazione diaframmatica |

### EXERCISE_MEDIA — media per esercizi (3 maggio 2026)

Oggetto globale definito prima di `TRAINING_SESSIONS`. Struttura per esercizio:
```js
{
  muscleImg:   '...', // path locale a assets/exercises/<nome>-muscoli.png (mappa muscolare Wger)
  executionImg:'...'  // path locale a assets/exercises/<nome>-esecuzione.png, oppure null
}
```
Tutti i 19 esercizi sono mappati. `executionImg: null` per esercizi senza foto esecuzione disponibile su Wger; il modal in quel caso mostra solo la mappa muscolare a tutta larghezza.

**Asset locali esercizi:** `assets/exercises/` — PNG di Wger (Wger.de, CC BY-SA 4.0). Versionati nel repo.

**Note temporanee** (TODO per ripuliture future):
- Alcuni `executionImg` puntano a varianti `*-esecuzione-1.png` (esistono `-1` e `-2` da combinare in un'unica immagine senza suffisso)
- `Chest press in piedi con elastico.muscleImg` riusa `chest-press-orizzontale-muscoli.png` come fallback (file `chest-press-in-piedi-muscoli.png` da generare)
- `Hip thrust con elastico TUT alto` riusa il `muscleImg` di `Hip thrust con elastico` (stesso muscolo)

### Scheda esercizio AI — `openExerciseAI`

- Pulsante **▶** accanto al nome di ogni esercizio nel dettaglio sessione
- Apre modal con loading state immediato (`ST.exerciseAIOpen = { exName, loading: true }`)
- Legge media da `EXERCISE_MEDIA[exName]` (nessuna chiamata dinamica a Wger API)
- Chiama `callAI(prompt, 600)` con prompt personalizzato per: 55 anni, ex nuotatore/pallanuotista, lombari (iperlordosi), ginocchia (valgismo dinamico), elastici a tubo
- Modal mostra in ordine: griglia 2 colonne `muscleImg | executionImg` (collassa a 1 colonna se `executionImg=null`), testo AI formattato, footer con attribuzione "Mappe muscolari da Wger.de — CC BY-SA 4.0"
- Il modal è parte di `page-training` innerHTML — gestito tramite `ST.exerciseAIOpen`. Stato: `{ exName, muscleImg, executionImg, svgContent, content }`

### Info icon (ⓘ) — `showInfoModal`

Classe CSS `.info-icon` (cerchio verde 16px). Termini supportati: `rir`, `serie`, `recupero`, `dup`, `scarico`, `progressione`.
Posizionati in:
- Tab Piano: accanto a "CICLO 4 SETTIMANE" (scarico) e "PROGRESSIONE DOPPIA" (progressione)
- Tab Sessione: nel badge header sessione (RIR) e nel badge serie esercizio (serie)

### Fix Piano tab (maggio 2026)

`CYCLE_WEEKS[currentWeek].active = true` crashava se `train_start_date` è nel futuro (`diffDays < 0` → `% 4` → indice negativo). Fix: il blocco esegue solo se `diffDays >= 0`.

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
- **Info icon:** `.info-icon` (cerchio 16px verde accent, testo bianco) — usato per termini tecnici Training
- **Modal info:** `.info-modal-overlay` + `.info-modal` + `.info-modal-close` — usato sia da `showInfoModal` che da `openExerciseAI`

## Deploy

```bash
cd ~/benessere-forma
git add zona-tracker.html
git commit -m "Descrizione"
git push origin main
```

GitHub Pages si aggiorna automaticamente (1-2 minuti).

## Funzioni chiave aggiuntive (aprile–maggio 2026)

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
- [x] Pulsante 🗑️ elimina pasto solo su desktop (mobile usa swipe)
- [x] Pulsante × elimina gruppo integratori in timeline
- [x] `supplements_log` UNIQUE constraint + pattern delete+insert (no più duplicati)
- [x] Info icon ⓘ con mini modal per RIR, Serie, Scarico, Progressione (Training)
- [x] `TRAINING_SESSIONS` aggiornato con nuovi esercizi + campo `note`
- [x] Split Piano giorni numerici G1–G7
- [x] Fix crash tab Piano quando `train_start_date` è nel futuro
- [x] Scheda esercizio AI con modal (video Wger, immagini, mappa muscolare, testo AI)
- [x] `EXERCISE_MEDIA` — media statici per Upper A + Face pull
- [x] Completare `EXERCISE_MEDIA` per Upper B, Lower A, Lower B (3 maggio 2026): tutti i 19 esercizi training mappati con `muscleImg`+`executionImg` PNG Wger locali in `assets/exercises/`
- [x] Nomi esercizi normalizzati ("con elastico" esplicito, no ridondanze) + note dense con muscoli target (3 maggio 2026)
- [ ] Asset `assets/muscles/face-pull.jpg` da aggiungere manualmente (legacy — sostituito dal nuovo sistema `assets/exercises/`)
- [ ] **Pannello admin** (gestione utenti, assegnazione programmi)
- [ ] Fix backfill macro integratori vecchi

## Cosa abbiamo fatto

### 3 maggio 2026 — Aggiornamento esercizi Training (nomi, note, immagini Wger)

**TRAINING_SESSIONS riscritto** con tutti i 19 esercizi training rinominati per chiarezza ("con elastico" esplicito, niente "banda", niente ridondanze tipo "orizzontale/verticale"). Note esercizio ora dense (~25 parole): setup attrezzo concreto + indicazioni esecuzione + lista muscoli target. Reps "per lato" specificato per esercizi unilaterali (Bulgarian, Single leg RDL).

**EXERCISE_MEDIA passato da SVG inline custom (`muscleMapSVG` 7-15KB cad.) a immagini PNG Wger locali**:
- Struttura nuova: `{ muscleImg, executionImg }` — entrambi path a `assets/exercises/*.png`
- Tutti i 19 esercizi mappati. `executionImg: null` per esercizi senza foto Wger disponibile (Inverted row, Romanian deadlift, Hip thrust, Glute bridge, Single leg RDL, Hip thrust TUT, Bulgarian, Row in piedi, Face pull, Chest press in piedi)
- ~44 KB di SVG inline rimossi → ~3.7 KB di references → file più snello
- Asset PNG Wger.de versionati in `assets/exercises/` (CC BY-SA 4.0)

**Modal `openExerciseAI` semplificato**:
- Rimosso rendering `muscleMapSVG`/`wgerImages`/`wgerVideos` (stato `ST.exerciseAIOpen` solo `{ exName, muscleImg, executionImg, content }`)
- Nuovo layout: griglia `1fr 1fr` con muscoli a sinistra + esecuzione a destra; collassa a `1fr` se `executionImg=null`
- Footer attribuzione "Mappe muscolari da Wger.de — CC BY-SA 4.0"

**Compat storico Supabase**: i record esistenti su `training_logs.exercise_name`/`workout_sets.exercise_name` con vecchi nomi sono stati rimappati manualmente via SQL (no alias dict nel codice).

**Note tecniche residue**:
- 4 file con suffisso `*-esecuzione-1.png`/`-2.png` — usati `-1` come placeholder, da unire poi in un singolo file senza suffisso
- `chest-press-in-piedi-muscoli.png` non disponibile → fallback a `chest-press-orizzontale-muscoli.png` (stessi muscoli target)


### 2 maggio 2026 — Modulo Training: AI, persistenza, esperienza in-sessione

**Mappe muscolari SVG (Upper A integrate)**
- `EXERCISE_MEDIA[exName].muscleMapSVG` — SVG inline (anteriore + posteriore) renderizzato nel modal scheda esercizio AI
- Esercizi coperti: Trazioni alla sbarra, Chest press orizzontale, Chest press inclinata, Shoulder press verticale, Row orizzontale, Face pull
- Da completare: Upper B, Lower A, Lower B, Recovery

**Tabelle Supabase create**
- `workouts` — record di sessione completata: `id`, `user_id`, `date`, `session_type`, `completed`, `duration_min`. Usata da calendario Progressione + Home tile + cards Sessioni
- `workout_sets` — log per serie singola con dati strutturati: `id`, `user_id`, `workout_id` (nullable), `date`, `session_type`, `exercise_name`, `set_number`, `reps`, `resistance` (int), `unit` (kg/lbs), `rir_actual`. Sorgente di verità per la nuova UI; `training_logs` resta come storico parallelo (compat Progressione)
- RLS su entrambe: `auth.uid() = user_id`

**Countdown recupero trifase (Blocco Attivazione)**
- 3 voci: Respirazione 360° (120s) · Vacuum (120s) · Cat-Cow (60s)
- Per ogni voce: checkbox tappabile + display `MM:SS` + ▶/⏸/✕ + tap su tempo durante pausa per modificare via `prompt()`
- Auto-check al raggiungere 0 + 5 beep AudioContext (880Hz × 0.3s × gain 1.0 × gap 150ms) + vibrazione `[300×5,100×4]`
- Reset countdown se l'utente toglie il check su una voce completata
- Update DOM mirato (no full re-render ogni secondo) per non interferire con input form aperti
- Titolo "Blocco Attivazione" diventa verde + ✓ quando tutte e 3 spuntate
- State `ST.trainActivation[3]` + `ST.trainActivationTimers[3]` (in-memory, reset a back button)

**WakeLock — schermo sempre acceso durante sessione**
- `requestWakeLock()` su `openTrainingSession()` · `releaseWakeLock()` su back, cambio tab, `showPage` non-training
- `visibilitychange` listener riacquisisce il lock al rientro foreground se sessione attiva
- `try/catch` silenzioso se l'API non è supportata (Safari iOS pre-16.4 ignora)

**Suggerimento progressione AI (Cloudflare Worker)**
- `suggestProgressionAI()` chiama `callAI(prompt, 80)` dopo ogni `saveTrainingSet`
- Prompt include: esercizio, serie corrente, reps/resistenza/RIR effettivi, range target, RIR target, storico ultime 3 sessioni distinte (escluso oggi) da `training_logs`
- Risposta salvata in `ST.aiSuggestions[${sessionId}_${exName}]` e mostrata sotto i badges nella card esercizio: testo `🤖 …` italic teal `#2A7A6F` 11px
- Fail silenzioso

**Calendario mensile Progressione**
- `renderCalendar(workouts, year, month)` — griglia mese con celle colorate per `session_type` + sigle UA/UB/LA/LB/AR
- Footer: counter Sessioni + Streak + sessione più frequente
- Navigazione mese precedente/successivo via `loadWorkouts(y, m)`
- Tap cella con workout → conferma eliminazione (`ST.trainCalDeleteConfirm`)

**Giorno completato visibile**
- Auto-trigger `saveWorkoutRecord(sessionId)` dentro `saveTrainingSet()` quando tutti gli esercizi della sessione sono al 100%
- `saveWorkoutRecord` reso idempotente — query preventiva su `(user_id, date, session_type)` per evitare duplicati
- Anti-duplica anche via `ST.trainCompletedToday[sessionId]`
- Toast `🎉 Sessione completata!` + ricarica `loadTrainingHomeData` + `loadSessionLastCompletion`
- **Cards Sessioni**: ogni card ora mostra overline `GIORNO N` (1=upperA, 2=lowerA, 3=upperB, 4=lowerB) + pill `✓ {data}` in alto a destra se completata (verde se oggi, grigia altrimenti)
- **Home tile Training** riscritta: query diretta su `workouts ORDER BY date DESC LIMIT 1` come sorgente di verità unica desktop/mobile. 4 stati discreti: `notStarted` ("Inizia il programma — Giorno 1: Upper A") · `doneToday` ("Giorno X completato ✓ · Prossimo: Giorno Y — …") · `inProgress` ("Sessione in corso — Riprendi →") · default ("Giorno Y · {tipo}" con last date + streak). Eliminato il check `train_start_date > today` che bloccava la tile su mobile

**Scala elastici numerica (resistance picker)**
- Sostituito input testuale con scroll picker orizzontale `RESIST_VALUES = [10..250]` step 10
- `scroll-snap-type:x mandatory` + `selectResist(v)` aggiorna DOM in place (no re-render → preserva scroll/focus)
- Auto-scroll alla selezione iniziale all'apertura modal
- Helper text fisso: "lbs indicativi · scarto ±15% per gli elastici a tubo"
- Default = ultimo valore loggato per quell'esercizio nella stessa giornata, fallback 30
- Salvato come integer in `workout_sets.resistance` (e come stringa in `training_logs.resistance` per compat)

**Unità kg/lbs**
- `<select>` kg/lbs nella sezione Training del modal Impostazioni
- Salvata in `localStorage` prefs (`zt_prefs_<userId>.unit`), NON su Supabase (evita problemi schema)
- Default `kg`. Etichetta visualizzata nel picker carico (`CARICO (kg)` / `CARICO (lbs)`) e accanto ai valori delle serie loggate
- Saved with workout_sets row as `unit` field

**Edit serie loggata inline**
- Pulsante ✏️ su ogni badge serie loggata → riga diventa editabile (input numerici reps + resist + ✓ + ✕)
- `confirmEditLog`: `UPDATE workout_sets WHERE id = setId AND user_id = …` (id catturato all'insert via `.select('id').single()` e salvato in `ST.trainLoggedSets[key].setId` + persistito in localStorage). Fallback su composite key `(user_id, date, session_type, exercise_name, set_number)` per record antecedenti questa modifica
- Update parallelo anche su `training_logs` (compat Progressione)
- Inputs bound via `oninput` a `ST.editLogDraft` per resistere a re-render dei timer attivazione
- Progress `X/Y serie` ricalcolato auto

**Audio iOS fix**
- `_audioCtx` singleton globale lazy (no più creazione ad ogni beep)
- `_unlockAudio()` chiama `ctx.resume()` dentro user gesture; aggiorna `ST.audioBlocked`
- Listener globale one-shot su `touchstart`/`touchend`/`mousedown`/`keydown` (capture phase) → sblocca al primissimo gesto, poi si auto-rimuove (critico per iOS Safari che richiede gesture per `AudioContext.resume()`)
- `visibilitychange` chiama `_unlockAudio()` al rientro foreground (iOS sospende il context in background)
- Vibrazione `navigator.vibrate([300,100,300,100,300,100,300,100,300])` come fallback fisico parallelo al beep
- Banner non invasivo "🔔 Tocca per attivare l'audio" in cima al detail sessione se `ST.audioBlocked=true` dopo tentativo di resume fallito; tap dismiss chiama `_unlockAudio()`

**Layout & UX card esercizio**
- Riscritta a 5 righe `flex-wrap:nowrap` per evitare wrap mobile (titolo era andato a capo): R1 titolo + +S/✓DONE · R2 ▶ + sets×reps + RIR pill + ℹ + spacer + X/Y serie · R3 Recupero a destra · R4 attrezzo · R5 nota
- Border-left 3px verde `#2A7A6F` quando `allDone`
- Colore "Recupero: X" dinamico per durata: ≥120s grigio · 90s `#2A7A6F` · 60s `#185FA5`
- Pill `RIR N` accanto a sets×reps (sfondo `#E8F0FA`, testo `#185FA5`, font-mono 10px)
- Padding-bottom `calc(96px + env(safe-area-inset-bottom))` sul wrapper sessione per non finire sotto la bottom nav iPhone

## Bug noti

- `trainLoggedSets` si azzera al reload (in-memory only) — i badge serie spariscono dopo refresh
- `updateSuppSlotTime` presente ma non testata in produzione
- Alcuni integratori vecchi mostrano macro `—` (backfill SQL pendente)
- `body_logs` non ha constraint UNIQUE(user_id, date) su Supabase — il salvataggio usa insert/update manuale

## Note

- L'unico file da toccare normalmente è `zona-tracker.html`
- Il client Supabase si chiama `supa` (non `supabase`)
- La regola d'oro: un passo alla volta, Ignazio conferma con "ok/fatto" prima di procedere
