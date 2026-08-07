# Zona Tracker

PWA wellness single-file HTML, hostata su GitHub Pages. *(aggiornato: 7 agosto 2026)*

**Questo file contiene le regole vigenti.** Cosa resta da fare sta in [`docs/CANTIERI.md`](docs/CANTIERI.md); perché una regola esiste sta in [`docs/LEZIONI.md`](docs/LEZIONI.md); come si nominano gli esercizi in [`docs/NOMENCLATURA.md`](docs/NOMENCLATURA.md) (allegato normativo, in vigore). Non serve leggere gli archivi per lavorare: si aprono quando servono.

**Indice**: File e URL · Servizi · Workflow operativo · Pattern tecnici critici · Stato corrente · Bug noti aperti · Autenticazione · Design system · Navigazione · Schema Supabase · Vocabolario obiettivi · Media system · Nomenclatura v2 · Coach generatore · Audio Training · Rotazione e ciclo Training · Indice delle lezioni

## File e URL

- **App**: `zona-tracker.html` (unico file: HTML + CSS + JS)
- **Admin**: `dashboardzona.html` (email-gated `ignazio.f@me.com`, read-only)
- **URL pubblico**: https://ignaziof321621.github.io/benessere-forma/zona-tracker.html
- **Repo**: https://github.com/IgnazioF321621/benessere-forma · branch `main`
- **Strumenti cantiere GIF**: `tools/biblioteca-nomi/` (nel repo; i materiali di lavoro pesanti restano solo sul Mac)

## Servizi

| Servizio | URL | Scopo |
|---|---|---|
| Cloudflare Worker | `zona-ai.ignazio-f.workers.dev` | Proxy Groq (llama-3.3-70b-versatile) + lookup GIF |
| Supabase | `qxiyeiahpoiliwpqslpr.supabase.co` | DB + Auth + Storage |

Worker: account `ignazio-f` (account_id `2186a57344e459853657cea6213a2c74`). Secrets: `SUPABASE_SERVICE_ROLE_KEY` + `API_KEY`. Deploy: `wrangler deploy` da `worker/` — **non** triggered da git push. Worker Version ID attuale: `da1e0007`.

---

## Workflow operativo (vincolante)

- **Divisione dei ruoli**: Claude chat = decisioni e brief · Claude Design = mockup · Claude Code = tutte le scritture su codice, Storage, DB, git. Nessuna sovrapposizione.
- **Un passo alla volta**: Ignazio conferma prima di procedere. Nessuna proposta speculativa prima di aver letto DB e codice reali.
- **Dry-run e backup** prima di ogni scrittura su Storage o DB.
- **Resoconto obbligatorio a 6 punti** dopo ogni modifica: (1) file modificati con path esatto · (2) cosa è cambiato · (3) commit hash + branch · (4) push status su `origin/main` · (5) GitHub Pages ETA · (6) APP_VERSION.
- **Commit message con conteggi reali misurati**, mai stimati.
- **Comunicazione**: risposte brevi, dirette, senza gergo da sviluppatore verso Ignazio (non è un developer).
- La cartella locale sul Mac e GitHub devono restare allineate: si fanno da backup a vicenda.

---

## Pattern tecnici critici

