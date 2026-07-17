# Zona Tracker

PWA wellness single-file HTML, hostata su GitHub Pages.

## File e URL

- **App**: `zona-tracker.html` (unico file: HTML + CSS + JS)
- **Admin**: `dashboardzona.html` (email-gated `ignazio.f@me.com`, read-only)
- **URL pubblico**: https://ignaziof321621.github.io/benessere-forma/zona-tracker.html
- **Repo**: https://github.com/IgnazioF321621/benessere-forma · branch `main`
- **Stack**: HTML/CSS/JS puro, nessun framework, nessun build step

## Servizi

| Servizio | URL | Scopo |
|---|---|---|
| Cloudflare Worker | `zona-ai.ignazio-f.workers.dev` | Proxy Groq (llama-3.3-70b-versatile) + lookup GIF (ExerciseDB) |
| Supabase | `qxiyeiahpoiliwpqslpr.supabase.co` | DB + Auth + Storage |

Worker: account `ignazio-f` (account_id `2186a57344e459853657cea6213a2c74`). Secrets: `SUPABASE_SERVICE_ROLE_KEY` + `API_KEY`. `worker/wrangler.toml` aggiornato.

## Pattern tecnici

- Client Supabase si chiama `supa` (non `supabase`)
- Supabase SQL Editor gira come admin: `auth.uid()` = NULL → usare UUID espliciti
- `schedaGen=1` ricostruisce la scheda da zero, cancella storico progressione → solo per correzioni mirate
- Inspect: `grep -n "functionName"` → `sed -n 'START,ENDp'` (mai broad search sul monolite)
- `console.log` da rimuovere solo manualmente, mai con script automatici
- Versioning: `APP_VERSION` costante aggiornata dal pre-commit hook git automaticamente
- `TRAINING_SESSIONS`/`SESSION_CYCLE` hardcoded sono fallback; gli helper `getTrainingSession`/`getAllTrainingSessions`/`getSessionCycle` leggono prima da `ST.userTrainingSessions` (scheda utente da DB)

**Lezioni operative (13 luglio 2026):**
- Il ciclo canonico a 7 include `rest`: ogni logica che itera il ciclo deve gestire gli slot non loggabili (`rest`/`rest_injury`).
- La settimana ciclo si legge SOLO da `getCycleWeekInfo()`: vietato ricalcolarla inline (il terzo punto sfuggito era in `getNextCheckpointInfo`).
- Incollare righe nel Google Sheet: mai in append — sovrascrivere le righe con lo stesso codice, poi verificare doppioni con COUNTIF prima del sync (errore 21000 ON CONFLICT = doppioni).
- Colonne extra non nominate nel Sheet rompono il sync (PGRST204 colonna `''`): eliminare le colonne, non svuotarle.

**Lezioni operative (17 luglio 2026):**
- supabase-js NON lancia eccezioni sugli errori API: restituisce `{error}` nel result → i `try/catch` non li vedono. Controllare SEMPRE `res.error` (causa storica dei buchi silenziosi su `workout_sets`).
- Ramo `?name=` del Worker: match ESATTO su dizionario hardcoded (~20 nomi storici, `MATCH_DATA`), nessuna normalizzazione — non tocca né catalogo né `biblioteca_gif`.
- `biblioteca_gif`: 1.625 righe di cui il 72% (1.164) non referenziate da alcun `gif_slug` del catalogo — riserva del cantiere GIF, ma pesa su Storage/DB free tier.

---

## Stato corrente (17 luglio 2026)

**APP_VERSION attuale**: da verificare su device prima di ogni intervento.

### Modulo Nutrition ✅ COMPLETO
Tab Oggi, Integratori v3, Analisi v3, Piano v4 (Step A→F.2a) production-ready. F.2b (colazione/merenda) in STAND BY per scelta utente. Bug cache sticky `mealsByDay={}` fixato (commit `f7ca675`).

### Modulo Training — in sviluppo attivo
- Coach generatore: 554 esercizi su `esercizi_catalog` (gap intenzionali da fusioni), split 4/5 giorni con rotazione adattiva
- Split 5 giorni (DUP, intermedio/avanzato): 7 posizioni — upperA · lowerA · recoveryUpper · upperB · lowerB · upperC(Pump) · rest
- Recovery unificato: singolo "Recovery Day" (~25 min, 26 esercizi, 5 blocchi); DRY reference `recoveryLower.exercises → recoveryUpper.exercises`
- Upper Pump: 3×15-25 reps, RIR 0, rest 50s, isolamenti only, niente compound pesanti, niente Tabata
- Onboarding M1: 9 step live incluso blocco Training
- Audio: 3 suoni semantici (`playPrepBeep` 660Hz warning 5s, `playStopBeep` 659Hz stop, `playLongBeep` 1100Hz GO) — implementato
- Timer recupero parallelo al form log + riepilogo post-salvataggio nel modal recupero (commit `6125812`)
- **Restyling colori Training** ✅ (27 giugno 2026): tutti i colori hardcoded sostituiti con CSS vars — `#2A7A6F→var(--acc)`, `#E6F4F2→var(--acc-lt)`, `#B84C2A→var(--err)`, `#9CA3AF→var(--t3)`, banner Tabata→`var(--s1)/var(--t2)`
- **Debt guard**: `computeTrainingDebt()` ha guard `test-user-001` allineato a `computeTrainHomeData()`

