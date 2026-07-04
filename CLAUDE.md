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

---

## Stato corrente (27 giugno 2026)

**APP_VERSION attuale**: da verificare su device prima di ogni intervento.

### Modulo Nutrition ✅ COMPLETO
Tab Oggi, Integratori v3, Analisi v3, Piano v4 (Step A→F.2a) production-ready. F.2b (colazione/merenda) in STAND BY per scelta utente. Bug cache sticky `mealsByDay={}` fixato (commit `f7ca675`).

### Modulo Training — in sviluppo attivo
- Coach generatore: 122 esercizi su `esercizi_catalog` (EX001–EX132, gap intenzionali da fusioni), split 4/5 giorni con rotazione adattiva
- Split 5 giorni (DUP, intermedio/avanzato): 7 posizioni — upperA · lowerA · recoveryUpper · upperB · lowerB · upperC(Pump) · rest
- Recovery unificato: singolo "Recovery Day" (~25 min, 26 esercizi, 5 blocchi); DRY reference `recoveryLower.exercises → recoveryUpper.exercises`
- Upper Pump: 3×15-25 reps, RIR 0, rest 50s, isolamenti only, niente compound pesanti, niente Tabata
- Onboarding M1: 9 step live incluso blocco Training
- Audio: 3 suoni semantici (`playPrepBeep` 660Hz warning 5s, `playStopBeep` 659Hz stop, `playLongBeep` 1100Hz GO) — implementato
- Timer recupero parallelo al form log + riepilogo post-salvataggio nel modal recupero (commit `6125812`)
- Fix rotazione swap-aware: recuperi trasparenti alla rotazione, non avanzano il fronte (commit `c0287c9`)
- GIF nel modal recupero: ✅ funzionante (commit `f536db8`) — Worker `MATCH_BY_CODE` 39 esercizi + 20 legacy name-lookup
- **Settimana attiva corretta** (27 giugno 2026): `renderTraining()` tab Piano — se `validWorkoutsCount % 6 === 0` (multiplo esatto), mostra settimana precedente invece di saltare avanti. Formula: `rawWeek = Math.floor(count/6)%4; currentWeek = (count%6===0) ? (rawWeek===0?3:rawWeek-1) : rawWeek`
- **Restyling colori Training** ✅ (27 giugno 2026): tutti i colori hardcoded sostituiti con CSS vars — `#2A7A6F→var(--acc)`, `#E6F4F2→var(--acc-lt)`, `#B84C2A→var(--err)`, `#9CA3AF→var(--t3)`, banner Tabata→`var(--s1)/var(--t2)`
- **Debt guard**: `computeTrainingDebt()` ha guard `test-user-001` allineato a `computeTrainHomeData()`

### Modulo Body
M2 check fisico funzionale. Da ri-agganciare a fine blocco Training.

