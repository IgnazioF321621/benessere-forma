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
- `console.log` da rimuovere solo manualmente, mai con script automatici. Caso reale: il commit `8f46576` (12 giu 2026) ha cancellato tre guard di `_trainGenFilterPool` — erano one-liner `if (!X) { if (debug) console.log(…); return; }` e lo script ha portato via l'intera riga, `return` compreso. Filtri luogo/attrezzo/livello morti per 7 settimane, scoperti il 2 ago, ripristinati in `7a60a97`. Stesso commit: persa `compoundMissing.push(pat)`, e `?schedaDebug=1` è rimasto scollegato (sopravvive 1 log su tutti). Il pericolo è la logica inglobata nella stessa riga del logging, non il logging
- `GEAR_ALIASES` traduce verso parole che il catalogo deve parlare. Gli alias `barra_corta`/`barra_lunga → barra` e `cavigliere → cavigliera` puntano a termini con 0 occorrenze nel catalogo, né come attrezzo nativo né dentro un `surrogato_attrezzo`: l'utente dichiara quegli attrezzi in onboarding e non aprono un solo esercizio, in silenzio. Prima di aggiungere un alias, verificare che il termine di destinazione esista davvero nel catalogo
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

## Stato corrente (2 agosto 2026)

**Nutrition** ✅ completo — Oggi, Integratori v3, Analisi v3, Piano v4 (Step A→F.2a). F.2b (colazione/merenda) in stand-by.

**Training** — in sviluppo attivo. Coach generatore funzionante: 582 esercizi su `esercizi_catalog`, split 4/5 giorni con rotazione adattiva, Recovery Day unificato (~25 min, 5 blocchi), Upper Pump (DUP 5gg), audio unificato, timer recupero parallelo al form log, WS-QUEUE (scrittura `workout_sets` con retry + coda localStorage), infortuni multi-giorno, rientro soft. Filtri pool ripristinati (`7a60a97`), split 3 giorni non supportato dall'interfaccia.

Il modulo Training ha un solo utente: Ignazio. Gli altri tester usano Nutrition e Body. Un bug del generatore non ha impatto su terzi.

**Catalogo GIF** — cantiere nomenclatura v2 chiuso (24 luglio). 501 `gif_slug` attivi, 0 rotti, 81 codici senza slug.

**Cantiere nomi biblioteca** — in corso. Riordino dei nomi delle 891 GIF in 10 cartelle sotto `Biblioteca di esercizi/`, mobilità compresa. Strumento: pagina locale `tools/biblioteca-nomi/` (`prepara.py` → `conferma.py` su :8768 → `migra.py`). Metodo in tre tempi: conferma visiva a gruppi di dieci → rinomina sul Mac → migrazione dei tre posti (bucket, `biblioteca_gif`, Sheet).
Chiuse: **Addominali e Core** (68 righe migrate, 1 agosto). In coda per dimensione: Mobilità 215 · Gambe e Glutei 166 · Schiena e Trapezio 112 · Pettorali 80 · **Bicipiti e Braccia 75 (prossima)** · Spalle e Cuffia 63 · Tricipiti 61 · Cardio 31 · Polpacci 19.

**Body** — M2 check fisico funzionante. Da ri-agganciare a fine blocco Training.

**Admin** (`dashboardzona.html`) ✅ production-ready.

## Prossimi cantieri