**Sessione 17 luglio 2026 — audit Training + fix affidabilità:**
- **Timer unificati su orologio reale** (commit `e834320` + `fcd5185`): Tabata, warm-up (iso A/pausa/B), recovery (micro-pausa + blockStop), attivazione ed exec timer (doppio lato) ora timestamp-based su `endTime` come `tickCountdown` — tick 250ms, catena fasi senza drift, rientro da background con catch-up silenzioso (STOP idempotente, LONG stantio soppresso >1.5s), pausa/ripresa con residuo congelato. ⏳ IN OSSERVAZIONE: test su workout reali in corso.
- **WS-QUEUE** (commit `871aaf3` + `fcd5185`): nessuna scrittura su `workout_sets` può più perdersi in silenzio. `wsWrite()` = 1 retry immediato → coda persistente `zt_ws_pending_<userId>` in localStorage → toast discreto. Flush al boot post-login, a ogni scrittura riuscita e al rientro in foreground. Insert idempotente al replay, insert+delete stessa chiave si annullano, cap 200 op.
- **Storico bonificato (solo DB, nessun commit)**: rename asimmetrico 32 righe WS · reinserite 18 righe del 2/6 maggio · `band_color='Viola'` su 4 trazioni · migrazione ai nomi catalogo (35 rinomine: 408 righe TL + 407 WS) · bonifica 4 doppioni TL. **Stato finale: TL = WS = 912 righe, divergenza 0, doppioni 0**; orfani residui solo 2 congelati per scelta ("Squat con elastico e talloni rialzati", "Mobilità articolare").
- **Audit diagnosi completata**: mappa problemi 4 rossi / 6 gialli / 8 note (dettaglio in `mappa-audit-training.md` di Ignazio). Punti ancora aperti: 91 esercizi senza `gif_slug` (di cui 53 principali) · rientro soft dopo pause lunghe assente · infortunio solo giornaliero · `GEAR_ALIASES` corto · 1.164 GIF orfane in biblioteca. ~~Sessioni fallback hardcoded senza codice~~ chiuso 17 luglio sera: 27 campi `codice` aggiunti a `TRAINING_SESSIONS` (18 da mappatura storico + Trazioni→EX008 + 8 recovery); restano senza codice per scelta "Squat con elastico e talloni rialzati" (congelato) e 12 voci recovery mai catalogate → idea futura mini-zona "Mobilità" del catalogo (segnata, non pianificata). ~~Slug rotti EX057/EX088~~ chiusi il 17 luglio sera (fix `gif_slug` via Sheet + sync, riuso GIF esistenti: nessun upload).

**Fix deployati post-audit (5 commit, 12-13 luglio 2026):**
- **Scheda attiva — nomi runtime**: il loader di `schede_utente` riallinea in memoria i `name` degli esercizi al catalogo live via Map codice→nome (warmup, exercises, carry_conclusivo, finisher.exercises). Il jsonb NON si tocca mai. Fallback: senza codice o codice non a catalogo → resta lo snapshot. Fix GIF modal: `openExerciseAI` passa `ex.codice` a `fetchExerciseMedia` (risolve via `?code=`).
- **Rotazione**: `nextSession` usa `lastInCycle` (recovery inclusi come marcatori di posizione); slot `rest` consumato se l'ultimo workout non è di oggi (avanza con wrap a upperA). `computeTrainingDebt` invariato: recovery trasparenti al debito.
- **`getCycleWeekInfo()`**: helper canonico UNICO per la settimana ciclo (`weekNum, isScarico, workCount, workPerGiro`). Conta SOLO i giorni di lavoro (recovery esclusi); `workPerGiro` derivato dal ciclo (6gg→4, 5 giorni→5). Correttivo bordo day-aware: a multiplo esatto resta sulla settimana chiusa solo se l'ultimo workout è di oggi. Consumatori: render Progressione, scarico, `getNextCheckpointInfo` (guardia `3*workPerGiro`).
- **Scarico (decisione utente)**: stessi esercizi e set, SOLO carichi ridotti + RIR forzato a 3 in `computeNextSetSuggestion`; riga SCARICO nella card al primo set; badge header; testo modal allineato. MAI ridurre set/reps.
- **Sostituzione cautele**: alternativa accettata solo se nel Set ammissibili (unione dei 5 pool filtrati luogo/attrezzo/livello), altrimenti skip `alternative-not-eligible`. Vale anche per Tabata.
- **Suggerimenti unit-aware**: `ST.profile.unit` → kg step 2.5 / lbs step 10 (default lbs); ramo bande trazioni senza unità.

