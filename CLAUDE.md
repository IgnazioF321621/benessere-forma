# Zona Tracker

PWA wellness single-file HTML, hostata su GitHub Pages.

## File e URL

- **App**: `zona-tracker.html` (unico file: HTML + CSS + JS)
- **Admin**: `dashboardzona.html` (email-gated `ignazio.f@me.com`, read-only)
- **URL pubblico**: https://ignaziof321621.github.io/benessere-forma/zona-tracker.html
- **Repo**: https://github.com/IgnazioF321621/benessere-forma · branch `main`

## Servizi

| Servizio | URL | Scopo |
|---|---|---|
| Cloudflare Worker | `zona-ai.ignazio-f.workers.dev` | Proxy Groq (llama-3.3-70b-versatile) + lookup GIF |
| Supabase | `qxiyeiahpoiliwpqslpr.supabase.co` | DB + Auth + Storage |

Worker: account `ignazio-f` (account_id `2186a57344e459853657cea6213a2c74`). Secrets: `SUPABASE_SERVICE_ROLE_KEY` + `API_KEY`. Deploy: `wrangler deploy` da `worker/` — **non** triggered da git push. Worker Version ID attuale: `da1e0007`.

## Pattern tecnici critici

- Client Supabase si chiama `supa` (non `supabase`)
- SQL Editor gira come admin: `auth.uid()` = NULL → usare UUID espliciti
- **supabase-js NON lancia eccezioni sugli errori API**: restituisce `{error}` nel result → i `try/catch` non li vedono. Controllare SEMPRE `res.error`
- `schedaGen=1` ricostruisce la scheda da zero, cancella storico progressione — solo per correzioni mirate
- `console.log` da rimuovere solo manualmente, mai con script automatici
- `TRAINING_SESSIONS`/`SESSION_CYCLE` hardcoded sono fallback; gli helper `getTrainingSession`/`getAllTrainingSessions`/`getSessionCycle` leggono prima da `ST.userTrainingSessions`. ⚠️ Dentro gli helper NON usare i nomi degli helper stessi → ricorsione infinita
- Service Worker: **MAI aggiungere `supabase` al cache-first** (causa sync bug cross-device). Cache-first solo per `cdn.jsdelivr.net`. Cache name: `zt-v2`
- `APP_VERSION` aggiornata automaticamente dal pre-commit hook git
- PostgREST tronca SELECT al limite default → **paginare sempre** su tabelle >1000 righe (es. `biblioteca_gif`)
- `biblioteca_gif` supera 1.000 righe: senza paginazione compaiono orfani fantasma nelle verifiche
- Il ciclo canonico a 7 include `rest`: ogni logica che itera il ciclo deve gestire slot non loggabili (`rest`/`rest_injury`)
- La settimana ciclo si legge SOLO da `getCycleWeekInfo()` — vietato ricalcolarla inline
- TSV/CSV da Google Sheet: arrivano **UTF-8 con BOM + CRLF** — `csv.DictReader` senza `encoding='utf-8-sig'` produce silenziosamente 0 righe valide (la prima chiave diventa `﻿slug`). Controllare sempre il conteggio righe parsate
- **Path e nomi file SEMPRE ASCII**: Storage rifiuta chiavi NFD con `400 InvalidKey`. I file macOS sono in NFD (la `ù` è `u` + U+0300). Accenti solo in `nome_italiano`/catalogo, mai nel path o filename
- Il `:` nel filename è ammesso in Storage e NON viene sanificato (verificato su 5 file in `Tricipiti/`)

---

## Stato corrente (24 luglio 2026)

**Nutrition** ✅ completo — Oggi, Integratori v3, Analisi v3, Piano v4 (Step A→F.2a). F.2b (colazione/merenda) in stand-by.

**Training** — in sviluppo attivo. Coach generatore funzionante: 582 esercizi su `esercizi_catalog`, split 4/5 giorni con rotazione adattiva, Recovery Day unificato (~25 min, 5 blocchi), Upper Pump (DUP 5gg), audio unificato, timer recupero parallelo al form log, WS-QUEUE (scrittura `workout_sets` con retry + coda localStorage), infortuni multi-giorno, rientro soft.