- Client Supabase si chiama `supa` (non `supabase`)
- SQL Editor gira come admin: `auth.uid()` = NULL → usare UUID espliciti
- **supabase-js NON lancia eccezioni sugli errori API**: restituisce `{error}` nel result → i `try/catch` non li vedono. Controllare SEMPRE `res.error` → [L22](docs/LEZIONI.md#l22--supabase-js-non-lancia-eccezioni-sugli-errori-api)
- `schedaGen=1` ricostruisce la scheda da zero, cancella storico progressione — solo per correzioni mirate
- **`console.log` da rimuovere solo manualmente, mai con script automatici.** Il pericolo è la logica inglobata nella stessa riga del logging → [L1](docs/LEZIONI.md#l1--uno-script-che-toglie-i-log-si-porta-via-la-logica-sulla-stessa-riga)
- **Prima di aggiungere un alias in `GEAR_ALIASES`, verificare che il termine di destinazione esista davvero nel catalogo.** Un token vive quando qualche riga lo usa → [L2](docs/LEZIONI.md#l2--un-alias-può-puntare-a-una-parola-che-non-esiste). Stesso difetto in `APERTO_WHITELIST` (`banda` e `cavigliere` a 0 occorrenze; `corda`, 9 esercizi, non è in whitelist)
- `TRAINING_SESSIONS`/`SESSION_CYCLE` hardcoded sono fallback; gli helper `getTrainingSession`/`getAllTrainingSessions`/`getSessionCycle` leggono prima da `ST.userTrainingSessions`. ⚠️ Dentro gli helper NON usare i nomi degli helper stessi → ricorsione infinita
- Service Worker: **MAI aggiungere `supabase` al cache-first** (causa sync bug cross-device). Cache-first solo per `cdn.jsdelivr.net`. Cache name: `zt-v2`
- `APP_VERSION` aggiornata automaticamente dal pre-commit hook git
- **Paginare sempre** le SELECT su tabelle >1000 righe (es. `biblioteca_gif`): PostgREST tronca al limite default → [L13](docs/LEZIONI.md#l13--postgrest-tronca-le-select-al-limite-default)
- Il ciclo canonico a 7 include `rest`: ogni logica che itera il ciclo deve gestire slot non loggabili (`rest`/`rest_injury`)
- La settimana ciclo si legge SOLO da `getCycleWeekInfo()` — vietato ricalcolarla inline
- TSV/CSV da Google Sheet: **UTF-8 con BOM + CRLF** — usare `encoding='utf-8-sig'` e controllare il conteggio righe parsate → [L14](docs/LEZIONI.md#l14--i-tsv-da-google-sheet-arrivano-utf-8-con-bom-e-crlf)
- **Path e nomi file SEMPRE ASCII**: Storage rifiuta chiavi NFD con `400 InvalidKey`. Normalizzare a NFC, poi traslitterare → [L15](docs/LEZIONI.md#l15--i-nomi-file-macos-sono-in-forma-decomposta). Accenti solo in `nome_italiano`/catalogo, mai nel path o filename
- Il `:` nel filename è ammesso in Storage e NON viene sanificato (verificato su 5 file in `Tricipiti/`)

---

## Stato corrente (7 agosto 2026)

**Nutrition** ✅ completo — Oggi, Integratori v3, Analisi v3, Piano v4 (Step A→F.2a). F.2b in stand-by.

**Training** — in sviluppo attivo, **unico utente Ignazio** (gli altri tester usano Nutrition e Body: un bug del generatore non ha impatto su terzi). Coach generatore funzionante su **667 esercizi**, split 4/5 giorni con rotazione adattiva, Recovery Day unificato, Upper Pump, audio unificato, timer recupero parallelo al form log, WS-QUEUE, infortuni multi-giorno, rientro soft.

**Catalogo GIF** — **602 `gif_slug` attivi, 0 rotti, 65 codici senza slug**. Zero slug puntati da più di un codice. Numeri sempre aggiornati in [`docs/STATO.md`](docs/STATO.md). Zone chiuse: Addominali e Core, Bicipiti e Braccia, Cardio e Conditioning, Gambe e Glutei. **Prossima: Spalle e Cuffia.**

**Body** — M2 check fisico funzionante. Da ri-agganciare a fine blocco Training.

**Admin** (`dashboardzona.html`) ✅ production-ready.

⚠️ **Egress Supabase fuori quota — cantiere biblioteca in pausa fino al 15 agosto 2026.** Cached Egress al 171% (8,55 GB su 5) misurato il 7 agosto; il ciclo si azzera il 15. Fino ad allora **nessuna migrazione di zona e nessun download dal bucket**. Gli strumenti di sola lettura (`stato.py`, `verifica_sync.py`, `riconcilia.py`, `collaudo_egress.py`) si possono lanciare: non scaricano nulla e lo dimostrano col contatore. La causa e i rimedi restano in [L24](docs/LEZIONI.md#l24--limpronta-di-un-oggetto-si-legge-senza-scaricarlo); i due rimedi ancora da fare — ricomprimere le GIF (sono 1080×1080, −82%) e rimettere il `cache-control` (oggi `no-cache` su tutti i 647 oggetti) — sono in [`docs/CANTIERI.md`](docs/CANTIERI.md).

**Prossimo passo**: cantiere 1 — test timer su workout reali, prima di qualunque altro lavoro su Training. Lista completa in [`docs/CANTIERI.md`](docs/CANTIERI.md).

---

## Bug noti aperti

- `trainLoggedSets` si azzera al reload — badge serie spariscono dopo refresh
- Alcuni integratori vecchi hanno macro `—` (backfill SQL pendente)
- `body_logs` manca UNIQUE(user_id, date) — salvataggio usa insert/update manuale
- Editor Pacchetto: emoji picker e time picker usano `prompt()` nativo (UX scadente mobile)
- Isabella: `status=draft`, 0 meals per settimana corrente — non investigato
- **EX576** `Piegamenti tocco ai piedi`: `alternativa` = EX576 (autoriferimento preesistente)
- **Rollback `weekly_plans` silenzioso** — nel postino Nutrition `rollRes` è assegnato e mai letto: un rollback fallito non viene rilevato da nessuno
- **45 chiamate `await supa.` su 116 senza controllo dell'errore** (misurato 7 agosto) — stessa radice del punto precedente
- **`?schedaDebug=1` scollegato** — il flag si accende, il dry-run gira, non stampa niente (sopravvive 1 solo `console.log` sotto `window._trainGenDebug`). Quattro blocchi vuoti residui: tre in `_trainGenPickByPattern`, uno nel carry. Il parametro `splitTypeFilter` di `ztTrainGenPatternPick` è accettato e ignorato
- **27 funzioni mai chiamate** in `zona-tracker.html` (misurato 7 agosto), tra cui il vecchio timer di attivazione e il vecchio modal pasti
- **5 candidati core senza GIF** — EX023 Pallof press · EX032 Hollow hold · EX036 Bird dog · EX046 Stir the pot · EX109 Plank shoulder taps. Per Bird dog la GIF esiste in biblioteca: manca solo il `gif_slug`
- **Deltoidi posteriori: 1 solo candidato** nel pool casa. Slot obbligatorio in quasi ogni Upper → stesso esercizio blocco dopo blocco. Non blocca la generazione. Altro gruppo al minimo: deltoidi laterali 3

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
**667 righe** (6 agosto 2026). Gap permanenti: EX107/EX151/EX170/EX528 · EX110/EX228/EX229/EX323 (bruciati dai consolidamenti del 6 agosto) — **mai renumerare**. Nessun codice libero sotto il massimo. Prossimo libero: **EX676**. RLS SELECT pubblica. PK logica = `codice`.

**Fonte: Google Sheet → Apps Script "ZonaTracker-Sync-Esercizi (v3)" → Supabase upsert. Mai editare Supabase direttamente. Il sync non elimina: le righe da eliminare vanno cancellate a mano nel Sheet prima del sync.**

**Dopo ogni sync si lancia `verifica_sync.py`** — stana righe arenate, valori riportati indietro e catene rotte in un colpo solo, confrontando il vivo contro `docs/STATO.json`:

```bash
python3 tools/biblioteca-nomi/verifica_sync.py && python3 tools/biblioteca-nomi/stato.py
```

Tre trappole del sync, tutte già costate giri a vuoto:
- ⚠️ **Una riga tolta dal foglio non sparisce: si arena.** Si riconosce dall'`updated_at` più vecchio dell'ultimo lotto. È l'**unico** caso in cui cancellare direttamente da Supabase è sicuro → [L3](docs/LEZIONI.md#l3--una-riga-tolta-dal-foglio-non-sparisce-si-arena)
- ⚠️ **Il sync riporta indietro ciò che il foglio non ha.** Dopo ogni sync verificare anche i codici toccati nei passi precedenti, non solo quelli nuovi → [L4](docs/LEZIONI.md#l4--il-sync-riporta-indietro-ciò-che-il-foglio-non-ha)
- ⚠️ **Rimisurare la baseline dei pool dopo ogni sync**, non solo dopo le modifiche al codice → [L17](docs/LEZIONI.md#l17--la-baseline-si-sposta-anche-quando-cambia-il-catalogo-non-solo-il-codice)

Colonne: `codice, nome, nome_en (⚠️ DEPRECATA dal 19/07/2026 — non portante, non usarla per slug/filename/UI), pattern, gruppo_target, attrezzo, luogo, muscoli, livello, zone_rischio, adattamento, alternativa, setup, esecuzione, errori, nota_sicurezza, uso, surrogato_attrezzo, nota_surrogato, esecuzione_surrogato, errori_surrogato`.

- `uso` valori: `principale / finisher / recupero / riscaldamento / mobilita / carry / skill`
- `uso: skill` — skill ginnastica (EX570/573/574/575): **escluse dalla generazione automatica**
- `pattern` normalizzato via `_normPattern()` (lowercase + trim)
- `gruppo_target` vocabolario chiuso — **non dedurre da `muscoli`** (testo libero, vocabolario diverso)
- `alternativa` contiene codici `EX###` in chiaro, nessuna FK: prima di eliminare un codice, scansionare tutti i campi testuali con regex `\bEX\d{3}\b`

Regole `surrogato_attrezzo`: token puliti separati da `+` (vocabolario chiuso: `elastico, manubri, panca, sbarra, fitball, kettlebell, maniglie, trx, cavigliera, barra, bilanciere, corpo libero`). MAI testo libero, MAI alternative con "o". `manubri` sempre plurale. Congruenza obbligatoria con `nota/esecuzione/errori_surrogato`.

### `schede_utente`
`id, user_id, blocco_n int, scheda jsonb, attiva bool`. UNIQUE PARTIAL su `(user_id) WHERE attiva=true`. I `name` nel jsonb sono snapshot alla generazione: il loader li riallinea a runtime dal catalogo via Map codice→nome — il jsonb non si riscrive mai. Fallback su `TRAINING_SESSIONS` hardcoded se nessuna scheda.

### `biblioteca_gif`
**1.570 righe** (6 agosto 2026): 602 vive, 0 rotte, 46 libere, **922 morte** (cantiere 3E). Conteggi sempre aggiornati in [`docs/STATO.md`](docs/STATO.md). Colonne: `slug, nome_italiano, nome_originale, categoria, gruppo_muscolare, storage_path, storage_url`. `slug` = `gif_slug` del catalogo.

Bucket Storage `biblioteca-gif`: **647 oggetti in 9 cartelle** (misurato 7 agosto), zero file senza riga: Addominali e Core · Bicipiti e Braccia · Cardio e Conditioning · Gambe e Glutei · Pettorali · Polpacci · Schiena e Trapezio · Spalle e Cuffia · Tricipiti. Cartelle legacy eliminate il 18/07/2026.

**`categoria` non ha convenzione unica tra zone** — leggere sempre quale usa la zona di destinazione prima di scrivere. Pettorali → nome della zona; Schiena e Trapezio → pattern di movimento (`tirata orizzontale` · `tirata verticale` · `isolamento`), il nome della zona non compare. `storage_path` invece è sempre univoco per zona ed è il riferimento affidabile.

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

**602/602 `gif_slug` risolvono, 0 rotti** (6 agosto). 65 codici senza slug → fallback ExerciseDB.

⚠️ **La verifica per impronta dice che la catena è integra, non che punta dove è stato deciso** → [L8](docs/LEZIONI.md#l8--che-la-catena-sia-integra-non-significa-che-punti-dove-è-stato-deciso)
⚠️ **Lo sweep completo va lanciato con concorrenza 3, non 6** (Storage risponde 429) → [L11](docs/LEZIONI.md#l11--lo-sweep-completo-va-lanciato-con-concorrenza-bassa). Vale per gli sweep che scaricano davvero: dal 7 agosto la verifica normale usa `HEAD` e non ha più questo limite → [L24](docs/LEZIONI.md#l24--limpronta-di-un-oggetto-si-legge-senza-scaricarlo)

### Regole di migrazione (bucket + `biblioteca_gif` + Sheet)

**Aggancio per impronta, mai per nome.** Un file si collega al suo codice confrontando lo **SHA-256** → [L9](docs/LEZIONI.md#l9--aggancio-per-impronta-mai-per-nome). La regola vive nello strumento: `prepara.py` aggancia file → riga → codice per SHA-256 tramite `impronte.py`; il basename di `storage_path` non entra nella classificazione.

- `biblioteca_gif` si legge **live** con la chiave di servizio da `worker/.dev.vars` (mai stampata). L'export CSV è solo ripiego: invecchia a ogni migrazione.
- Stato **`indeterminato`**: se anche un solo oggetto del bucket non ha impronta determinabile, i file senza riscontro **non** diventano `libero`. Nel dubbio la GIF vale come viva → [L10](docs/LEZIONI.md#l10--il-ripiego-silenzioso-su-libero-è-ciò-che-ha-causato-il-difetto)
- **Nessun nome entra nello strumento passando dalla chat.** Fonte unica dei nomi è il pannello di conferma, l'unico posto in cui il nome è stato scelto guardando la GIF.
- **Un solo traslitteratore**, `nomenclatura.senza_accenti()`, usato sia da `slug()` sia da `percorso_ascii()` → [L15](docs/LEZIONI.md#l15--i-nomi-file-macos-sono-in-forma-decomposta)
- ⚠️ Il TSV del pannello e il piano di `migra.py` non coprono le stesse righe → [L12](docs/LEZIONI.md#l12--il-tsv-del-pannello-e-il-piano-di-migrapy-non-coprono-le-stesse-righe)

**L'impronta si legge dall'`eTag`, il contenuto dal Mac — mai scaricando** *(dal 7 agosto 2026)* → [L24](docs/LEZIONI.md#l24--limpronta-di-un-oggetto-si-legge-senza-scaricarlo)

L'`eTag` che Storage dichiara **è l'MD5 del contenuto**: dall'`eTag` si risale al file gemello sul Mac e quindi al suo SHA-256, senza far uscire un byte dal bucket. Copertura misurata: **647 oggetti su 647**. È ciò che ha portato il costo di una zona da ~200 MB a 0.

- **Due cache, entrambe sul contenuto**: `lavoro/_impronte/_locale.json` (percorso → md5+sha256, rinfrescata per mtime) e `lavoro/_impronte/_per_impronta.json` (`md5|bytes` → sha256). ⚠️ **Mai indicizzare sul percorso**: il cantiere rinomina, e la chiave sul percorso costava un download a ogni rinomina — 150 file scaricati due volte
- **Le verifiche si fanno con `HEAD`**, non scaricando: `verifica_oggetto()` in `impronte.py` è il punto unico. Usata da `migra_zona.py`, `verifica_worker.py`, `fase7_cancella_vecchie.py`, `ripara_slug_in_place.py`
- **`ignoto` blocca come `diverso`**: un'impronta non determinabile non diventa mai "a posto" per silenzio
- **Il download è l'eccezione, si chiede a voce, e vale per un file solo**: `prepara.py --scarica`, `verifica_worker.py --sha EX###`. Mai a tappeto
- **Ogni strumento che può scaricare stampa i byte a fine esecuzione, anche a zero** (`stampa_consumo()`). Senza quel numero, i consumi si possono solo stimare
- In `lavoro/` restano `_esegui_gambe_e_glutei.py` e `_costruisci_gambe_e_glutei.py`, residui one-off del cantiere Gambe che scaricavano a tappeto: **disinnescati il 7 agosto**, si fermano all'avvio prima di toccare la rete. Originali in `_backup/oneoff_gambe_originali_20260807T161449/`
- ⚠️ Fuori da `biblioteca-nomi` l'unico che scarica oggetti è `tools/auditor_nomenclatura.py`, e solo per gli slug in collisione (**oggi 0**, quindi scarica nulla). Ha `--no-hash` per spegnerlo del tutto

**Ordine a righe doppie — obbligatorio quando cambia uno slug.** La catena è `esercizi_catalog.gif_slug` → `biblioteca_gif.slug` → `storage_path` → file: se i primi due divergono il Worker restituisce `missing`. Il sync del Sheet è manuale e la finestra può durare ore, quindi va coperta:

1. rinomina nel bucket e aggiorna `storage_path`, slug invariato
2. aggiungi righe con lo slug nuovo e lo stesso `storage_path`, così risolvono entrambi
3. sincronizza il Sheet
4. verifica tutti i codici, poi cancella le righe vecchie **una per una e solo se nessun codice le punta più**

Non deve esistere un istante in cui una GIF è irraggiungibile.

**Eccezione — zona senza codici**: se nessun `gif_slug` punta alla zona non esiste catena da proteggere, lo slug si aggiorna in place e non servono né righe doppie né sync. `migra_zona.py … slug` lo fa, ma **solo dopo aver verificato che i codici puntanti siano zero**; con anche un codice si ferma.

**Rinominare i file nel bucket è cosmesi.** L'app risolve via `storage_path`: il nome del file non è ciò che rompe o aggiusta le immagini.

**Procedura sicura per file Storage**: copia server-side → verifica hash → aggiorna indice → cancella vecchio. Mai invertire l'ordine.

**Strada A (due codici, stessa GIF)**: seconda riga in `biblioteca_gif` con stesso `storage_path`, slug derivato dal secondo nome. Nessun file duplicato in Storage. È la soluzione quando due codici **devono** restare distinti pur condividendo l'immagine; quando invece sono lo stesso esercizio la strada è il consolidamento (cantiere 4).

### Regole cantiere GIF (riconciliazione a tre fonti)

Per ogni zona confrontare: **(1)** file `.gif` sul Mac · **(2)** righe `biblioteca_gif` + bucket Storage · **(3)** righe `esercizi_catalog`. Output = tabella stati: `OK · MANCA_STORAGE · MANCA_CATALOGO · NOME_DIVERSO · ORFANO · GIF_ROTTA`. L'appaiamento è sempre per SHA-256, mai per nome.

**La regola che non si negozia**: nessun esercizio entra in catalogo o viene rinominato senza che Ignazio ne abbia visto la GIF. L'analisi tecnica prepara la decisione, non la sostituisce — anche quando la spiegazione tecnica torna perfettamente.

**Strumenti di controllo** (sola lettura, si lanciano dalla radice del repo):

| comando | quando | cosa dice |
|---|---|---|
| `python3 tools/biblioteca-nomi/stato.py` | dopo ogni sync e ogni migrazione | fotografa tutto in `docs/STATO.md` + `STATO.json` |
| `python3 tools/biblioteca-nomi/verifica_sync.py` | **dopo ogni sync**, prima di ogni altra cosa | righe arenate, valori riportati indietro, catene rotte |
| `python3 tools/biblioteca-nomi/riconcilia.py "<zona>"` | prima di migrare una zona | dove il diario del pannello e il piano divergono |
| `python3 tools/biblioteca-nomi/collaudo_egress.py` | dopo ogni modifica a `impronte.py` | che l'impronta da `eTag` coincida con quella da download, oggetto per oggetto |

**I numeri di riferimento stanno in [`docs/STATO.md`](docs/STATO.md), non qui.** Quel file si rigenera con un comando; i numeri scritti a mano in un documento invecchiano in silenzio.

**Chiave unica SHA-256.** Tutti i registri del cantiere sono indicizzati per impronta, mai per nome file: il cantiere rinomina i file, e una chiave sul nome decade alla prima rinomina. Vale anche per `cantiere_96_pendente.tsv`, convertito il 7 agosto → [L12](docs/LEZIONI.md#l12--il-tsv-del-pannello-e-il-piano-di-migrapy-non-coprono-le-stesse-righe), e per le cache delle impronte, convertite lo stesso giorno → [L24](docs/LEZIONI.md#l24--limpronta-di-un-oggetto-si-legge-senza-scaricarlo)

**Il piano di `pianifica.py` è l'unica fonte di cosa si migra.** Il diario `slug_da_migrare.tsv` resta la prova che una conferma è stata salvata nell'istante in cui è stata data, ma non decide più cosa migrare: `riconcilia.py` verifica che i due coincidano prima di partire.

⚠️ **Il campo `codice` dei registri scritti a mano non è affidabile**: su `cantiere_96_pendente.tsv` 22 righe su 96 puntavano a un codice diverso da quello vero. Il codice si **ricava dall'impronta** (file → riga → codice), non si crede → [L5](docs/LEZIONI.md#l5--un-tsv-senza-intestazione-non-è-verificabile-da-nessuno)

**Guardie tecniche** (sempre attive):
1. "1 codice per slug" — contare quanti codici puntano allo stesso `gif_slug` prima di rinomine massive
2. SHA-256 prima di ogni rinomina massiva. ⚠️ Stana i doppioni identici, non tutti: per gli altri serve il confronto frame per frame dopo allineamento → [L7](docs/LEZIONI.md#l7--limpronta-trova-i-doppioni-identici-non-tutti-i-doppioni)
3. Script idempotenti con timeout esteso
4. Righe dei codici eliminati vanno cancellate a mano nel Sheet (il sync non elimina)
5. Prima di eliminare un codice: scansione regex `\bEX\d{3}\b` su tutti i campi testuali di tutte le righe (`alternativa` non ha FK)
6. **Allocare i codici al momento della scrittura, mai in anticipo** → [L6](docs/LEZIONI.md#l6--codici-allocati-in-anticipo-si-scontrano)

**I TSV da incollare nel foglio vanno consegnati CON la riga di intestazione**, dicendo di incollare dalla seconda riga in giù. Per una **riga singola** la forma più sicura non è il TSV ma l'elenco verticale `colonna → valore`, immune allo sfasamento. Prima di generare TSV posizionali, farsi dare la riga di intestazione del foglio e verificarne l'ordine → [L5](docs/LEZIONI.md#l5--un-tsv-senza-intestazione-non-è-verificabile-da-nessuno)

**Prima di aprire una lista di liberi**, incrociare i nomi col catalogo e separare i due mucchi: candidati nuovi contro codici già esistenti senza `gif_slug` → [L20](docs/LEZIONI.md#l20--la-domanda-giusta-non-è-sempre-diventa-un-esercizio)

**Strumenti che raccolgono lavoro manuale**: ogni conferma si salva su disco **nell'istante in cui viene data**, con `fsync`. Si collauda chiudendo la scheda e riavviando il processo **prima** di consegnarlo → [L21](docs/LEZIONI.md#l21--uno-strumento-che-raccoglie-lavoro-manuale-salva-nellistante-della-scelta)

### Mappe muscolari
19 esercizi storici: PNG locali in `assets/exercises/` (Wger CC BY-SA 4.0). EX031+: mancanti (cantiere futuro).

---

## Nomenclatura esercizi v2 — normativa vincolante

Le 12 regole per nominare un esercizio e derivarne lo slug stanno in **[`docs/NOMENCLATURA.md`](docs/NOMENCLATURA.md)** — allegato normativo, non archivio: è lo standard in vigore dal 19 luglio 2026 e supera ogni regola precedente. Si apre ogni volta che un esercizio entra a catalogo o viene rinominato.

Indice: 1 nome unico · 2 formula e default omessi · 3 maiuscole · 4 panche · 5 gradi · 6 slug monolingue · 7 codice stabile · 8 storico · 9 estensione attiva del rachide · 10 campo `uso` per i conditioning · 11 famiglia in testa · 12 lato del carico

---

## Coach generatore — regole

**Filosofia**: catalogo verificato + AI che assembla. Mai inventare esercizi. Esercizi fissi dentro il blocco (4 sett.), variazione tra blocchi.

**Filtri del pool (`_trainGenFilterPool`) — guardia critica.** Tre guard in cascata, tutti obbligatori: luogo → attrezzo → livello. Se uno solo manca, ogni riga del catalogo entra nei pool in base al solo campo `uso` e la scheda si riempie di esercizi non eseguibili. **Verificare la loro presenza prima di qualunque intervento sul generatore** → [L1](docs/LEZIONI.md#l1--uno-script-che-toglie-i-log-si-porta-via-la-logica-sulla-stessa-riga)

**Criterio di ammissibilità a casa**: la riproducibilità del movimento, non il nome dell'esercizio. Un rematore alla macchina replicato con elastico è legittimo: stesso pattern, stessa posizione, resistenza equivalente. Una leg curl prona alla macchina non lo è: nulla in casa riproduce quella resistenza in quella posizione.

Il surrogato non è un ripiego da tollerare, è il meccanismo che dà ampiezza al catalogo casalingo: **127 dei 332 esercizi** ammessi al pool principale di un profilo casa entrano da lì. Chi tocca i filtri non deve stringere il ramo surrogato per ridurre i nomi da palestra: il nome mostrato resta quello nativo, la versione casalinga vive in `nota_surrogato` → campo `setup`.

**Baseline di riferimento** (profilo Ignazio, casa, avanzato, catalogo 667 righe, 6 ago): `poolPrincipali` **332** · `poolFinisher` **130** · `poolRiscaldamento` **43** · pool core **67 pescabili su 67 ammessi** · `poolFinisherTabata` **25** · `poolCarry` **1**. Se dopo una modifica i numeri divergono, qualcosa nei filtri è cambiato.

⚠️ Il pool core si conta come **pescabili**, non come righe ammesse: una riga `pattern = core` con `gruppo_target` vuoto passa i filtri e non può essere scelta da nessuno slot. Se i due numeri tornano a divergere, c'è una riga nuova da classificare → [L16](docs/LEZIONI.md#l16--il-pool-core-si-conta-come-pescabili-non-come-righe-ammesse)

⚠️ **Rimisurare dopo ogni sync del Sheet**: la baseline si sposta anche quando cambia solo il catalogo → [L17](docs/LEZIONI.md#l17--la-baseline-si-sposta-anche-quando-cambia-il-catalogo-non-solo-il-codice). Storico in [`docs/CANTIERI.md`](docs/CANTIERI.md#storico-baseline-pool).

**I gruppi più poveri del pool non sono nelle gambe.** Con 667 righe restano: deltoidi posteriori **1 candidato**, avambracci 3, deltoidi laterali 3, deltoidi anteriori 4. Gambe e Glutei ha aggiunto 61 righe senza spostarne nessuno — il cantiere che cambia davvero l'allenamento è **Spalle e Cuffia**, non la zona più grossa.

### Core: quattro funzioni, due nature
(2 ago 2026, commit `f16e035`)

| Funzione | Natura | Righe a catalogo |
|---|---|---|
| `core anti-estensione` | tenuta | 21 |
| `core anti-rotazione` | tenuta | 8 |
| `core flessione` | dinamica | 31 |
| `core rotazione` | dinamica | 15 |

Tutte con `pattern = core`. Ogni sessione ha **due slot core: uno di tenuta, uno dinamico** — il core va allenato sia nel resistere al movimento sia nel produrlo. Mappa categoria → coppia in `_TRAIN_GEN_CORE_BY_TYPE`; il core è uscito da `_TRAIN_GEN_ISO_OBBLIGATORI_BY_TYPE`, che torna solo muscolare.

Upper/Push/Pull → piano trasverso (anti-rotazione + rotazione). Lower/Legs → piano sagittale (anti-estensione + flessione). Fullbody alterna.

**Fallback**: se una funzione non ha candidati, si ripiega sull'altra della **stessa natura** (`_TRAIN_GEN_CORE_FALLBACK`). Mai attraversare le nature: slot vuoto è preferibile a due esercizi della stessa natura.

⚠️ **`_trainGenIsIsometric` discrimina sulla funzione, non sul pattern.** La natura la dichiara il `gruppo_target`, **controllato prima delle euristiche sul nome**. Le tenute vanno a tempo, i dinamici a ripetizioni → [L19](docs/LEZIONI.md#l19--_traingenisisometric-deve-discriminare-sulla-funzione-non-sul-pattern)

⚠️ Il vocabolario delle funzioni **non ha un piano frontale**: `EX111 Side bend` è flessione laterale pura ed è stato messo in `core rotazione` come casella dei dinamici sugli obliqui. Adattamento consapevole.

### Indice di rotazione
**`sessionIdx` (assoluto), non `occurrenceIdx`.** Due sessioni di categoria diversa che attingono alla stessa lista con lo stesso indice convergono sullo stesso esercizio. Slot core: `sessionIdx + rigenIdx` (`+0` e `+1` per i due slot). Tabata: `sessionIdx + rigenIdx × numero di sessioni`.

**Il discrimine non è l'offset, è se le liste sono disgiunte** — i compound non manifestano il difetto perché Upper e Lower chiedono pattern diversi. Il carry conclusivo è il riferimento corretto → [L18](docs/LEZIONI.md#l18--lindice-di-rotazione-deve-essere-assoluto-non-loccorrenza-dentro-il-tipo)

### Pattern minimi per sessione
- Full Body: spinta + tirata + dom.ginocchia + dom.anca + core
- Upper: spinta orizz + spinta vert + tirata orizz + tirata vert
- Lower: dom.ginocchia + dom.anca + core

Tirata ≥ spinta. Core sempre obbligatorio. Ordine: compound pesanti → complementari → isolamenti → core.

### Split
| Giorni | Split |
|---|---|
| 2 | Full Body × 2 |
| 3 | Full Body × 3 (princ.) · Upper/Lower/Full (int/avanzato) |
| 4 | Upper/Lower × 2 |
| 5 | Upper/Lower DUP + Upper Pump (int/avanzato) · PPL (princ.) |

⚠️ **Solo 4 e 5 giorni sono realmente supportati end-to-end.** Il generatore produce correttamente anche schede a 2 e 3 giorni e le salva in `schede_utente`, ma rotazione e rendering sono ancorati a id di sessione fissi (`upperA`/`lowerA`/`upperB`/`lowerB`/`recoveryUpper`/`recoveryLower`, più `upperC` per il 5 giorni). Una scheda a 3 giorni produce id `upper`/`lower`/`fullbody` che non combaciano con nessuna mappa: `getTrainingSession()` cade sul fallback `TRAINING_SESSIONS` hardcoded e l'utente vede la scheda d'emergenza con nomi esercizio non aggiornati — sintomo diagnostico utile. Punti da toccare per generalizzare: [cantiere 20](docs/CANTIERI.md#20-generalizzare-lo-split-a-2-e-3-giorni).

Split 5gg DUP: 7 posizioni — upperA · lowerA · recoveryUpper · upperB · lowerB · upperC(Pump) · rest.

### Parametri
| Obiettivo | Reps | RIR | Recupero |
|---|---|---|---|
| Forza | 4-6 | 2-3 | 3 min |
| Ipertrofia | 8-12 | 1-2 | 90-120s |
| Ricomp/Dimagrimento | 10-15 (princ.) / ridotti (avanzato) | 1 | 60-90s |
| Salute | 6-10 | 2 | 90-120s |

RIR attivo SOLO per intermedio/avanzato.

**Cautele**: `limitazioni` × `zone_rischio` → prima ADATTA (`adattamento`), poi SOSTITUISCE (`alternativa`). Alternativa accettata solo se nel Set ammissibili (unione 5 pool filtrati luogo/attrezzo/livello), altrimenti skip `alternative-not-eligible`. Vale anche per Tabata.

**Finisher Tabata**: solo `dimagrimento`/`ricomposizione`, ~5 min, basso impatto, `uso=finisher`. Upper Pump: niente Tabata. 4 esercizi distinti per sessione, fissi dentro la scheda e rinnovati a ogni rigenerazione.

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

---

## Indice delle lezioni

Il racconto completo di ognuna è in [`docs/LEZIONI.md`](docs/LEZIONI.md).

1. [Uno script che toglie i log si porta via la logica sulla stessa riga](docs/LEZIONI.md#l1--uno-script-che-toglie-i-log-si-porta-via-la-logica-sulla-stessa-riga) — filtri pool, `8f46576`
2. [Un alias può puntare a una parola che non esiste](docs/LEZIONI.md#l2--un-alias-può-puntare-a-una-parola-che-non-esiste) — `GEAR_ALIASES`, onboarding
3. [Una riga tolta dal foglio non sparisce: si arena](docs/LEZIONI.md#l3--una-riga-tolta-dal-foglio-non-sparisce-si-arena) — sync Sheet
4. [Il sync riporta indietro ciò che il foglio non ha](docs/LEZIONI.md#l4--il-sync-riporta-indietro-ciò-che-il-foglio-non-ha) — sync Sheet
5. [Un TSV senza intestazione non è verificabile](docs/LEZIONI.md#l5--un-tsv-senza-intestazione-non-è-verificabile-da-nessuno) — consegna righe al foglio
6. [Codici allocati in anticipo si scontrano](docs/LEZIONI.md#l6--codici-allocati-in-anticipo-si-scontrano) — nuovi `EX###`
7. [L'impronta trova i doppioni identici, non tutti](docs/LEZIONI.md#l7--limpronta-trova-i-doppioni-identici-non-tutti-i-doppioni) — consolidamenti
8. [Catena integra ≠ catena giusta](docs/LEZIONI.md#l8--che-la-catena-sia-integra-non-significa-che-punti-dove-è-stato-deciso) — verifiche via Worker
9. [Aggancio per impronta, mai per nome](docs/LEZIONI.md#l9--aggancio-per-impronta-mai-per-nome) — `prepara.py`
10. [Il ripiego silenzioso su "libero"](docs/LEZIONI.md#l10--il-ripiego-silenzioso-su-libero-è-ciò-che-ha-causato-il-difetto) — stato `indeterminato`
11. [Sweep con concorrenza 3, non 6](docs/LEZIONI.md#l11--lo-sweep-completo-va-lanciato-con-concorrenza-bassa) — verifica massiva GIF
12. [Due liste che non coincidono](docs/LEZIONI.md#l12--il-tsv-del-pannello-e-il-piano-di-migrapy-non-coprono-le-stesse-righe) — `conferma.py` vs `migra.py`
13. [PostgREST tronca le SELECT](docs/LEZIONI.md#l13--postgrest-tronca-le-select-al-limite-default) — `biblioteca_gif`
14. [BOM e CRLF dai TSV Google](docs/LEZIONI.md#l14--i-tsv-da-google-sheet-arrivano-utf-8-con-bom-e-crlf) — ogni parsing
15. [I nomi file macOS sono in NFD](docs/LEZIONI.md#l15--i-nomi-file-macos-sono-in-forma-decomposta) — path Storage
16. [Pool core: ammessi ≠ pescabili](docs/LEZIONI.md#l16--il-pool-core-si-conta-come-pescabili-non-come-righe-ammesse) — baseline
17. [La baseline si sposta col catalogo](docs/LEZIONI.md#l17--la-baseline-si-sposta-anche-quando-cambia-il-catalogo-non-solo-il-codice) — dopo ogni sync
18. [Indice di rotazione assoluto](docs/LEZIONI.md#l18--lindice-di-rotazione-deve-essere-assoluto-non-loccorrenza-dentro-il-tipo) — core, Tabata
19. [Isometrico per funzione, non per pattern](docs/LEZIONI.md#l19--_traingenisisometric-deve-discriminare-sulla-funzione-non-sul-pattern) — prescrizione core
20. [La domanda giusta sui "liberi"](docs/LEZIONI.md#l20--la-domanda-giusta-non-è-sempre-diventa-un-esercizio) — cantieri 2 e 16
21. [Salvare nell'istante della scelta](docs/LEZIONI.md#l21--uno-strumento-che-raccoglie-lavoro-manuale-salva-nellistante-della-scelta) — strumenti di conferma
22. [supabase-js non lancia eccezioni](docs/LEZIONI.md#l22--supabase-js-non-lancia-eccezioni-sugli-errori-api) — ogni scrittura DB
23. [Il codice scritto a mano non è una chiave](docs/LEZIONI.md#l23--il-codice-scritto-a-mano-in-un-registro-non-è-una-chiave) — registri del cantiere
24. [L'impronta si legge senza scaricare](docs/LEZIONI.md#l24--limpronta-di-un-oggetto-si-legge-senza-scaricarlo) — `eTag` = MD5, verifiche `HEAD`, contatore byte