### Modulo Body
M2 check fisico funzionale. Da ri-agganciare a fine blocco Training.

**Checkpoint sync mesociclo** (13 luglio 2026): `getNextCheckpointInfo()` legge la settimana da `getCycleWeekInfo()`.
- `overdue:true` solo se `isScarico` **e** `workCount >= 3*workPerGiro` (almeno 3 giri di lavoro) **e** `daysUntil < 0`
- Settimane 1-3 (carico): `overdue:false` sempre, anche se >28 giorni dall'ultimo check
- Fallback 0 workout: comportamento classico (overdue se >28 gg)
- Label Home: se `daysUntil < 0 && !overdue` → mostra `"CHECKPOINT A FINE MESOCICLO"` (non numero negativo)

### Admin panel (`dashboardzona.html`) ✅ production-ready

---

## Prossimi cantieri (priorità aperte)

**Training (post-audit 17 luglio 2026):**
0. **PRIMA DI TUTTO — test timer su workout reali** (commit `e834320` in osservazione) → poi scegliere tra i gialli restanti della mappa audit (punti 7-10) e il cantiere GIF dei 91 esercizi senza `gif_slug`. Zona Polpacci sempre in coda.
1. **ALTO — avviso utente corpo libero puro** — con zero attrezzi non esistono tirate/deltoidi copribili: scelta UX da prendere (avviso in onboarding o generazione).
2. ~~EX057~~ risolto (17 luglio sera): riusa la GIF Spalle "prono panca inclinata 45°" — se un giorno arriva una GIF a 30° dedicata, si può sostituire. Zone GIF mancanti: Dorsali e restanti.
3. **Pool risicati casa** — deltoidi laterali 1, ischiocrurali 2, spinta verticale 1: si risolvono con le zone future del cantiere GIF.
4. Residui storici invariati: memoria di blocco rotazione esercizi · gating principianti 5gg · infortuni multi-giorno (duration + history UI) · pulizia `EXERCISE_MEDIA` legacy · pill RIR per-esercizio in scarico (ritocco cosmetico).

**Altri moduli:**
5. **Mappa muscolare** — PNG per gruppo muscolare (~15-20 file), selezionati automaticamente dal campo `muscoli` del catalogo. Strategia A: file locali `assets/muscles/<gruppo>.png`. Strategia B: API Muscle Visualizer ExerciseDB (da valutare).
6. **M2 entry point** — `"Nuovo check fisico"` sempre visibile in Body; reminder fine blocco; blood test history UI (`m2EntryIntro()` esiste, manca UI di accesso).
7. **Progressione tab** — Volume + Carico per esercizio dentro card (prossimo livello grafico).
8. **F.2b/colazione/merenda** — stand-by; riattivare solo se richiesto in onboarding.
9. **Push notifications** — sistema unico riusabile (piano + training + integratori).
10. **Refresh onboarding M1** — preferenze generazione piano (giorno/ora) + tracking peso. ⚠️ `profiles_plan_day_check` ammette solo `'fri'/'sat'/'sun'` — no `'custom'` senza estendere il CHECK.
11. **Coach identity** — nome proprio per l'AI coach (tipo Alexa/Siri). Deferred.
12. **"Oggi ho solo X min"** (Phase 2) — compressione singola sessione senza toccare progressione blocco.
13. **Calorie floor** — validare `KCAL_MIN_F`/`KCAL_MIN_M` con nutrizionista prima di release pubblica.

## Bug noti aperti

- `trainLoggedSets` si azzera al reload (in-memory only) — badge serie spariscono dopo refresh
- `updateSuppSlotTime` non testata in produzione
- Alcuni integratori vecchi hanno macro `—` (backfill SQL pendente)
- `body_logs` manca UNIQUE(user_id, date) — salvataggio usa insert/update manuale
- Editor Pacchetto: emoji picker e time picker usano `prompt()` nativo (UX scadente su mobile)
- GIF nel modal informativo pre-serie (scheda esercizio AI): non mostrata — da decidere
- Isabella: `status=draft`, 0 meals per settimana corrente — non investigato
- **EX287 "Stacco da terra classico"**: decisione pendente su quale GIF tenere — confronto locale disponibile in `Biblioteca di esercizi/Gambe e Glutei/Stacco da terra classico.gif` (live attuale) vs `Stacco da terra classico - CANDIDATO da confrontare.gif` (proposto Blocco 23, non caricato)