**Catalogo GIF** — cantiere nomenclatura v2 chiuso (24 luglio). 501 `gif_slug` attivi, 0 rotti, 81 codici senza slug.

**Body** — M2 check fisico funzionante. Da ri-agganciare a fine blocco Training.

**Admin** (`dashboardzona.html`) ✅ production-ready.

## Prossimi cantieri

1. **Test timer su workout reali** — commit `e834320` (timer unificati timestamp-based) in osservazione. PRIMA di qualunque altro cantiere Training.
2. **Cantiere 600 GIF** — 81 codici senza `gif_slug`. **Prima di partire**: progettare la vista di conferma visiva a blocchi (collo di bottiglia reale, non la scrittura DB). Metodo: riconciliazione a tre fonti zona per zona (vedi sezione Media system). Zone ancora da riconciliare: Gambe e Glutei (Mac 125/Storage 112) · Pettorali (77/56) · Schiena e Trapezio (104/87) · Bicipiti e Braccia (7 GIF da caricare, 7 codici da EX587).
3. **Code pulizia Storage** — C: 28 file L2 residui nelle zone curate (indicizzati, non referenziati) · D: bucket `exercise-media` legacy (43 file, 5,9 MB, verificare se l'app lo usa ancora) · E: riallineamento indice `biblioteca_gif` (~1.150 righe orfane su file eliminati).
4. **Code catalogo** — EX085 (`gruppo_target='Gambe e Glutei'` fuori vocabolario) · EX322 (`'gambe'` fuori vocabolario) · 56 righe con `nome_italiano` divergente nell'indice (residuo blocco rinomine) · 5 `alternativa` pendenti già bonificati ma da monitorare se emergono altri.
5. **Avviso corpo libero puro** — con zero attrezzi non esistono tirate/deltoidi copribili: scelta UX (avviso in onboarding o generazione).
6. **EX287 "Stacco da terra classico"** — decisione pendente: GIF live vs candidato in `Biblioteca di esercizi/Gambe e Glutei/Stacco da terra classico - CANDIDATO da confrontare.gif`.
7. **M2 entry point** — CTA sempre visibile in Body; reminder fine blocco; blood test history UI.
8. **F.2b colazione/merenda** — stand-by, riattivare solo se onboarding lo richiede.
9. **Refresh onboarding M1** — preferenze generazione piano (giorno/ora) + tracking peso. ⚠️ `profiles_plan_day_check` ammette solo `'fri'/'sat'/'sun'`.
10. **Push notifications** — sistema unico (piano + training + integratori).
11. **"Oggi ho solo X min"** — compressione singola sessione senza toccare progressione blocco.

## Bug noti aperti

- `trainLoggedSets` si azzera al reload — badge serie spariscono dopo refresh
- Alcuni integratori vecchi hanno macro `—` (backfill SQL pendente)
- `body_logs` manca UNIQUE(user_id, date) — salvataggio usa insert/update manuale
- Editor Pacchetto: emoji picker e time picker usano `prompt()` nativo (UX scadente mobile)
- Isabella: `status=draft`, 0 meals per settimana corrente — non investigato
- **EX576** `Piegamenti tocco ai piedi`: `alternativa` = EX576 (autoriferimento preesistente, non generato dal cantiere)

---

## Autenticazione

OTP a 6 cifre via email. Flusso: `signInWithOtp` → codice email → `verifyOtp({ type: 'email' })`. Rate limit: aspettare 1h se raggiunto.

Bootstrap (`setTimeout(..., 1800)`): `?test=1` → `#access_token` → `?code=` → `getSession()` → schermata auth → `onAuthStateChange` → `visibilitychange` (polling + `refreshInBackground` throttle 30s).

---

## Design system

- **Font**: Syne (titoli/prose) + JetBrains Mono (numeri/label). **MAI Manrope** sulle schermate nuove
- **Background**: bone `#F5F3EE` · **Accent**: evergreen `#2A7A6F`
- **Tinte modulo**: Nutrition `#FAC775` · Training `#B5D4F4` · Body `#AFA9EC` (forte `#5E4A7A` solo checkpoint)
- **Over-target**: `OVER_COLOR='#B45309'`
- **"coach"** sostituisce "AI" in tutti i copy visibili UI
- Training: restyling CSS vars completo (27 giugno 2026). Nutrition e Body: migrazione legacy in corso.

---

## Navigazione

| Tab | ID | Gate |
|---|---|---|
| Home | `home` | — |
| Nutrition | `oggi` | — |
| Training | `training` | `!!ST.profile.train_start_date` (NON `usa_training`) |
| Body | `body` | — |

---

## Schema Supabase

### `profiles`
PK = `id` (= `auth.users.id`).

Campi chiave: `first_name, last_name, age, sex (M/F/O), height_cm, weight_kg, goal_weight_kg, target_kcal/protein/carbs/fat, obiettivo (CSV 6 chiavi OBJ_ADAPT), dieta, intolleranze (text[]), activity_level, train_start_date, usa_training (bool default true), tipo_allenamento, attrezzatura (text[]), giorni_allenamento (int), durata_sessione (int), note_salute (serializza esperienza+limitazioni — no colonne dedicate), plan_generation_day (CHECK fri/sat/sun only), plan_generation_time (HH:MM), weight_tracking_mode (daily/every3/weekly/flexible)`.

⚠️ `obiettivo`/`dieta`/`intolleranze` anche in `localStorage` (`zt_prefs_<userId>`) — `applyLocalPrefs()` sovrascrive dopo ogni `applyProfile()`.

### `meals`
`id, user_id, date, time (HH:MM), slot, description` (nome autoritativo — non esiste `name` o `food_name`), `kcal numeric(6,1), protein/carbs/fat numeric(5,1), notes`.

### `esercizi_catalog`
**582 righe** (24 luglio 2026). Gap permanenti: EX107/EX151/EX170/EX528 — mai renumerare. Prossimo libero: **EX587**. RLS SELECT pubblica. PK logica = `codice`. **Fonte: Google Sheet → Apps Script "ZonaTracker-Sync-Esercizi (v3)" → Supabase upsert. Mai editare Supabase direttamente. Il sync non elimina: righe da eliminare vanno cancellate a mano nel Sheet prima del sync.**

Colonne: `codice, nome, nome_en (⚠️ DEPRECATA dal 19/07/2026 — non portante, non usarla per slug/filename/UI), pattern, gruppo_target, attrezzo, luogo, muscoli, livello, zone_rischio, adattamento, alternativa, setup, esecuzione, errori, nota_sicurezza, uso, surrogato_attrezzo, nota_surrogato, esecuzione_surrogato, errori_surrogato`.

- `uso` valori: `principale / finisher / recupero / riscaldamento / mobilita / carry / skill`
- `uso: skill` — skill ginnastica (EX570/573/574/575): **escluse dalla generazione automatica**, non entrano nei pool del coach
- `pattern` normalizzato via `_normPattern()` (lowercase + trim)
- `gruppo_target` vocabolario chiuso — **non dedurre da `muscoli`** (testo libero, vocabolario diverso)
- `alternativa` contiene codici `EX###` in chiaro, nessuna FK: prima di eliminare un codice, scansionare tutti i campi testuali con regex `\bEX\d{3}\b` per trovare riferimenti incrociati pendenti

Regole `surrogato_attrezzo`: token puliti separati da `+` (vocabolario chiuso: `elastico, manubri, panca, sbarra, fitball, kettlebell, maniglie, trx, cavigliera, barra, bilanciere, corpo libero`). MAI testo libero, MAI alternative con "o". `manubri` sempre plurale. Congruenza obbligatoria con `nota/esecuzione/errori_surrogato`.

### `schede_utente`
`id, user_id, blocco_n int, scheda jsonb, attiva bool`. UNIQUE PARTIAL su `(user_id) WHERE attiva=true`. I `name` nel jsonb sono snapshot alla generazione: il loader li riallinea a runtime dal catalogo via Map codice→nome — il jsonb non si riscrive mai. Fallback su `TRAINING_SESSIONS` hardcoded se nessuna scheda.

### `biblioteca_gif`
**1.653 righe** (24 luglio 2026), di cui ~1.150 orfane (file eliminati il 18/07 — cantiere E futuro). Colonne: `slug, nome_italiano, nome_originale, categoria, gruppo_muscolare, storage_path, storage_url`. `slug` = `gif_slug` del catalogo. **`categoria`/`gruppo_muscolare` non hanno convenzione unica tra zone** — verificare sempre sulle righe esistenti della zona prima di inserire. Bucket Storage `biblioteca-gif`: ~520 file, 8 zone curate (Addominali e Core · Bicipiti e Braccia · Gambe e Glutei · Pettorali · Polpacci · Schiena e Trapezio · Spalle e Cuffia · Tricipiti). Cartelle legacy eliminate il 18/07/2026.

### `training_logs`
`id, user_id, date, session_id, exercise_name, set_number, reps, resistance, rir_actual, notes`. Stato: 912 righe, divergenza 0, doppioni 0 (bonificato 17 luglio).

### `weekly_plans`
`id, user_id, week_start, target_kcal/protein/carbs/fat, ai_reasoning, status (draft/active/archived)`. UNIQUE `(user_id, week_start)`. `plan_generation_day` CHECK: solo `'fri'/'sat'/'sun'`.

### `weekly_plan_meals`
`id, plan_id→weekly_plans CASCADE, user_id, day_of_week (1-7), slot, description, ingredients jsonb, meal_time, kcal/protein/carbs/fat, ai_explanation, sort_order`.

### Altre tabelle
`body_logs (weight_kg, waist_cm, bf_pct, muscle_kg, visceral_fat, hip/chest/bicep_cm, body_age — no UNIQUE)` · `weight_logs (UNIQUE user_id+date)` · `supplements_log (UNIQUE user_id+date+supplement_name, is_extra, snapshot macro)` · `supplement_packages + supplement_package_items (UNIQUE package_id+supplement_id)` · `ai_memory (category, content, confidence, evidence_count, last_observed, active)` · `weekly_plan_acceptance (plan_meal_id→CASCADE, status, actual_meal_id→SET NULL — UNIQUE plan_meal_id)` · `nutrilite_catalog (64 prodotti, SELECT pubblica)` · `fasting_days, supplements, workout_sets`.

---

## Vocabolario obiettivi (`OBJ_ADAPT`)

6 chiavi: `dimagrimento · ricomposizione · ipertrofia · forza_performance · longevita · mantenimento`.
Migrazione: `perdita_peso→dimagrimento`, `massa_muscolare→ipertrofia` via `migrateObiettivo()` — applicata ovunque si legge `profile.obiettivo`.

Macro % `[carbo/prot/fat]`: dimagrimento 38/32/30 · ricomposizione 38/34/28 · ipertrofia 40/35/25 · forza_performance 42/33/25 · longevita+mantenimento 40/30/30.

---

## Media system

### Flusso GIF (Worker)
- `?code=EX###` (priorità): cerca `gif_slug` su `esercizi_catalog` → lookup `biblioteca_gif WHERE slug=gif_slug` → URL `biblioteca-gif/{categoria}/{gruppo_muscolare}/{slug}.gif`
- Fallback se `gif_slug` NULL: vecchio `MATCH_BY_CODE` ExerciseDB (~39 esercizi storici)
- `?name=...` (legacy): match esatto su dizionario hardcoded ~20 nomi (`MATCH_DATA`), nessuna normalizzazione
- App: `fetchExerciseMedia(exName, exCode)` · `ensureRestGif(exName, exCode)` — cache key = `exCode || exName`

**501/501 `gif_slug` risolvono, 0 rotti** (24 luglio). 81 codici senza slug → fallback ExerciseDB.

### Mappe muscolari
19 esercizi storici: PNG locali in `assets/exercises/` (Wger CC BY-SA 4.0). EX031+: mancanti (cantiere futuro).

### Nomenclatura esercizi v2 (19 luglio 2026) — normativa vincolante

> Supera ogni regola precedente. In caso di conflitto vale solo quanto scritto qui.

**1. Nome unico.** Catalogo con un solo nome per esercizio. `nome_en` deprecata. Il nome è in italiano se l'italiano è il termine di sala; se il termine di sala è inglese resta inglese (`plank · crunch · hip thrust · face pull · pistol · jump squat · front squat · lat machine`).

**2. Formula**: `[Movimento] [Attrezzo] [Variante] [Posizione]` — preposizioni rimosse, default (bilaterale, simultaneo) omessi. Attrezzo = ciò che si impugna: al cavo l'attrezzo è l'attacco (corda, maniglia…), non il cavo.

**3. Maiuscole**: prima lettera del nome + nomi propri (lista chiusa 11 voci: `Scott · Zottman · Arnold · Pendlay · Bulgarian · Jefferson · Svend · Larsen · Kelso · Russian · Yates`) + sigle/designazioni tecniche nella forma canonica (`EZ · TRX · IT · Y-W · V`). Tutto il resto minuscolo anche se inglese.

**4. Panche** — vocabolario chiuso a 5: `panca piana · panca inclinata · panca declinata · panca verticale · panca Scott`. `panca verticale` assorbe "90 gradi/con schienale". `panca romana` (iperestensore 45°) e `sedia romana` (torre verticale) sono **attrezzi distinti**, campo Attrezzo, fuori dal vocabolario delle 5 panche.

**5. Gradi**: simbolo `°` abolito ovunque nel nome — si scrive `gradi` per esteso. Nei campi descrittivi (`setup`, `esecuzione`, `errori`) è ammesso.

**6. Slug monolingue**: `gif_slug` = kebab-case ASCII dal solo nome unico. Schema `slug(IT)-slug(EN)` abolito. Path e filename SEMPRE ASCII.

**7. Codice stabile**: `EX###` mai derivato dalla zona. Gap permanenti, mai renumerare.

**8. Storico**: qualunque rinomina va accompagnata da migrazione parallela su `training_logs` e `workout_sets` (indicizzano per nome testuale).

**Procedura sicura per file Storage**: copia server-side → verifica hash → aggiorna indice → cancella vecchio. Mai invertire l'ordine.

**Strada A (due codici, stessa GIF)**: seconda riga in `biblioteca_gif` con stesso `storage_path`, slug derivato dal secondo nome. Nessun file duplicato in Storage.

**"corpo libero" nel nome solo quando distingue** da una versione con carico.

### Regole cantiere GIF (riconciliazione a tre fonti)

Per ogni zona: confrontare **(1)** file `.gif` sul Mac · **(2)** righe `biblioteca_gif` + bucket Storage · **(3)** righe `esercizi_catalog` del `gruppo_target`. Output = tabella stati: `OK · MANCA_STORAGE · MANCA_CATALOGO · NOME_DIVERSO · ORFANO · GIF_ROTTA`. `NOME_DIVERSO` va sempre confermato per hash SHA-256.

**La regola che non si negozia**: nessun esercizio entra in catalogo o viene rinominato senza che Ignazio ne abbia visto la GIF. L'analisi tecnica prepara la decisione, non la sostituisce — anche quando la spiegazione tecnica torna perfettamente.

**Guardie tecniche** (sempre attive):
1. "1 codice per slug" — contare quanti codici puntano allo stesso `gif_slug` prima di rinomine massive
2. Strada A per codici che condividono una GIF
3. Hash SHA-256 prima di ogni rinomina massiva (stanare doppioni di contenuto)
4. Script idempotenti con timeout esteso
5. Procedura sicura Storage (copia → verifica → aggiorna → cancella)
6. Righe dei codici eliminati vanno cancellate a mano nel Sheet (il sync non elimina)
7. Prima di eliminare un codice: scansione regex `\bEX\d{3}\b` su tutti i campi testuali di tutte le righe (il campo `alternativa` non ha FK)

---

## Coach generatore — regole

**Filosofia**: catalogo verificato + AI che assembla. Mai inventare esercizi. Esercizi fissi dentro il blocco (4 sett.), variazione tra blocchi.

**Pattern minimi per sessione**:
- Full Body: spinta + tirata + dom.ginocchia + dom.anca + core
- Upper: spinta orizz + spinta vert + tirata orizz + tirata vert
- Lower: dom.ginocchia + dom.anca + core

Tirata ≥ spinta. Core sempre obbligatorio. Ordine: compound pesanti → complementari → isolamenti → core.

**Split**:
| Giorni | Split |
|---|---|
| 2 | Full Body × 2 |
| 3 | Full Body × 3 (princ.) · Upper/Lower/Full (int/avanzato) |
| 4 | Upper/Lower × 2 |
| 5 | Upper/Lower DUP + Upper Pump (int/avanzato) · PPL (princ.) |

Split 5gg DUP: 7 posizioni — upperA · lowerA · recoveryUpper · upperB · lowerB · upperC(Pump) · rest.

**Parametri**:
| Obiettivo | Reps | RIR | Recupero |
|---|---|---|---|
| Forza | 4-6 | 2-3 | 3 min |
| Ipertrofia | 8-12 | 1-2 | 90-120s |
| Ricomp/Dimagrimento | 10-15 (princ.) / ridotti (avanzato) | 1 | 60-90s |
| Salute | 6-10 | 2 | 90-120s |

RIR attivo SOLO per intermedio/avanzato.

**Cautele**: `limitazioni` × `zone_rischio` → prima ADATTA (`adattamento`), poi SOSTITUISCE (`alternativa`). Alternativa accettata solo se nel Set ammissibili (unione 5 pool filtrati luogo/attrezzo/livello), altrimenti skip `alternative-not-eligible`. Vale anche per Tabata.

**Finisher Tabata**: solo `dimagrimento`/`ricomposizione`, ~5 min, basso impatto, `uso=finisher`. Upper Pump: niente Tabata.

**Isolamenti bonus**: pescano SOLO da `uso=principale`.

**Generazione**: trigger a fine M1 (`saveOnboarding→generateTrainingProgram`). Fine blocco: solo dopo M2. Manuale: `rigeneraSchedaDaImpostazioni()`.

**Suggerimenti progressione**: `ST.profile.unit` → kg step 2.5 / lbs step 10 (default lbs). Bande trazioni senza unità.

---

## Audio Training

- `playPrepBeep` 660Hz — ultimi 5s di ogni countdown
- `playStopBeep` 659Hz — fine fase/lato/serie
- `playLongBeep` 1100Hz — GO/inizio timer

Pausa cambio lato iso (5s) → silenzio totale. Avvio serie a reps → silenzio. Fine recupero → solo STOP.

---

## Rotazione e ciclo Training

**Recuperi TRASPARENTI**: non avanzano il fronte, non generano debito. `computeTrainingDebt`: skip recuperi nel loop; guard `test-user-001` → `{ debt:[], target:null }`. `nextSession` dall'ultimo workout di LAVORO (filtro `!/^recovery/i`).

**`getCycleWeekInfo()`**: helper canonico UNICO per la settimana ciclo. Conta SOLO giorni di lavoro (recovery esclusi). `workPerGiro` derivato dal ciclo (6gg→4, 5gg→5). **Non ricalcolare inline.**

**`getNextCheckpointInfo()`**: `overdue:true` solo se `isScarico` **e** `workCount >= 3*workPerGiro` **e** `daysUntil < 0`. Settimane 1-3 carico: `overdue:false` sempre.

**WS-QUEUE**: `wsWrite()` = 1 retry immediato → coda `zt_ws_pending_<userId>` in localStorage → toast discreto. Flush al boot, a ogni scrittura riuscita, al rientro in foreground. Insert idempotente al replay, cap 200 op.

**Scarico**: stessi esercizi e set, SOLO carichi ridotti + RIR forzato a 3. MAI ridurre set/reps.

**Infortuni multi-giorno**: periodo 1/3/7 gg o aperto in `zt_injury_<userId>`. Righe `rest_injury` materializzate una al giorno al passaggio (idempotenti). Barra in Training con data rientro e "Sto bene, riprendo".

**Rientro soft**: pausa ≥10 gg → banner non bloccante. L1 (10-29 gg) −20%/RIR+1, L2 (≥30 gg) −35%/RIR+2. Solo suggerimenti, zero effetti su scheda/DB/settimana ciclo.