**Checkpoint sync mesociclo** (27 giugno 2026): `getNextCheckpointInfo()` considera la settimana del ciclo.
- `overdue:true` solo se `validWorkoutsCount > 22` (workout #23+) **e** `currentWeekIdx === 3` (scarico) **e** `daysUntil < 0`
- Settimane 1-3 (carico): `overdue:false` sempre, anche se >28 giorni dall'ultimo check
- Fallback 0 workout: comportamento classico (overdue se >28 gg)
- Label Home: se `daysUntil < 0 && !overdue` → mostra `"CHECKPOINT A FINE MESOCICLO"` (non numero negativo)

### Admin panel (`dashboardzona.html`) ✅ production-ready

---

## Prossimi cantieri (priorità aperte)

1. **Mappa muscolare EX031–EX132** — PNG per gruppo muscolare (~15-20 file), selezionati automaticamente dal campo `muscoli` del catalogo. Strategia A: file locali `assets/muscles/<gruppo>.png`. Strategia B: API Muscle Visualizer ExerciseDB (da valutare). **PROSSIMO CANTIERE**.
2. **Gating 5-day split per principianti** — impedire l'accesso al split 5 giorni DUP se `livello=principiante`.
3. ~~**Live debt collaudo**~~ ✅ — guard test-user aggiunto, collaudo sicuro (nessun debito rilevato).
4. **Injury residuals** — multi-day injury duration + history UI.
5. **M2 entry point** — `"Nuovo check fisico"` sempre visibile in Body; reminder fine blocco; blood test history UI (`m2EntryIntro()` esiste, manca UI di accesso).
6. **Progressione tab** — Volume + Carico per esercizio dentro card (prossimo livello grafico).
7. **F.2b/colazione/merenda** — stand-by; riattivare solo se richiesto in onboarding.
8. **Push notifications** — sistema unico riusabile (piano + training + integratori).
9. **Refresh onboarding M1** — preferenze generazione piano (giorno/ora) + tracking peso. ⚠️ `profiles_plan_day_check` ammette solo `'fri'/'sat'/'sun'` — no `'custom'` senza estendere il CHECK.
10. **Coach identity** — nome proprio per l'AI coach (tipo Alexa/Siri). Deferred.
11. **"Oggi ho solo X min"** (Phase 2) — compressione singola sessione senza toccare progressione blocco.
12. **Calorie floor** — validare `KCAL_MIN_F`/`KCAL_MIN_M` con nutrizionista prima di release pubblica.

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
122 esercizi (EX001–EX132, gap intenzionali). RLS SELECT pubblica. **PK logica = `codice`**. Google Sheet → Apps Script "ZonaTracker-Sync-Esercizi" (v3) → Supabase. **Mai editare Supabase direttamente**.

Colonne chiave: `codice, nome, pattern, gruppo_target, attrezzo, luogo, muscoli, livello, zone_rischio, adattamento, alternativa, setup, esecuzione, errori, nota_sicurezza, uso, surrogato_attrezzo, nota_surrogato, esecuzione_surrogato, errori_surrogato`.

`uso` valori: `principale / finisher / recupero / riscaldamento / mobilita / carry`.
`pattern` normalizzato via `_normPattern()` (lowercase + trim).
`gruppo_target` vocabolario chiuso — non dedurre da `muscoli` (testo libero, vocabolario diverso).

### `schede_utente`
`id, user_id, blocco_n int, scheda jsonb, attiva bool, created_at`. Indice UNIQUE PARTIAL su `(user_id) WHERE attiva=true` (max 1 attiva per utente). Fallback su `TRAINING_SESSIONS` hardcoded se nessuna scheda.

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
- `biblioteca_gif`: 1.367 righe — conteggio verificato su Supabase 4 luglio 2026 (+9 Blocco "Squat carichi/bulgaro" Gambe e Glutei, 4 luglio 2026 — nuovi slug `squat-parete-fitball`, `squat-bulgaro-corpo-libero`, `squat-bilanciere`, `squat-bilanciere-rack`, `squat-bilanciere-landmine`, `squat-bilanciere-sumo`, `squat-manubri`, `squat-pliometrico-manubri`, `squat-bulgaro-bilanciere`; scartato file fornitore "Squat con salto e manubri" byte-identico a EX268, non caricato; +9 Blocco "Squat/ponti glutei unilaterali" Gambe e Glutei, 4 luglio 2026 — nuovi slug `squat-corpo-libero`, `ponte-glutei-unilaterale-piede-posteriore-panca`, `ponte-glutei-unilaterale-gamba-tesa-allineata`, `ponte-glutei-unilaterale-gamba-verticale`, `squat-cavo-basso`, `squat-cavo-incrociato`, `squat-multipower`, `squat-macchina-hack-squat`, `squat-macchina-hack-squat-inverso`; scartato il file fornitore hack-squat doppione di EX261, non caricato; +10 Blocco "Leg extension/press/ponte glutei" Gambe e Glutei, 4 luglio 2026 — nuovi slug `leg-extension-bilaterale-macchina`, `leg-extension-unilaterale-macchina`, `leg-press-orizzontale-bilaterale-macchina`, `leg-press-45-bilaterale`, `leg-press-45-unilaterale`, `ponte-glutei-bilaterale-corpo-libero`, `ponte-glutei-corpo-libero-piedi-panca`, `ponte-glutei-gambe-tese-piedi-panca`, `ponte-glutei-manubrio`, `ponte-glutei-frog-pump`; filename Storage = nome italiano ufficiale; +10 Blocco "Leg curl" Gambe e Glutei, 4 luglio 2026 — nuovi slug `leg-curl-bilaterale-cavo-sdraiato`, `leg-curl-bilaterale-macchina-prona`, `leg-curl-bilaterale-macchina-seduta`, `leg-curl-bilaterale-macchina-seduta-prese-anteriori`, `leg-curl-bilaterale-macchina-seduta-prese-laterali`, `leg-curl-unilaterale-cavo-basso-piedi`, `leg-curl-unilaterale-macchina-piedi`, `leg-curl-unilaterale-macchina-piedi-supporto-coscia`, `leg-curl-unilaterale-macchina-piedi-ginocchio-rialzato`, `leg-curl-unilaterale-macchina-prona`; filename Storage = nome italiano ufficiale come le 52 righe preesistenti della cartella `Gambe e Glutei/`, NON slug; +6 Blocco 23 "Gambe e Glutei", 2 luglio 2026 — nuovi slug `squat-manubri-lati`, `squat-profondo-bilanciere`, `squat-panca-manubri`, `stacco-terra-manubri`, `stacco-terra-trap-bar`, `squat-bilanciere-rack`), bucket `biblioteca-gif` su Supabase Storage. Tabella: `slug, nome_italiano, nome_originale, categoria, gruppo_muscolare, storage_path, storage_url`
- `esercizi_catalog`: colonna `gif_slug` — 212 esercizi coperti su 259 (conteggio verificato su Supabase 4 luglio 2026). **EX263–EX269 aggiunti Blocco "Squat carichi/bulgaro" Gambe e Glutei, 4 luglio 2026** (tutti `gruppo_target=quadricipiti`, campi surrogato vuoti): EX263 Squat con bilanciere→`squat-bilanciere`, EX264 Squat con bilanciere al rack→`squat-bilanciere-rack`, EX265 Squat con bilanciere landmine→`squat-bilanciere-landmine`, EX266 Squat con bilanciere sumo→`squat-bilanciere-sumo`, EX267 Squat con manubri→`squat-manubri`, EX268 Squat pliometrico con manubri→`squat-pliometrico-manubri` (`pattern=cardio_metabolico`), EX269 Squat bulgaro unilaterale con bilanciere→`squat-bulgaro-bilanciere`; scartato file fornitore "Squat con salto e manubri" (byte-identico a EX268, l'utente tiene la versione "pliometrico") — non caricato. **2 overwrite**: EX045 "Wall squat con fitball"→"Squat bilaterale simultaneo alla parete con fitball a corpo libero", slug `squat-al-muro-con-palla-di-exercicio`→`squat-parete-fitball` (attrezzo resta `fitball`); EX047 "Affondo bulgaro a corpo libero"→"Squat bulgaro unilaterale a corpo libero", slug `affondo-bulgaro-corpo-libero`→`squat-bulgaro-corpo-libero` (attrezzo resta `panca`); per entrambi tutti i campi tecnici sovrascritti dal CSV, vecchio oggetto Storage eliminato (`funzionale-hiit/squat-al-muro-con-palla-di-exercicio.gif` per EX045, `Gambe e Glutei/Affondo bulgaro a corpo libero.gif` per EX047 — verificato: ciascuno slug usato solo dal proprio codice, unica riga `biblioteca_gif` su quel path), righe `biblioteca_gif` legacy lasciate orfane. ⚠️ EX047 usato in 1 riga `schede_utente` (blocco 33) come snapshot col nome ancora più vecchio "Bulgarian split squat (piede posteriore su panca)"; il lookup GIF risolve per codice quindi resta corretto, ma quella scheda storica continuerà a mostrare il nome vecchio. EX045 non referenziato in nessuna scheda. **EX255–EX262 aggiunti Blocco "Squat/ponti glutei unilaterali" Gambe e Glutei, 4 luglio 2026** (campi surrogato vuoti): EX255 Ponte glutei unilaterale a corpo libero con piede posteriore su panca→`ponte-glutei-unilaterale-piede-posteriore-panca` (glutei), EX256 Ponte glutei unilaterale a gamba tesa allineata→`ponte-glutei-unilaterale-gamba-tesa-allineata` (glutei), EX257 Ponte glutei unilaterale a gamba verticale→`ponte-glutei-unilaterale-gamba-verticale` (glutei), EX258 Squat al cavo basso→`squat-cavo-basso` (quadricipiti), EX259 Squat al cavo incrociato→`squat-cavo-incrociato` (quadricipiti), EX260 Squat al multipower→`squat-multipower` (quadricipiti), EX261 Squat alla macchina hack squat→`squat-macchina-hack-squat` (quadricipiti), EX262 Squat alla macchina hack squat inverso→`squat-macchina-hack-squat-inverso` (quadricipiti); scartato il file fornitore "Squat alla macchina hack" (doppione di EX261, l'utente ha scelto la versione hack squat) — non caricato. **EX013 overwrite**: "Squat"→"Squat bilaterale simultaneo a corpo libero", `attrezzo` `corpo libero;bilanciere;manubri;kettlebell`→`corpo libero`, `gruppo_target` NULL→`quadricipiti`, slug `squat`→`squat-corpo-libero`, tutti i campi tecnici sovrascritti dal CSV; vecchio oggetto Storage `Gambe e Glutei/Squat a corpo libero.gif` eliminato (verificato: slug `squat` usato solo da EX013 nel catalogo, unica riga `biblioteca_gif` su quello storage_path, zero `gif_slug` in `schede_utente`), riga `biblioteca_gif` legacy lasciata orfana. ⚠️ EX013 "Squat" referenziato per `codice` in 80/81 righe `schede_utente` come snapshot col vecchio nome: il lookup GIF risolve per codice quindi resta corretto, ma le schede storiche continueranno a mostrare "Squat". **EX248–EX254 aggiunti Blocco "Leg extension/press/ponte glutei" Gambe e Glutei, 4 luglio 2026** (campi surrogato vuoti): EX248 Leg extension unilaterale alla macchina→`leg-extension-unilaterale-macchina` (quadricipiti), EX249 Leg press bilaterale simultanea a 45 gradi→`leg-press-45-bilaterale` (quadricipiti), EX250 Leg press unilaterale a 45 gradi→`leg-press-45-unilaterale` (quadricipiti), EX251 Ponte glutei a corpo libero con piedi su panca→`ponte-glutei-corpo-libero-piedi-panca` (glutei), EX252 Ponte glutei a gambe tese con piedi su panca→`ponte-glutei-gambe-tese-piedi-panca` (ischiocrurali), EX253 Ponte glutei con manubrio→`ponte-glutei-manubrio` (glutei), EX254 Ponte glutei frog pump a corpo libero→`ponte-glutei-frog-pump` (glutei); **3 overwrite (nome+slug+tutti i campi tecnici, prima vuoti)**: EX097 "Leg extension"→"Leg extension bilaterale simultanea alla macchina", slug `leg-extension`→`leg-extension-bilaterale-macchina`; EX016 "Leg press"→"Leg press orizzontale bilaterale simultanea alla macchina", slug `leg-press-horizontal`→`leg-press-orizzontale-bilaterale-macchina` (⚠️ EX016 referenziato per `codice` in 48 righe `schede_utente` come snapshot col vecchio nome "Leg press"; il lookup GIF risolve per codice quindi resta corretto, ma le schede storiche continueranno a mostrare il nome vecchio); EX019 "Ponte glutei a corpo libero"→"Ponte glutei bilaterale simultaneo a corpo libero", slug `ponte-dei-glutei`→`ponte-glutei-bilaterale-corpo-libero`; per tutti e 3 il vecchio oggetto Storage è stato eliminato (`muscolazione/arti-inferiori-e-glutei/leg-press-horizontal.gif`, `Gambe e Glutei/Ponte glutei a corpo libero.gif`, `Gambe e Glutei/Leg extension.gif` — verificato: ciascuno referenziato solo dal proprio codice, zero riferimenti a quegli slug nelle 81 righe `schede_utente`), righe `biblioteca_gif` legacy lasciate orfane. **EX239–EX247 aggiunti Blocco "Leg curl" Gambe e Glutei, 4 luglio 2026** (tutti `gruppo_target=ischiocrurali`, campi surrogato vuoti): EX239 Leg curl bilaterale simultaneo al cavo sdraiato→`leg-curl-bilaterale-cavo-sdraiato`, EX240 …alla macchina prona→`leg-curl-bilaterale-macchina-prona`, EX241 …alla macchina seduta→`leg-curl-bilaterale-macchina-seduta`, EX242 …seduta con prese anteriori→`leg-curl-bilaterale-macchina-seduta-prese-anteriori`, EX243 …seduta con prese laterali→`leg-curl-bilaterale-macchina-seduta-prese-laterali`, EX244 Leg curl unilaterale al cavo basso in piedi→`leg-curl-unilaterale-cavo-basso-piedi`, EX245 …alla macchina in piedi→`leg-curl-unilaterale-macchina-piedi`, EX246 …con supporto coscia→`leg-curl-unilaterale-macchina-piedi-supporto-coscia`, EX247 …con ginocchio in appoggio rialzato→`leg-curl-unilaterale-macchina-piedi-ginocchio-rialzato`; **EX095 rinominato** "Leg curl unilaterale alla macchina prona" (era "Leg curl alla macchina prono unilaterale (coscia appoggiata)"), `gif_slug` `leg-curl-alla-macchina`→`leg-curl-unilaterale-macchina-prona`, campi tecnici sovrascritti dal CSV blocco, vecchio oggetto Storage `muscolazione/arti-inferiori-e-glutei/leg-curl-alla-macchina.gif` eliminato (verificato: nessun altro riferimento in catalogo né nelle 81 righe `schede_utente`), riga `biblioteca_gif` legacy lasciata orfana; ⚠️ **file sorgente byte-identici EX241=EX242 e EX246=EX247** (hash MD5 uguali): uno dei due codici di ogni coppia mostra una variante non esatta — da rivedere con l'utente; ⚠️ **disallineamento storico**: prima di questo blocco Supabase aveva max EX238 e 228 righe — i blocchi 16–23 descritti sotto (EX245–EX299) NON risultano su Supabase; verificare l'allineamento col Google Sheet prima del prossimo sync per evitare collisioni di codici. (Storia precedente, non riscontrata su Supabase il 4 luglio 2026: EX294–EX299 aggiunti Blocco 23 "Gambe e Glutei", 2 luglio 2026: EX294 Squat con manubri ai lati→`squat-manubri-lati`, EX295 Squat profondo con bilanciere→`squat-profondo-bilanciere`, EX296 Squat su panca con manubri→`squat-panca-manubri`, EX297 Stacco da terra con manubri→`stacco-terra-manubri`, EX298 Stacco da terra con trap bar→`stacco-terra-trap-bar`, EX299 Squat con bilanciere al rack→`squat-bilanciere-rack` (fornitore `squat-libero-con-bilanciere.gif`, NON riusata la riga legacy orfana omonima ex-EX013); EX225 "Squat sumo a corpo libero" contenuto sovrascritto con nuovo asset su decisione utente nonostante analisi visiva contraria (il file fornitore sembrava un affondo laterale, non un sumo squat — verificare a occhio se il problema si ripresenta); EX218/EX219/EX273 già live e corretti, solo cleanup duplicati dalla cartella sorgente; **EX287 "Stacco da terra classico" in sospeso**: asset live (deadlift convenzionale) mantenuto, nuovo candidato `stacco-della-terra-con-bilanciere.gif` copiato in locale come "Stacco da terra classico - CANDIDATO da confrontare.gif" per revisione visiva utente, nessuna modifica a Storage/DB, sorgente originale non spostata; **EX289 "Pistol squat con manubrio" asset live mantenuto**, candidato `squat-con-manubri-su-una-gamba.gif` spostato in Scartati da revisionare (ambiguità irrisolvibile da frame statico); scarto `squat-sumo-peso-corporal.gif` (sumo femminile doppione di EX225) → Scartati da revisionare; EX291–EX293 aggiunti Blocco 22 "Gambe e Glutei", 2 luglio 2026: EX291 Squat al cavo incrociato→`squat-cavo-incrociato`, EX292 Squat al multipower→`squat-multipower`, EX293 Squat con bilanciere→`squat-bilanciere`; EX212 "Affondo indietro con bilanciere" e EX240 "Affondo bulgaro con manubri" — contenuto GIF sovrascritto: erano già live con lo slug corretto ma asset stale/sbagliato, individuato per hash-mismatch col vero file sorgente; EX282 "Affondo indietro con manubri" ricollegato da `kickback-passo-indietro` a `affondo-indietro-manubri` (nuovo asset, vecchio oggetto Storage eliminato — la premessa del brief "vecchia GIF già spostata in Scartati da revisionare" era falsa, verificato che il file non esisteva lì); EX019 "Ponte glutei a corpo libero" migrato da path legacy `muscolazione/arti-inferiori-e-glutei/` a `Gambe e Glutei/`, contenuto sovrascritto con nuovo asset (slug `ponte-dei-glutei` invariato); EX047 rinominato da "Bulgarian split squat (piede posteriore su panca)" a "Affondo bulgaro a corpo libero", ricollegato dal proprio slug legacy `squat-bulgaro-a-corpo-libero` (categoria `calisthenics`, ora orfano) allo slug `affondo-bulgaro-corpo-libero` già usato da EX238 (asset identico, nessun nuovo upload); **EX238 eliminato** (doppione di EX047, gap permanente come EX261/EX277 — zero riferimenti verificati in `schede_utente` su 81 righe prima della cancellazione); EX013 "Squat" ricollegato da `squat-libero-con-bilanciere` (bilanciere) a nuovo slug `squat` (corpo libero) — vecchio oggetto Storage eliminato, riga `biblioteca_gif` legacy lasciata orfana; campo `gruppo_target` non popolato per i nuovi codici di questo blocco (vocabolario chiuso non include valori tipo "Gambe e Glutei", coerente con EX280–EX290 che lo lasciano NULL); EX284–EX290 aggiunti Blocco 21 "Gambe e Glutei", 1 luglio 2026 — solo `affondo-salto-cambio-gamba-manubri` per EX288, unico asset realmente nuovo del blocco; gli altri 6 esercizi nuovi riusano slug legacy già live: EX284 Leg curl prono unilaterale→`leg-curl-prono-unilaterale`, EX285 Leg curl prono bilaterale→`leg-curl-prono`, EX286 Leg press 45 unilaterale→`leg-press-45-unilateral`, EX287 Stacco da terra classico→`stacco-della-terra`, EX288 Affondo con salto e cambio gamba con manubri→`affondo-salto-cambio-gamba-manubri` (nuovo upload, per decisione esplicita utente resta distinto da EX038 pur usando un file di partenza byte-identico a quello di EX038 "Affondo camminato"), EX289 Pistol squat con manubrio→`pistol-squat-1`, EX290 Ponte glutei a gambe tese (talloni su panca)→`ponte-dei-glutei-a-gambe-tese`; EX083 "Pistol squat" ricollegato da `pistol-squat-assistito` a `pistol-squat-2` (verificato visivamente: corpo libero); EX280–EX283 aggiunti Blocco 20 "Gambe e Glutei", tutti riusano slug legacy già live in Storage, nessun upload nuovo: EX280 Hip thrust al multipower→`hip-thrust-al-multipower`, EX281 Iperestensione inversa alla macchina→`iperestensione-inversa`, EX283 Leg press 45 gradi→`leg-press-45`; EX016 "Leg press" ricollegato da `leg-press-45` a `leg-press-horizontal` (stesso file già live, evita duplicato); EX279 "Hip thrust unilaterale" ricollegato da slug Blocco-19 `hip-thrust-unilaterale-schiena-su-panca` allo slug legacy `hip-thrust-unilaterale` — riga Blocco 19 lasciata orfana, non eliminata; EX273–EX276 + EX278–EX279 aggiunti Blocco 19, EX277 gap intenzionale — doppione di EX221 "Reverse hack squat"; EX221 rinominato per riflettere il contenuto reale; EX085 "Good morning a corpo libero" rinominato e privato del gif_slug errato — la GIF con bilanciere appartiene a EX233; EX263–EX272 Blocco 18, EX270 GIF identica a EX095; EX254–EX260 + EX262 Blocco 17, EX261 gap intenzionale; EX245–EX253 Blocco 16), 47 senza slug (fallback ExerciseDB)

  ⚠️ Nota di allineamento (4 luglio 2026): il testo storico qui sopra (blocchi 16–23, codici EX245–EX299) descrive interventi NON riscontrati sullo stato reale di Supabase — prima del blocco Leg curl il DB aveva max EX238 e 228 righe. I codici EX239–EX254 di questi due blocchi Leg curl/Leg extension sono stati assegnati sui buchi liberi reali. Verificare l'allineamento col Google Sheet master prima del prossimo sync.
- Worker Version ID attuale: `29b77d2b` (deploy 28 giugno 2026)

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