---

## Autenticazione

**OTP a 6 cifre via email** (migrazione Magic Link completata aprile 2026).

Flusso:
1. `signInWithOtp({ email, options: { shouldCreateUser: true } })`
2. Supabase invia codice 6 cifre
3. `verifyOtp({ email, token, type: 'email' })`

Bootstrap (`zona-tracker.html`, `setTimeout(..., 1800)`): ordine casi → `?test=1` → hash `#access_token` → query `?code=` → `getSession()` → schermata auth → `onAuthStateChange` → `visibilitychange` (polling + `refreshInBackground` throttle 30s).

Rate limit Supabase OTP: se raggiunto, aspettare 1h.

---

## Design system

- **Font**: Syne (titoli/prose) + JetBrains Mono (numeri/label). **MAI Manrope** sulle schermate nuove.
- **Background**: bone `#F5F3EE`
- **Accent globale**: evergreen `#2A7A6F`
- **Tinte modulo** (CSS vars): Nutrition `--mod-nutrition:#FAC775`, Training `--mod-training:#B5D4F4`, Body `--mod-body:#AFA9EC` (viola forte `#5E4A7A` riservato a Body checkpoint)
- **Over-target**: `OVER_COLOR='#B45309'`
- **Sub-nav**: `.nutrition-subnav` + `.nsn-pill` — riusato su tutti i moduli
- **"coach"** sostituisce "AI" in tutti i copy visibili UI

*Nota: Training restyling completato (27 giugno 2026). Nutrition e Body hanno ancora elementi legacy — migrazione progressiva in corso.*

---

## Navigazione

| Tab | ID pagina | Gate |
|---|---|---|
| 🏠 Home | `home` | — |
| 🌿 Nutrition | `oggi` | — |
| ⚡ Training | `training` | `train_start_date` impostata |
| ◐ Body | `body` | — |

`hasTraining()` = `!!ST.profile.train_start_date` (NON `usa_training`).

---

## Schema Supabase

### `profiles`
PK = `id` (= `auth.users.id`). Colonne chiave:

| Campo | Tipo | Note |
|---|---|---|
| `first_name`, `last_name` | text | |
| `age`, `sex` | int, char(1) | sex: 'M'/'F'/'O' |
| `height_cm`, `weight_kg`, `goal_weight_kg` | numeric | |
| `target_kcal/protein/carbs/fat` | int | snapshot macro |
| `obiettivo` | text | CSV delle 6 chiavi `OBJ_ADAPT` |
| `dieta`, `intolleranze` | text, text[] | |
| `activity_level` | text | |
| `train_start_date` | date | gate visibilità Training |
| `usa_training` | bool | default true |
| `tipo_allenamento` | text | casa/palestra/aperto |
| `attrezzatura` | text[] | |
| `giorni_allenamento` | int | 2/3/4/5 |
| `durata_sessione` | int | 30/45/60 min |
| `note_salute` | text | serializza esperienza, limitazioni (no colonne dedicate) |
| `plan_generation_day` | text | CHECK `'fri'/'sat'/'sun'` |
| `plan_generation_time` | text | HH:MM |
| `weight_tracking_mode` | text | `daily/every3/weekly/flexible` |

⚠️ `obiettivo`/`dieta`/`intolleranze` anche salvati in `localStorage` (`zt_prefs_<userId>`) — `applyLocalPrefs()` sovrascrive dopo ogni `applyProfile()`.

### `meals`
| `id` uuid PK | `user_id` uuid | `date` date | `time` text HH:MM | `slot` text | `description` text (nome autoritativo) | `kcal` numeric(6,1) | `protein/carbs/fat` numeric(5,1) | `notes` text |

### `supplements_log`
`user_id, date, slot, supplement_name, taken, is_extra, supplement_codice, dose, dose_unit, kcal, carbo, proteine, grassi, costo, created_at`. UNIQUE `(user_id, date, supplement_name)`.

### `supplement_packages`
`id, user_id, name, emoji, time HH:MM, sort_order, created_at`. RLS 4 own + admin.

### `supplement_package_items`
`id, package_id → packages CASCADE, supplement_id → supplements CASCADE, user_id, sort_order`. UNIQUE `(package_id, supplement_id)`.