1. **Test timer su workout reali** — commit `e834320` (timer unificati timestamp-based) in osservazione. PRIMA di qualunque altro cantiere Training.
2. **Cantiere 600 GIF** — 81 codici senza `gif_slug`, da colmare zona per zona. La vista di conferma visiva è fatta (`tools/biblioteca-nomi/`) e viene riusata: il cantiere procede in coda a quello dei nomi, cartella per cartella.
3. **Code pulizia Storage** — C: 28 file L2 residui nelle zone curate (indicizzati, non referenziati) · D: bucket `exercise-media` legacy (43 file, 5,9 MB, verificare se l'app lo usa ancora) · E: riallineamento indice `biblioteca_gif` (924 righe puntano a file inesistenti).
4. **Lista da consolidare** — coppie di codici distinti che puntano a file di **contenuto identico** (SHA-256 uguale). Non è materia di rinomina ma di consolidamento: un codice eliminato resta bruciato. La lista si accumula cartella per cartella e si affronta in **un giro unico alla fine**, mai durante una migrazione. Aperte da Addominali e Core: EX021/EX176 · EX139/EX184 · EX042/EX178 · `Russian twist` (file Mac di contenuto diverso da EX103). Registro: `tools/biblioteca-nomi/`.
5. **Code catalogo** — EX085 (`gruppo_target='Gambe e Glutei'` fuori vocabolario) · EX322 (`'gambe'` fuori vocabolario) · 56 righe con `nome_italiano` divergente nell'indice (residuo blocco rinomine) · 5 `alternativa` pendenti già bonificati ma da monitorare se emergono altri.
6. **Avviso corpo libero puro** — con zero attrezzi non esistono tirate/deltoidi copribili: scelta UX (avviso in onboarding o generazione). Misurato il 2 ago: pool principale 101 righe, `compoundMissing` = `tirata orizzontale` + `tirata verticale`.
7. **EX287 "Stacco da terra classico"** — decisione pendente: GIF live vs candidato in `Biblioteca di esercizi/Gambe e Glutei/Stacco da terra classico - CANDIDATO da confrontare.gif`.
8. **M2 entry point** — CTA sempre visibile in Body; reminder fine blocco; blood test history UI.
9. **F.2b colazione/merenda** — stand-by, riattivare solo se onboarding lo richiede.
10. **Refresh onboarding M1** — preferenze generazione piano (giorno/ora) + tracking peso. ⚠️ `profiles_plan_day_check` ammette solo `'fri'/'sat'/'sun'`.
11. **Push notifications** — sistema unico (piano + training + integratori).
12. **"Oggi ho solo X min"** — compressione singola sessione senza toccare progressione blocco.
13. **Surrogati mancanti** — censire gli esercizi con `luogo = palestra` riproducibili a casa che hanno `surrogato_attrezzo` vuoto: oggi restano fuori dal pool senza che nessuno lo sappia. È il lavoro che colma i buchi tipo "deltoidi posteriori: 1 esercizio". Natura identica al cantiere GIF: si procede a gruppi con conferma visiva. La diagnostica di appoggio è `ztSchedaWhy()` → `_diag.compoundMissing`, riparata il 2 ago (`d40faaf`).
14. **Allineamento nomi attrezzo onboarding ↔ catalogo** — `barra` e `cavigliera` non esistono a catalogo. Due strade: correggere gli alias verso termini reali, oppure emettere un avviso quando un token del profilo non trova riscontro. Senza intervento l'utente dichiara attrezzi inerti.

## Bug noti aperti

- `trainLoggedSets` si azzera al reload — badge serie spariscono dopo refresh
- Alcuni integratori vecchi hanno macro `—` (backfill SQL pendente)
- `body_logs` manca UNIQUE(user_id, date) — salvataggio usa insert/update manuale
- Editor Pacchetto: emoji picker e time picker usano `prompt()` nativo (UX scadente mobile)
- Isabella: `status=draft`, 0 meals per settimana corrente — non investigato
- **EX576** `Piegamenti tocco ai piedi`: `alternativa` = EX576 (autoriferimento preesistente, non generato dal cantiere)
- **Rollback `weekly_plans` silenzioso** — nel postino Nutrition, `rollRes` è assegnato e mai letto (residuo `8f46576`). Poiché supabase-js non lancia sugli errori API, un rollback fallito non viene rilevato da nessuno
- **`?schedaDebug=1` scollegato** — sopravvive 1 solo `console.log` sotto `window._trainGenDebug`. Il flag si accende, il dry-run gira, non stampa niente. Tre carcasse in `_trainGenPickByPattern`: due blocchi con solo calcoli morti e un `else if` vuoto. Anche il parametro `splitTypeFilter` di `ztTrainGenPatternPick` è ora accettato e ignorato
- **Deltoidi posteriori: 1 solo esercizio** nel pool casa ristretto. È slot obbligatorio in quasi ogni sessione Upper → stesso esercizio blocco dopo blocco. Non blocca la generazione. Altri gruppi al minimo: deltoidi laterali 3, `core anti-estensione` 4, `core anti-rotazione` 6

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
**582 righe** (1 agosto 2026). Gap permanenti: EX107/EX151/EX170/EX528 — mai renumerare. Prossimo libero: **EX587**. RLS SELECT pubblica. PK logica = `codice`. **Fonte: Google Sheet → Apps Script "ZonaTracker-Sync-Esercizi (v3)" → Supabase upsert. Mai editare Supabase direttamente. Il sync non elimina: righe da eliminare vanno cancellate a mano nel Sheet prima del sync.**

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
**1.550 righe** (1 agosto 2026), di cui **924 puntano a file inesistenti** (misurato — cantiere E). Colonne: `slug, nome_italiano, nome_originale, categoria, gruppo_muscolare, storage_path, storage_url`. `slug` = `gif_slug` del catalogo. Bucket Storage `biblioteca-gif`: **624 oggetti in 9 cartelle**, zero file senza riga (controllo inverso eseguito): Addominali e Core · Bicipiti e Braccia · Cardio e Conditioning · Gambe e Glutei · Pettorali · Polpacci · Schiena e Trapezio · Spalle e Cuffia · Tricipiti. Cartelle legacy eliminate il 18/07/2026.

**`categoria` non ha convenzione unica tra zone** — leggere sempre quale usa la zona di destinazione prima di scrivere. Pettorali → nome della zona (`Pettorali`); Schiena e Trapezio → pattern di movimento (`tirata orizzontale` · `tirata verticale` · `isolamento`), il nome della zona non compare. `storage_path` invece è sempre univoco per zona ed è il riferimento affidabile.

**`Cardio e Conditioning` è una zona di capacità, non muscolare**: raccoglie gli esercizi il cui stimolo non è isolabile su un gruppo muscolare. Le altre 8 restano zone muscolari.

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
- `?code=EX###` (priorità): cerca `gif_slug` su `esercizi_catalog` → lookup `biblioteca_gif WHERE slug=gif_slug` → URL costruito su **`storage_path` letto dalla riga**, non ricavato da slug o categoria
- Fallback se `gif_slug` NULL: vecchio `MATCH_BY_CODE` ExerciseDB (~39 esercizi storici)
- `?name=...` (legacy): match esatto su dizionario hardcoded ~20 nomi (`MATCH_DATA`), nessuna normalizzazione
- App: `fetchExerciseMedia(exName, exCode)` · `ensureRestGif(exName, exCode)` — cache key = `exCode || exName`

**501/501 `gif_slug` risolvono, 0 rotti** (24 luglio; i 22 slug migrati il 1 agosto riverificati uno per uno). 81 codici senza slug → fallback ExerciseDB.

### Regole di migrazione (bucket + `biblioteca_gif` + Sheet)

**Aggancio per impronta, mai per nome.** Un file si collega al suo codice confrontando lo **SHA-256**, non il nome. In un cantiere in cui i nomi sono proprio ciò che cambia, l'aggancio per nome classifica come libere righe che sono vive: già successo, 6 righe su 69.

**Ordine a righe doppie — obbligatorio quando cambia uno slug.** La catena è `esercizi_catalog.gif_slug` → `biblioteca_gif.slug` → `storage_path` → file: se i primi due divergono il Worker restituisce `missing`. Il sync del Sheet è manuale e la finestra può durare ore, quindi va coperta: **(1)** rinomina nel bucket e aggiorna `storage_path`, slug invariato · **(2)** aggiungi righe con lo slug nuovo e lo stesso `storage_path`, così risolvono entrambi · **(3)** sincronizza il Sheet · **(4)** verifica tutti i codici, poi cancella le righe vecchie **una per una e solo se nessun codice le punta più**. Non deve esistere un istante in cui una GIF è irraggiungibile.

**Rinominare i file nel bucket è cosmesi.** L'app risolve via `storage_path`: il nome del file non è ciò che rompe o aggiusta le immagini.

### Mappe muscolari
19 esercizi storici: PNG locali in `assets/exercises/` (Wger CC BY-SA 4.0). EX031+: mancanti (cantiere futuro).

### Nomenclatura esercizi v2 (19 luglio 2026) — normativa vincolante

> Supera ogni regola precedente. In caso di conflitto vale solo quanto scritto qui.

**1. Nome unico.** Catalogo con un solo nome per esercizio. `nome_en` deprecata. Il nome è in italiano se l'italiano è il termine di sala; se il termine di sala è inglese resta inglese (`plank · crunch · hip thrust · face pull · pistol · jump squat · front squat · lat machine`).

**2. Formula**: `[Movimento] [Attrezzo] [Variante] [Posizione]` — preposizioni rimosse, default (bilaterale, simultaneo) omessi. Attrezzo = ciò che si impugna: al cavo l'attrezzo è l'attacco (corda, maniglia…), non il cavo.

**3. Maiuscole**: prima lettera del nome + nomi propri (lista chiusa 12 voci: `Scott · Zottman · Arnold · Pendlay · Bulgarian · Jefferson · Svend · Larsen · Kelso · Russian · Yates · Bosu`) + sigle/designazioni tecniche nella forma canonica (`EZ · TRX · IT · Y-W · V · T · X`). Tutto il resto minuscolo anche se inglese.

`Bosu` è un marchio di attrezzo, non un termine comune. `T` e `X` sono designazioni di forma come `Y-W` e `V`: `Push up T prono`, `Corsa conetti a X`.

**4. Panche** — vocabolario chiuso a 5: `panca piana · panca inclinata · panca declinata · panca verticale · panca Scott`. `panca verticale` assorbe "90 gradi/con schienale". `panca romana` (iperestensore 45°) e `sedia romana` (torre verticale) sono **attrezzi distinti**, campo Attrezzo, fuori dal vocabolario delle 5 panche.

**5. Gradi**: simbolo `°` abolito ovunque nel nome — si scrive `gradi` per esteso. Nei campi descrittivi (`setup`, `esecuzione`, `errori`) è ammesso.

**6. Slug monolingue**: `gif_slug` = kebab-case ASCII dal solo nome unico. Schema `slug(IT)-slug(EN)` abolito. Path e filename SEMPRE ASCII. **L'apostrofo diventa trattino** (`Corsa all'indietro` → `corsa-all-indietro`), mai eliminato e mai sostituito da apostrofo tipografico. ⚠️ I nomi file macOS sono in forma decomposta (NFD): la `à` è `a` + U+0300. Prima della conversione ASCII **normalizzare a NFC** (`unicodedata.normalize('NFC', s)`), poi traslitterare — mai tagliare byte per byte, che su NFD lascia la lettera base seguita dal segno diacritico orfano.

**7. Codice stabile**: `EX###` mai derivato dalla zona. Gap permanenti, mai renumerare.

**8. Storico**: qualunque rinomina va accompagnata da migrazione parallela su `training_logs` e `workout_sets` (indicizzano per nome testuale).

**9. Estensione attiva del rachide** — gli esercizi che estendono attivamente la schiena (superman, swimming, reverse hyper, iperestensioni) vanno in `Schiena e Trapezio` con `gruppo_target = lombari`, **mai in `Addominali e Core`**. Motivo: gli slot core dell'app sono anti-estensione e anti-rotazione, e richiedono tenuta isometrica; un esercizio che estende attivamente la schiena in quello slot produce lo stimolo opposto a quello richiesto.

**10. Campo `uso` per i conditioning** — vale **solo per gli esercizi che stanno nella zona `Cardio e Conditioning`**. Tre valori secondo il tipo di stimolo:

| Tipo | `uso` | Effetto |
|---|---|---|
| Conditioning ciclico ad alta intensità | `finisher` | Entra nel pool Tabata (insieme a `pattern = cardio_metabolico`) |
| Andature, agilità, lavoro tecnico di corsa | `riscaldamento` | Pool riscaldamento |
| Pliometria massimale che resta in Cardio | *vuoto* | Resta fuori da ogni pool |

`uso` vuoto è previsto **solo** per chi resta in `Cardio e Conditioning` e non deve entrare in alcun pool: è espressione di potenza e va eseguita a fresco, e il generatore non ha ancora uno slot dedicato.

Per tutti e tre i gruppi: `pattern = cardio_metabolico` e `gruppo_target` **vuoto**, per non inquinare il picker degli isolamenti.

**La zona comanda.** La pliometria massimale ricollocata in una zona muscolare segue le regole di quella zona: riceve `pattern`, `gruppo_target` e `uso` come ogni altro esercizio di zona, ed entra nei pool del generatore. Precedenti a catalogo: EX268 `Squat pliometrico manubri` e EX212 `Affondo pliometrico manubri`. Vale anche quando l'esercizio era già a catalogo come conditioning: otto salti identici per natura non possono essere trattati in due modi diversi solo perché uno di essi c'era già.

**11. Famiglia in testa** — precisazione della regola 2, non sua sostituzione. La parola di famiglia apre sempre il nome, anche dove grammaticalmente suonerebbe meglio in seconda posizione. Serve a far ordinare vicini gli esercizi imparentati e a renderli riconoscibili a colpo d'occhio in un elenco alfabetico.

`Boxe combo gancio-montante`, non `Combo boxe gancio-montante`.

Nella grande maggioranza dei casi la regola coincide già con `[Movimento] [Attrezzo] [Variante] [Posizione]`, perché la famiglia **è** il movimento. La precisazione serve per i casi in cui la famiglia verrebbe altrimenti trattata come aggettivo o complemento.

**Eccezione — famiglia preceduta da preposizione.** Una parola di famiglia preceduta da preposizione è un complemento, non la famiglia: in quel caso non va anteposta. `Skip con calcio` resta tale — la famiglia è `skip`, il calcio è il modo.

Elenco **aperto**, si amplia man mano che se ne incontrano. Famiglie note a oggi: `squat · corsa · camminata · salto · skip · andatura · plank · boxe · calcio · affondo`.

`boxe` copre i colpi di braccia, `calcio` quelli di gamba: un roundhouse al sacco è `Calcio circolare sacco`, non `Boxe calcio circolare`.

Non ogni parola ricorrente è una famiglia: `bear crawl` e `wall ball` sono nomi propri di esercizio e restano interi.

**Procedura sicura per file Storage**: copia server-side → verifica hash → aggiorna indice → cancella vecchio. Mai invertire l'ordine.

**Strada A (due codici, stessa GIF)**: seconda riga in `biblioteca_gif` con stesso `storage_path`, slug derivato dal secondo nome. Nessun file duplicato in Storage. È la soluzione quando due codici **devono** restare distinti pur condividendo l'immagine; quando invece sono lo stesso esercizio la strada è il consolidamento, che si affronta a parte (vedi *Lista da consolidare*).

**"corpo libero" nel nome solo quando distingue** da una versione con carico.

### Regole cantiere GIF (riconciliazione a tre fonti)

Per ogni zona: confrontare **(1)** file `.gif` sul Mac · **(2)** righe `biblioteca_gif` + bucket Storage · **(3)** righe `esercizi_catalog`. Output = tabella stati: `OK · MANCA_STORAGE · MANCA_CATALOGO · NOME_DIVERSO · ORFANO · GIF_ROTTA`. L'appaiamento è sempre per SHA-256, mai per nome.

**La regola che non si negozia**: nessun esercizio entra in catalogo o viene rinominato senza che Ignazio ne abbia visto la GIF. L'analisi tecnica prepara la decisione, non la sostituisce — anche quando la spiegazione tecnica torna perfettamente.

**Guardie tecniche** (sempre attive):
1. "1 codice per slug" — contare quanti codici puntano allo stesso `gif_slug` prima di rinomine massive
2. SHA-256 prima di ogni rinomina massiva, per stanare i doppioni di contenuto (vedi *Aggancio per impronta*)
3. Script idempotenti con timeout esteso
4. Righe dei codici eliminati vanno cancellate a mano nel Sheet (il sync non elimina)
5. Prima di eliminare un codice: scansione regex `\bEX\d{3}\b` su tutti i campi testuali di tutte le righe (il campo `alternativa` non ha FK)

**Strumenti che raccolgono lavoro manuale**: ogni conferma si salva su disco **nell'istante in cui viene data**, con `fsync`, senza dipendere da un bottone di applicazione o dalla chiusura di un blocco. Registrare la scelta e agire sui file sono operazioni separate. Si collauda chiudendo la scheda e riavviando il processo **prima** di consegnarlo: se il lavoro non si ritrova, lo strumento non è pronto.

---

## Coach generatore — regole

**Filosofia**: catalogo verificato + AI che assembla. Mai inventare esercizi. Esercizi fissi dentro il blocco (4 sett.), variazione tra blocchi.

**Filtri del pool (`_trainGenFilterPool`) — guardia critica.** Tre guard in cascata, tutti obbligatori: luogo → attrezzo → livello. Se uno solo manca, ogni riga del catalogo entra nei pool in base al solo campo `uso` e la scheda si riempie di esercizi non eseguibili. Verificare la loro presenza prima di qualunque intervento sul generatore.

**Criterio di ammissibilità a casa**: la riproducibilità del movimento, non il nome dell'esercizio. Un rematore alla macchina replicato con elastico è legittimo: stesso pattern, stessa posizione, resistenza equivalente. Una leg curl prona alla macchina non lo è: nulla in casa riproduce quella resistenza in quella posizione.

Il surrogato non è un ripiego da tollerare, è il meccanismo che dà ampiezza al catalogo casalingo: 120 dei 283 esercizi ammessi al pool principale di un profilo casa entrano da lì. Chi tocca i filtri non deve stringere il ramo surrogato per ridurre i nomi da palestra: il nome mostrato resta quello nativo, la versione casalinga vive in `nota_surrogato` → campo `setup`.

**Baseline di riferimento** (profilo Ignazio, casa, avanzato, catalogo 582 righe): `poolPrincipali` 283 · `poolFinisher` 103 · `poolRiscaldamento` 17. Se dopo una modifica i numeri divergono, qualcosa nei filtri è cambiato.

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

⚠️ **Solo 4 e 5 giorni sono realmente supportati end-to-end.** Il generatore produce correttamente anche schede a 2 e 3 giorni e le salva in `schede_utente`, ma rotazione e rendering sono ancorati a id di sessione fissi (`upperA`/`lowerA`/`upperB`/`lowerB`/`recoveryUpper`/`recoveryLower`, più `upperC` per il 5 giorni). Una scheda a 3 giorni produce id `upper`/`lower`/`fullbody` che non combaciano con nessuna mappa: `getTrainingSession()` cade sul fallback `TRAINING_SESSIONS` hardcoded e l'utente vede la scheda d'emergenza con nomi esercizio non aggiornati.

Punti da toccare per generalizzare: `SESSION_DAY_NUM` / `SESSION_DAY_NUM_5` · `_rotationDayMap()` / `getRotationCycle()` (discriminante binario sulla presenza di `upperC`) · `DAY_SPLIT` in "I tuoi giorni" (hardcoded, due soli layout) · `getCycleWeekInfo()` (`workPerGiro` derivato dal ciclo). Da mettere in conto la migrazione di `session_type` nello storico `workouts`.

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