### `nutrilite_catalog`
64 prodotti. RLS SELECT pubblica. PK logica = `codice`.

### `esercizi_catalog`
554 righe (verificato live 17 luglio 2026; zero doppioni al 13 luglio 2026). Prossimo codice libero: **EX555**. RLS SELECT pubblica. **PK logica = `codice`**. Google Sheet → Apps Script "ZonaTracker-Sync-Esercizi" (v3) → Supabase. **Mai editare Supabase direttamente**.

Colonne chiave: `codice, nome, nome_en, pattern, gruppo_target, attrezzo, luogo, muscoli, livello, zone_rischio, adattamento, alternativa, setup, esecuzione, errori, nota_sicurezza, uso, surrogato_attrezzo, nota_surrogato, esecuzione_surrogato, errori_surrogato`.

`nome_en` (text, nullable): nome inglese di riferimento, popolato progressivamente per zone insieme alle GIF.

**Regole `surrogato_attrezzo` (vincolanti, verificate 13 luglio 2026):**
- SOLO token puliti separati da `+` (tutti richiesti). Vocabolario valido: `elastico, manubri, panca, sbarra, fitball, kettlebell, maniglie, trx, cavigliera, barra, bilanciere, corpo libero`. MAI testo libero, MAI alternative con "o".
- Congruenza obbligatoria: se il surrogato è X, `nota_surrogato`/`esecuzione_surrogato`/`errori_surrogato` non devono proporre attrezzi diversi da X (la menzione dell'attrezzo originale sostituito è ok).
- `manubri` sempre plurale; separatore `attrezzo` SOLO `;`.

`uso` valori: `principale / finisher / recupero / riscaldamento / mobilita / carry`.
`pattern` normalizzato via `_normPattern()` (lowercase + trim).
`gruppo_target` vocabolario chiuso — non dedurre da `muscoli` (testo libero, vocabolario diverso).

### `schede_utente`
`id, user_id, blocco_n int, scheda jsonb, attiva bool, created_at`. Indice UNIQUE PARTIAL su `(user_id) WHERE attiva=true` (max 1 attiva per utente). Fallback su `TRAINING_SESSIONS` hardcoded se nessuna scheda. I `name` degli esercizi nel jsonb sono snapshot alla generazione: il loader li riallinea a runtime dal catalogo (vedi Modulo Training → nomi runtime), il jsonb non si riscrive mai.

### `training_logs`
`id, user_id, date, session_id, exercise_name, set_number, reps, resistance, rir_actual, notes`.

### `body_logs`
`id, user_id, date, weight_kg, waist_cm, bf_pct, muscle_kg, visceral_fat, hip_cm, chest_cm, bicep_cm, body_age, notes`. No UNIQUE constraint.

### `weight_logs`
`id, user_id, date, weight_kg, created_at`. UNIQUE `(user_id, date)`.

### `weekly_plans`
`id, user_id, week_start date, target_kcal/protein/carbs/fat, ai_reasoning, status (draft/active/archived), created_at`. UNIQUE `(user_id, week_start)`.

`plan_generation_day` CHECK: solo `'fri'/'sat'/'sun'` — nessun `'custom'` senza estendere il vincolo DB.

### `weekly_plan_meals`
`id, plan_id → weekly_plans CASCADE, user_id, day_of_week int 1-7, slot text, description, ingredients jsonb, meal_time text, kcal/protein/carbs/fat int, ai_explanation, sort_order, created_at`.

### `weekly_plan_acceptance`
`id, plan_meal_id → weekly_plan_meals CASCADE, user_id, status (accepted/substituted/skipped/off_plan), actual_meal_id → meals SET NULL, notes, created_at`. UNIQUE `(plan_meal_id)`.

### `ai_memory`
`id, user_id, category (preference/avoidance/context/pattern), content, confidence numeric(3,2), evidence_count, last_observed, active bool, created_at`.

### `fasting_days`, `supplements`, `workout_sets`
Tabelle esistenti, RLS standard.

### `nutrilite_catalog`
Script separato → `nutrilite_catalog`. Separato da `esercizi_catalog`.

---

## Vocabolario obiettivi (`OBJ_ADAPT`)

6 chiavi valide: `dimagrimento · ricomposizione · ipertrofia · forza_performance · longevita · mantenimento`.

`OBJ_MIGRATE`: `{ perdita_peso: 'dimagrimento', massa_muscolare: 'ipertrofia' }` — `migrateObiettivo()` applicata ovunque si legge `profile.obiettivo`.

Macro % `[carbo, prot, fat]`:
- dimagrimento: 38/32/30
- ricomposizione: 38/34/28
- ipertrofia: 40/35/25
- forza_performance: 42/33/25
- longevita / mantenimento: 40/30/30

---

## Media system

### GIF esercizi (Worker + biblioteca Supabase)
- Worker endpoint dual-mode: `?code=EX###` (priorità) · `?name=...` (legacy 20 esercizi storici)
- Flusso `?code=EX###`: cerca `gif_slug` su `esercizi_catalog WHERE codice=EX###` → se presente, lookup `biblioteca_gif WHERE slug=gif_slug` → URL `biblioteca-gif/{categoria}/{gruppo_muscolare}/{slug}.gif` (source: `biblioteca`)
- Fallback: se `gif_slug` NULL → vecchio `MATCH_BY_CODE` ExerciseDB (source: `exercisedb`)
- `biblioteca_gif`: 1.625 righe (conteggio verificato su Supabase 17 luglio 2026). Zone complete: Addominali e Core · Gambe e Glutei · Bicipiti e Braccia · Pettorali · Spalle e Cuffia · Tricipiti (+ asset legacy `muscolazione/*` residui). Tabella: `slug, nome_italiano, nome_originale, categoria, gruppo_muscolare, storage_path, storage_url`. Convenzioni: filename Storage `IT (EN).gif` con `°` strippato nel path; `nome_italiano` mantiene il `°`; `slug` = `gif_slug` del catalogo. Il `:` nel filename è ammesso e NON viene sanificato da Storage (5 varianti "skull crusher" in `Tricipiti/`): verificato 17 luglio 2026, chiave reale = `storage_path` del TSV. La cronologia dettagliata dei batch/blocchi (giu-lug 2026) è nel git log di questo file.
- `esercizi_catalog.gif_slug`: **463/463 slug risolvono** su `biblioteca_gif` (verificato live 17 luglio 2026 sera, Worker incluso). Chiusi gli ultimi 2: EX057 → riuso GIF Spalle `alzate-laterali-manubri-prono-panca-inclinata-45-…` (45° vs 30° del nome: solo angolo diverso); EX088 → `camminata-alternata-manubri` (era un mismatch di slug, la GIF esisteva già). Entrambi corretti via Google Sheet + sync. Codici senza slug → fallback ExerciseDB.
- ⚠️ Verifica risoluzione slug: `biblioteca_gif` supera le 1.000 righe → PostgREST tronca la SELECT al limite di default. Paginare con header `Range`, altrimenti compaiono orfani fantasma.
- Worker Version ID attuale: `da1e0007` (deploy 29 giugno 2026)

### Cantiere GIF — metodo e regole di processo (aggiornato 2 luglio 2026, sostituisce le regole precedenti)

**Fonte di verità (la regola più importante)**
- Il CSV locale del progetto NON è più la fonte per le decisioni — è la copia più vecchia e disallineata.
- Gerarchia reale: Google Sheet `catalogo_esercizi` = master ufficiale (ci gira l'app) → Supabase = copia operativa (aggiornata in tempo reale da Claude Code durante il cantiere) → CSV locale = copia più vecchia.
- A inizio sessione: l'utente scarica il Google Sheet aggiornato e lo carica in chat; Claude (chat) lavora su quella fotografia fresca per tutta la sessione, non sul CSV del repo.
- In fase di verifica/esecuzione: Claude Code legge lo stato reale da Supabase (`esercizi_catalog` + `biblioteca_gif`), mai dal CSV locale.

**Quattro controlli anti-errore (ad ogni blocco)**
1. Decidere sul dato fresco, mai sul CSV vecchio (vedi sopra).
2. Verificare la voce, non solo la GIF nuova — prima di agganciare una GIF a un codice esistente, controllare che quel codice abbia GIÀ nome/slug/GIF coerenti. Se la voce è già sbagliata, segnalare e correggere, non costruirci sopra.
3. Controllo di coerenza finale a fine blocco, per ogni voce toccata: la GIF mostra davvero quel movimento? Nome e slug combaciano? Se no, stop.
4. La lettura visiva di Claude prevale su una conferma veloce — se i fotogrammi contraddicono il nome (o una conferma rapida dell'utente), fermarsi e segnalarlo invece di procedere.

**Cantieri di pulizia separati (NON mescolare con l'aggiunta di nuove GIF)**
- Bonifica doppioni emersi dal pre-scan (es. Smith machine = multipower, gruppo estensione anca, stiff-leg).
- Bonifica del "vecchio ereditato" (nomi/GIF sbagliati nelle voci storiche).
- Sessioni dedicate, non durante la catalogazione.

**Pre-scan doppioni a inizio zona**
- Prima di catalogare una nuova cartella/zona: Claude Code fa un pre-scan (solo lettura) che confronta cartella origine ↔ destinazione e produce un report a tre fasce: 🔴 identici (hash uguale) / 🟡 molto simili (verifica utente) / 🟢 unici.
- Claude Code NON decide e NON sposta/elimina: isola i candidati, l'utente conferma.

**Cosa resta invariato**
- Batch grande (20-30 GIF) analizzato insieme, con tabella unica di conferma e casi ambigui isolati in fondo.
- File spostati (MOVE, non copy) da origine a destinazione, nome italiano ufficiale. Mai slug tecnico nel filename locale.
- Convenzione nome: `Movimento base` + `variante` + `con attrezzo` (es. "Squat con salto con manubri"); termine base consolidato non tradotto (Front squat, Hip thrust, Jump squat, Pistol restano). Slug segue lo stesso ordine in kebab-case.
- Doppioni → mai eliminare, spostati in `Scartati da revisionare/`.
- Output per blocco: brief `.md` + CSV per Google Sheet (rigenerato con slug reali dopo il resoconto di Claude Code).
- Resoconto obbligatorio a 6 punti dopo ogni esecuzione.

**Struttura cartelle locale (fissa)**:
```
Biblioteca di esercizi/
├── 5° GIF DI MUSCOLAZIONE/   ← sorgente grezza, NON toccare
├── Addominali e Core/         ← file confermati, nome italiano leggibile
├── {Zona futura}/             ← una cartella per zona, stesso livello
├── Scartati da revisionare/   ← doppioni/candidati scartati, mai eliminati
```

**Nota accesso Sheet**: Claude Code non ha OAuth Google, non può scrivere sul Sheet programmaticamente. Operazione manuale. L'Apps Script "ZonaTracker-Sync-Esercizi (v3)" (menu "Sync Esercizi" nel foglio) sincronizza Sheet → Supabase; per nuovi blocchi aggiungere prima le righe nel Sheet, poi lanciare il sync. Upload Storage + insert `biblioteca_gif`/`esercizi_catalog` si possono fare in anticipo tramite script Python (`.env` ha `SUPABASE_SERVICE_ROLE_KEY`).

**Note tecniche runtime** (invariate):
- Cache KV indicizzata per codice
- App: `fetchExerciseMedia(exName, exCode)` · `ensureRestGif(exName, exCode)` (cache key = `exCode || exName`)
- `surrogateNote` dice SOLO le differenze rispetto alla GIF — non ripete setup già mostrato

### Mappe muscolari
- 19 esercizi storici: PNG locali in `assets/exercises/` (Wger CC BY-SA 4.0)
- EX031–EX132: ❌ mancanti → **prossimo cantiere** (vedi sopra)

---

## Modulo Training — Regole coach generatore

### Filosofia
Catalogo verificato + AI che assembla (mai inventare esercizi). Continuità progressione, varietà stimolo. Eredita da blocco precedente.

### Pattern obbligatori minimi per sessione
- **Full Body**: spinta + tirata + dom.ginocchia + dom.anca + core
- **Upper**: spinta orizz + spinta vert + tirata orizz + tirata vert
- **Lower**: dom.ginocchia + dom.anca + core
- **Push/Pull/Legs**: pattern specifici

Tirata ≥ spinta. `spinta verticale` NON copre deltoidi laterali. `tirata orizzontale` NON copre deltoidi posteriori. Core sempre obbligatorio.

### Ordine esercizi (fisso)
1. Multiarticolari pesanti (freschi)
2. Complementari
3. Isolamenti
4. Core

### Split per giorni
| Giorni | Split |
|---|---|
| 2 | Full Body × 2 |
| 3 | Full Body × 3 (principiante) · Upper/Lower/Full (int/avanzato) |
| 4 | Upper/Lower × 2 |
| 5 | Upper/Lower DUP + Upper Pump (int/avanzato) · PPL (principiante) |

### Parametri per obiettivo
| Obiettivo | Reps | RIR | Recupero |
|---|---|---|---|
| Forza | 4-6 | 2-3 | 3 min |
| Ipertrofia | 8-12 | 1-2 | 90-120s |
| Ricomp/Dimagrimento | 10-15 (princ) / range ridotti (int/avanzato) | 1 | 60-90s |
| Salute | 6-10 | 2 | 90-120s |

RIR attivo SOLO per intermedio/avanzato. Principianti: schede senza RIR.

### Periodizzazione
- DUP: Forza (4-6 reps RIR 2) alternato con Ipertrofia (8-12 reps RIR 1)
- Ciclo 4 settimane: 3 carico + 1 scarico
- Progressione doppia: satura reps → aumenta carico

### Finisher Tabata
Solo per `dimagrimento`/`ricomposizione`. ~5 min in coda (totale = dichiarata + 5). Esercizi con `uso` contenente `finisher`. Basso impatto articolare, no salti, no flessione lombare ripetuta.

### Cautele utente
Coach incrocia `limitazioni` × `zone_rischio` del catalogo. Regola: prima ADATTA (colonna `adattamento`), solo se non basta SOSTITUISCE (`alternativa`). Alert = promemoria tecnica, MAI divieto.

### Scambio esercizio (opzione limitata)
- Max 1-2 scambi per sessione
- Alternativa proposta dal coach (stesso pattern)
- Scambio non permanente: sessione successiva torna all'originale

### Variazione inter-blocco
- **Dentro blocco**: esercizi fissi (storico stabile)
- **Tra blocchi**: principianti cambiano 1-2 esercizi; intermedi/avanzati maggiore rotazione

### Isolamenti
Obbligatori SOLO se il gruppo muscolare non è già coperto dai compound della sessione (`_TRAIN_GEN_COMPOUND_COVERAGE` map). Bonus iso pescano SOLO da `uso=principale` (un iso marcato solo `finisher` non entra come bonus).

### Attrezzatura
`_TRAIN_GEN_EQ_PRIORITY` map (ambiente × tipo esercizio → lista ranked). Un solo `eq` per esercizio. `panca + elastico` = combo valida per casa. `GEAR_ALIASES` gestisce slug mismatch (es. `elastici_tubo` → `elastico`). `_hasCarico()` rileva attrezzatura load-capable.

### Generazione scheda
Trigger: fine onboarding M1 (`saveOnboarding` → `generateTrainingProgram`). Fine blocco: solo dopo check M2 completato. Su richiesta manuale: `rigeneraSchedaDaImpostazioni()` solo da Impostazioni.

---

## Audio sistema (Training)

3 suoni semantici globali:
- `playPrepBeep` 660Hz — tic brevi · ultimi 5s di ogni countdown
- `playStopBeep` 659Hz 700ms — fine fase/lato/serie
- `playLongBeep` 1100Hz 640ms — GO/inizio

Regole fisse:
- LONG → parte/riparte un timer di esecuzione
- Pausa cambio lato iso (5s) → silenzio totale
- Avvio serie a ripetizioni col tasto → silenzio
- Fine recupero → solo STOP (no LONG)

Sequenze di riferimento:
- **Iso unilaterale**: Avvia=LONG → SX: corti(5s)+STOP → pausa 5s muta → DX=LONG → corti(5s)+STOP → logger
- **Recovery flow**: fine esercizio=STOP → micro-pausa muta → ripartenza=LONG → corti(5s)
- **Recupero tra serie**: corti(5s) → a 0 solo STOP → chiusura silenzio → utente avvia

---

## Rotazione Training

`getRotationCycle()` — helper canonico 6-day. Recuperi TRASPARENTI: non avanzano il fronte, non generano debito, non guidano il prossimo. `computeTrainingDebt`: skip recuperi nel loop (`isRecoverySid → continue`). Guard `test-user-001` all'inizio (→ `{ debt:[], target:null }`). `computeTrainHomeData`: `nextSession` deriva dall'ultimo workout di LAVORO (filtro `!/^recovery/i`).

---

## Service Worker

- Network-first per `zona-tracker.html`
- Cache-first SOLO per `cdn.jsdelivr.net`
- **MAI aggiungere `supabase` al cache-first** (causa sync bug cross-device)
- Cache name: `zt-v2`
- Auto-reload su nuova versione SW

---

## Debug cross-device

- Versione attiva: `v${APP_VERSION}` in fondo a ogni tab principale
- Account loggato: Impostazioni ⚙️ → prima card mostra `ST.user.email`
- Web Inspector iPhone: Safari Mac → Sviluppo → nome iPhone → pagina
- SQL diagnostica: `await supa.from('meals').select('*').eq('user_id', ST.user.id).eq('date', '...')`

---

## Tester attivi

- **Ignazio** — utente principale + dev (iPhone + Android)
- **Ginevra** — iPhone/iPad
- **Isabella** — Android + iPad (pescetariana)
- **Ornella** — dispositivo da verificare

---

## Free tier limits (verificati maggio 2026)

**Supabase**: 500MB DB, 1GB storage, 5GB egress/mese, 50K MAU. Pausa dopo 7gg inattività.
**Cloudflare Workers**: 100K req/giorno, KV incluso. Forever free.
**Groq** (`llama-3.3-70b-versatile`): 30 RPM / 6K TPM / 1K RPD. Reset midnight UTC.
