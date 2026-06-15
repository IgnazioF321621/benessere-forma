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
- File principali: `zona-tracker.html`, `auth-callback.html`, `dashboardzona.html` (admin)


## Stato corrente (sintesi al 15 giugno 2026)

**Modulo Nutrition**: ✅ COMPLETO end-to-end. Tab Oggi, Integratori, Analisi v3 e Piano v4 (Step A→F.2a v2 + Passo 2) tutti production-ready. F.2b colazione+merenda in STAND BY (gestione libera utente). Tab Oggi e Piano leggono dalla stessa fonte (`weekly_plan_meals` via cache `ST.pianoV4RealPlanCache`). ✅ Bug cache sticky `mealsByDay={}` fixato (commit `f7ca675`) — verifica tester (Ginevra, Ornella, Isabella) in sospeso.

**Modulo Training**: in sviluppo attivo. Coach generatore completo (catalogo 123 esercizi su `esercizi_catalog`), split 4/5 giorni con rotazione adattiva, Recovery Day + Rest Day unificati (giugno 2026). Tab Progressione ridisegnata completamente (11 giu 2026): strip calendario 7 giorni scorrevole, 4 grafici selezionabili (Carico / 1RM stimato / Volume totale / Zone reps), stat cards 2×2 (Best Peso, 1RM Stim., Sessioni, Trend), Coach insight. Sistema audio unificato (3 suoni semantici: prepBeep 660Hz warning, stopBeep 659Hz stop, longBeep 1100Hz GO) — ✅ implementato. Timer recupero parallelo al form log + riepilogo post-salvataggio nel modal recupero (commit `6125812`, in collaudo). APP_VERSION attuale: `v2026.06.12 · XX:XX`. Vedi sezione "MODULO TRAINING — REGOLE DEL COACH & DECISIONI" per specifiche complete.

**Modulo Body**: M2 check fisico funzionale (versione 13 mag) + design refinement applicato. Da ri-agganciare a fine blocco Training.

**Onboarding M1**: esteso con blocco Training (attrezzatura + giorni + tempo) + interruttore Training on/off. Implementato 25 mag.

**Admin panel** (`dashboardzona.html`): ✅ production-ready dall'11 mag 2026.

**Prossimi filoni aperti** (non ordinati per priorità):
- Rifiniture modulo Training (vedi TODO interni nelle sezioni dedicate)
- Notifiche push iOS PWA (V2, dopo stabilizzazione)
- Refresh onboarding M1: preferenze coach (giorno+ora generazione piano, modalità tracking peso)
- Food input multi-modale (barcode → foto AI → OCR etichetta)
- F.2b/c/d Nutrition (visione futura: colazione/merenda, ricettario, apprendimento storico, correzione squilibri)
- Tasti ACCETTA/SOSTITUISCI/SALTO sui pasti veri del coach + `weekly_plan_acceptance`

**Debiti tecnici noti**:
- Integratori v3 (`// [LEGACY-INTEGRATORI-V3]`) — cleanup separato, non ancora fatto.
- **GIF esercizi nel modal recupero**: il toggle "▶ Mostra esecuzione" era presente ma il placeholder è ora nel mockup approvato — cantiere separato da aprire dopo collaudo del flow timer+form (commit `6125812`).
- ~~**Bug cache sticky `mealsByDay={}`**~~ ✅ fixato (commit `f7ca675`, 13 giu 2026): aggiunto path di retry in `_pianoV4LoadRealPlanForWeek` quando `plan` non-null ma `mealsByDay` vuoto. Verifica tester (Ginevra, Ornella, Isabella) in sospeso.

---

**📚 Log storico delle sessioni**: il diario completo di ogni sessione di sviluppo (mag–giu 2026) è stato spostato in `CLAUDE.md.backup-20260603-150645` per liberare context. Se serve consultare la storia di una decisione o di un commit specifico, cercare in quel file.

---

## Log sessioni (giugno 2026)

### 2026-06-08

**Chiuso oggi:**

- **Nomi esercizi — rimozione attrezzo dal campo nome**: fix editoriale nel Google Sheet — l'attrezzo non compare più ridondante nel nome dell'esercizio (es. "Squat con elastico" → "Squat"). Sincronizzato su `esercizi_catalog`.

### 2026-06-11

**Chiuso oggi:**

- **Fix bug `fname` in `_saveSettingsExecute`** (commit `422bad4`): `ReferenceError: fname is not defined` introdotto il 24 maggio 2026 e rimasto silente fino all'11 giugno. Causa: refactor parziale che rinominò la variabile interna senza aggiornare un riferimento. Effetto: **nessun salvataggio impostazioni ha funzionato dal 24 maggio al 11 giugno** per NESSUN campo (nome, cognome, peso, obiettivo, dieta, intolleranze, giorni allenamento, ecc.) — ogni tentativo lanciava eccezione non visibile all'utente. Fix: aggiunta lettura `fname` da DOM all'inizio di `_saveSettingsExecute`. ⚠️ **Azione richiesta**: avvisare Ginevra, Isabella e Ornella che eventuali modifiche alle impostazioni profilo tra il 24 maggio e l'11 giugno sono andate perse — ricontrollare e salvare di nuovo.

- **Fix "Rigenera scheda" non salvava `giorni_allenamento` su DB** (commit `9dea3aa`): prima del fix, `rigeneraSchedaDaImpostazioni` aggiornava `ST.profile.giorni_allenamento` solo in memoria locale senza scrivere su Supabase. A ogni ricarica dell'app il valore tornava a quello precedente (letto da DB), rendendo la rigenerazione inconsistente. Fix: aggiunto `UPDATE profiles SET giorni_allenamento` con gestione errore prima di chiamare `generateTrainingProgram` — se il write fallisce, la generazione non parte e l'errore appare in `#set-rigenera-msg`.

- **Redesign tab Progressione**: completamente ridisegnata secondo mockup approvato da Claude Design. Strip calendario 7 giorni scorrevole con dot workout e navigazione settimana (fix bug timezone — costruzione data locale via `getFullYear()/getMonth()/getDate()` invece di `toISOString()`). Dropdown esercizio restyled con ultimo peso/reps inline per ogni voce (richiede `loadAllExerciseNames` estesa con `reps, resistance, date`). 4 grafici selezionabili via chip row: Carico (linea + area fill), 1RM stimato (formula Epley: `peso × (1 + reps/30)`), Volume totale (`reps × resistance` somma tutti i set), Zone reps (stacked bar forza/ipertrofia/resistenza). Stat cards 2×2: Best Peso, 1RM Stim., Sessioni, Trend (delta media ultime 2 vs precedenti 2 sessioni). Card Coach insight con testo deterministico. Stato vuoto con placeholder. Commit `e0fa603` + fix timezone + CSS classes `931a3d6`.

- **Sistema audio unificato — ✅ implementato** (commit incluso nella sessione 11 giu): definiti 3 suoni semantici globali per tutti i flow di allenamento:
  - `playPrepBeep` 660Hz — tic brevi · "sta per finire" (ultimi 3–5 sec)
  - `playStopBeep` 659Hz — tono lungo 700ms · sostituisce `playFinalTripleBeep` ovunque
  - `playLongBeep` 1100Hz — tono pieno 640ms · "GO / inizia" (era 880Hz)
  - `playFinalTripleBeep` eliminata completamente
  - `playLongBeep` aggiunto dove mancava: fine countdown recupero normale, fine micro-pausa Recovery Day

**Nuovi stati ST aggiunti:**
- `trainCalStripOffset` — offset settimane strip calendario
- `trainCalSelectedDay` — giorno selezionato nella strip
- `trainProgChart` — grafico attivo (`'carico'|'1rm'|'volume'|'zone'`)
- `trainProgLastSet` — cache ultimo set per esercizio (populate da `loadAllExerciseNames`)

**Nuove funzioni aggiunte:**
- `renderCalStrip(workouts)` — strip 7 giorni scorrevole
- `renderProgChart(points, byDate, selEx)` — SVG unificato 4 modalità

**Cantiere 2 — fix UI + verifiche (11 giu 2026):**

- **Fix ordine macro Badge Giorno Perfetto** (commit `12d06ce`): la `badge-macro-row` mostrava `P·C·G` invece dell'ordine canonico Zona `C·P·G`. Corretta riga 16093 in `renderOggi`.

- **Fix macro card Piano legacy** (commit `5125f13`): corretto l'ordine Proteine↔Carboidrati nelle tile della card target in `renderPiano`/`updatePianoTargetCard`. Tecnicamente corretto ma su **codice morto** — entrambe le funzioni sono irraggiungibili con `pianoV4Enabled: true` attivo (routing punta a `renderPianoV4`). Il fix è inerte in produzione normale.

- **Card IMPOSTAZIONI·PIANO in Piano v4 verificata**: `macroLabel = ${pctC}·${pctP}·${pctF}` — già C·P·G corretto, nessun fix necessario.

- **Divisore settimana N/4 verificato**: il `6` hardcoded in Home (riga 6693) e tab Programma (riga 13032) è corretto per entrambe le schede 4 e 5 giorni. Il ciclo 4-day ha 6 posizioni tutte contate; il ciclo 5-day ha 7 posizioni ma il Rest Day (G7) viene salvato come `session_type='rest'` ed è escluso dalla query `.neq('session_type','rest')` — ogni giro produce sempre esattamente 6 record. Nessun fix necessario. Il TODO a riga 7536 è fuorviante e verrà aggiornato nel cantiere pulizia.

- **Codice morto confermato** (candidati al cantiere pulizia): `renderPiano()`, `updatePianoTargetCard()`, `generatePianoAI()` (irraggiungibili con v4 attivo); `renderStoricoLegacy()` (alias routing punta a `renderAnalisi`; contiene anche ordine macro P·C·G errato a riga 17355 ma irrilevante essendo dead code).

### 2026-06-12

**Chiuso oggi:**

- **Cantiere 3 — pulizia legacy chiuso** (passi 1–4):
  - Passo 1 (commit `f8140c9`, −49 righe): rimossi recovery timer legacy (codice morto nel modulo Training).
  - Passo 2 (commit `74f2414`, −54 righe): rimossi `renderStoricoLegacy`, `setReportRange`, CSS associato e campo ST.
  - Passo 3 (commit `50458e0`, −11 righe): rimossa `updatePianoTargetCard` (funzione orfana irraggiungibile con v4 attivo).
  - **Passo 4 (Piano v3 + feature flag + Magic Link residui + 59 console.log)** — ✅ commit `8f46576` (+ hotfix `336805d`, `1c7b936`): rimossi `renderPiano`, `generatePianoAI`, `ST.pianoV4Enabled`; puliti residui Magic Link (fallback `verifyOtp({type:'magiclink'})`, branch bootstrap hash/PKCE, `auth-callback.html`); rimossi 59 `console.log` (manualmente, chirurgicamente — vedi Lezione 11).
  - **Hook generazione scheda a fine onboarding M1** — ✅ commit `df4eaf1`: `saveOnboarding` chiama ora `generateTrainingProgram` al completamento (era rimasto manuale via `?schedaGen=1`).
  - **Commento fuorviante N/4** — ✅ commit `6973826`: il `6` hardcoded è corretto, commento aggiornato a riga 7536.

- **Fix bug generazione piano Ignazio** (commit `07105ba`):
  - **Causa**: `callAI(prompt, 2000)` — risposta Groq troncata a ~5831 caratteri per 14 pasti con ingredienti, macro e spiegazioni. JSON incompleto → `JSON.parse` crash → `validation-failed` → rollback → 0 pasti → toast errore.
  - **Fix**: `maxTokens` portato da 2000 a 4000 in `_pianoV4GenerateAndInsertMeals`. Aggiunto `try/catch` esplicito attorno a `_pianoV4F2aParseAndValidate` per catturare eccezioni impreviste.
  - Confermato: 7/7 giorni generati correttamente sul profilo Ignazio post-fix.

- **Pulsante "RIGENERA PIANO →"** (commit `d978368`): aggiunto nel tab Piano v4 con rollback automatico della riga-madre `weekly_plans` se la generazione AI pasti fallisce. Bypassa i guard `skip-day` e `skip-existing` via `forceAll: true`. ⚠️ Il postino genera per `_pianoV4NextWeekStartIso()` (settimana PROSSIMA su qualsiasi giorno tranne lunedì) — il pulsante invalida e ricarica la cache per la settimana CORRENTEMENTE VISUALIZZATA. Comportamento: genera piano settimana +1, ricarica display settimana corrente (nessun conflitto se le due settimane sono diverse).

- **Diagnostica piano Ginevra** (solo analisi, nessun fix codice):
  - Piano per `week_start='2026-06-08'` con `status='active'` confermato in DB. 14 pasti confermati in `weekly_plan_meals`.
  - week_start calcolata lato JS su venerdì 12 giugno = `'2026-06-08'` ✅ (nessun problema di timezone).
  - Nessun filtro `status` in `_pianoV4LoadRealPlanForWeek` ✅ — il piano viene trovato.
  - **Causa probabile**: `weekly_plan_meals.user_id` per le 14 righe di Ginevra ≠ `auth.uid()` di Ginevra → RLS blocca silenziosamente → `mealsRes.data = []` → `mealsByDay = {}`. Ignazio vede 14 righe via SQL Editor (service_role bypassa RLS).
  - **Bug secondario (codice)**: una volta che la cache è `{state:'loaded', plan:<non-null>, mealsByDay:{}}`, né la guardia in `renderPianoV4` (`!entry` = false) né quella interna (`existing.plan` non-null → return) consentono mai un retry. Fix da implementare (vedi debiti tecnici).
  - **Fix immediato per Ginevra**: verificare `user_id` nelle righe `weekly_plan_meals` via SQL Editor (confrontare con UUID di Ginevra da `auth.users`). Se mismatch → `UPDATE weekly_plan_meals SET user_id = <UUID Ginevra> WHERE plan_id = <id piano giu8>`. Poi hard reload app su device Ginevra.

**⚠️ DA FARE PRIMA DI DOMENICA SERA (generazione automatica settimanale):**
- ~~Fix codice cache sticky `mealsByDay={}` (riga ~19563 in `_pianoV4LoadRealPlanForWeek`).~~ ✅ commit `f7ca675`
- Verificare che tutti e 4 i tester vedano il piano domenica sera dopo la generazione automatica.
- **Ginevra**: hard reload app + verifica visibilità 14 pasti settimana 08-giu dopo eventuale UPDATE SQL user_id.
- **Isabella**: `weekly_plans` settimana 08-giu ha `status='draft'`, 0 pasti — verificare se la generazione è fallita (maxTokens) o se il profilo manca di targets.
- **Ornella**: `weekly_plans` settimana 08-giu ha `status='draft'`, 14 pasti — verificare visibilità sul device (possibile stesso bug cache o user_id mismatch).

**Cantiere aperto (collaudo in attesa):**
- ~~**Timer recupero parallelo + form log nel modal recupero**~~ ✅ commit `6125812` — collaudo in corso su device.
- **GIF esercizi nel modal recupero**: placeholder già nel mockup approvato. Cantiere separato da aprire dopo collaudo del flow `6125812`.

### 2026-06-15

**Chiuso in questa sessione:**

- **Cantiere: Doppio timer iso unilaterale** ✅

  **Sessione normale** (commit `963083f`):
  - `openTrainExec`: aggiunto `perLato` e `isoPhase:'A'` a `ST.trainExecOpen`
  - `execTimerStart`: dopo il beep di fine, se `perLato` e `isoPhase==='A'` → transizione a `'pause'` + avvio `execTimerStartPause(5)`
  - Nuova funzione `execTimerStartPause`: countdown 5s, prep beep ultimi 3s, a 0 imposta `isoPhase='B'` + long beep + rilancia `execTimerStart`
  - Render timer: label condizionale LATO SX / CAMBIO POSIZIONE (ambra) / LATO DX; pulsante "In corso…" disabilitato durante fase A e pausa
  - Esercizi coinvolti: Pallof press con elastico, Side plank, EX062/EX067/EX068 (identificati per nome o codice in `_TRAIN_GEN_UNILATERAL` + `_trainGenIsIsometric`)

  **Warm-up specifico** (commit `08dc4c2`):
  - Costanti `WARMUP_ISO_SIDE_SEC = 30` e `WARMUP_ISO_PAUSE_SEC = 5`
  - Nuova funzione `_warmupFlowInitIsoPhase()`: legge `parseRepsRange(item.reps).perLato`, imposta `isoPhase` e `remaining` sull'item corrente
  - `_warmupFlowAdvance`: gestisce transizioni `A → pause → B → avanza`; la fase `rest` chiama `_warmupFlowInitIsoPhase()` per il nuovo item
  - `_warmupFlowTick`: prep beep threshold adattivo (3s durante pausa iso, 5s altrimenti)
  - Render hero warm-up: label LATO SX / CAMBIO POSIZIONE / LATO DX, colori ambra durante pausa, progress bar `dur` corretta per fasi iso
  - `warmupFlowSkip`: `isoPhase = null` per saltare tutta la sequenza
  - Esercizi coinvolti: Glute bridge isometrico con cavigliera (unico item hardcoded con `reps:'20-30 sec per lato'` nel warm-up)

  **Test pendente** (non eseguibile senza scattare serie reali): da verificare al prossimo allenamento.

### 2026-06-13

**Chiuso in questa sessione:**

- Hook generazione scheda a fine onboarding M1 ✅ commit `df4eaf1`
- Piano v3 + `pianoV4Enabled` rimossi ✅ commit `8f46576`
- Magic Link residui rimossi ✅ commit `8f46576`
- `console.log` rimossi (59) ✅ commit `8f46576` + hotfix `336805d`, `1c7b936`
- Commento fuorviante N/4 ✅ commit `6973826`
- Sistema audio unificato ✅ già implementato (nota errata in CLAUDE.md)
- Timer recupero parallelo + form log nel modal recupero ✅ commit `6125812` — collaudo in corso
- Beep avvio serie + unlock audio iOS ✅ commit `b37a543` — collaudo in corso
- No countdown recupero dopo ultima serie ✅ commit `c9886f5`
- Sessione non si chiude automaticamente dopo ultima serie → Tabata accessibile ✅ commit `abeae13`
- `PULL_UP_EXERCISE_NAME` → `'Trazioni'` allineato al nome esatto in `esercizi_catalog` ✅ commit `e9f2b61`
- Progressione Pump: mantieni reps invece di scendere con RIR 0 ✅ commit `6c4b55b`
- Beep fine step warm-up specifico ✅ commit `b37a543`
- Fix cache sticky `_pianoV4LoadRealPlanForWeek`: se `plan` non-null ma `mealsByDay` vuoto → retry dal DB ✅ commit `f7ca675` — verifica tester (Ginevra, Ornella, Isabella) in sospeso

**Lezione emersa in questa sessione:**

- Rimozione `console.log` solo manuale e chirurgica, mai con script automatico su file monolite — rischio alto di rompere log multi-riga e codice adiacente. (dettaglio completo: Lezione 11)

### 2026-06-10

**Chiuso oggi:**

- **Revisione completa catalogo esercizi**: tutti i 122 esercizi (EX001–EX131) revisionati su CSV. Compilati i campi `zone_rischio`, `adattamento`, `alternativa`, `nota_sicurezza` portandoli a 122/122. Aggiunte le due nuove colonne `esecuzione_surrogato` ed `errori_surrogato`: compilate per tutti i 16 esercizi con `surrogato_attrezzo` popolato. CSV aggiornato reimportato nel Google Sheet e sincronizzato su Supabase (dopo ALTER TABLE per aggiungere le due nuove colonne — vedi sezione DB). Il bug "esecuzione versione bilanciere mostrata per surrogato elastico" è ora risolto a monte nel catalogo.

- **Nuovo esercizio EX132 — Goblet squat**: aggiunto nel Google Sheet e sincronizzato su Supabase. Compound `dominante ginocchia`, `attrezzo: elastico;maniglie;manubrio;corda doppia`, `luogo: casa;libero;palestra`, `livello: intermedio`, `uso: principale`. Risolve il problema squat corpo libero senza progressione in sessioni Forza per utenti casa con elastici + maniglie.

- **FIX generatore — Pike push-up duplicato cross-sessione (Upper A / Upper B)**: aggiunta regola post-generazione che rileva se lo stesso codice esercizio compare come compound per lo stesso pattern (`spinta verticale`) sia in Upper A che in Upper B. In quel caso lo rimuove da Upper B (occurrenceIdx 1). Upper B rimane senza compound `spinta verticale` se il pool ha un solo candidato — nessuna sostituzione forzata.

- **FIX generatore — Squat corpo libero puro in sessione Forza**: aggiunta costante `_ATTREZZI_CON_CARICO` che verifica se almeno uno degli attrezzi dell'esercizio è un attrezzo con carico (`elastico`, `manubri`, `bilanciere`, `kettlebell`, `maniglie`, `corda doppia`, `barra modulare`) presente nel kit utente. Se `resolvedType === 'Forza'` e `pattern === 'dominante ginocchia'` e nessun attrezzo con carico nel kit → il candidato viene scartato e il pick viene rilancato escludendo il codice da `usedSoFar`. Con EX132 nel catalogo il secondo pick trova Goblet squat (ha elastico+maniglie, presenti nel kit Ignazio).

- **EX045 Wall squat con fitball — riclassificazione**: `uso` cambiato da `principale` a `recupero` nel Google Sheet e sincronizzato. Motivazione: esercizio isometrico di stabilità/riabilitazione, non ha progressione di carico — non appartiene al pool compound Forza/Ipertrofia.

- **EX015 Affondi — aggiornamento attrezzo**: aggiunto `elastico;maniglie` al campo `attrezzo` (era solo `corpo libero`). Ora la FIX 2 del generatore lo riconosce come esercizio con carico per utenti casa con elastici.

**Pendente (da fare nella prossima sessione Sheet → sync):**
- EX045: cambiare `uso` da `principale` a `recupero`
- EX015: aggiungere `elastico;maniglie` ad `attrezzo`
- Poi rigenerare scheda Ignazio e verificare con `ztSchedaWhy({giorni:4})`

### 2026-06-09

**Chiuso oggi:**

- **Equipment coach-driven (sessione 9 giu 2026)**: Aggiunta costante `_TRAIN_GEN_EQ_PRIORITY` (mappa `{ambiente → {compound|iso → [priorità attrezzi]}}`) e funzione `_trainGenPickEq`. Il generatore sceglie ora UN SOLO attrezzo per esercizio al momento della generazione, scorrendo la lista priorità e prendendo il primo che l'utente possiede. Campo `eq` nel JSON scheda = stringa singola (es. `"elastico"`, `"panca+elastico"`). `_trainGenMapToSession` estesa con parametri `tipoAllen` + `attrezzaturaSet`. `buildCoachPrompt` riceve terzo parametro `attrezzoSessione` → prompt AI adattato all'attrezzo specifico. Rigenerazione scheda obbligatoria dopo deploy.
- **Bug residuo eq surrogato**: EX002 Distensioni su panca — `setup` corretto (usa `nota_surrogato`), ma `execution` e `commonErrors` restano versione bilanciere. Fix richiede due nuove colonne catalogo: `esecuzione_surrogato` e `errori_surrogato`. Da implementare nella sessione dedicata al catalogo.
- **Reset mesociclo**: `train_start_date = 2026-06-08` → la Settimana 1 del blocco riparte da Upper A lunedì 8 giugno.
- **Recuperi corretti per letteratura**: valori `rest_sec` aggiornati su tutti gli obiettivi e livelli per iso, iso_isometrico e compound, secondo Schoenfeld e Israetel. I recuperi ora variano in modo coerente con l'intensità e il tipo di esercizio.
- **RIR nascosto su isometrici**: la pill RIR non compare sulla card esercizio né nell'anteprima sessione quando `reps` termina in `sec` (esercizi isometrici/timed).
- **Timer countdown isometrici**: picker a step di 5s (range `repsMin-5` → `repsMax+15`) + countdown a schermo + `playLongBeep` all'avvio del timer. L'utente sceglie la durata target prima di partire.
- **Audio unificato**: prep beep 3..1 su isometrici, 5..1 su recupero; `playLongBeep` su ripartenza serie, activation flow, recovery flow, Tabata work→rest. Audio coerente in tutta la sessione.
- **Banner surrogato nel modal ⓘ**: quando un esercizio è la versione casalinga di un esercizio palestra (`isSurrogato: true`), il modal mostra sotto il titolo `⚠ Versione adattata · [ATTREZZO]` con classe `ex-surrogato-note`. Commit `8d26dea`.
- **`giorni_allenamento = 5` forzato via SQL**: il salvataggio dall'app non funzionava (bug non ancora investigato); valore impostato direttamente su Supabase per sbloccare il collaudo split 5 giorni.

**On the horizon (aperti):**

- ~~**Attrezzo per sessione (coach-driven)**~~ ✅ Implementato 9 giu 2026 (commit `e945aad`). `_TRAIN_GEN_EQ_PRIORITY` + `_trainGenPickEq` + `buildCoachPrompt` esteso. Rigenerare scheda per applicare.
- ~~**Catalogo esercizi — revisione completa**~~ ✅ Completato 10 giu 2026. Tutti i 122 esercizi revisionati, colonne `esecuzione_surrogato`/`errori_surrogato` aggiunte e compilate per i 16 esercizi con surrogato.
- **Salvataggio `giorni_allenamento` dall'app**: il campo non si salva correttamente dall'onboarding/impostazioni. Da investigare (regressione o bug storico).
- ~~**Cantiere "Doppio timer iso unilaterale"**~~ ✅ Implementato 15 giu 2026 (commit `963083f` sessione normale + `08dc4c2` warm-up). Test live pendente (primo allenamento utile).

---

## Tester attivi

- **Ignazio** (utente principale + dev) — iPhone + Android
- **Ginevra** — iPhone e/o iPad
- **Isabella** — Android + iPad (variante pescetariana)
- **Ornella** — dispositivo da verificare

Messaggio WhatsApp inviato 11 mag 2026 a Ginevra e Isabella per riattivazione con richiesta di costanza nei log e feedback strutturato per 2 settimane.


## Servizi esterni

| Servizio | URL | Scopo |
|---|---|---|
| Cloudflare Worker | `zona-ai.ignaziof23.workers.dev` | Proxy verso Groq API (llama-3.3-70b-versatile) |
| Supabase | `https://qxiyeiahpoiliwpqslpr.supabase.co` | Database + Auth |

### Free tier limits dei servizi usati (verificati maggio 2026)

**Supabase Free Plan**
- Database: 500 MB
- File storage: 1 GB
- Bandwidth (egress): 5 GB/mese
- Utenti attivi: 50.000/mese
- Edge Functions: 500.000 invocations/mese
- Max progetti free: 2 per organizzazione
- Pause dopo 7 giorni inattività (si sveglia al primo accesso)
- Uso commerciale consentito sul free tier
- Upgrade a Pro: $25/mese (8 GB DB, 100K MAU, 100 GB storage, no pause, backup 7 giorni)

**Cloudflare Workers Free Plan**
- 100.000 requests/giorno
- 10ms CPU/request
- KV storage incluso
- Workers AI: 10.000 Neurons/giorno (~5.000-10.000 generazioni immagini con Stable Diffusion)
- Forever free, no scadenza, uso commerciale OK

**Groq Free Tier**
- `llama-3.3-70b-versatile` (modello attualmente usato): 30 RPM / 6.000 TPM / 1.000 RPD
- `llama-3.1-8b-instant`: 14.400 RPD (10x più permissivo)
- Solo text generation, no image generation
- Reset al midnight UTC
- Per image generation usare Cloudflare Workers AI

## Autenticazione

**Metodo attuale: OTP a 6 cifre via email** ✅ migrazione completata aprile 2026

Migrazione Magic Link → OTP completata aprile 2026:
- Commit principale `1bada62` — `feat: login OTP a 6 cifre — addio Magic Link, funziona in PWA su iOS/Android/tutti`
- Fix successivo `364dd83` — `fix: OTP accetta 6-8 cifre, rimuove limite rigido a 6`

Flusso:
1. Utente inserisce email → `signInWithOtp({ email, options: { shouldCreateUser: true } })`
2. Supabase invia email con codice a 6 cifre (NON un link)
3. Utente inserisce il codice nella PWA → `verifyOtp({ email, token, type: 'email' })`
4. Login completato direttamente nella PWA, senza uscire dall'app ✅

**Residui Magic Link** — ✅ rimossi (commit `8f46576`, 12 giu 2026): fallback `verifyOtp({type:'magiclink'})`, branch bootstrap hash/PKCE, `auth-callback.html`, commento obsoleto riga 8626.

**Rate limit Supabase:** durante i test intensivi si può raggiungere il limite OTP. Aspettare 1 ora per il reset.

## Admin panel (`dashboardzona.html`)

File separato per il monitoraggio in tempo reale dei tester. Solo lettura — nessuna modifica/cancellazione dati Supabase.

**URL pubblico:** https://ignaziof321621.github.io/benessere-forma/dashboardzona.html

**Accesso**
- Auth Supabase OTP a 6 cifre (riusa stesso flusso e stesso client di `zona-tracker.html`)
- Email gate: solo `ignazio.f@me.com` può procedere oltre il login. Altre email → schermata "Accesso non autorizzato" + logout.
- `signInWithOtp` chiamato con `shouldCreateUser: false` (l'admin non crea utenti).

**Funzioni implementate**

Schermata 1 — Home dashboard:
- "Oggi": stat tiles con N° utenti attivi oggi, N° pasti totali oggi, N° integratori totali oggi
- "Tester": lista cliccabile di tutti gli utenti in `profiles`, ordinata per ultimo accesso (più recente in cima). Pallino verde (≤2h), ambra (oggi non recente), grigio (inattivo). Riepilogo "X pasti oggi · ultimo accesso Y fa".
- "Uso moduli (ultimi 7 giorni)": bar chart CSS pure con % giorni distinti con almeno 1 log nel periodo. Modulo Training letto da `workouts`. Modulo Body letto da `body_logs`. Fallback "nessun dato" se la tabella è vuota o non accessibile.
- Bottone "Aggiorna" + timestamp ultima sincronizzazione.

Schermata 2 — Dettaglio utente:
- Profilo: dieta, obiettivo, sesso, età, altezza, peso, peso obiettivo, attività, inizio training, intolleranze (tags), note salute, ultimo accesso (in italiano: "2 ore fa" / "ieri" / "3 giorni fa")
- Card Calorie oggi nel dettaglio utente (consumate vs `target_kcal` con barra progresso) + macro (proteine/carbo/grassi) con barre individuali, formattazione numeri italiana
- Bar chart pasti ultimi 7 giorni (etichette Lun/Mar/... con giorno corrente evidenziato)
- Ultimi 10 pasti: ora · slot · descrizione · kcal
- Ultimi 10 integratori: ora · slot · nome
- "← Torna" per tornare alla home.

**Stack tecnico admin**
- HTML/CSS/JS vanilla single-file, niente framework, niente build step
- Stesso Supabase client JS (`https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2`)
- Font system-ui (no Syne/JetBrains — stile pragmatico admin)
- Palette neutra: sfondo bianco `#FFFFFF`, ink `#1A1A1A`, ink-soft `#666666`, line `#E5E5E5`, verde attivo `#16A34A`, ambra `#D97706`, rosso `#DC2626`
- Mobile-first responsive (max-width 920px desktop). Touch target ≥44px.

**Sicurezza**
- Nessuna `.insert()`, `.update()`, `.delete()` su tabelle dati nel codice admin (solo `.signOut()` su auth)
- Email check `user.email !== ADMIN_EMAIL` → unauthorized screen + logout. Hardcoded `ADMIN_EMAIL = 'ignazio.f@me.com'`.
- Anon key Supabase identica a `zona-tracker.html` (chiave pubblica, sicura da esporre — la sicurezza dipende dalle policy RLS).

**Schema `profiles`**: PK = `id` (coincide con `auth.users.id`), non `user_id`. Altre tabelle dati (`meals`, `supplements_log`, `workouts`, `body_logs`, `training_logs`, `supplements`, `fasting_days`) usano FK `user_id`.

**⚠️ RLS Supabase — policy admin necessarie**

Le policy attuali (`auth.uid() = user_id` su tutte le tabelle) permettono a Ignazio di vedere solo i propri dati. Per leggere i dati di Ginevra e Isabella servono policy aggiuntive admin. Da eseguire in Supabase SQL Editor:

```sql
-- profiles
CREATE POLICY "admin_read_all_profiles"
ON public.profiles FOR SELECT TO authenticated
USING ((auth.jwt() ->> 'email') = 'ignazio.f@me.com');

-- meals
CREATE POLICY "admin_read_all_meals"
ON public.meals FOR SELECT TO authenticated
USING ((auth.jwt() ->> 'email') = 'ignazio.f@me.com');

-- supplements_log
CREATE POLICY "admin_read_all_supplements_log"
ON public.supplements_log FOR SELECT TO authenticated
USING ((auth.jwt() ->> 'email') = 'ignazio.f@me.com');

-- workouts
CREATE POLICY "admin_read_all_workouts"
ON public.workouts FOR SELECT TO authenticated
USING ((auth.jwt() ->> 'email') = 'ignazio.f@me.com');

-- body_logs
CREATE POLICY "admin_read_all_body_logs"
ON public.body_logs FOR SELECT TO authenticated
USING ((auth.jwt() ->> 'email') = 'ignazio.f@me.com');
```

Finché queste policy non sono in Supabase, l'admin vede solo i dati di Ignazio (le altre row sono filtrate via RLS). La schermata mostrerà un solo tester e i contatori "oggi" risulteranno bassi.

**Cosa NON è implementato** (volutamente fuori scope di questa fase):
- Tracking dell'effettivo "login" utente (Supabase non espone `last_sign_in_at` via client SDK con anon key) — `ultimo accesso` è approssimato dal max timestamp tra `meals` / `supplements_log` / `workouts` / `body_logs`.
- Lettura email tester diversi da Ignazio — l'email è in `auth.users`, non accessibile via anon key. Il nome utente è derivato da `profiles.name` / `full_name` / `first_name` se presente, altrimenti `Utente <uuid-corto>`.
- Cross-tab refresh automatico, notifiche push admin
- Export dati / report CSV
- Filtri per range temporale custom (fisso a oggi + ultimi 7 giorni)

## Bootstrap auth (`zona-tracker.html`)

Il bootstrap (in fondo al file, dentro `setTimeout(..., 1800)`) gestisce questi casi in ordine:
1. `?test=1` → modalità test locale
2. Hash con `#access_token=...&refresh_token=...` → flusso implicito
3. Query param `?code=...` → flusso PKCE
4. `getSession()` → sessione esistente
5. Nessuna sessione → mostra schermata auth
6. `onAuthStateChange` → ascolta eventi SIGNED_IN / SIGNED_OUT / TOKEN_REFRESHED
7. `visibilitychange` → polling sessione quando la PWA torna in foreground + **re-fetch dati cross-device** se utente loggato e throttle 30s superato (vedi `ST.lastRefreshAt` e `refreshInBackground`)

## Schema Supabase

### Tabella `meals`
**Schema reale verificato su Supabase 22 mag 2026** (sostituisce documentazione precedente):

| Colonna | Tipo | Note |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` NOT NULL | FK → auth.users |
| `date` | `date` NOT NULL | YYYY-MM-DD |
| `time` | `text` | HH:MM |
| `slot` | `text` | `colazione / snack_mattina / pranzo / snack_pomeriggio / cena / extra` |
| `description` | `text` NOT NULL | **nome cibo / descrizione pasto — colonna autoritativa per il nome.** NON esistono `name` o `food_name` |
| `kcal` | `numeric(6,1)` | totale pasto (decimali OK dopo migrazione mag 2026) |
| `protein / carbs / fat` | `numeric(5,1)` | grammi totali pasto |
| `notes` | `text` | nullable |
| `created_at` | `timestamptz` | default `now()` |

RLS abilitata — policy: `auth.uid() = user_id`.

### Tabella `nutrilite_catalog`
64 prodotti reali pre-inseriti (Nutrilite + Bodykey + XS Sports), aggiornati una tantum via sync Google Sheet. RLS SELECT pubblica. Nessun `user_id`. Colonne usate dal catalogo v3: `codice` (PK logica), `nome`, `linea` (Nutrilite/Bodykey/XS Sports), `categoria` (16+ valori reali — vedi `CATEGORY_TO_TINT`), `confezione`, `dose_die`, `dose_unit`, `kcal`, `carbo`, `proteine`, `grassi`, `prezzo_partner`, `costo_mensile_partner`, `costo_dose_partner`.

### Tabella `esercizi_catalog` (27 maggio 2026)
Catalogo esercizi verificati per il futuro coach generatore di schede Training. Stesso pattern di `nutrilite_catalog`: nessun `user_id`, RLS SELECT pubblica (`using(true)`), nessuna scrittura da client (popolata solo via sync service-role). PK logica = `codice`.

| Colonna | Tipo | Note |
|---|---|---|
| `codice` | `text` PK logica | identificativo univoco esercizio (es. `TRAZ-BANDA`, `CHEST-EL-IN-PIEDI`) |
| `nome` | `text` | nome leggibile, in italiano |
| `pattern` | `text` | pattern motorio. **Vocabolario del Google Sheet** (con spazi/accenti: "spinta orizzontale", "spinta verticale", "tirata orizzontale", "tirata verticale", "dominante ginocchio"/"dominante ginocchia", "dominante anca", "core", "isolamento", "mobilita", `cardio_metabolico` dal 28 mag, **`loaded carry`** dal 31 mag — farmer walk/suitcase/overhead/turkish get-up). Il codice normalizza via `_normPattern()` (lowercase + trim) prima di confrontare — vedi "Opzione 3" 28 mag: è il codice che si adegua alle parole del foglio, NON il foglio che deve usare gli underscore |
| `gruppo_target` | `text` NULL | **(29 mag)** dimensione semantica per pescare gli ISOLAMENTI per gruppo muscolare specifico. **Vocabolario chiuso**: iso muscolari `bicipiti` `tricipiti` `deltoidi laterali` `deltoidi posteriori` `ischiocrurali` `polpacci` `glutei` `avambracci` `trapezi` + **(31 mag, catalogo 123)** `quadricipiti` `petto` `dorsali` `deltoidi anteriori` `cuffia rotatori`; core `core anti-estensione` (Plank, Dead bug, Hollow hold, Plank fitball) e `core anti-rotazione` (Pallof press, Bird dog, Side plank, Stir the pot). VUOTO per i compound (pattern motori) E per gli esercizi di mobilità Lower (EX117/119/120 → pescati per MUSCOLI, non per gruppo_target — vedi `_trainGenPickWarmupByMuscle`). ⚠️ **ANTI-PATTERN**: NON dedurre il gruppo target parsando la colonna `muscoli` (testo libero) — il vocabolario differisce (es. `ischiocrurali` nel Sheet vs `femorali/hamstring` letterario; "deltoide laterale" non compare MAI nei muscoli scritti). Serve QUESTA colonna dedicata, compilata a mano nel foglio. **NB nuovi gruppo_target 31 mag**: `quadricipiti/petto/dorsali/deltoidi anteriori` sono ammessi SOLO come bonus (`_TRAIN_GEN_BONUS_BY_MACRO`), MAI obbligatori (già coperti dai compound); `cuffia rotatori` è prehab warm-up Upper, non isolamento di lavoro |
| `attrezzo` | `text` | `elastico`, `manubri`, `bilanciere`, `panca`, `sbarra`, `kettlebell`, `corpo libero` (con SPAZIO, non underscore — vedi Leva A 28 mag), `fitball`, `trx`, ecc. Lista separata da `;` |
| `luogo` | `text` | `casa`, `palestra`, `aperto`/`libero` (alias equivalenti — vedi Leva A), `qualsiasi`. Lista separata da `;` |
| `muscoli` | `text` | lista muscoli target separati da `;` |
| `livello` | `text` | principiante, intermedio, avanzato (o lista separata da `;`) |
| `zone_rischio` | `text` | tag IDENTICI all'onboarding M1 (`lombare;cervicale;spalle;gomiti;polsi;anche;ginocchia;caviglie;ernie;cardiovascolari;ipertensione`) separati da `;`. Vuoto = nessuna controindicazione |
| `adattamento` | `text` | come ADATTARE l'esercizio per le zone a rischio (es. "rom ridotto, niente iperestensione") |
| `alternativa` | `text` | `codice` dell'esercizio sostitutivo se l'adattamento non basta |
| `setup` | `text` | posizione iniziale + attrezzatura (1 frase) |
| `esecuzione` | `text` | step movimento separati da `;` |
| `errori` | `text` | errori comuni separati da `;` |
| `nota_sicurezza` | `text` | warning opzionale (es. "scapole basse e indietro, no scrollare") |
| `uso` | `text` | (27 mag sera, PARTE 5) valori separati da `;`: `principale` / `finisher` / `recupero` + **(31 mag, catalogo 123)** `riscaldamento` (warm-up/prehab → `poolRiscaldamento`), `mobilita` (recuperi G3/G6, ancora non usato dal generatore), `carry` (loaded carry; `carry;finisher` = farmer/suitcase → `poolCarry`, `carry` da solo = overhead/get-up esclusi). ⚠️ **i bonus iso pescano SOLO da `principale`**: un isolamento marcato solo `finisher` (es. EX099/EX100) NON entra come bonus |
| `surrogato_attrezzo` | `text` | (28 mag) attrezzatura casalinga alternativa con cui eseguire un esercizio "da palestra" a casa, lista separata da `+` (es. `panca+elastico`). Se popolato E l'utente si allena a casa E possiede TUTTI gli attrezzi del surrogato → l'esercizio diventa disponibile come **surrogato** (flag `_surrogato` nel pool, `isSurrogato` nell'oggetto sessione). ⚠️ **Va sulla riga GIUSTA**: bug 31 mag — il surrogato elastico del suitcase carry era erroneamente su EX088 Farmer walk invece che su EX089 Suitcase carry → a casa-elastici entrava il farmer (bilaterale, non surrogabile a elastico) invece del suitcase. Il farmer NON ha surrogato elastico sensato; il suitcase sì (elastico ancorato di lato, una mano, da fermo) |
| `nota_surrogato` | `text` | (28 mag) come eseguire la versione surrogata casalinga (es. "usa l'elastico ancorato in basso al posto del bilanciere"). Mostrata come avviso nella card quando l'esercizio è servito come surrogato |
| `esecuzione_surrogato` | `text` NULL | **(10 giu 2026)** step di esecuzione specifici per la versione casa con attrezzo surrogato, separati da `;`. Compilato SOLO per esercizi con `surrogato_attrezzo` popolato. Sostituisce `esecuzione` nella card quando `isSurrogato: true`. |
| `errori_surrogato` | `text` NULL | **(10 giu 2026)** errori comuni specifici della versione surrogato, separati da `;`. Stessa condizione di `esecuzione_surrogato`. |
| `updated_at` | `timestamptz` | gestito da sync, default `now()` |

**ALTER TABLE 10 giu 2026**: `ALTER TABLE esercizi_catalog ADD COLUMN esecuzione_surrogato text, ADD COLUMN errori_surrogato text;` — eseguito su Supabase SQL Editor prima della sync per permettere la propagazione delle due nuove colonne dal Google Sheet.

**Seme attuale (aggiornato 10 giu 2026): 123 esercizi (codici `EX001`…`EX132`)**
EX132 = Goblet squat (compound `dominante ginocchia`, casa/libero/palestra, elastico+maniglie+manubrio+corda doppia, intermedio). Aggiunto il 10 giu 2026 per risolvere il problema squat corpo libero puro in sessioni Forza utenti casa. **EX132 precedente** (cat-cow doppione eliminato 31 mag) è stato riutilizzato per questo esercizio.

**Seme storico (1 giu 2026): 122 esercizi (codici `EX001`…`EX131` — doppione cat-cow EX132 eliminato 31 mag sera)** — catalogo riorganizzato ad ALBERO (pattern → varianti) e ampliato da 70 a 122, sincronizzato da Ignazio dal Google Sheet. **9 doppioni-attrezzo FUSI** nelle madri (codici eliminati: EX004→EX002, EX005/EX007→EX006, EX010→EX009, EX012→EX011, EX014→EX013, EX020→EX018, EX025→EX024, EX056→EX055). Aggiunti: pattern `loaded carry` (EX088 farmer, EX089 suitcase, EX090 overhead, EX091 turkish get-up); nuovi isolamenti (EX094 Prone Y-W, EX097 Leg extension/quadricipiti, EX098 Croci/petto, EX099 Pull-over/dorsali, EX100 Alzate frontali/deltoidi anteriori, EX101 cuffia rotatori); warm-up/mobilità (EX117-122 riscaldamento, EX123-131 recupero/mobilità incl. foam roll EX129/130, passive hang EX131; EX132 cat-cow doppione eliminato); compound aggiuntivi (push press EX075, good morning EX085, kettlebell swing EX084, pistol EX083, front squat EX081, ecc.); cardio Tabata (box jump EX112, broad jump EX113, burpee EX054). ⚠️ **Il generatore NON usa il `codice` per pescare** (lavora su pattern/gruppo_target/attrezzo/uso) → i 9 codici fusi non rompono nulla; le schede storiche `schede_utente` sono name-based e self-contained. **Storia precedente (≤70 esercizi)**: 30 iniziali (27 mag) → +3 (`EX031` Mountain climber, `EX032` Hollow hold, `EX033` Step-up, 27 mag sera PARTE 5) → +14 nuovi principali `EX034`-`EX047` (28 mag) → +7 cardio Tabata `EX048`-`EX054` (28 mag, `pattern=cardio_metabolico`, `uso=finisher`, basso impatto articolare). **+16 isolamenti `EX055`-`EX070` (29 mag)** per dare al generatore un isolamento per ogni gruppo muscolare piccolo: 3 deltoidi laterali, 2 deltoidi posteriori, 2 bicipiti, 2 tricipiti, 1 ischiocrurali, 2 polpacci, 2 glutei, 1 avambracci, 1 trapezi. Storia: 30 iniziali (27 mag) → +3 (`EX031` Mountain climber, `EX032` Hollow hold, `EX033` Step-up, 27 mag sera PARTE 5) → +14 nuovi principali `EX034`-`EX047` (28 mag) → +7 cardio Tabata `EX048`-`EX054` (28 mag, `pattern=cardio_metabolico`, `uso=finisher`, basso impatto articolare). **+16 isolamenti `EX055`-`EX070` (29 mag)** per dare al generatore un isolamento per ogni gruppo muscolare piccolo: 3 deltoidi laterali, 2 deltoidi posteriori, 2 bicipiti, 2 tricipiti, 1 ischiocrurali, 2 polpacci, 2 glutei, 1 avambracci, 1 trapezi. Riclassificazioni: `EX031`→`cardio_metabolico` (28 mag); **`EX030` Band pull-apart** `mobilita`→`isolamento`, `recupero`→`principale`, `gruppo_target=deltoidi posteriori` (29 mag); **`EX043` Leg curl fitball** `dominante anca`→`isolamento`, `gruppo_target=ischiocrurali` (29 mag); **`EX032` Hollow hold** `uso`: `finisher`→`principale;finisher` (29 mag). Gli 8 esercizi core (`EX021/EX022/EX023/EX032/EX036/EX037/EX042/EX046`) hanno ricevuto `gruppo_target` (Pallof/Bird dog/Side plank/Stir the pot = anti-rotazione; Plank/Dead bug/Hollow/Plank-fitball = anti-estensione). **Totale isolamenti con `gruppo_target` popolato: 23** (post-sync 29 mag). Include i 4 esercizi storici di Ignazio (trazioni banda, chest/shoulder/row elastico). Da ampliare nel tempo.

**Copertura isolamenti per gruppo_target** (post-sync 29 mag, pool `uso=principale`):

| gruppo_target | esercizi |
|---|---|
| deltoidi laterali | EX055, EX056, EX057 |
| deltoidi posteriori | EX030, EX058, EX059 |
| bicipiti | EX024, EX025, EX060, EX061 |
| tricipiti | EX026, EX027, EX062, EX063 |
| ischiocrurali | EX043, EX064 |
| polpacci | EX028, EX065, EX066 |
| glutei | EX067, EX068 |
| avambracci | EX069 |
| trapezi | EX070 |
| core anti-estensione | EX021 Plank, EX022 Dead bug, EX042 Plank fitball (+ EX032 Hollow hold solo se `uso` include `principale`) |
| core anti-rotazione | EX023 Pallof, EX036 Bird dog, EX037 Side plank, EX046 Stir the pot |

**Sorgente**: Google Sheet dedicato `esercizi_catalog` (ID `1kEaq1SNsd5pY66p2JkFJCfBaPLtCMCk-2an3z4w9mo8`), scheda `esercizi_catalog`.

**Sync**: Google Apps Script DEDICATO e SEPARATO da quello Nutrilite — funzione `syncEsercizi`, UPSERT `on_conflict=codice` via service_role. Lanciato a mano da Ignazio quando aggiorna il catalogo (menu nativo "Sync Esercizi" nel foglio, popup risultato). Opzione futura: integrare nel sync esistente; per ora separato per sicurezza.

### Tabella `schede_utente` (28 maggio 2026)
Contenitore JSON della scheda di allenamento generata dal coach per un utente. Approccio **JSON unico** (NON multi-tabelle relazionali), coerente con `weekly_plan_meals.ingredients`/`profiles.piano_ai`. Le statistiche di progressione restano in `workout_sets`/`training_logs` (relazionali, intatte).

| Colonna | Tipo | Note |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` NOT NULL | FK → `auth.users` |
| `blocco_n` | `integer` NOT NULL | numero progressivo del blocco (~4 settimane), per la varietà inter-blocco |
| `scheda` | `jsonb` NOT NULL | intera scheda: `{ meta:{...}, sessioni:[ {id, name, type, rir, label, rest, exercises:[...], finisher?:{...}} ] }` |
| `attiva` | `boolean` NOT NULL | default `false`. Quale scheda l'app deve leggere |
| `created_at` | `timestamptz` NOT NULL | default `now()` |

**Muro DB anti-doppia-attiva**: indice UNIQUE PARTIAL `uq_schede_utente_una_attiva` su `(user_id) WHERE attiva = true` → max 1 scheda attiva per utente garantito dal DB. Salvataggio (`_trainGenSaveToDB`): prima `UPDATE schede_utente SET attiva=false WHERE user_id=? AND attiva=true`, poi INSERT della nuova con `attiva=true`. RLS: 4 policy `own_*` (auth.uid() = user_id).

**Lettura dall'app** (Mossa 3): `loadActiveScheda()` popola `ST.userTrainingSessions` (mappa `sessionId→session`) + `ST.userSessionCycle` (array ordinato). I 4 helper unificati `getTrainingSession(sid)` / `getAllTrainingSessions()` / `getSessionCycle()` (+ `findExInAllSessions`) leggono dalla scheda utente se presente, **fallback automatico su `TRAINING_SESSIONS` hardcoded** se nessuna scheda. ⚠️ Dentro questi helper i riferimenti DEVONO restare `TRAINING_SESSIONS`/`SESSION_CYCLE` originali — sostituirli col nome dell'helper stesso causa ricorsione infinita → stack overflow → pagina bianca (bug rilevato e fixato post-deploy Mossa 3, vedi changelog 28 mag).

### Tabella `profiles`
Dati utente: `height_cm`, `weight_kg`, `goal_weight_kg`, `target_kcal/protein/carbs/fat`, `sex`, `age`, `activity_level`, `train_start_date` (opzionale).

**Campi coach Tab Piano v4** (aggiunti 20 maggio 2026):
- `plan_generation_day` text NOT NULL default `'sun'` — **CHECK constraint `profiles_plan_day_check` ammette SOLO `'fri'/'sat'/'sun'`** (verificato 22 mag durante collaudo Step E: `UPDATE … SET plan_generation_day='thu'` viene rifiutato dal DB). Quando il Worker AI genera il piano settimanale. **Nota design vs DB**: la documentazione design 19 mag prevedeva un quarto valore `'custom'` per scelta libera del giorno, ma il CHECK in produzione **NON lo include** — quando arriverà l'onboarding M1 esteso (priorità #6) il vincolo dovrà essere esteso prima di esporre l'UI.
- `plan_generation_time` text NOT NULL default `'20:00'` — formato HH:MM (validato lato client)
- `weight_tracking_mode` text NOT NULL default `'flexible'` — CHECK `daily/every3/weekly/flexible` — preferenza pesate Livello 1

Default applicati automaticamente a tutte le righe esistenti via ALTER ADD COLUMN NOT NULL DEFAULT. UI per modificarli verrà aggiunta nel modal Impostazioni profilo nella sessione "Refresh onboarding M1" (post Tab Piano v4 V1, vedi priorità #6).

**Lettura dal codice**: `plan_generation_day` e `plan_generation_time` vengono letti per la prima volta da Step E (welcome overlay) — funzione `_pianoV4ComputeAutoWelcomeStatus` in `_pianoV4MaybeAutoWelcome`. Mappa `_PLAN_DAY_MAP` traduce abbreviazioni 3 lettere → `Date.getDay()` (0=dom..6=sab). Valori non in `{fri,sat,sun}` (es. eventuale `'custom'` futuro o seed inatteso) → fallback `'sun'` con commento esplicativo nel codice.

### Tabella `supplements`
Integratori per user_id, editabili inline.

### Tabella `supplements_log`
**Schema reale aggiornato 22 mag 2026 pomeriggio (migration 8 colonne applicata da Ignazio)**:

| Colonna | Tipo | Note |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` NOT NULL | FK → auth.users |
| `date` | `date` NOT NULL | YYYY-MM-DD |
| `slot` | `text` | HH:MM dello slot di assunzione |
| `supplement_name` | `text` NOT NULL | **nome integratore — colonna autoritativa** |
| `taken` | `boolean` | true=assunto, false=registrato ma non spuntato |
| `is_extra` | `boolean` | true=registrato come EXTRA; false=integratore standard di pacchetto |
| `supplement_codice` | `text` | codice prodotto catalogo (es. `XS-PROT-BAR-CHOCO`) — popolato solo per extras dal modulo Integratori |
| `dose` | `numeric` | quantità (es. 0.5 = mezza barretta). NULL su righe pre-migration |
| `dose_unit` | `text` | es. `cps`, `barretta`, `stick`. NULL su righe pre-migration |
| `kcal` | `numeric` | snapshot kcal totali (dose ×). NULL su righe pre-migration → fallback runtime via `nutrilite_catalog` |
| `carbo` / `proteine` / `grassi` | `numeric` | snapshot macro totali in grammi. NULL su righe pre-migration → fallback runtime |
| `costo` | `numeric` | snapshot costo dose (€). NULL su righe pre-migration |
| `created_at` | `timestamptz` | default `now()` |

UNIQUE constraint su `(user_id, date, supplement_name)` — aggiunto aprile 2026 dopo cleanup duplicati.

**Storia migration**: la documentazione 18 mag (Step 2 Integratori) descriveva queste 8 colonne come applicate, ma la SQL non era stata eseguita fino al 22 mag pomeriggio. Quindi:
- Righe pre-22 mag: hanno solo le prime 7 colonne valorizzate. `supplement_codice/dose/dose_unit/kcal/carbo/proteine/grassi/costo` = NULL.
- Righe post-22 mag: snapshot completo immutabile salvato al momento dell'insert da `dbInsertExtraLog`.

**Strategia macro extras — snapshot con fallback** (Step D.3, 22 mag pomeriggio):
- Fonte di verità: snapshot DB per riga (`kcal/carbo/proteine/grassi`)
- Fallback runtime SOLO quando snapshot NULL: lookup `ST.catalog` (per `supplement_codice` → per `supplement_name` esatto → per nome normalizzato lowercase trim) e calcolo `cat.X × (dose / cat.dose_die)` con `dose` default 1 se NULL.
- `_fromFallback: true` aggiunto come marker su `ST.extras[i]` quando tutti gli snapshot erano NULL — utile per UI diagnostiche future ma non visualizzato per ora.
- Il catalogo è RETE DI SICUREZZA, mai fonte primaria → evita riscrittura retroattiva dello storico se il catalogo Nutrilite cambia in futuro.
- Nessuno script di migrazione dati: le righe pre-22 mag si auto-riparano a schermo via fallback.

**Conseguenza pratica per UI**: il rendering della timeline Oggi usa 2 path distinti senza sovrapposizioni:
- righe con `is_extra=true` → letto SOLO da `loadExtras` (con fallback macro) → renderizzato come case `'extra'` (card mint compatta tag EXTRA)
- righe con `is_extra=false` → letto SOLO da `loadTodaySuppLog` (filtro `.eq('is_extra', false)`) → renderizzato come case `'supp'` (gruppo standard) o `'supp_log'` (legacy fuori gruppo)

Fix `loadTodaySuppLog` applicato 22 mag mattina (commit `c32f141`). Fallback macro `loadExtras` applicato 22 mag pomeriggio (Step D.3).

### Tabella `supplement_packages` (16 maggio 2026)
Pacchetti orari di integratori dell'utente (es. "Mattina" alle 08:45). Architettura nuova introdotta col refresh Integratori v3.

| Colonna | Tipo | Note |
|---|---|---|
| `id` | `uuid` PK | `gen_random_uuid()` default |
| `user_id` | `uuid` NOT NULL | FK → `auth.users` ON DELETE CASCADE |
| `name` | `text` NOT NULL | es. "Mattina", "Pre-workout" |
| `emoji` | `text` NOT NULL | default `'📦'`, es. "☕", "⚡", "🌙" |
| `time` | `text` NOT NULL | formato `HH:MM`, es. `"08:45"` |
| `sort_order` | `integer` NOT NULL | default 0 |
| `created_at` | `timestamptz` NOT NULL | default `now()` |

Indici: `(user_id)`, `(user_id, sort_order)`. RLS abilitata con 4 policy `own_*` (auth.uid() = user_id) per SELECT/INSERT/UPDATE/DELETE + policy admin `admin_read_all_packages` (FOR SELECT, email check `ignazio.f@me.com`).

### Tabella `supplement_package_items` (16 maggio 2026)
Join table: quali integratori appartengono a quale pacchetto.

| Colonna | Tipo | Note |
|---|---|---|
| `id` | `uuid` PK | |
| `package_id` | `uuid` NOT NULL | FK → `supplement_packages.id` ON DELETE CASCADE |
| `supplement_id` | `uuid` NOT NULL | FK → `supplements.id` ON DELETE CASCADE |
| `user_id` | `uuid` NOT NULL | FK → `auth.users` ON DELETE CASCADE (denormalizzato per RLS performance) |
| `sort_order` | `integer` NOT NULL | default 0 |
| `created_at` | `timestamptz` NOT NULL | default `now()` |

Constraint: `UNIQUE (package_id, supplement_id)` — un prodotto non può essere duplicato nello stesso pacchetto. Indici: `(package_id)`, `(supplement_id)`, `(user_id)`. RLS uguale a `supplement_packages`: 4 policy `own_*` + `admin_read_all_package_items`.

**Migrazione one-shot** eseguita il 16 maggio 2026 (script SQL DO block con guard `packages_count > 0`): per ogni `(user_id, slot)` distinto in `supplements`, crea un pacchetto `"Pacchetto {slot}"` con emoji default e collega gli items via `supplement_package_items`. Risultato: **11 pacchetti / 28 items** totali fra i tester (account Ignazio: 6 pacchetti 06:30/08:45/11:00/14:30/17:00/22:15 con 3/8/1/4/1/2 prodotti).

**Integratori "extra"**: NON serve tabella nuova. Gli extra sono `supplements` che NON hanno una riga in `supplement_package_items`. Filtrati client-side da `_extraSupps()` in `renderIntegratori()`.

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

### Tabella `weight_logs` (20 maggio 2026)
Pesate flessibili quotidiane — Livello 1 dell'architettura "check fisici a 2 livelli" Tab Piano v4. Separata da `body_logs` (che resta per check M2 mesociclo: peso + circonferenze + foto).

| Colonna | Tipo | Note |
|---|---|---|
| `id` | `uuid` PK | `gen_random_uuid()` default |
| `user_id` | `uuid` NOT NULL | FK → `auth.users` ON DELETE CASCADE |
| `date` | `date` NOT NULL | |
| `weight_kg` | `numeric(5,2)` NOT NULL | |
| `created_at` | `timestamptz` NOT NULL | default `now()` |

Constraint: `UNIQUE (user_id, date)` — una pesata/giorno, la seconda sovrascrive via upsert (la pesata "vera" è quella mattutina). Indice: `(user_id, date DESC)` per sparkline 30gg. RLS abilitata con 4 policy `own_*` + `admin_read_all_weight_logs` (email check `ignazio.f@me.com`).

### Tabella `ai_memory` (20 maggio 2026)
Preferenze, evitamenti, contesti e pattern appresi dall'AI dalle azioni utente (ACCETTA/SOSTITUISCI/SALTO sui pasti del piano settimanale). Il Worker AI in Step G aggiornerà progressivamente confidence e evidence_count.

| Colonna | Tipo | Note |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` NOT NULL | FK → `auth.users` ON DELETE CASCADE |
| `category` | `text` NOT NULL | CHECK: `preference` / `avoidance` / `context` / `pattern` |
| `content` | `text` NOT NULL | es. "Preferisce pesce 3x/settimana" |
| `confidence` | `numeric(3,2)` NOT NULL | default 0.50, CHECK 0.00-1.00 |
| `evidence_count` | `integer` NOT NULL | default 1 |
| `last_observed` | `date` NOT NULL | default `CURRENT_DATE` (per soft-expire >90gg) |
| `active` | `boolean` NOT NULL | default `true` (soft delete) |
| `created_at` | `timestamptz` NOT NULL | default `now()` |

Indice: `(user_id, active, confidence DESC)` ottimizzato per query "top 5 preferenze attive" della sezione Memoria AI in tab Piano. RLS: 4 own + 1 admin.

### Tabella `weekly_plans` (20 maggio 2026)
Contenitore del piano settimanale generato dall'AI. Una riga = una settimana per un utente. I pasti veri sono in `weekly_plan_meals` (figlia).

| Colonna | Tipo | Note |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` NOT NULL | FK → `auth.users` ON DELETE CASCADE |
| `week_start` | `date` NOT NULL | lunedì ISO della settimana |
| `target_kcal` | `integer` | snapshot al momento generazione (nullable per edge case onboarding) |
| `target_protein` | `integer` | snapshot |
| `target_carbs` | `integer` | snapshot |
| `target_fat` | `integer` | snapshot |
| `ai_reasoning` | `text` | spiegazione generale piano (mostrata nel welcome overlay come "Adattamento proposto") |
| `status` | `text` NOT NULL | default `'draft'`, CHECK `draft/active/archived` |
| `created_at` | `timestamptz` NOT NULL | default `now()` |

Constraint: `UNIQUE (user_id, week_start)` — un solo piano per settimana per utente. Flusso status: `draft` (appena generato dall'AI) → `active` (utente ha visto welcome overlay e cliccato "Vedi piano") → `archived` (settimana passata). Indice: `(user_id, week_start DESC)`. RLS: 4 own + 1 admin.

**⚠️ Dati di test preservati (post Step F.2a, 23 mag 2026 sera)**: esiste una riga `draft` per Ignazio (user_id `bb6fa499-1364-4d8d-8ce6-774c8e392306`), `week_start='2026-05-25'`, target `2200/187/209/68` kcal/P/C/F, `ai_reasoning` popolato con testo coach reale. È il banco di prova del welcome overlay Step E. **NON cancellare** finché serve come riferimento (welcome overlay, eventuale riattivazione F.2b, futuri test su `weekly_plans`/`weekly_plan_meals`). Per ri-testare il welcome overlay dopo aver premuto "Vedi piano →" (che porta status='active'): `UPDATE weekly_plans SET status='draft' WHERE user_id='bb6fa499-1364-4d8d-8ce6-774c8e392306' AND week_start='2026-05-25';`. Note collaudo storico F.1+F.2a: durante le sessioni del 23 mag la riga è stata più volte temporaneamente spostata a `week_start='2026-06-01'` per testare l'INSERT del postino/pasti, e i pasti F.2a generati nelle settimane libere sono stati poi rimossi via DELETE per ripristinare lo stato. DB pulito a fine sessione 23 mag sera. NB: F.2b in stand by (vedi "TODO Step F.2b — STAND BY"), quindi questo banco prova non ha più una scadenza di sblocco specifica.

### Tabella `weekly_plan_meals` (20 maggio 2026)
I pasti veri proposti dall'AI. Una riga = un pasto per un giorno e uno slot specifici. Figlia di `weekly_plans`.

| Colonna | Tipo | Note |
|---|---|---|
| `id` | `uuid` PK | |
| `plan_id` | `uuid` NOT NULL | FK → `weekly_plans.id` ON DELETE CASCADE |
| `user_id` | `uuid` NOT NULL | FK → `auth.users` ON DELETE CASCADE (denormalizzato per RLS performance) |
| `day_of_week` | `integer` NOT NULL | CHECK BETWEEN 1 AND 7 (1=lun, 7=dom, ISO) |
| `slot` | `text` NOT NULL | CHECK `colazione/spuntino/pranzo/merenda/cena` |
| `description` | `text` NOT NULL | testo pasto proposto AI (1 frase del piatto) |
| `ingredients` | `jsonb` | **F.2a v2 (25 mag 2026)**. Array di stringhe (3-5 voci), formato `'NomeIngrediente NUMEROg'` (es. `["Filetto salmone 150g","Quinoa 70g (peso secco)","Olio EVO 10g"]`). Nullable per retrocompat sulle righe pre-25 mag |
| `meal_time` | `text` | **F.2a v2 (25 mag 2026)**. Orario indicativo `'HH:MM'`: `'13:00'` pranzi / `'20:00'` cene. Default applicato dal validatore lato app se l'AI lo omette. Nullable per retrocompat |
| `kcal` | `integer` | nullable (edge case AI fallisce calcolo macro) |
| `protein` | `integer` | grammi, nullable |
| `carbs` | `integer` | grammi, nullable |
| `fat` | `integer` | grammi, nullable |
| `ai_explanation` | `text` | "PERCHÉ TI PROPONGO QUESTO" mostrato nel Dettaglio Giorno overlay |
| `sort_order` | `integer` NOT NULL | default 0 |
| `created_at` | `timestamptz` NOT NULL | default `now()` |

Indici: `(plan_id, day_of_week, sort_order)` per render Dettaglio Giorno + `(user_id)` per RLS performance. RLS: 4 own + 1 admin.

**Migration F.2a v2 (25 mag 2026)** — eseguita manualmente in SQL Editor prima del deploy codice: `ALTER TABLE public.weekly_plan_meals ADD COLUMN IF NOT EXISTS ingredients jsonb, ADD COLUMN IF NOT EXISTS meal_time text;` Le righe pre-migration mantengono `NULL` su entrambe (retrocompat). Il renderer Tab Piano (passo 2 separato, non in questa fase) leggerà `ingredients`/`meal_time` quando presenti; sui NULL userà i dati hardcoded delle card demo come fallback.

### Tabella `weekly_plan_acceptance` (20 maggio 2026)
Tracking delle azioni utente sui pasti del piano (ACCETTA / SOSTITUISCI / SALTO / off-plan rilevato). Una riga = una azione su un pasto. Alimenta il contatore "X/7 giorni seguiti" e la memoria AI.

| Colonna | Tipo | Note |
|---|---|---|
| `id` | `uuid` PK | |
| `plan_meal_id` | `uuid` NOT NULL | FK → `weekly_plan_meals.id` ON DELETE CASCADE |
| `user_id` | `uuid` NOT NULL | FK → `auth.users` ON DELETE CASCADE |
| `status` | `text` NOT NULL | CHECK `accepted/substituted/skipped/off_plan` |
| `actual_meal_id` | `uuid` | FK → `meals(id)` **ON DELETE SET NULL** (relazione laterale, no cascade — preserva storico se utente elimina pasto in tab Oggi) |
| `notes` | `text` | debug / contesto AI (es. "macro entro ±10%", "skip esplicito") |
| `created_at` | `timestamptz` NOT NULL | default `now()` |

Constraint: `UNIQUE (plan_meal_id)` — una sola azione per pasto del piano (UPDATE se l'utente cambia idea). Indice: `(user_id, created_at DESC)` per contatore real-time + lettura settimana passata da AI. RLS: 4 own + 1 admin.

Logica contatore "X/7 giorni seguiti": COUNT(*) WHERE plan_id = ? AND status IN ('accepted','substituted') — premia aderenza nutrizionale, non obbedienza letterale.

## Database — campi M1 mappati (15 maggio 2026)

Mappatura dei campi raccolti dall'onboarding M1 (9 schermate, 7 step di dati) verso lo schema `profiles`:

| Campo M1 (`ST.m1Data`) | Colonna `profiles` | Note |
|---|---|---|
| `nome` | `first_name` | text |
| `cognome` | `last_name` | text |
| `eta` | `age` | int |
| `sesso` (M/F/Altro) | `sex` | char(1): 'M'/'F'/'O' |
| `altezza` | `height_cm` | int |
| `peso_attuale` | `weight_kg` | numeric(5,2) |
| `peso_obiettivo` | `goal_weight_kg` | numeric(5,2) |
| `obiettivi[]` (multi-select max 2) | `obiettivo` | CSV string (split client-side, vedi `OBJ_ADAPT` keys) |
| `attivita` | `activity_level` | text |
| `stile_alimentare` | `dieta` | text |
| `intolleranze[]` | `intolleranze` | array text |

### TODO colonne dedicate (oggi aggregati in `note_salute`)

I seguenti campi M1 sono raccolti ma attualmente serializzati come testo libero dentro `profiles.note_salute` perché le colonne dedicate non esistono ancora nello schema. Da promuovere a colonne proprie quando serviranno operazioni filtrate (es. coach personalizzato per limitazione articolare):

- `esperienza_allenamento` (M1 step 4) — principiante / intermedio / avanzato / ritorno-allenamento
- `limitazioni[]` (M1 step 6) — array multi-select (schiena/articolazioni/condizioni)
- `altre_intolleranze` (M1 step 5) — campo libero "Altro"
- `altre_limitazioni` (M1 step 6) — campo libero "Altro"

## Navigazione — struttura attuale (aprile 2026)

| Tab | ID pagina | Contenuto |
|---|---|---|
| 🏠 Home | `home` | Dashboard: ring kcal + 3 tile modulo live |
| 🌿 Nutrition | `oggi` | Sub-nav: Oggi / Integratori / Analisi / Piano (rinominata da Storico → Analisi il 18 mag 2026) |
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

### Nutrition (sub-nav: Oggi / Integratori / Analisi / Piano)
- **Oggi**: hero ring, macro bars, timeline pasti+integratori, log pasto AI, badge zona, badge Giorno Perfetto; ogni pasto ha pulsante ✏️ modifica e 🗑️ elimina (solo desktop — su mobile solo swipe); ogni gruppo integratori ha pulsante × per eliminare il gruppo intero
- **Integratori**: pacchetti orari personalizzati + integratori extra come eventi `supplements_log`, catalogo Nutrilite hi-fi (v3, vedi sezione "Modulo Integratori v3")
- **Analisi** (ex Storico): dashboard analitica tendenze — switch finestra SETTIMANA/MESE/3M/6M, 3 stat card, chart kcal SVG area, heatmap status zona, macro distribution, drilldown Dettaglio Giorno (v3, vedi sezione "Tab Analisi v3")
- **Piano**: target 40·30·30, piano AI, priorità cliniche
- **Visualizzazione kcal/macro: logica residua** (kcal e macro rimasti invece di accumulativi). Applicata a 3 zone: anello+barre macro nella Home card riepilogo, tile Nutrition nei moduli Home, hero card Nutrition/Oggi. Anello si svuota anziché riempirsi. Stato "oltre target" usa colore ambra `#B45309`. Stato "target esatto" mostra "target raggiunto". Helper globali: `fmtNum`, `kcalRimaste`, `macroRimasti`, `isOverTarget`, costante `OVER_COLOR`. Piano/Storico/Integratori restano accumulativi.
- **Barre macro**: visualizzazione residua coerente con anello kcal (parte 100% piena, si svuota man mano che si consuma).
- **Pill Zona**: una sola pill per macro-area visiva. Home card → pill in alto a destra. Home tile Nutrition → pill laterale "ZONA"/"FUORI ZONA"/"—" (rimosso vecchio "OFF 40·30·30"). Hero card Nutrition/Oggi → pill in basso nella riga `zonaRowHTML` sotto le 3 cards macro (rimossa duplicazione dal centro anello). Timeline pasti → pill per pasto invariata.

### Training (sub-nav: Sessione / Piano / Progressione)
- **Sessione**:
  - Lista sessioni: Upper A/B (Forza/Ipertrofia), Lower A/B, Active Recovery
  - Dettaglio sessione: blocco attivazione 5 min + esercizi con campo `note` in corsivo
  - Pulsante **▶** su ogni esercizio → apre modal scheda AI (`openExerciseAI`)
  - Log serie inline per ogni esercizio: reps + resistenza + RIR → salva su `training_logs`
  - Badge S1/S2/... su card dopo il log, ✓ DONE quando tutte le serie completate
  - Info icon ⓘ su badge RIR (→ `showInfoModal('rir')`) e su serie (→ `showInfoModal('serie')`)
  - Modal recupero: countdown parte subito al tap "Fine serie" (parallelo al form log); form `tl-reps`/`tl-rir`/`tl-resist` integrato nel corpo del modal (commit `6125812`); post-salvataggio mostra eyebrow "Serie N salvata ✓" + card APPENA FATTA/PROSSIMA. GIF esecuzione: cantiere separato in attesa collaudo.
- **Programma** (label tab rinominato 8 maggio 2026, id `piano` per back-compat):
  - Split settimanale con giorni numerici G1–G6 (rotazione 6 giorni, dopo G6 → G1)
  - Ciclo 4 settimane (CARICO × 3 + SCARICO × 1). Settimana corrente calcolata su workout completati (1 settimana = 6 workout veri, riposi esclusi)
  - Progressione doppia: 3 step + esempio pratico
  - Info icon ⓘ su "CICLO 4 SETTIMANE" e "PROGRESSIONE DOPPIA"
  - Riposo extra opzionale: 2 card separate (🌙 scelto / 🩹 infortunio con prompt zona corpo)
- **Progressione** (rifatta 9 maggio 2026):
  - Calendario mensile in cima (sigle workout, stats sessioni/streak/freq)
  - Tap su giorno calendario → modal **Dettaglio giorno** (lista esercizi + serie con matita/cestino + bottone "Elimina intero workout")
  - **Dropdown selezione esercizio** full-width (sostituisce vecchia chip-row): bottone trigger + pannello con search bar + 2 tab (Per programma / Per esercizio) + lista alfabetica
  - Default selection: primo esercizio alfabetico tra quelli loggati (auto al caricamento tab)
  - **Grafico SVG vanilla** per esercizio selezionato: barre se ≤8 sessioni, linea+dots se >8. Tap su punto → modal Dettaglio giorno filtrato
  - 3 chip toggle metrica sopra grafico: **Peso** (default) / Reps / Volume (Tempo invece di Reps/Volume per esercizi `iso:true` temporali)
  - 3 stat card sotto grafico: Best peso, Best reps/tempo, Ultimo (data + valore metrica)
  - Edit/delete singola serie da modal Dettaglio giorno → refresh automatico grafico

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

**Split:** Upper/Lower 4 giorni + 2 Active Recovery — giorni numerici G1–G6 (rotazione 6 giorni, dopo G6 → G1)

**Riposo extra** (NON in rotazione, NON conta nel calcolo settimana ciclo):
- Riposo scelto (`rest`): giorno volontario, button grigio (`markRestChosen`)
- Riposo infortunio (`rest_injury`): stop forzato, button arancione, prompt zona corpo, salvato in `workouts.note` (`markRestInjury`)

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

### TRAINING_SESSIONS — schema attuale (3 maggio 2026, post-Step3)

**Struttura sessione (top-level)**:
```js
{
  id: 'upperA',                 // === chiave esterna del map (back-compat)
  name: 'Upper A',              // titolo breve (calendar/Home tile/Sessioni cards)
  type: 'Forza',                // 'Forza' | 'Ipertrofia' | 'Recupero' (capitalized — usato da getRestSec)
  rir: 2,                       // RIR target sessione (null per recovery)
  label: 'Upper A — Forza',     // titolo esteso (nuovo, usato dal modal scheda esercizio)
  rest: '2-3 min',              // testo recupero (nuovo, usato da card e modal; null per recovery)
  exercises: [ ... ]
}
```

**Struttura esercizio**:
```js
{
  name: 'Trazioni alla sbarra',
  sets: 4,
  reps: '4-6',                  // '4-6' | '8-12' | '4-6 per lato' | '20-30 sec' | '20-30 sec per lato' | '10 min'
  eq: 'Sbarra fissa da porta',  // attrezzatura sintetica
  iso: true,                    // OPZIONALE: esercizi isolation/isometrici, usato da getRestSec
  setup: 'Presa pronata...',    // 1 frase: posizione iniziale + attrezzatura
  execution: [                  // 3-4 step movimento
    'Sospensione passiva...',
    'Tirata fino al mento...',
    'Eccentrica controllata 3 sec'
  ],
  commonErrors: [               // 3 errori tipici da evitare
    'Dondolare il corpo per slancio',
    'Spalle che salgono...',
    'Range incompleto...'
  ],
  muscles: ['dorsale','bicipiti','trapezio','romboidi'],
  alert: '⚠️ Lombari: ...'      // OPZIONALE: warning protezione (7 esercizi)
}
```

**Convenzioni nomi**: tutti gli esercizi con elastico riportano "con elastico" nel nome (es. "Chest press in piedi con elastico"). Niente "banda elastica", niente ridondanze tipo "orizzontale/verticale".

**Esercizi con `alert` (protezione lombari/ginocchia)** — 7 totali:
- Shoulder press in piedi con elastico (lombari iperestensione)
- Row inclinato in piedi busto 45° (lombari schiena flessa)
- Bulgarian split squat con elastico (ginocchia valgismo + tallone)
- Romanian deadlift con elastico (lombari schiena neutra)
- Glute bridge isometrico con cavigliera (ginocchia rinforzo vasto mediale)
- Squat con elastico e talloni rialzati (ginocchia + lombari)
- Single leg Romanian deadlift con elastico (lombari equilibrio)

**Esercizi con `iso:true`** — 7 totali (recupero più breve via `getRestSec`): Face pull, Lateral raise, Curl bicipiti, Tricipiti overhead, Glute bridge isometrico, Leg curl con fitball, Calf raise.

| Sessione | Esercizi |
|---|---|
| Upper A (Forza) | Trazioni alla sbarra, Chest press in piedi con elastico, Shoulder press in piedi con elastico, Row in piedi con elastico, Face pull con elastico |
| Upper B (Ipertrofia) | Inverted row con elastico, Chest press inclinata su panca, Lateral raise con elastico, Row inclinato in piedi busto 45°, Curl bicipiti con elastico, Tricipiti overhead con elastico |
| Lower A (Forza) | Bulgarian split squat con elastico, Romanian deadlift con elastico, Hip thrust con elastico, Glute bridge isometrico con cavigliera |
| Lower B (Ipertrofia) | Squat con elastico e talloni rialzati, Single leg Romanian deadlift con elastico, Hip thrust con elastico TUT alto, Leg curl con elastico sulla fitball, Calf raise con elastico |
| Recovery | Mobilità articolare, Stretching, Vacuum + respirazione diaframmatica |

**Totale: 20 esercizi training (5+6+4+5) + 3 recovery = 23**

### EXERCISE_MEDIA — media per esercizi (3 maggio 2026)

Oggetto globale definito prima di `TRAINING_SESSIONS`. Struttura per esercizio:
```js
{
  muscleImg:   '...', // path locale a assets/exercises/<nome>-muscoli.png (mappa muscolare Wger)
  executionImg:'...'  // path locale a assets/exercises/<nome>-esecuzione.png, oppure null
}
```
Tutti i 20 esercizi training sono mappati (i 3 esercizi di Active Recovery non hanno media). `executionImg: null` per esercizi senza foto esecuzione disponibile su Wger; il modal in quel caso mostra la sola mappa muscolare a tutta larghezza (griglia `1fr` invece di `1fr 1fr`).

**Asset locali esercizi:** `assets/exercises/` — PNG di Wger (Wger.de, CC BY-SA 4.0). Versionati nel repo.

**Note temporanee** (TODO per ripuliture future):
- Alcuni `executionImg` puntano a varianti `*-esecuzione-1.png` (esistono `-1` e `-2` da combinare in un'unica immagine senza suffisso)
- `Chest press in piedi con elastico.muscleImg` riusa `chest-press-orizzontale-muscoli.png` come fallback (file `chest-press-in-piedi-muscoli.png` da generare)
- `Hip thrust con elastico TUT alto` riusa il `muscleImg` di `Hip thrust con elastico` (stesso muscolo)

### Scheda esercizio AI — `openExerciseAI(exName, sessionId)` (3 maggio 2026)

**Trigger**: l'intero **header della card esercizio** (titolo + meta-row) è cliccabile (`onclick="openExerciseAI(...)"`). Niente più pulsante ▶ separato.

**Flusso**:
1. Apertura sincrona: legge `TRAINING_SESSIONS[sessionId]` + `findExercise(exName, sessionId)` + `EXERCISE_MEDIA[exName]`. Setta `ST.exerciseAIOpen` con TUTTI i dati statici visibili immediatamente + `loading:true` per l'AI Coach
2. `renderTraining()` mostra subito il modal con sezioni statiche complete (Setup, Esecuzione, Errori, Parametri, Alert)
3. In parallelo: `callAI(prompt, 200)` con prompt **semplificato** che chiede SOLO un cue avanzato (max 3 frasi: cue tecnico + gestione fatica + variazione respiratoria). NON ripete setup/execution/errori/muscoli (già nelle sezioni statiche)
4. Risposta AI → setta `content`, `loading:false`, re-render

**Sezioni del modal (in ordine)**:
1. **Header**: nome esercizio + label sessione (es. "Upper A — Forza") + ✕
2. **Media**: griglia `1fr 1fr` con `muscleImg` + `executionImg`. Collassa a `1fr` se `executionImg=null`. Immagini con **`height:240px` fissa + `object-fit:contain`** (fix bug dimensioni disuguali)
3. **Setup**: 1 paragrafo (`<p>`) con la posizione iniziale e attrezzatura
4. **Esecuzione**: lista numerata `<ol>` con 3-4 step
5. **Errori comuni**: lista bullet `<ul>` con 3 errori da evitare
6. **Parametri**: pill compatta `${sets}×${reps} · RIR N · Recupero ...`
7. **Alert protezione** (condizionale): box giallo/arancio con `⚠️` solo se `ex.alert` è presente (7 esercizi)
8. **AI Coach** (background teal `#F0F7F5`): mostra "Genero un cue avanzato per te…" durante loading, poi il testo AI
9. **Footer**: "Mappe muscolari da Wger.de — CC BY-SA 4.0"

**Stato `ST.exerciseAIOpen`**:
```js
{
  exName, sessionId,
  sessionLabel, sessionType, sessionRir, sessionRest,  // dati sessione
  sets, reps, eq,                                       // parametri esercizio
  setup, execution[], commonErrors[], muscles[], alert, // contenuti structured
  muscleImg, executionImg,                              // media Wger
  content, loading                                      // AI Coach
}
```

Il modal è parte di `page-training` innerHTML, montato/smontato tramite `ST.exerciseAIOpen`. Classi CSS dedicate: `.modal-section`, `.modal-list`, `.modal-params`, `.modal-alert`, `.modal-ai-section`, `.ex-media-grid`, `.ex-media-img`.

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

## Decisioni di design correnti (15 maggio 2026)

Sintesi delle decisioni di design consolidate dopo Fase A/B/C/D. Queste **sostituiscono** scelte precedenti documentate nella sezione "Design system" (legacy Manrope + palette moduli verde/blu/marrone) per le schermate nuove: M1, M2, Home V2. I moduli interni (Nutrition/Training/Body sub-tab) mantengono ancora elementi grafici legacy — sono da migrare progressivamente (vedi TODO sezione successiva).

- **Stack visivo definitivo**: Syne (sans display) + JetBrains Mono (numeri/label). **Niente Manrope** sulle schermate nuove.
- **Palette**:
  - Background: bone `#F5F3EE`
  - Accent globale: evergreen `#2A7A6F`
  - Tinte modulo (variabili CSS in cima a `zona-tracker.html`): Nutrition `--mod-nutrition:#FAC775` (ambra), Training `--mod-training:#B5D4F4` (azzurro), Body `--mod-body:#AFA9EC` (viola)
  - Over-target: `OVER_COLOR='#B45309'` (ambra scuro, leggibile non allarmante)
- **Logica donut Nutrition** (sia Home V2 che modulo Nutrition): modello ibrido **"forma = consumato, numero = rimanente"** — anello si riempie col consumo, numeri al centro mostrano kcal RIMASTE. Macro pill mostrano grammi rimasti, prefisso `+N` ambra se oltre target. Riusa helper `kcalRimaste()`, `macroRimasti()`, `isOverTarget()`, `OVER_COLOR` — niente duplicazione di logica.
- **Saluto Home V2 orario-dipendente** (`renderHomeV2()`):
  - 0-5: "Notte"
  - 5-12: "Buongiorno"
  - 12-18: "Buon pomeriggio"
  - 18-24: "Buonasera"
- **Chip "DOPO L'ALLENAMENTO" fasce orarie** (`getPostWorkoutHint()`):
  - 5-10: colazione zona
  - 10-12: spuntino + colazione zona
  - 12-14: pranzo zona
  - 14-18: merenda + proteine
  - 18-21: cena zona
  - 21-5: cena leggera + proteine
- **Avatar Home V2**: bollino circolare 42px con iniziali (`first_name[0]+last_name[0]`), evergreen pieno, onclick → `openSettingsModal()`. Rimpiazza l'header globale (nascosto su home via `#header.home-v2-hide`).
- **"coach" sostituisce "AI"** in tutti i copy visibili UI (decisione 10 maggio, applicata in Fase A).
- **Tinta viola modulo Body** (`#AFA9EC`) usata in Home V2 come accent della card Body. Per i checkpoint Body futuri (M2 ricorrente) la tinta forte `#5E4A7A` resta riservata.
- **Pacchetti vs Extra — architettura confermata 16 mag 2026 sera, completata 18 mag 2026**:
  - **Pacchetti** = configurazioni persistenti dell'utente, vivono in `supplement_packages` + `supplement_package_items`. Definiscono "il mio set di integratori delle 08:45" con dose/molt/scorta editabili
  - **Extra** = registrazioni mordi-e-fuggi, eventi una tantum. Vivono in `supplements_log` con flag `is_extra=true` (Step 2 completato 18 mag — commit `306defe`). Snapshot completo nome/dose/macro/costo immutabile nella riga log
  - **Pacchetti e extra sono mondi separati e indipendenti**: eliminare un pacchetto NON tocca gli extra, registrare un extra NON modifica pacchetti
  - Stesso integratore può essere preso sia dentro un pacchetto sia come extra al volo, senza che le due cose si influenzino
  - L'utente può registrare un extra anche più volte nella stessa giornata
  - **Stato implementazione 18 mag**: pacchetti ✅ production-ready, extras ✅ production-ready (eventi `supplements_log` con `is_extra=true` + Conferma Extra fullscreen + timeline tab Oggi ridisegnata + tag EXTRA mint)
- **Target macro personalizzati — leggere SEMPRE dinamicamente dal profilo (18 mag 2026)**:
  - I target macro percentuali NON sono hardcoded `40/30/30` Zone classica
  - Ogni utente ha piano personalizzato calcolato dal proprio profilo (obiettivo + TDEE + macro adattivi via `OBJ_ADAPT` / `calcAdaptedTargets`)
  - Esempio Ignazio: `38/34/28` (ricomposizione/forza+performance)
  - Esposto su `ST.TARGET.pCarbo` / `ST.TARGET.pProt` / `ST.TARGET.pFat` (oltre ai valori in grammi `carbs/protein/fat`)
  - **Regola applicativa**: in Analisi, Dettaglio Giorno, heroCard tab Oggi v3, status zona pill — SEMPRE leggere da `ST.TARGET.p*` con fallback `40/30/30`
  - Soglia "in zona": ±2% target dinamici (severa, per dashboard analitica); "quasi zona": ±5% (più permissivo, hero card tab Oggi v3)
  - Nessun tag "PIANO BASE" mostrato in UI: il fallback opera silenzioso se i campi sono assenti


## Modulo Integratori v3 (16 maggio 2026)

Refresh hi-fi del modulo Integratori (Nutrition) coordinato da Claude Design ed eseguito da Claude Code in 2 blocchi sequenziali. Sostituisce la grafica legacy (lista raggruppata per slot + editing inline + bottoni custom) con un'architettura a **pacchetti** e un nuovo modal catalogo Nutrilite design-driven. Commit `7dc35c9` + `1c2a295` (fix RLS) + `fa75562`.

### Architettura dati nuova

- **2 nuove tabelle Supabase** (vedi sezione "Schema Supabase"): `supplement_packages` (id, user_id, name, emoji, time, sort_order, created_at) e `supplement_package_items` (id, package_id CASCADE, supplement_id CASCADE, user_id, sort_order, created_at + UNIQUE su `(package_id, supplement_id)`).
- **Indici**: `(user_id)` + `(user_id, sort_order)` sui pacchetti; `(package_id)` + `(supplement_id)` + `(user_id)` sugli items.
- **RLS**: 4 policy `own_*` per SELECT/INSERT/UPDATE/DELETE (auth.uid() = user_id) + 1 policy `admin_read_all_*` per SELECT con email check `ignazio.f@me.com` (necessaria per la dashboard admin futura).
- **Migrazione one-shot** eseguita 16 mag: 11 pacchetti / 28 items totali fra i tester. Account Ignazio: 6 pacchetti 06:30/08:45/11:00/14:30/17:00/22:15 con 3/8/1/4/1/2 prodotti.
- **Integratori "extra"**: NO nuova tabella. Sono `supplements` che NON hanno una riga in `supplement_package_items`. Filtrati client-side da `_extraSupps()`.
- **Connessione tab Oggi ↔ pacchetti**: `supplements_log` invariato (la registrazione assunzioni continua a vivere in Oggi). La timeline Oggi può raggruppare per pacchetto via lookup `supplement_id → supplement_package_items.package_id`.

### Tab Integratori principale — `renderIntegratori()` v3

Header v3 con accent bar `#FAC775` 3px + eyebrow data Mono caps + titolo Syne 800 30px "Nutrition" + avatar IF + sub-nav pillole (OGGI/INTEGRATORI/STORICO/PIANO `.oggi-v3-pill`). Sotto eyebrow di scope: `"GESTORE PACCHETTI E EXTRA · LA REGISTRAZIONE VIVE IN OGGI"`.

**Sezione "I miei pacchetti"**:
- Titolo Syne 700 18px + counter destra "N GRUPPI"
- Lista card pacchetto (~72px altezza): tile emoji 40×40 fondo `#F0EDE6` sinistra, nome Syne 600, riga sotto Mono caps `"N PRODOTTI · HH:MM"`, chevron `›` grigio destra. Stock warn `⚠ SCORTA BASSA` terracotta accanto al count se uno qualsiasi degli items ha `daysLeft ≤ 7`.
- Tap intera card → `openPackageEditor(packageId)`
- CTA primary `+ Nuovo pacchetto` fill evergreen + tag `NUTRILITE` Mono caps a destra → `openPackageEditor(null)` (CREATE mode)

**Sezione "Integratori extra"**:
- Titolo + counter "N ATTIVI"
- Righe compatte (~44px): box orario Mono caps sinistra con divisore verticale hairline, nome Syne 500, icona `···` destra
- Tap → `openExtraEditor(supplementId)`
- CTA secondary `+ Singolo integratore` outline evergreen + tag `NUTRILITE` → `openCatalogForExtra()` (apre catalogo con `ST.catalogContext.mode = 'addExtra'`)

### Editor Pacchetto — `openPackageEditor(packageId | null)` fullscreen

Modale fullscreen `#package-editor-overlay`. Sostituisce `openAddSuppModal` legacy.

- **Header banda `#FAC775`** + `‹ INDIETRO` Mono caps sinistra + titolo Syne `"Modifica pacchetto"` (EDIT) o `"Nuovo pacchetto"` (CREATE) centro + `SALVA` Mono caps evergreen destra (disabled in CREATE se nome vuoto o 0 prodotti)
- **Card meta unica** con 3 righe separate da hairline:
  - **ORARIO**: valore Mono 700 28px (es. `"08:45"`) + nome pacchetto Mono caps grigio sulla destra + bottone `MODIFICA ›` Mono caps evergreen — tap → `pkgEditorEditTime()` (oggi `prompt()` nativo)
  - **EMOJI**: tile 56×56 fondo `#F0EDE6` con emoji corrente → tap `pkgEditorEditEmoji()` (oggi `prompt()`)
  - **NOME**: input Syne 500 18px con underline dashed (segnala editabile) — debounce save 800ms in EDIT mode
- **Sezione "Prodotti nel pacchetto"** con eyebrow `"TRASCINA PER RIORDINARE · N PRODOTTI"`
  - Card prodotto in 2 stati:
    - **Vista collassata**: drag handle `⠿` + nome Syne 500 + riga Mono caps `"{dose} {unit} · {kcal} KCAL · {C}G C · {P}G P · {G}G G"` (regola macro: kcal sempre, C/P/G tutti o nessuno) + badge stock condizionale + chevron `▾`
    - **Vista espansa** pannello inset cream `#FAF8F2`: 4 macro chips colorate read-only, stepper `−/+` per **DOSE** + select unità (cps/stick/barretta/misurino), **MOLT.** step 0.25 (helper italic "0.5 = mezza dose · 2 = doppia"), **SCORTA** + auto-calcolo `"= N giorni rimasti"`, riga **COSTO** Mono caps `"€ X.XX/oggi · YY.YY/mese"` read-only, bottone `× RIMUOVI DAL PACCHETTO` Mono caps rosso `#C44434` centrato
  - **Pattern accordion**: solo uno espanso alla volta, altri collassano sempre (anche se fuori viewport). Animazione: chevron rotate 0→180deg 200ms, max-height 0→600px + opacity, cubic-bezier(.16,1,.3,1) 240ms
- **CTA `+ AGGIUNGI PRODOTTO · NUTRILITE`** outline evergreen → `pkgEditorAddProduct()` (apre catalogo con `addToPackage` mode)
- **CTA `ELIMINA PACCHETTO`** Mono caps rosso `#C44434` centrato — visibile se `ST.packageEditor.packageId` esiste (pacchetto già persistito in DB), **indipendentemente dal numero di items**. Regola corretta introdotta col commit `73d141b` (16 mag sera). La regola precedente legata a `items.length > 0` impediva eliminazione di pacchetti vuoti già persistiti (es. dopo migrazione legacy o creazione vuota — caso "Prova").
- **Empty state CREATE**: emoji 📦 grande + `"PACCHETTO VUOTO"` Mono caps + helper Syne 13px + CTA `+ Aggiungi prodotto` promossa a fill evergreen
- **Undo toast 4s** pattern Mail iOS per rimozione singolo prodotto: `pkgEditorRemoveItem()` setta `ST._pkgRemoveTimer` 4s, durante la finestra mostra toast `.pkg-undo-toast` scuro con bottone "Annulla" giallo. Allo scadere → DELETE `supplement_package_items.id`

#### Eliminazione pacchetto — comportamento corretto (commit `c28ef45`)

La funzione `pkgEditorDoDelete()` cancella in cascata sia il pacchetto sia i supplements linkati:

1. Raccoglie `suppIds` da `ST.packageEditor.items.map(it => it.supplement_id)`
2. **Bulk DELETE** su `supplements` filtrato per `user_id` (RLS-safe): `supa.from('supplements').delete().in('id', suppIds).eq('user_id', ST.user.id)`
3. **DELETE** su `supplement_packages` (FK CASCADE rimuove automaticamente `supplement_package_items`)
4. Sync in-memory immediato: filtro `ST.supps` via `Set(suppIds)` + filtro `ST.packages`
5. Re-fetch authoritative: `loadSupps() + loadPackages()` per coerenza cross-device + ricalcolo totali Home tile / `suppMonthlyCost`
6. `saveCache()` + `closePackageEditor()` + toast con count: `"Pacchetto eliminato (N integratori)"` se N>0, altrimenti `"Pacchetto eliminato"`

**Error handling separato**: se la prima DELETE su supplements fallisce → toast warning `⚠️` + early return, non procede con la delete del pacchetto (evita stati inconsistenti DB).

**Cosa NON tocca**:
- `supplements_log`: referenzia `supplement_name` (text), no FK su `supplements.id`. Lo storico assunzioni passate del pacchetto eliminato resta in DB come dati storici. Coerente con la regola "lo storico delle assunzioni viene mantenuto".
- Gli extra: invariati. Sono `supplements` non in nessun pacchetto, fuori dal blast radius dell'eliminazione.

**Differenza vs "× Rimuovi dal pacchetto"** (singolo item): quello mantiene il supplement nella libreria e lo trasforma in extra (rimuove solo il link `supplement_package_items`). "Elimina pacchetto" invece cancella tutto in cascata. Comportamento intenzionale per i 2 flussi.

### Extra editor — `openExtraEditor(supplementId)`

Riusa lo stesso overlay con `ST.packageEditor.mode = 'extra'`. Vista semplificata:
- Header banda + titolo `"Integratore extra"` + `Chiudi` destra
- Card meta: orario editabile + nome read-only (dal catalogo)
- Item card sempre espanso (no toggle): stesso stepper dose/molt/scorta + macro chips + costo
- CTA finale `ELIMINA DALLA LIBRERIA` rosso → modal conferma → `dbDeleteSupp(supplementId)` definitivo

### Modal Catalogo Nutrilite v3 — `openCatalogModal` + `renderCatalogList` riscritte

Modal fullscreen `100dvh` (override `weight-modal-inner` scoped a `#catalog-modal`). Sostituisce l'UI legacy lineare.

**Architettura split shell/content** (decisione critica per UX):
- `renderCatalogShell()` chiamata 1 volta da `openCatalogModal` — monta header + search input + pills container + eyebrow + list + CTA come scheletro statico
- `renderCatalogList()` su ogni filter change — aggiorna solo `#catalog-counter`, `#catalog-pills`, `#catalog-eyebrow`, `#catalog-list`, `#catalog-cta-btn`. **NON ricostruisce il search input** → focus preservato durante typing, no flicker tastiera iOS
- Handler `onCatalogSearchInput(value)` su `oninput` → solo `renderCatalogList()`

**UI**:
- **Shell fullscreen** bone `#F5F3EE` + accent bar `#FAC775` 3px
- **Header**: `‹ INDIETRO` Mono caps sinistra + titolo Syne 700 16px `"Catalogo Nutrilite"` centro + contatore `"N SELEZIONATI"` Mono 700 destra (grigio `#9A9388` quando N=0, evergreen quando N≥1)
- **Barra ricerca** `#ECE9E0` con icona 🔍 sinistra + clear button `×` destra (visibile solo con query). Font-size **16px** anti-zoom iOS Safari
- **Pillole categoria** scroll orizzontale: prima `"TUTTI 64"` poi una per categoria reale (es. `"INTEGRATORI BASE 8"`), ordinate per count desc, counter inline. Attiva fill `#FAC775` testo dark, inattiva outline 0.75px `#C8C3B8`. Fade hint a destra `linear-gradient(90deg, transparent → #F5F3EE)` largo 24px
- **Eyebrow** Mono caps sopra lista: `"{FILTRO} · ORDINATO PER NOME · N RISULTATI"` + link `AZZERA ›` evergreen quando filtri attivi (categoria != TUTTI OR query != '')
- **Card prodotto** (~104px):
  - **Thumb 56×56** sinistra: background tinted per categoria (vedi `CATEGORY_TINT_MAP`) + emoji semantico centrato + texture diagonale white 40%→0 via `::after` (gradevole, non AI-slop)
  - **Info centrale**: nome Syne 600 + tag linea inline (solo `BODYKEY` mint o `XS SPORTS` terracotta, non per Nutrilite default), riga categoria + porzione Mono caps (`"CATEGORIA · 1 CPS"`), riga macro Mono (regola: kcal sempre anche se 0, C/P/G tutti o nessuno, ordine `kcal → C → P → G`, colori chip semantici), riga costo `"€ X.XX/dose"` Mono color `#9A9388`
  - **Check destra** 26×26: vuoto bordo `#C8C3B8` / on fill evergreen + ✓ bianco. Animazione keyframe `catalogCheckPop` scale 0.7→1, cubic-bezier(.16,1,.3,1) 200ms
- **Stato "NEL PACCHETTO"** (legge `ST.catalogContext.alreadyInPackage`): card opacity 0.55 + tag `Nel pacchetto` Mono caps evergreen sotto la riga costo + `pointer-events:none` (no tap accidentale)
- **CTA bottom sticky** con fade gradient bone→trasparente sopra:
  - Stato 0 selezionati: opacity 0.45, disabled, label `Seleziona prodotti`
  - Stato ≥1: fill evergreen abilitato, label `Aggiungi {N} prodotti` con numero in Mono 700 inline più grosso. Singolare/plurale gestito
- **Empty state** "Nessun prodotto" con 🔍 grande + link `Azzera filtri ›` (se ci sono filtri attivi)
- **Empty state** "Catalogo non disponibile" con 📦 + `Riprova ›` (richiama `loadCatalog()`)

### Mappa colori categoria — `CATEGORY_TINT_MAP` (hardcoded JS)

Decisione "A" del brief: nessuna colonna DB nuova, mappa client-side.

- **5 macro-tinte**: `ambra #FEF3DC` (integratori base/cuore), `terracotta #FCEEE9` (sport/composizione/ossa), `rosa #FCE9EE` (pelle/donna), `verde #E6F4E6` (energia/peso/concentrazione), `beige #F0EDE6` (erbe/fegato/protezione — fallback)
- `CATEGORY_TO_TINT`: 15 mapping categoria reale → tinta (categorie non presenti → fallback `beige`)
- `CATEGORY_EMOJI_OVERRIDE`: emoji semantico per categoria (es. `Sostituto pasto → 🥤`, `Ossa / Muscoli → 🦴`, `Concentrazione → 🧠`). Le categorie senza override usano l'emoji default del macro-gruppo
- Helper `getCatalogTint(item)` ritorna `{bg, emoji}` con fallback beige + emoji 🌱

### Tab Oggi: patch badge ESAURITO

`oggiSuppCardHTML(s, taken)` patchato (commit `7dc35c9`):
- Se `_suppDaysLeft(s) === 0` → badge `ESAURITO` terracotta `#B84C2A` accanto al nome
- Se `_suppDaysLeft(s) <= 7` → badge `⚠ Ngg` terracotta (esistente, conservato)
- **NO auto-disable**: l'integratore esaurito resta visibile in timeline come segnale per riordinare
- **Regola dominio**: la label è sufficiente, l'utente vede mancare la registrazione e capisce

### Decisioni design Nutrition v3 (consolidate dai mockup Claude Design)

- **Ordine macro globale**: kcal → carbo → proteine → grassi (corretto da P/C/G legacy errato — applicato retroattivamente ovunque nel modulo)
- **Tipografia**: Syne 800/700/600/500 (identità, titoli, prosa) + JetBrains Mono 400/500/700 (TUTTI i numeri, label caps, eyebrow tecnici)
- **Tinta modulo Nutrition**: `#FAC775` SOLO su accent bar header e pillola tab attiva, MAI come fondo card
- **Pacchetti come entità**: l'utente costruisce libreria personalizzata (nome + emoji + orario + lista prodotti). Sostituisce il vecchio raggruppamento implicito per `slot`
- **Extra come eventi `supplements_log`** (rivisto Step 2, 18 mag 2026): righe con `is_extra=true` + snapshot completo macro/dose/costo. NIENTE persistenza in `supplements` (vedi sotto-sezione "Flusso Registra Extra")
- **Catalogo Nutrilite 64 prodotti reali** (Nutrilite + Bodykey + XS Sports), aggiornato una tantum via Google Sheet sync
- **Selezione multipla nel catalogo, applicazione in blocco** → 1 sola transizione step2 → import in transazione
- **"Già nel pacchetto"**: prodotti già linkati al pacchetto sorgente mostrati ma non riselezionabili (evita duplicati involontari). Costraint DB `UNIQUE (package_id, supplement_id)` è la rete di sicurezza

### Flusso "Registra Extra" — Step 2 completato (18 maggio 2026, commit `306defe`)

Ridisegno architetturale del flusso "Registra Extra" del modulo Integratori. Risolve il bug "gruppi fantasma 08:00 nel bottom sheet" e "extra fantasma in timeline" causato dall'architettura legacy che persisteva gli extras come `supplements` con `slot` valorizzato.

**Architettura extras (mordi-e-fuggi)**:
- Gli extras vivono SOLO in `supplements_log` come righe con `is_extra=true`
- NESSUNA persistenza in `supplements` (regola architettonica fondamentale)
- Pacchetti e extras sono mondi indipendenti: pacchetto eliminato NON tocca extras, registrare extra NON modifica pacchetti, stesso integratore in pacchetto + come extra al volo non hanno collisione
- Snapshot immutabile salvato nella riga log (`supplement_name`, `supplement_codice`, `dose`, `dose_unit`, `kcal`, `carbo`, `proteine`, `grassi`, `costo`) — storico onesto anche se il catalogo Nutrilite cambia in futuro
- Le macro dell'extra vengono scalate per ratio `dose / dose_die catalogo` (es. registro 2 cps di "Daily 1 cps = 4 kcal" → salva 8 kcal nella riga)
- DB extension eseguita 18 mag: 9 colonne nuove su `supplements_log` (`is_extra`, `supplement_codice`, `dose`, `dose_unit`, `kcal`, `carbo`, `proteine`, `grassi`, `costo`) + 2 indici (`idx_supplements_log_extra` parziale su `is_extra=true`, `idx_supplements_log_date_extra` per timeline) + cleanup orfani `DELETE FROM supplements WHERE id NOT IN supplement_package_items`

**Schermata Conferma Extra fullscreen** (`#confirm-extra-screen` overlay z-index 1700):
- Entry: bottom sheet "+ Registra integratori" tab Oggi → tap card "Singolo · Fuori schema" → `openCatalogForRegisterExtra()` → catalogo Nutrilite in modalità `registerExtra` → seleziona N prodotti → tap "Aggiungi N prodotti" → `openConfirmExtraScreen(codici)` slide-up
- Header: `‹ INDIETRO` Mono caps sinistra + `"Registra extra"` Syne centro + `REGISTRA` Mono caps evergreen destra (disabled se 0 prodotti o dose=0 o orario invalido)
- Banda accent `#FAC775` 3px persistente in cima (continuità modulo Nutrition catalogo → conferma)
- Eyebrow mint `"EVENTO MORDI-E-FUGGI · NESSUNA CONFIG. SALVATA"` (claim ontologico mint pill)
- Titolone Syne 800 24px `"Conferma dose & orario"` + sottotitolo Syne 13px `"Stai registrando N prodotti fuori dai pacchetti."`
- Counter Mono caps `"N PRODOTTI SELEZIONATI"`
- Card per ogni prodotto (~~104px):
  - Thumb 48×48 tinted via `getCatalogTint(item)` (riusa `CATEGORY_TINT_MAP` del catalogo) + texture diagonale `::after`
  - Nome Syne 600 15px + meta caps `"{CATEGORIA} · {dose default} {unit}"`
  - Riga DOSE: stepper `−/+` (28+28px) con input numerico al centro + select unità (cps/stick/barretta/misurino, esteso se diverso)
  - Riga ORARIO: valore Mono 700 24px + button `MODIFICA ›` Mono caps evergreen → `prompt()` HH:MM
  - Bottone `× RIMUOVI DA QUESTA REGISTRAZIONE` Mono caps rosso `#C44434` in fondo card
- **Pattern Mail iOS undo 4s** su rimozione card: card sparisce, strip nero `"Rimosso · {nome} · ANNULLA"` 36px sostituisce per 4s, poi commit definitivo. Tap ANNULLA entro 4s → card ripristinata
- **Default smart**: dose = `dose_die` del catalogo, orario = ora corrente al momento apertura schermata
- **Empty state**: se l'utente rimuove TUTTI i prodotti → blocco centrato 📦 + `"Nessun prodotto da registrare"` + helper + CTA `"‹ Torna al catalogo"` (sostituisce sticky CTA bottom). Header REGISTRA disabled
- **Back con conferma**: se l'utente ha modificato dose/orario rispetto al default OR ha rimosso card → `confirm("Annullare la registrazione?")`. Se nessuna modifica → back silent. Riapre catalog modal con selezione preservata in `ST.catalogSelected`
- **CTA sticky bottom** evergreen full-width: `"REGISTRA N EXTRA"` invariabile (anche al singolare resta `"1 EXTRA"` come unità Mono caps, decisione design per ridurre rumore visivo)
- **Submit**: per ogni item insert in `supplements_log` con macro/costo scalati per ratio dose (snapshot immutabile). Reset `ST.catalogSelected` + `ST.catalogContext` (consumati) + close schermata + reload `ST.extras` + re-render tab Oggi + toast undo Mail iOS 4s `"N EXTRA REGISTRATI · ANNULLA"` (id `#cextra-undo-toast`)
- **Toast undo post-submit**: tap ANNULLA entro 4s → DELETE cascade su tutti gli ID inseriti + reload + re-render + toast secondario `"Registrazione annullata ↩️"`

**Timeline tab Oggi ridisegnata** (`renderOggi`, case `extra` nuovo):
- Eyebrow timeline: `"PIANIFICATI · REGISTRATI"` → `"PASTI · PACCHETTI · EXTRA · IN ORDINE CRONOLOGICO"`
- `tlExtraEvents` da `ST.extras.filter(x => x.date === ST.activeDay)` mergiati con `tlMealEvents` + `tlSuppEvents`, sort cronologico per slot
- Card extra (`.oggi-v3-event` + `.oggi-v3-event-extra`):
  - Thumb 36×36 tinted via `getCatalogTint({categoria})` (lookup catalogo via `supplement_codice` o `supplement_name`)
  - Nome Syne 600 14px + meta Mono 10px `"{kcal} KCAL · {dose} {UNIT}"` + macro inline `kcal → C → P → G` (regola dominio "tutte o nessuna" se ≥1 > 0)
  - Tag `EXTRA` Mono caps 9.5px tracking 1.4 mint `#E6F4F2` + evergreen `#2A7A6F`
- Niente check ✓ (l'evento È la registrazione, no "pianificato vs registrato")
- Niente × o ▼ visibili → tap su card → modal conferma `"Eliminare la registrazione extra?"` (info-modal-overlay z-index 1600) → `doDeleteExtraFromTimeline()` → DELETE riga + reload + toast `"Extra eliminato 🗑️"`
- Macro extras conteggiate in `dayTotals` via `_extrasV3Totals(day)` (limitato a `ST.activeDay` perché `ST.extras` è caricato solo per la data attiva; storico passato resta sul pattern legacy)

**Tab Storico — minimal patch** (decisione esplicita design):
- Tag `EXTRA ×N` Mono caps 8.5px tracking 1.4 mint+evergreen accanto alla data della card giorno attivo (today) se `ST.extras.length > 0` per quella data
- Drilldown via tap sulla card → `goToDay(date)` → tab Oggi mostra i singoli extras con tag
- **Niente restyle tab Storico** — resta layout legacy. Refresh completo Storico v3 in giro futuro dedicato

**Animazioni transizione catalogo → conferma extra**:
- Slide-up nuovo overlay 280ms `cubic-bezier(.16,1,.3,1)` via `@keyframes cextraSlideUp`
- Card prodotto entrano in stagger 40ms per le prime 3 visibili (`animation-delay`) — `@keyframes cextraCardIn` 240ms
- Banda `#FAC775` persistente in cima (continuità visiva catalog → conferma)
- Back ‹ INDIETRO: slide-down 220ms `@keyframes cextraSlideDown` via classe `.dismissing`
- Selezione catalogo preservata su back (catalog modal ritrova `ST.catalogSelected` intatto)
- CTA REGISTRA `:active` scale .98 100ms

**6 decisioni design chiuse con Claude Design**:
1. Orario default per-prodotto = ora corrente apertura (non un orario unico per tutta la selezione)
2. Tag `EXTRA` posizionato a destra timeline (gerarchia visiva: nome+meta a sinistra, tag a destra)
3. CTA `"REGISTRA N EXTRA"` Mono caps invariabile anche al singolare (riduce rumore visivo plurale/singolare)
4. Niente cross-reference pacchetto/extra (no indicatori "è anche nel pacchetto X")
5. Undo Mail iOS sulla rimozione card in Conferma (no conferma destruttiva immediata)
6. Macro `kcal·C·P·G` wrappabili su schermo stretto (no overflow forzato)

**4 decisioni architetturali chiuse**:
1. Schema `supplements_log` esteso (no nuova tabella)
2. Snapshot completo immutabile (no JOIN runtime su `nutrilite_catalog`)
3. Cleanup totale fantasmi via SQL `DELETE` (no migrazione retroattiva nello storico)
4. Tab Storico solo minimal patch (no restyle in questo giro)

### Stato funzioni chiave Integratori v3

| Funzione | Scopo |
|---|---|
| `loadPackages()` | Carica `supplement_packages` + `supplement_package_items` con `.eq('user_id', uid)` esplicito (fix `1c2a295` RLS leak admin). Reset `ST.packages = []` su ogni chiamata. Join client-side con `ST.supps` |
| `renderIntegratori()` v3 | Tab principale: pacchetti + extra + CTA. Helper `_suppDaysLeft`, `_suppIdsInAnyPackage`, `_extraSupps` |
| `openPackageEditor(id)` / `openExtraEditor(id)` | Apre overlay fullscreen `#package-editor-overlay` in mode `create`/`edit`/`extra` |
| `renderPackageEditor()` / `_renderPkgItemCard()` / `_renderExtraEditor()` | Render dinamico dell'overlay basato su `ST.packageEditor` |
| `savePackageEditor()` / `_pkgEditorPersistNewPackage()` / `_pkgEditorFlushMetaPending()` | Persistenza: CREATE insert pacchetto, EDIT debounce-save su meta |
| `pkgItemSet/Adjust(supplementId, field, delta)` | Stepper dose/mult/doses → riusa `updateSupp*` legacy con re-render forzato editor |
| `pkgEditorRemoveItem()` / `pkgEditorUndoRemove()` | Pattern undo toast 4s, commit DB allo scadere |
| `pkgEditorAddProduct()` | Apre catalogo con `ST.catalogContext = { mode:'addToPackage', packageId, time, alreadyInPackage }`. In CREATE mode persiste prima il pacchetto vuoto, poi apre catalogo |
| `openCatalogModal()` / `renderCatalogShell()` / `renderCatalogList()` | Modal catalogo v3: shell statica + content dinamico (search input persistente) |
| `_renderCatalogCardV3()` / `getCatalogTint()` | Render card + helper tinta+emoji |
| `setCatalogCategory(cat)` / `resetCatalogFilters()` / `clearCatalogSearch()` / `onCatalogSearchInput(v)` | Helper filtri catalogo |
| `importFromCatalog()` | Post-insert links nuovi supplements al pacchetto via `supplement_package_items` INSERT (se `ctx.mode === 'addToPackage'`). Già patched al Blocco 1 per pre-fill slot in step2 |

### Stato ST esteso per Integratori v3

```js
{
  // Blocco 1
  packages: [],                  // [{id, name, emoji, time, sort_order, items:[{id, supplement_id, sort_order, supplement:{...}}]}]
  packageEditor: null,           // { mode:'create'|'edit'|'extra', packageId, supplementId?, name, emoji, time, items, expandedItem, dirty, saving }
  catalogContext: null,          // { mode:'addToPackage'|'addExtra', packageId?, packageName?, packageTime?, time?, alreadyInPackage?:[codice...] }
  pkgRemoveItemConfirm: null,    // { supplementId, itemId, name } — toast undo
  pkgDeleteConfirm: false,       // modal conferma elimina pacchetto/extra
  pkgExitConfirm: false,         // riservato per modifiche non salvate
  // Blocco 2
  catalogCategoryFilter: 'TUTTI', // pill categoria attiva nel modal catalogo
}
```

### Cleanup legacy Integratori v3 — completato (commit `0724a63`)

Cleanup completo del codice legacy modulo Integratori v3 eseguito il **16 mag 2026 sera**. **14 simboli rimossi**, **366 righe nette eliminate**.

Lista item effettivamente rimossi:
- Funzioni Blocco 1: `renderIntegratoriLegacy`, `setSuppFilter`, `suppDragStart` / `suppDragOver` / `suppDrop` / `suppDragEnd`, `toggleSuppExpand`, `openAddSuppModal` / `closeAddSuppModal` / `saveNewSupp`
- HTML: `<div id="add-supp-modal">` orfano nel body
- Campi ST: `suppFilter`, `suppExpanded` (mai dichiarato in init, accessi lazy)
- Funzioni Blocco 2: `toggleCatalogRemove`, `selectAllCatalog`
- Campo ST: `catalogToRemove`
- Branch `hasRem` ("Da rimuovere") completo in `goToCatalogStep2()` + blocco delete in `importFromCatalog()` (~30 righe)

**Conseguenza Opzione A**: `importFromCatalog()` è ora **puramente additivo**. Niente più capacità di rimuovere supplements via catalogo. Le eliminazioni vivono solo in:
- Editor Pacchetto → `× Rimuovi dal pacchetto` (rimuove link `supplement_package_items`, supplement diventa extra)
- Editor Pacchetto → `Elimina pacchetto` (cancella pacchetto + tutti i suoi supplements in cascata, vedi sopra)
- Extra Editor → `Elimina dalla libreria` (cancella il singolo supplement extra)

**Falsi positivi nei marker legacy** (salvati grazie all'audit pre-rimozione, NON rimossi):
- `updateSuppSlotTime` — è viva, chiamata da `renderOggi()` timeline tab Oggi v3 (input `type="time"` dell'header gruppo integratori per bulk update dello slot). Il marker `// [LEGACY-INTEGRATORI-V3]` che le era stato apposto al Blocco 1 era errato. Sostituito con commento descrittivo del suo uso.
- `ST.suppSheet` — è vivo, è lo state del bottom sheet `+ Registra integratori` tab Oggi v3 (`openSuppSheet` / `closeSuppSheet` + render del body con ~14 occorrenze attive). La precedente documentazione che lo classificava legacy era errata.

## Tab Analisi v3 (18 maggio 2026)

Refresh totale della 3ª tab Nutrition. Coordinato da Claude Design (mockup hi-fi: Vista Settimana, Vista 6 Mesi, Dettaglio Giorno drilldown) ed eseguito da Claude Code in catena unica. Commit `09a2775`. APP_VERSION `v2026.05.18 · 17:04`.

### Cambio di nome e paradigma

- **Rinominata da "Storico" a "Analisi"** — sub-nav Nutrition ora: OGGI · INTEGRATORI · **ANALISI** · PIANO
- DOM element `#page-storico` → `#page-analisi`; alias retrocompat in `showPage` / `renderPage` / `nutriSubNav` per cache PWA stale o link salvati
- **Da "lista cronologica passiva" a "dashboard analitica di tendenze nutrizionali"**
- Obiettivo: capire pattern temporali, medie, distribuzione macro, aderenza zona nel tempo
- Il dettaglio giornaliero NON è più nella lista principale: vive nel drilldown overlay (tap su grafico/heatmap → timeline read-only)

### Struttura tab Analisi

**Header v3** (riusa pattern Oggi/Integratori v3):
- Accent bar `#FAC775` 3px + eyebrow data Mono caps "VEN 18 MAG · ANALISI" + titolo Syne 800 30px "Nutrition" + avatar IF
- Sub-nav pillole `oggi-v3-pill` con ANALISI attiva fill `#FAC775`

**Switch finestra temporale (sticky top sotto sub-nav)**:
- 4 pillole Mono caps tracking 1.4: `SETTIMANA · MESE · 3 MESI · 6 MESI`
- Attiva fill evergreen `#2A7A6F` + testo bianco
- Default: SETTIMANA corrente (lun-dom italiana)
- Cambio finestra: cross-fade 180ms `cubic-bezier(.16,1,.3,1)` sul content sotto
- **ANNO scartato** in chiusura design: troppo lungo per caso uso reale (l'utente non guarda quasi mai dati così aggregati per gestire la zona settimanale)

**Header navigazione date**:
- Eyebrow Mono caps dinamico: "QUESTA SETTIMANA" / "SETTIMANA SCORSA" / "MAGGIO 2026" / "MAR — MAG 2026" ecc.
- Range data sotto (Syne 700 18px) — solo per SETTIMANA, omesso per finestre lunghe
- Nav minimal `‹ ›` (cerchio 32px outline) — chevron destro disabilitato se vista corrente (offset = 0)
- Slide del contenuto in cambio offset (no animazione esplicita, sfrutta il re-render)

**3 stat card numeriche**:
- Card 1: **MEDIA KCAL/DIE** (es. "2222") + sotto "↑ 85 VS PREC." solo in SETTIMANA, oppure "KCAL/GIORNO" fisso su finestre lunghe
- Card 2: **GIORNI IN ZONA** (es. "5/7") + sotto delta giorni in zona (SETTIMANA) o "% ADERENZA" (finestre lunghe)
- Card 3: **PASTI MEDIA/DIE** (es. "3.4") + sub "22 TOTALI"
- Stile: Mono 700 24px numero + Mono caps 9px eyebrow + Mono 500 9.5px sub
- I confronti "vs prec." compaiono SOLO su SETTIMANA (sono troppo rari su finestre lunghe per essere informativi)

**Confronto settimana vs settimana** (riga compatta, SOLO vista SETTIMANA):
- Box Mono caps con sfondo `--s2`: "VS SETT. SCORSA · 11-17 MAG · ↑ 1 GIORNO IN ZONA · +85 KCAL MEDIA"
- Frecce ↑↓ colorate evergreen (positive) / terracotta (negative)
- Scompare su MESE / 3M / 6M

**Chart kcal giornaliere SVG custom** (`_analisiRenderAreaChart`):
- viewBox `340×160`, area gradient evergreen (`stop-opacity 0.32 → 0`), linea reale stroke `#2A7A6F` 2px round
- Linea target tratteggiata orizzontale (dashed `3 3` opacity 0.55) — target dinamico dal profilo, label "TGT 2326" allineato a destra
- Dot bianchi (`r=4`, fill bianco + stroke evergreen 1.5px) sui giorni con dati, cliccabili → `openDayDetailScreen(key)`
- **Dot vuoto + dashed su "oggi"** se nessun dato registrato (asciuga la settimana corrente in progress)
- **Asta verticale sotto** + dot terracotta `#C44434` sui giorni con extras registrati (segnale visivo non invasivo)
- Tap zone `r=14` invisibili più ampie per touch mobile
- Asse X: SETTIMANA mostra L/M/M/G/V/S/D + numero giorno; MESE mostra date a step ~6; 3M/6M mostra label MAG/APR/MAR/... sui primi giorni di ciascun mese
- Asse Y minimal: 3 tick (0, mid, max) con suffisso "k" sopra 1000
- yMax dinamico: `ceil(max(kcal, target) * 1.1 / 500) * 500`

**Heatmap status zona giorno-per-giorno** (`_analisiRenderHeatmap`):
- 4 colori cella: verde `#2A7A6F` (in zona ±2% target dinamici) · ambra `#FAC775` (quasi ±5%) · terracotta `#C44434` (fuori) · grigio `#DDD9D0` (no dati)
- Numero giorno Mono caps inside cella (bianco su sfondi colorati, t3 su grigio)
- Tap su cella → `openDayDetailScreen(key)` (skip cell empty/no-data senza dayData)
- Cella "oggi" con outline 2px evergreen
- Layout per finestra:
  - **SETTIMANA**: 7 celle in riga (`.w-week`), aspect-ratio 1, gap 4px
  - **MESE**: griglia 7×~5 con padding celle vuote inizio per allineare al lunedì (`.w-month`)
  - **3 MESI**: 3 mini-griglie mensili impilate verticalmente, ognuna con header mese in Mono caps
  - **6 MESI**: 6 mini-griglie mensili impilate verticalmente (scelta design: meglio leggibili impilate che affiancate su mobile)
- Header sezione mostra titolo "Aderenza 38/34/28" con i target dinamici reali del profilo
- Legenda 4 dot 9×9px Mono caps sotto

**Macro distribution chart** (`_analisiRenderMacroBars`):
- 3 barre orizzontali CARBO (ambra) / PROTEINE (evergreen) / GRASSI (terracotta)
- Per barra: label Mono caps + valore Mono 18px grammi + sub Mono caps "38% · TGT 38%" (% reale media vs target dinamico)
- Track barre 10px height + radius 6, fill % real
- **Tick verticale tratteggiato** 2px `#t1` sul valore target (rivela visivamente quanto sei lontano dalla soglia obiettivo)

### Drilldown "Dettaglio Giorno" (overlay slide-up fullscreen)

Tap su punto chart o cella heatmap → slide-up 240ms `cubic-bezier(.16,1,.3,1)` di un overlay fullscreen.

**Shell**:
- Background scrim `rgba(0,0,0,.4)` + screen bianco con accent bar `#FAC775` 3px
- Header: `‹ INDIETRO` Mono caps sinistra (chiude overlay con slide-down 200ms) + data Syne 700 (es. "Mer 15 mag 2026") centro + kebab `···` destra
- **Kebab visibile SOLO per giorni della settimana corrente** (editing è limitato a sett. attuale per principio "non riscrivere il passato")
- Tap kebab → menu compatto `daydetail-menu` con voce "Modifica giorno" + helper Mono caps "SOLO PER GIORNI DELLA SETT. CORRENTE"
- Tap "Modifica giorno" → `goToDay(date)` (chiude overlay + naviga tab Oggi a quella data)

**Sezione riepilogo "Com'è andata"**:
- Status zona pill colorato (NELLA ZONA / QUASI ZONA / FUORI ZONA / NESSUN DATO) + target dinamico inline (es. "38 · 34 · 28 ±2%")
- Riga kcal totali grandi (Mono 24px) + "su X obiettivo" piccolo grigio + delta colorato a destra (IN LINEA / +X OLTRE TARGET / -X VS TARGET)
- 3 barre macro orizzontali coerenti con tab Analisi principale (riusa `_analisiRenderMacroBars`)

**Sezione timeline "Cosa hai registrato"** (read-only):
- Eyebrow Mono caps "TIMELINE GIORNATA · READ-ONLY · N EVENTI"
- Eventi ordinati cronologici: pasti + pacchetti integratori + extras (snapshot dal pattern timeline tab Oggi v3, ma SENZA check/×/espansione)
- Card evento: ora Mono + icona slot + nome Syne 600 + meta Mono caps + kcal + tag PACCHETTO/EXTRA opzionale
- NO interazioni dirette sulle card (la modifica è centralizzata via kebab header)
- Empty state "Nessun evento registrato" se 0 eventi quel giorno

**Limitazione cache locale documentata**:
- `ST.extras` è popolato solo per `ST.activeDay`
- Drilldown su date passate ≠ activeDay mostra 0 extras V3 nella timeline (i pasti e supps standard restano visibili perché in `ST.db.days[key]`)
- Edge case accettabile per dashboard storica — il "vero" editing si fa via "Modifica giorno" che ricarica il giorno come activeDay

### Architettura tecnica

**Dati**:
- Tutti calcolati client-side da `ST.db.days` cache locale già esistente
- **Nessuna query Supabase nuova** (decisione architetturale "B" chiusa in design)
- `ST.extras` (V3) limitato a activeDay come prima
- Refresh strategy "A" (chiusa in design): **ridisegno totale dei grafici a ogni interazione**, no cache complessa, no invalidazione granulare

**Grafici SVG custom**:
- Strategia "B" (chiusa in design): SVG scritto a mano (no Chart.js, no Recharts, no ApexCharts)
- Vantaggi: zero dipendenze nuove, layout 100% controllato, bundle size invariato, animazioni native CSS
- 3 componenti riusabili: `_analisiRenderAreaChart` · `_analisiRenderHeatmap` · `_analisiRenderMacroBars`

**Empty state onesto**:
- Decisione "A" (chiusa in design): mostrare sempre tutto anche con dati parziali
- Nota Mono caps "DATI PARZIALI · N/X GIORNI" sopra le stat card se i giorni con dati < giorni della finestra (per settimana corrente: < giorni passati di questa settimana)
- Stato totalmente vuoto: empty state centrato 📊 + "Nessun dato in questa finestra"

**Target macro percentuali — fix critico in chiusura**:
- Letti DINAMICAMENTE da `ST.TARGET.pCarbo` / `ST.TARGET.pProt` / `ST.TARGET.pFat`
- Esempio Ignazio: `38/34/28` (calcolato da `calcAdaptedTargets` per obiettivo ricomposizione/forza+performance)
- Fallback `40/30/30` (Zone classica) se i campi mancano
- Tolleranza status zona: ±2% in zona, ±5% quasi zona (più stretta della heroCard tab Oggi v3 ±5/±10 per coerenza "dashboard è più severa")

### 4 dubbi residui chiusi in design

1. **Heatmap 6 MESI**: scelta layout mini-griglie mensili impilate verticalmente (NON affiancate). Più leggibile su mobile, scroll naturale.
2. **Dati parziali**: nota onesta "DATI PARZIALI · N/X GIORNI" sempre visibile quando applicabile (non nasconde la realtà al utente).
3. **Target kcal nel chart**: linea tratteggiata orizzontale con marker label "TGT 2326" allineato a destra. Sempre visibile.
4. **Kebab "Modifica"**: visibile SOLO per giorni della settimana corrente. Per giorni passati il drilldown è puramente read-only (principio "non riscrivere il passato senza intenzione").

### 5 cambi finali (chiusura design + implementazione)

1. **Switch finestra**: SETTIMANA/MESE/3M/**6 MESI** (sostituito ANNO che era nel mockup originale — troppo lungo per il caso uso reale)
2. **Target macro %**: letti dinamicamente da profilo (Ignazio 38/34/28), NON più hardcoded 40/30/30
3. **Confronto "vs prec."**: SOLO in SETTIMANA. Su finestre lunghe i confronti sono rari e poco utili
4. **Heatmap 3M/6M**: griglie mensili impilate verticalmente, no affiancate (mobile-first)
5. **Tolleranza status zona Analisi**: ±2% in zona / ±5% quasi (più severa della tab Oggi v3 ±5/±10 — appropriato per dashboard analitica)

### Stato funzioni chiave Analisi v3

| Funzione | Scopo |
|---|---|
| `_analisiGetWindowRange(window, offset)` | Calcola `{start, end}` Date oggetti della finestra (`SETTIMANA`/`MESE`/`3MESI`/`6MESI`) all'offset specifico (0=corrente, -1=prec) |
| `_analisiGetWindowLabel(window, offset, start, end)` | Genera `{eb, range}` per header navigazione (es. "QUESTA SETTIMANA" + "11 — 17 MAG 2026") |
| `_zoneStatusForDayKey(key)` | Status zona giornaliero `inZone`/`almostZone`/`outOfZone`/`noData` con tolleranza ±2/±5% sui target dinamici |
| `_analisiCollectDays(start, end)` | Itera tutti i giorni del range, ritorna array `{date, key, dayData, totals, status, mealsN, extrasN}` |
| `_analisiAggregate(days)` | Aggregati: medie kcal/macro, giorni in zona, pasti totali/media, distribuzione macro % |
| `_analisiRenderAreaChart(daysData, targetKcal, windowKind)` | SVG path area gradient + linea + dot cliccabili + asta extras + asse X/Y minimal |
| `_analisiRenderHeatmap(daysData, kind)` | Celle status zona (`week`/`month`/`multi-month` layouts) |
| `_analisiRenderMacroBars(agg, target)` | 3 barre orizzontali C/P/G + tick tratteggiato sul target |
| `renderAnalisi()` | Entry point: orchestrazione shell + content |
| `renderAnalisiShell()` | Header v3 statico + switch finestra (1 chiamata per session tab) |
| `renderAnalisiContent()` | Content dinamico (cambia su switch finestra e nav date) — re-render totale |
| `setAnalisiWindow(window)` | Handler pillola switch (reset offset = 0 al cambio finestra) |
| `setAnalisiDateOffset(offset)` | Handler nav "‹ ›" date (clamp offset ≤ 0, mai nel futuro) |
| `openDayDetailScreen(dateStr)` | Apre overlay drilldown fullscreen slide-up |
| `renderDayDetailScreen()` | Render dell'overlay (riepilogo + timeline read-only) |
| `closeDayDetailScreen()` | Slide-down + cleanup `ST.dayDetailScreen` |
| `dayDetailToggleMenu()` | Toggle menu kebab "Modifica giorno" (visibile solo settimana corrente) |
| `dayDetailModifyTap()` | Chiude overlay + `goToDay(date)` → naviga tab Oggi per editing |

**Totale: 18 funzioni nuove** + State esteso (`ST.analisi`, `ST.dayDetailScreen`) + DOM `#page-analisi` + ~150 righe CSS `.analisi-v3-*` / `.daydetail-*`.

### Funzioni marcate legacy `[LEGACY-STORICO-V3]`

- `renderStorico` → rinominata `renderStoricoLegacy`, non più chiamata dal routing
- `setReportRange` — no-op pratico (guard `typeof === 'function'`)
- CSS `.storico-extra-tag` — commento legacy nell'header del blocco
- Alias `'storico'` in `showPage` / `renderPage` / `nutriSubNav` — retrocompat cache PWA stale, costo runtime zero
- Rimuovere tutti questi item in cleanup separato dopo verifica produzione stabile (vedi "Da rifinire")

## Tab Piano v4 — Visione + Roadmap (19 maggio 2026)

Design completo del refresh tab Piano chiuso il **19 maggio 2026** in 2 round Claude Design (Round 1: 3 mockup base + 6 decisioni residue chiuse; Round 2: estensione con architettura check fisici a 2 livelli + 6 nuovi dubbi chiusi). 12 decisioni di design chiuse totali. Decisione di implementazione presa da Ignazio: **Opzione 3** (tutto tranne notifiche push iOS).

### Cambio di paradigma

- **Da pagina "consultazione setup statica"** (legacy: target 40·30·30, piano AI textarea, priorità cliniche) **→ "coach attivo settimanale evolutivo"**
- **Filosofia**: "AI propone, utente decide" — niente automazione cieca, trasparenza ("PERCHÉ TI PROPONGO QUESTO"), no gamification ansiogena
- **Livello 4 — Coach Evoluto con equilibrio**: il coach impara dalle scelte settimanali dell'utente (accettazioni, sostituzioni, skip) e propone aggiustamenti progressivi senza forzare nessuna automazione

### Ritmo settimanale

- **Piano statico per settimana (lun-dom)**: una volta generato, il piano resta fisso fino al refresh successivo
- **AI gira UNA volta a settimana** per generare il prossimo piano basandosi su:
  - Settimana conclusa (pasti registrati, sostituzioni, skip)
  - Memoria progressiva (preferenze e contesti accumulati nel tempo)
  - Trend peso settimanale (per piccole correzioni nutrition)
  - Check M2 completo (ogni 4 settimane: peso + circonferenze + foto + esami → guida adattamento sostanziale piano nutrition + training mesociclo successivo)
- **Utente sceglie giorno+ora di generazione piano** — preset `VEN/SAB/DOM` + `PERSONALIZZATO` (combobox custom). Default in onboarding M1 esteso: `DOM 20:00`

### Architettura "check fisici a 2 livelli"

**Livello 1 — Peso flessibile on-demand**:
- Utente sceglie modalità di pesata in onboarding: `OGNI GIORNO` / `OGNI 3 GIORNI` / `OGNI SETTIMANA` / `LIBERO` (default `LIBERO`)
- Pesata via modal bottom sheet (stepper +/−0.1kg + tap numero per keyboard iOS)
- Trend peso entra in `weight_logs` Supabase, accessibile a AI per piccole correzioni settimanali
- **Reminder gentile banner** in tab Oggi se ≥14 giorni senza pesata (anti-nag: silenzio progressivo `dismiss → 48h pausa → 7gg pausa → 28gg pausa` se ripetutamente dismissed)
- Card peso in tab Piano: numero attuale + sparkline 30 giorni + CTA "Pesati ora"
- D1 (settimana 1 onboarding): card visibile con sparkline vuota + messaggio invito "Inizia a pesarti per vedere il trend" (no nascondere)

**Livello 2 — M2 check completo ogni 4 settimane (mesociclo)**:
- Già esistente (vedi sezione M2 Check Fisico — versione funzionale 13 maggio 2026)
- Peso + circonferenze + foto + blood work
- Guida adattamento **sostanziale** piano nutrition + piano training mesociclo successivo (target_kcal, macro adattati, eventuale cambio obiettivo)
- Trigger differenziato dal Livello 1: il peso flessibile aggiusta in continuo (correzioni piccole), il check M2 ridefinisce i target periodicamente

### 5 schermate hi-fi chiuse

1. **Tab Piano vista principale** (sostituisce `renderPiano` legacy):
   - Header settimana corrente (es. "Settimana del 19 mag 2026") + nav `‹ ›` per scorrere settimane future/passate
   - Card stato "ATTIVO · 5/7 GIORNI SEGUITI" con barra 7 segmenti (verde per giorni in zona, ambra per quasi, terracotta per fuori/skip)
   - 7 card giorno (lun-dom) con chip pasti emoji (colazione/spuntino/pranzo/merenda/cena), tap → overlay Dettaglio Giorno
   - Sezione **Memoria AI** scheda paper-cream `#F8F4EB`: top 4-5 preferenze più salde apprese dall'AI (es. "Preferisce pesce 3x/settimana", "Evita burro e formaggi stagionati", "Venerdì sera fuori pasto"), CTA "VEDI TUTTE ›" → lista completa
   - Card **peso flessibile**: numero attuale + sparkline 30gg + CTA "Pesati ora"
   - Profile compatto in fondo (obiettivo + target_kcal + macro % + modalità tracking peso)

2. **Dettaglio Giorno overlay** (slide-up, pattern da `daydetail-overlay` Analisi v3):
   - Pasti proposti dall'AI con macro complete + ingredienti
   - Box italic **"PERCHÉ TI PROPONGO QUESTO"** sotto ogni pasto: spiegazione AI in 1-2 frasi (es. "Hai dichiarato di preferire il pesce e ieri non hai raggiunto le proteine target")
   - 3 azioni per pasto: **ACCETTA** (scrive in `meals` di tab Oggi) / **SOSTITUISCI** (placeholder V1) / **SALTO** (marca acceptance + segnala AI per non riproporre)

3. **Welcome overlay domenicale** (sostituisce notifica push — Opzione 3):
   - Trigger: prima apertura dell'app nel giorno+ora scelti dall'utente (default DOM 20:00) E piano per settimana successiva pronto in DB
   - Overlay fullscreen con "Piano della prossima settimana pronto"
   - Diff card "Adattamento proposto" se l'AI ha modificato target (es. "Calorie ridotte da 2326 → 2200 kcal in base al trend peso +0.4kg/settimana")
   - CTA: "Vedi piano →" / "Più tardi"

4. **Modal "Pesati ora"** (bottom sheet):
   - Stepper Mono 32px `−` numero `+` (step 0.1kg)
   - Tap sul numero → apre keyboard iOS native (input type=number)
   - Default = ultimo peso registrato (se esiste in `weight_logs`)
   - CTA "Conferma" → insert `weight_logs` + toast + refresh card peso in Piano + refresh sparkline

5. **Banner reminder pesata** (solo tab Oggi):
   - Visibile in tab Oggi se ≥14 giorni senza pesata
   - Posizionato sopra timeline pasti (non in Piano per evitare invadenza)
   - Banner dismissable + anti-nag rule (silenzio progressivo 48h → 7gg → 28gg dopo dismiss ripetuti)
   - Copy: "Sono passati X giorni dall'ultima pesata. Vuoi aggiornare il trend?"
   - CTA "Pesati ora" (apre modal) / "Più tardi" (dismiss con timer anti-nag)

### 12 decisioni chiuse (Round 1 + Round 2)

1. **Giorno generazione piano**: switch con 3 preset `VEN/SAB/DOM` + `PERSONALIZZATO` (combobox custom). Default DOM 20:00. Preferenza salvata in `profiles`
2. **Contatore "X/7 giorni seguiti"**: conta accettati + sostituzioni che restano in zona macro (premia aderenza nutrizionale, non obbedienza letterale al pasto proposto)
3. **Memoria AI**: top 4-5 preferenze più salde mostrate in evidenza + CTA "VEDI TUTTE ›" per lista completa (no esposizione totale ansiogena)
4. **Bottone RIGENERA**: solo giorni futuri non ancora arrivati; il passato resta fisso come riferimento storico (no rewriting della storia)
5. **Settimana 1 onboarding**: piano AI generato subito al termine M1 con dati profilo + tag "Costruito su M1, si raffinerà con l'uso" (no attesa fine settimana per primo piano)
6. **Card peso D1**: visibile con sparkline vuota + messaggio invito (no nascondere — meglio rendere visibile la possibilità che nasconderla)
7. **Modal peso**: stepper +/−0.1kg + tap numero per keyboard iOS (combinazione, no XOR)
8. **Trend chart sparkline**: statico in V1, no interattività (no tap su punto → drilldown)
9. **Banner reminder pesata**: solo tab Oggi (non in Piano — anti-invadenza, il Piano deve essere uno spazio "calmo")
10. **Adattamento AI nutrition**: inserito in welcome overlay domenicale come diff card (concentra il messaggio nel momento "settimanale" invece di sparpagliarlo)
11. **Onboarding M1 estensione 2 nuove preferenze**: TRATTENUTO per sessione dedicata futura. Per ora default DOM 20:00 + flessibile 14gg, modificabili dal modal impostazioni profilo
12. **Notifiche push iOS PWA**: NON in V1 (Opzione 3 scelta). Welcome overlay domenicale è sufficiente per concentrare il messaggio del coach al primo apertura nel giorno scelto. Push iOS rimandata a V2 post-stabilizzazione Tab Piano v4

### Roadmap implementazione (9 sessioni Step A→I)

Decisione utente Ignazio: **Opzione 3** (tutto tranne notifiche push iOS). Implementazione sequenziale con deploy in produzione tra ogni step per validazione progressiva con tester.

- **Sessione 1 — Step A** ✅ (20 mag 2026, commit `d08ee4d`): **Fondazione dati Supabase**
  - Tabelle nuove: `weekly_plans`, `weekly_plan_meals`, `weekly_plan_acceptance`, `ai_memory`, `weight_logs`
  - Update `profiles` con 2 nuovi campi: `plan_generation_day` (text 'fri'|'sat'|'sun'|'custom'), `plan_generation_time` (text HH:MM), `weight_tracking_mode` (text 'daily'|'every3'|'weekly'|'flexible')
  - Migrazioni DDL + RLS policies (4 policy `own_*` per ogni tabella + eventuale admin policy)

- **Sessione 2 — Step B** ✅ (20 mag 2026, catena 7 commit `272e375`→`2984704`, APP_VERSION finale `v2026.05.20 · 16:01`): **UI Tab Piano vista principale v4 — scaffolding completo**
  - Feature flag `ST.pianoV4Enabled` — ✅ rimosso (commit `8f46576`). `renderPiano` e `generatePianoAI` eliminate insieme.
  - Nuova funzione `renderPianoV4()` parallela a `renderPiano` legacy (rinomina rimandata a Step I)
  - Helper utility: `getPianoV4WeekStart(offset)`, `formatPianoV4WeekLabel(date)`, `getPianoV4Days(weekStart)`
  - 6 blocchi visivi: accent bar + header v3, nav settimane `‹ ›`, card stato sand `#FDF7E8` (hint contestuali), 7 card giorno dashed con badge OGGI, card Memoria AI bone + bordo top giallino `var(--mod-nutrition)`, card peso `getLatestBodyData()` + sparkline placeholder + CTA disabled tratteggiato grigio, profile compatto grid 2×2 con CTA `MODIFICA ›` → `openSettingsModal()`
  - Tutto in stato D1 (settimana 1 onboarding): nessuna fetch Supabase, contatore `0/7`, sparkline placeholder
  - Regola tipografica v2 applicata: numeri JetBrains Mono (TARGET kcal, MACRO %, peso 32px), testi Syne (OBIETTIVO, PESO modalità, hint contestuali). Pattern modifier `.pianov4-profile-value--mono` riusabile
  - Pausa per validazione tester prima di Sessione 3

- **Sessione 3 — Step C** ✅ (20-21 mag 2026, catena 8 commit `5384085`→`2f041f7`, APP_VERSION finale `v2026.05.21 · 11:15`): **Overlay Dettaglio Giorno completo**
  - Slide-up 240ms `cubic-bezier(.16,1,.3,1)` famiglia `.pianov4-day-*` parallela a `.daydetail-*` di Analisi v3 intatta
  - 5 pasti demo always-on per tutti i tester (no flag mock, decisione product 20 mag)
  - Banner "ESEMPIO DIMOSTRATIVO" sand+giallino chiarisce tester che sono dimostrativi
  - Totalizzatore giorno con feedback range ±10% vs `ST.TARGET.kcal` (3 stati: in-range evergreen / under ambra / over ambra) + counter "· N saltato/i"
  - Card pasto con header + macro + ingredienti + box italic "PERCHÉ TI PROPONGO QUESTO" (tono consulenza commerciale Nutrilite/XS educata)
  - 3 azioni ACCETTA + SOSTITUISCI + SALTO funzionanti con persistenza localStorage namespace `zona_pianov4_demo_*`
  - SOSTITUISCI apre bottom sheet con 3 alternative dimostrative per slot (15 totali) + reset to original
  - SALTO toggle reversibile via "↺ ANNULLA" + card barrata opacity 0.65 + escluso da totalizzatore
  - Precedenza badge: accepted > skipped > substituted (pasto accettato non sostituibile né saltabile)
  - Costante globale `SLOT_MAP_DEMO_TO_LEGACY` riusabile in Step F per writer AI piano → meals
  - Fix ortografico `pescatariano → pescetariano` ovunque
  - Safe-area iPhone notch su header overlay
  - 8 sotto-step: C.1 scaffolding · C.2 empty state + safe-area · C.2.1 rimossa emoji 📅 (icon system custom rimandato post-I) · C.3 5 demo + banner · C.4 ACCETTA + dbAddMeal · C.4.1 diagnostica bug slot · C.4.2 fix `SLOT_MAP_DEMO_TO_LEGACY` + SQL cleanup · C.5 SOSTITUISCI + totalizzatore + fix ortografico · C.6 SALTO Opzione A card barrata

- **Sessione 4 — Step D** (PROSSIMA, dopo investigazione integratori macro + comunicato tester): **Modal peso + banner reminder**
  - Bottom sheet stepper +/−0.1kg + keyboard iOS
  - Logica `weight_logs.insert()` + toast conferma + refresh card peso in Piano
  - Banner anti-nag in tab Oggi (≥14gg senza pesata, silenzio progressivo 48h/7gg/28gg via timestamp `weight_reminder_dismissed_at` in localStorage)

- **Sessione 5 — Step E ridotto**: **Welcome overlay domenicale (senza push)**
  - Overlay automatico al primo apertura app nel giorno+ora scelti (check `lastWelcomeShown` in localStorage per evitare re-show stesso giorno)
  - Diff card "Adattamento proposto" se AI ha modificato target nel piano nuovo
  - **NIENTE notifiche push iOS** (Opzione 3 — taglio strategico per evitare complessità PWA push su iOS Safari)

- **Sessione 6 — Step F.1 ✅ (23 mag 2026)**: **Postino draft `weekly_plans`** (Modo 1 "obiettivi invariati")
  - NO Cloudflare Worker cron — il postino gira **all'apertura app** nei 3 rami di `loadAndStart`, PRIMA delle chiamate welcome. Decisione architetturale: niente infrastruttura cron, sfrutta il login/wake dell'utente.
  - Crea solo la riga-madre `weekly_plans` con `status='draft'` e i 4 target copiati dal profilo senza adattamento. L'adattamento AI sui numeri (Modo 2) resta per Step G.
  - `ai_reasoning` scritto da `callAI(prompt, 200)` (voce coach, italiano, prima persona, max 2-3 frasi, variante "obiettivi invariati") con fallback fisso `_PIANOV4_POSTINO_FALLBACK_REASONING` se AI fallisce.
  - Anti-doppione SELECT + gestione `unique_violation` (23505) — il postino non duplica MAI.
  - Welcome overlay (Step E) coerente: `timeOk` neutralizzato (forza true), `plan_generation_time` resta dormiente per future push V2.
  - Forzature collaudo: `?genera=1`, `ztTestGenera()`, `?generaDebug=1`, `ztGeneraWhy()`.
  - Toast del postino con data IT `DD/MM/YYYY` (helper `_pianoV4IsoToItDate`) + durata 5500ms (`showToast` esteso con terzo parametro retro-compatibile, solo i 5 toast del postino lo usano).
  - Commit: `0fbbe86` (postino) + `74c51c5` (ritocchi toast). APP_VERSION `2026.05.23 · 15:08`.

- **Sessione 7 — Step F.2a ✅ (23 mag 2026 sera)**: **Generazione pasti pranzo + cena via AI** (14 pasti = 7 pranzi + 7 cene)
  - Subito dopo il postino F.1 (riga-madre `weekly_plans`), genera anche i pasti figli `weekly_plan_meals`. SOLO pranzo + cena in F.2a; colazione + merenda = F.2b separato.
  - Ripartizione calorica standard tutti gli utenti: Colazione 25% / Merenda 15% / **Pranzo 35%** / **Cena 25%**. Bersagli per pasto calcolati a runtime dai `target_*` del profilo (`_pianoV4F2aTargets`).
  - **Una sola chiamata** `callAI(prompt, 2000)` per tutti 14 pasti, JSON rigido, parser/validator robusto (`_pianoV4F2aParseAndValidate`): 14 pasti, copertura completa 1..7 × {pranzo,cena}, campi obbligatori (`day`, `slot`, `description`). MAI throw.
  - **Opzione A**: riga-madre F.1 creata SEMPRE, indipendentemente dall'esito pasti. Se F.2a fallisce → draft resta senza pasti, welcome overlay annuncia comunque, no rollback.
  - Funzioni nuove: `_pianoV4F2aTargets`, `_pianoV4F2aBuildPantry`, `_pianoV4F2aBuildPrompt`, `_pianoV4F2aParseAndValidate`, `_pianoV4GenerateAndInsertMeals`. Hook in `_pianoV4MaybePostino` DOPO INSERT riga-madre. Anti-doppione doppio (skip-existing di F.1 + guard `plan_id` pre-INSERT).
  - Convenzioni DB: `day_of_week` 1=LUN..7=DOM ISO; `slot` ∈ {'pranzo','cena'} (CHECK ammette colazione/spuntino/pranzo/merenda/cena); `sort_order` pranzo=1/cena=2.
  - **Prompt irrobustito in 3 giri di collaudo dal vivo** (lezione chiave: il coach AI va affinato iterativamente):
    1. Giro 1 (`4bc94eb`): funziona meccanicamente ma INVENTA ("Pollo di mare" per pescetariano) e ripete giorno 7.
    2. Giro 2 (`76cb793`): 10 regole ferree + DISPENSA AMMESSA (`_pianoV4F2aBuildPantry` whitelist categorie ingredienti per dieta+intolleranze) + divieto invenzione + divieto mascheramento (esempio negativo esplicito "pollo di mare") + varietà ingredienti + attenzione giorno 7. Risolto: ingredienti veri, no latticini, 7 giorni diversi.
    3. Giro 3 (`8ae2dda`): VARIETÀ DI STRUTTURA — tavolozza A piatti unici/zuppe, B cotture pesce variate NO crudo/tartare, C schema pranzo/cena variabile, D proteine protagoniste legumi/uova. Risolto: niente più monotonia "carbo+pesce / pesce+contorno".
  - **Toast voce coach** (`e966956`): rimossi termini interni "Postino"/"draft"/"INSERT" dai messaggi visibili. Testi finali: "Il coach ha generato il tuo piano per la settimana del DD/MM/YYYY" (5500ms) + "Il coach ha preparato pranzi e cene della settimana" (7500ms). Termini tecnici restano solo in console.log.
  - Collaudo dal vivo positivo su profilo Ignazio (2326 kcal pescetariano + no lattosio): 14 pasti, pranzi ~800-830 / cene ~570-600 kcal, ingredienti reali, intolleranze rispettate, varietà piena ingredienti+struttura.
  - Catena commit: `4bc94eb` + `76cb793` + `8ae2dda` + `e966956`. APP_VERSION finale `2026.05.23 · 21:56`.

- **Sessione 8 — Step F.2b ⏸ STAND BY (non eliminato)**: **Colazione + merenda** (= il restante 40% calorico riservato)
  - **Decisione 23 mag sera (post-F.2a)**: colazione e merenda lasciate alla gestione libera dell'utente; il coach genera SOLO pranzo + cena (F.2a). La ripartizione 25/15/35/25 protegge comunque il 40% — il coach punta solo al 60% — quindi l'utente ha lo spazio per gestire i due pasti a mano senza sforare la giornata. F.2a è di fatto il punto d'arrivo della parte automatica del modulo Nutrition per questa fase.
  - Riattivazione futura prevista se in onboarding M1 esteso l'utente sceglierà esplicitamente "voglio che il coach pensi anche a colazione e merenda" (vedi idea onboarding in sezione "Note e scoperte"). Logica/architettura di riferimento: riuso F.2a (stesso pattern `_pianoV4F2aBuildPrompt` + parser/validator + INSERT batch + DISPENSA).
  - Specifica originale archiviata (per riattivazione): 7 colazioni (25%) + 7 merende (15%) per draft, slot `'colazione'`/`'merenda'`, colazione standardizzata per utente (dolce/salato + tipo bevanda), merenda spesso = barretta energetica.

- **Sessione 9 — Step G**: **Logica adattamento + memoria AI**
  - Worker (o postino esteso, da decidere in G) legge `weight_logs` settimanali, calcola trend peso (slope linear regression su 14gg), propone adattamento target_kcal (Modo 2)
  - Aggiorna `ai_memory` con preferenze apprese dalle azioni utente (es. "preferisce pesce" se 3+ sostituzioni con pesce, "evita burro" se SALTO ripetuto su pasti con burro, "venerdì fuori" se SALTO ricorrente venerdì sera)
  - Logica "AI propone, utente decide": no automatismi sui target — l'utente conferma manualmente via diff card nel welcome overlay

- **Sessione 10 — Step H**: **Integrazione bidirezionale tab Oggi**
  - Registra pasto in Oggi → sistema verifica se il pasto è pianificato per quel giorno+slot
  - Match → marca `weekly_plan_acceptance.status='accepted'` automaticamente
  - No match in zona macro → marca `status='substituted'` (conta nel "X/7 giorni seguiti")
  - No match fuori zona → marca `status='off_plan'` (NON conta nel contatore)
  - Contatore "5/7 giorni seguiti" real-time in card stato

- **Sessione 11 — Step I**: **Update CLAUDE.md + cleanup legacy**
  - Marca `renderPiano` (versione legacy) → `renderPianoLegacy`
  - Aggiorna routing `showPage`/`renderPage` per puntare a `renderPianoV4`
  - Documentazione finale completa Tab Piano v4 production-ready
  - Roadmap successive (V2): notifiche push iOS, SOSTITUISCI funzionante con catalogo pasti AI, food input multi-modale integrato


## Workflow git (aggiornato 12 maggio 2026)

Claude Code esegue **tutto il ciclo completo**: edit + commit + push + deploy.

**Regola d'oro**: per OGNI modifica, Claude Code DEVE fornire un resoconto strutturato con questi 6 punti:

1. **File modificati**: percorso completo (worktree incluso) di ogni file toccato
2. **Cosa è cambiato**: sintesi puntuale delle modifiche (1 bullet per modifica)
3. **Commit hash + branch**: hash breve (es. `a64d743`) e nome branch
4. **Stato push**: confermare push avvenuto su `origin/main` (sì/no, eventuali errori)
5. **Tempo stimato propagazione**: GitHub Pages tipicamente ~1-3 min dopo push
6. **Versione/tag del rilascio**: incremento versione o tag (es. `v1.4.2` o data ISO)

**Niente operazioni git silenziose.** Se Claude Code esegue git push senza resoconto, è una violazione del workflow.

**Regola permanente — test prima del commit (aggiunta 11 giu 2026)**: mai eseguire commit/push senza prima aver eseguito (o fatto eseguire a Ignazio) il test definito nel brief. Se il test non è eseguibile autonomamente, fermarsi e chiedere conferma prima di procedere.

**Worktree management**: indicare sempre quale worktree è attivo. Se ne viene creato uno nuovo, dichiararlo all'inizio della sessione.

## Lezioni di metodo (per sessioni future)

Sette principi distillati da incidenti reali — leggere PRIMA di affrontare anomalie o feature che leggono/scrivono dati persistenti.

### 1. Il DB è la fonte di verità, non il codice né questo file

Sessione 4 (22 mag 2026, fix triplo render barretta): la diagnostica via codice produsse "3 row DB distinte da 3 gesti utente". L'utente eseguì una SELECT reale e il DB rivelò **1 sola riga** in `supplements_log` — bug di RENDERING, non di scrittura. Quel SELECT cambiò radicalmente la natura del fix.

Stesso pattern: CLAUDE.md ha portato fuori strada 2 volte in una giornata (schema `supplements_log` documentato come "+9 colonne applicate il 18 mag" → smentito dall'utente con `SELECT column_name FROM information_schema.columns`; previsione "dose fallback farà X" → smentita dal comportamento reale post-migration).

**Regola operativa**: davanti a un'anomalia o a una decisione che dipende dallo schema/dato, **PRIMA contare/ispezionare le righe reali nel DB**, POI guardare il codice. Mai assumere lo schema dal codice o dalla documentazione.

### 2. SQL Editor Supabase: `auth.uid()` non funziona, serve UUID esplicito

Il SQL Editor gira come ruolo admin (non come utente app), quindi `auth.uid()` ritorna NULL e tutti i WHERE basati su quello sono no-op. Per ispezionare dati utente serve filtrare con UUID hardcoded.

UUID di riferimento:
- **Ignazio** (utente principale + dev): `bb6fa499-1364-4d8d-8ce6-774c8e392306`

Per scoprire lo schema reale di una tabella (più affidabile di indovinare nomi colonna):
```sql
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'supplements_log';
-- oppure più rapido:
SELECT * FROM supplements_log LIMIT 1;
```

### 3. Prompt AI = scatola opaca, verificare la fonte dati PRIMA di costruirvi sopra

Step D.3 R3a (22 mag pomeriggio): la lezione del fix barretta fece scattare un audit obbligatorio prima di scrivere il prompt: "qual è la struttura ST che alimenta il blocco INTEGRATORI ASSUNTI? Produce contenuto reale o vuoto?".

Risultato dell'audit: `ST.extras = []` perché `loadExtras` falliva silenziosamente. Senza l'audit, il fix R3a sarebbe stato "implementato" ma sempre silente in pratica — peggior caso: lavoro che sembra fatto ma non sblocca nulla.

**Regola operativa**: prima di costruire una feature AI o un blocco di prompt, FERMATI e produci un esempio CONCRETO del contenuto che verrà passato al modello per la giornata corrente dell'utente. Se è vuoto, capisci PERCHÉ è vuoto, non riempire con dati finti.

### 4. Snapshot con fallback (pattern per dati storici)

Step D.3 `loadExtras` introdusse il pattern definitivo per i dati storici tipo "registrazione utente che dipende da catalogo esterno":

- **Snapshot al momento della registrazione** salvato sulla riga DB (`kcal, carbo, proteine, grassi, dose, dose_unit, supplement_codice, costo`) → fonte di verità
- **Catalogo come RETE DI SICUREZZA**, mai fonte primaria → lookup runtime solo se snapshot è NULL (es. righe pre-migration)
- **Marker `_fromFallback: true`** sulle righe ricostruite via catalog → utile per UI diagnostiche future

Se invece il catalogo fosse fonte primaria, ogni modifica al catalogo riscriverebbe retroattivamente lo storico — comportamento sbagliato per "log immutabile di cosa l'utente ha consumato il giorno X". Snapshot+fallback preserva l'onestà storica.

### 5. Verifica pre-commit obbligatoria quando il fix cambia ciò che l'utente VEDE

Mattino 22 mag: fix `c32f141` (filtro `is_extra` in `loadTodaySuppLog`) fu committato con previsione "barretta sparirà dalla timeline finché non risolviamo lo schema". L'utente la previde, la accettò, ma serve disciplina perché senza la nota esplicita avrebbe potuto sembrare regressione.

Pomeriggio 22 mag: fix `b4259f5` (loadExtras + R3a) — STEP 3 ("verifica no-duplicato") fu OBBLIGATORIO pre-commit. Confermato che la barretta apparisse 1 sola volta e contasse 1 sola volta. Senza quella verifica avremmo potuto riaprire il triplo render appena chiuso al mattino.

**Regola operativa**:
- Quando un fix tocca rendering/totali → produrre un riepilogo "cosa cambia visibilmente per l'utente" PRIMA del commit, non dopo
- Quando 2 fix toccano lo stesso terreno (es. fix barretta mattino + loadExtras pomeriggio) → verificare esplicitamente l'interazione tra i due
- Quando un fix introduce nuova sorgente dati o nuovo path di lettura → tracciare l'effetto su tutti i path che leggono la stessa struttura

### 6. "Mostra A invece di B"? Verifica che B sia stato SCRITTO, prima di indagare la lettura

Sera 25 mag (passo 2 → collegamento tab Piano): il tab Piano continuava a mostrare i pasti **demo** invece dei pasti veri del coach, nonostante 2 fix successivi sulla lettura. Catena di ipotesi sbagliate prima di trovare il vero problema:
1. **"È un filtro su `status='active'`?"** → no, la SELECT non filtrava per status (verificato).
2. **"È la cache negativa sticky?"** → fix legittimo, ma il bug si presentava anche su cache pulita.
3. **"È un mismatch chiavi cache write/read?"** → no, entrambe passavano per lo stesso helper `_pianoV4WeekStartIsoForOffset`.

Solo dopo aver aggiunto log diagnostici lungo tutta la catena (commit `3991322`) è emersa la verità: `weekly_plan_meals` per quel piano **conteneva 0 righe**. Un `?genera=1` precedente aveva creato la riga-madre `weekly_plans`, ma la generazione AI dei 14 pasti (F.2a v2) era fallita silenziosamente nello stesso turno — Opzione A: madre resta senza figli. Il `_pianoV4HasRealPlanForWeek` ritornava correttamente `false` (`plan exists but no meals`) → fallback demo, esattamente come progettato.

**Regola operativa**: davanti al sintomo "vedo il dato di fallback X invece di quello atteso Y", la prima cosa da verificare NON è la catena di lettura/cache/filtro/render — è la SCRITTURA del dato atteso. Una SELECT diretta sul DB (`SELECT COUNT(*) FROM weekly_plan_meals WHERE plan_id = '…'`) ti dice in 2 secondi se stai cercando di leggere qualcosa che non esiste. Se Y non è in DB, qualsiasi fix sulla lettura è tempo sprecato.

Vale come complemento alla lezione 1 ("il DB è la fonte di verità"): non basta ispezionare il DB della tabella sbagliata. Quando il sintomo è "fallback invece di valore reale", traccia la pipeline a ritroso fino alla scrittura del valore reale.

### 7. Quando il dato vero migra di sede, schianta proattivamente la vecchia fonte

Sera 25 mag (fix tab Oggi): Tab Piano e Tab Oggi mostravano pasti DIVERSI per lo stesso giorno (esempio: "Branzino 582 kcal" nel tab Oggi vs "Zuppa di lenticchie 580 kcal" nel tab Piano). Causa: il 20-24 maggio avevamo migrato la fonte di verità del piano del coach da `profiles.piano_ai` (colonna jsonb dormiente legacy) alla tabella `weekly_plan_meals` (passo per passo: Step A → F.2a v2 → Passo 2). Il tab Piano era stato aggiornato a leggere dalla nuova fonte. Il tab Oggi era rimasto come zombie ancorato alla **vecchia fonte** per ~12 ore, mostrando un piano legacy stale, finché il sintomo non è arrivato visibile all'utente.

Esiste un solo lettore — la funzione `getTodayPianoMeals()` — e si trova con `grep ST.pianoAI` in 5 secondi. Ma il check non era stato fatto in modo sistematico al momento della migrazione.

**Regola operativa**: quando introduci una nuova fonte di verità per un dato, l'ultimo passo NON è "il nuovo lettore funziona". È:
1. `grep` su TUTTI i punti del codice che leggono la VECCHIA fonte (variabile globale, colonna DB, localStorage, ecc.)
2. Per ogni lettore: decidi se va migrato sulla nuova fonte oppure marcato esplicitamente come legacy con commento (e, idealmente, con una constante boolean `USE_LEGACY_X = true` o un feature flag che renda visibile la dipendenza).
3. Solo dopo: chiudi la migrazione e dichiara la nuova fonte come SSOT.

Lasciare un lettore zombie ancorato alla vecchia fonte è uno dei modi più affidabili per generare bug di coerenza inter-tab/inter-feature, perché finché entrambe le fonti hanno dati, il bug è invisibile fino al primo "cambio di stato" (es. F.2a v2 scrive su `weekly_plan_meals` e non più su `piano_ai` → da quel momento i due dati divergono e il lettore zombie pubblica dato stantio).

Complementare alla lezione 1 (DB fonte di verità) e alla 6 (verifica la SCRITTURA): qui la lezione è sulla **disciplina di chiusura della migrazione**.

### 8. `eq` è ora stringa singola nel JSON scheda (post 9 giu 2026)

La lista grezza del catalogo (`MANUBRI;ELASTICO;BILANCIERE`) viene risolta al momento della generazione tramite `_trainGenPickEq`. Schede generate prima di questa data hanno ancora `eq` multiplo — richiedono rigenerazione via **Impostazioni → Rigenera scheda** (o `?schedaGen=1`).

### 10. Verificare il test definito nel brief PRIMA di committare

Cantiere 2 (11 giu 2026): il fix `5125f13` ha corretto correttamente l'ordine macro in `renderPiano`/`updatePianoTargetCard`, ma quella card è irraggiungibile con `pianoV4Enabled: true`. Il test visivo avrebbe rivelato immediatamente che il fix non produceva nessun cambiamento visibile — e avrebbe diretto l'attenzione sui punti attivi (Badge Giorno Perfetto, zona-pill, card Piano v4).

**Regola operativa**: prima di committare, eseguire il test visivo/funzionale definito nel brief. Se Claude Code non può eseguirlo autonomamente (es. richiede interazione con l'app sul device), dichiararlo esplicitamente e attendere conferma da Ignazio. Un commit su codice morto che "sembra corretto" è comunque rumore nel git log e falsa sicurezza.

### 11. Rimozione `console.log`: solo manuale e chirurgica, mai con script automatico su file monolite

Cantiere pulizia 12 giu 2026: un tentativo di rimozione automatica via `sed` su `zona-tracker.html` (file monolite ~21.000 righe) ha prodotto sintassi rotta su righe multi-linea e template literal che includevano `console.log` come sotto-espressione. I 59 `console.log` sono stati poi rimossi manualmente riga per riga (commit `77ceff8` + hotfix `336805d`, `1c7b936` per ripristinare frammenti spezzati).

**Regola operativa**: su `zona-tracker.html` NON usare mai `sed`/regex automatico per rimuovere blocchi multi-riga. Ogni rimozione di `console.log` va fatta a mano con Read → Edit mirato, verificando che nessun template literal venga spezzato.

### 9. Surrogato: solo `setup` sovrascritto, non `execution`/`commonErrors`

Finché non esistono le colonne `esecuzione_surrogato`/`errori_surrogato` nel catalogo, i testi di esecuzione ed errori restano quelli dell'esercizio nativo anche per i surrogati. Il `setup` viene correttamente sostituito dalla `nota_surrogato`. Per esercizi come EX002 Distensioni su panca (surrogato panca+elastico), le istruzioni di esecuzione descrivono ancora la versione bilanciere → possibile confusione per l'utente. Fix richiede sessione dedicata al catalogo.

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
| `parseRepsRange(repsStr)` | Parser unificato campo reps: ritorna `{kind:'reps'\|'seconds', min, max, perLato, unit}` o null (8 mag 2026) |
| `loadTrainingAllCompleted()` | Carica tutti workout completati validi (esclude riposi) per calcolo settimana ciclo (8 mag 2026) |
| `markRestChosen()` | Segna giorno come riposo volontario (`workouts.session_type='rest'`) (8 mag 2026) |
| `markRestInjury()` | Segna riposo per infortunio + nota zona corpo (`workouts.session_type='rest_injury'`, `note=...`) (8 mag 2026) |
| `scrollToActiveExercise()` | Scrolla card primo esercizio non completato al centro (8 mag 2026) |
| `restSecToText(sec)` | Format recupero in stringa: 60→'1 min', 75→'75 sec', 120→'2 min' |
| `ensureRestGif(exName)` | Pre-fetch silenzioso GIF esecuzione per modal recupero (toggle on-demand, cache `ST.exerciseGifCache`) (9 mag 2026) |
| `toggleRestGif()` | Apre/chiude blocco GIF esecuzione nel modal recupero (9 mag 2026) |
| `findExInAllSessions(exName)` | Cerca esercizio per nome in tutte le `TRAINING_SESSIONS`, ritorna `{ex, sess}` o null (9 mag 2026) |
| `isTimedExerciseByName(exName)` | True se esercizio è `iso:true` con reps in formato secondi (9 mag 2026) |
| `bestSetOfDay(logs)` | Per array di training_logs di un giorno+esercizio: ritorna serie migliore (peso desc → reps desc tiebreaker) (9 mag 2026) |
| `shortDate(dateStr)` / `formatDayHeader(dateStr)` | Format date per chart asse X ("8/5") e modal header ("Gio 8 mag") (9 mag 2026) |
| `openDayDetail(date, exName?)` | Apre modal dettaglio giorno (calendar click). Se exName: filtra logs solo a quell'esercizio (chart click). (9 mag 2026) |
| `editLogRow(id)` / `confirmEditLogRow()` / `cancelEditLogRow()` | Edit inline serie (reps + resistance + RIR) nel modal day-detail. Update simultaneo `training_logs` + `workout_sets` (9 mag 2026) |
| `confirmDeleteSet(id, label)` / `deleteSetConfirmed()` | Conferma + delete singola serie da entrambe le tabelle (9 mag 2026) |
| `confirmDeleteWorkoutFromDetail()` / `deleteWorkoutConfirmed()` | Conferma + delete workout intero dal modal day-detail (sostituisce vecchio `trainCalDeleteConfirm`) (9 mag 2026) |
| `loadAllExerciseNames()` | Lazy load distinct `exercise_name` da training_logs (cache `ST.allExerciseNamesCache`). Auto-default selezione primo alfabetico (9 mag 2026) |
| `invalidateAllExerciseNamesCache()` | Invalida cache lista esercizi (chiamata da `saveTrainingSet`/`deleteSetConfirmed`/`deleteWorkoutConfirmed`) (9 mag 2026) |
| `toggleProgDropdown()` / `closeProgDropdown()` / `setProgDropdownTab(tab)` / `setProgDropdownSearch(val)` / `selectProgEx(name)` | UX dropdown selezione esercizio Progressione (9 mag 2026) |
| `rigeneraSchedaDaImpostazioni()` | Trigger manuale da modal Impostazioni (sezione Training): aggiorna `ST.profile.giorni_allenamento`, chiama `generateTrainingProgram({source:'manual',force:true})` + `loadActiveScheda()`, mostra feedback inline nel modal |

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

- **Network-first** per `zona-tracker.html` (sempre fetch fresco dal server)
- **Cache-first SOLO per `cdn.jsdelivr.net`** (libreria Supabase JS versionata, OK cacheare)
- **Le chiamate REST a `*.supabase.co` NON vengono intercettate** → default browser, sempre network
- Registrato in fondo a `zona-tracker.html`, controlla aggiornamenti ogni 3 min
- Auto-reload della pagina quando trova una nuova versione del SW
- Cache name corrente: `zt-v2` (4 maggio 2026 — bumpata da `zt-v1` per pulire risposte stantie)

⚠️ **ANTI-PATTERN — NON aggiungere mai `'supabase'` nel branch cache-first del SW.** Lo abbiamo fatto in passato e ha causato un bug serio di sync cross-device: ogni device cacheava le risposte REST dell'API Supabase ai propri URL, quindi un dispositivo vedeva solo i record creati localmente, mai quelli inseriti da altri device dello stesso utente. Il check hostname deve restare **solo** `cdn.jsdelivr.net`.

## Versioning automatico (`APP_VERSION`)

Sistema di stamp automatico della versione attiva, utile per debug cross-device.

- **Costante:** `const APP_VERSION = '__APP_VERSION__';` definita in cima al file `zona-tracker.html` (vicino allo stato `ST`).
- **Hook Git:** `.git/hooks/pre-commit` (eseguibile, condiviso fra worktree via `$GIT_COMMON_DIR/hooks/`).
  - Genera la stringa formato `YYYY.MM.DD · HH:mm` da `date`
  - Sostituisce con `sed` qualunque valore corrente di `APP_VERSION` (placeholder `__APP_VERSION__` o versione precedente) → re-stage del file
  - **Skippa** se `zona-tracker.html` non è fra i file in stage del commit (commit di soli `sw.js`, ecc. non bumpano la versione)
- **Visualizzazione:** helper `versionFooter()` (in `zona-tracker.html`) restituisce `<div>v${APP_VERSION}</div>` + spacer invisibile da 120px. Chiamato in fondo a tutte e 4 le tab principali (Home, Nutrition/Oggi + sub-tab, Training, Body) come ultimo elemento del flusso scrollabile.
- **Workflow:** in working tree il valore è sempre `__APP_VERSION__` o quello dell'ultimo commit. Solo l'hook al commit successivo lo aggiorna.

## TODO post-fasi-design (15 maggio 2026)

Lavoro rimasto dopo le 4 fasi di design (A/B/C/D). Ordinato per area, non per priorità — l'ordine di esecuzione verrà deciso dopo la riprogettazione modulo Nutrition + Home definitiva su Claude Design.

1. **Pulsante "Nuovo check fisico" sempre visibile** nel modulo Body. M2 è un evento **ricorrente ogni 4 settimane**, non una tantum (vedi `getNextCheckpointInfo()` su Home V2 che calcola scadenza). Il modulo Body oggi non ha un CTA dedicato per riavviare M2.
2. **Reminder automatico fine-scheda allenamento** → notifica/banner "È ora del check fisico" quando il countdown 28 giorni scade. Trigger da decidere (visita Home, fine workout, lazy).
3. **UI storico esami del sangue** nel modulo Body — oggi `blood_tests` ha lo schema ma nessuna visualizzazione lato app. Lista + grafico per parametro nel tempo (emoglobina, ferritina, ecc.).
4. **Modulo Nutrition rifatto** con stile Syne/Mono allineato a M1/M2/Home V2 (decisione presa il 15 mag, lavoro su Claude Design in corso). Oggi i sub-tab Oggi/Integratori/Storico/Piano hanno ancora elementi grafici legacy (palette verde/blu/marrone, font system).
5. **Obiettivo utente visibile nella Home V2** (es. eyebrow "RICOMPOSIZIONE" sotto saluto) — design da finalizzare su Claude Design. Dato disponibile in `ST.profile.obiettivo` (CSV).
6. **Colore delta peso Body contestuale all'obiettivo** — già implementato in Home V2 al commit `39872f8`/`71aa1be` usando `goal_weight_kg` vs `weight_kg`. Da estendere coerentemente al modulo Body interno (oggi mostra solo verde/grigio statico).
7. **Respiro sopra saluto Home V2** — già applicato in `39872f8` (top padding +30px). Verificare se basta o serve altro tuning su Claude Design.
8. **Colonne DB dedicate** per `esperienza_allenamento`, `limitazioni[]`, `altre_intolleranze`, `altre_limitazioni` — oggi tutto serializzato in `profiles.note_salute`. Da promuovere a colonne quando servirà filtering/query (vedi sezione "Database — campi M1 mappati").
9. **Logica AI per PROSSIMA AZIONE dinamica** (Fase D Giro 2) — sostituirà `getProssimaAzioneSimple()` (4 regole statiche) con prompt contestuale che legge profilo + stato giornaliero + storico recente. Sorgente AI: Cloudflare Worker Groq esistente.
10. **Coerenza grafica retroattiva** sui moduli interni Nutrition/Training/Body — oggi solo M1/M2/Home V2 hanno il nuovo stack Syne+JetBrains Mono. I sub-tab interni dei moduli sono ancora su sistema legacy (vedi sezione "Design system" rispetto a "Decisioni di design correnti").

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
- [x] Audit training completo: setup array, rest fisso, riposi extra, rotazione 6 giorni (8 maggio 2026)
- [x] Modal log esercizi temporali con DURATA + auto-progressione su secondi (8 maggio 2026)
- [x] Tab Piano rinominata Programma + calcolo settimana basato su workout completati (8 maggio 2026)
- [x] GIF esecuzione opzionale nel modal recupero (toggle on-demand, cache globale) (9 maggio 2026)
- [x] Tab Progressione: grafico SVG (barre/linea) + 3 metriche (Peso/Reps/Volume o Peso/Tempo per iso) (9 maggio 2026)
- [x] Modal Dettaglio giorno con edit/delete singola serie + edit/delete workout (9 maggio 2026)
- [x] Dropdown selezione esercizio (search + tab Per programma/Per esercizio) sostituisce chip-row (9 maggio 2026)
- [x] Migrazione Magic Link → OTP a 6 cifre via email (aprile 2026, commit `1bada62` + fix `364dd83`)
- [x] Logica residua kcal/macro (zona-tracker.html, home + Oggi) (11 maggio 2026)
- [x] Recovery G3/G6 ristrutturate in micro-esercizi + countdown ibrido (12 maggio 2026)
- [x] Blocco Attivazione 5 min con countdown autonomo per tutte le 6 sessioni (12 maggio 2026)
- [x] muscleImg sugli esercizi recovery (33 esercizi con immagine, 18 con null esplicito) (12 maggio 2026)
- [x] Recovery G3/G6 — auto-collapse blocchi + micro-pause 5s/10s + stop blocco tra blocchi diversi (13 maggio 2026, commit `29eaac6`)
- [x] M2 Check Fisico — versione funzionale (intro/foto/misure/esami/esito), entry post-M1 + resume cross-device + skip persistente (13 maggio 2026)
- [ ] Asset `assets/muscles/face-pull.jpg` da aggiungere manualmente (legacy — sostituito dal nuovo sistema `assets/exercises/`)
- [ ] **Pannello admin** (gestione utenti, assegnazione programmi)
- [ ] Fix backfill macro integratori vecchi
- [ ] GIF esercizi nel modal recupero — cantiere separato, da aprire dopo collaudo commit `6125812`
- [ ] **FASE 2 Programmi multipli archiviati** (predisposto in dropdown Progressione 9 maggio 2026): tabella `programs` Supabase, colonna `program_id` su workouts, UI chiusura programma, popolare sezione "PROGRAMMI PASSATI" del dropdown con lista collassabile, filtro grafico per periodo programma. Vedi commento HTML inline nel codice (cerca "TODO FASE 2 — gestione programmi multipli")
- [x] Pulizia residui Magic Link — ✅ commit `8f46576` (12 giu 2026)

### Possibili evoluzioni future modulo Training

- Immagini esecuzione per i 9 esercizi senza foto: valutare AI generation via Cloudflare Workers AI (free tier 10.000 Neurons/giorno) + cache su Supabase Storage
- Hip thrust TUT alto e Single leg RDL: nessun match dataset esterni, restano `EXERCISE_MEDIA` fallback
- Rivedere immagini Wger per varianti laterale/posteriore (oggi solo frontali)

## MODULO TRAINING — REGOLE DEL COACH & DECISIONI
*Fonte: sessione design 24 maggio 2026. Diviso in: Parte 1 = regole che il coach AI userà per generare i programmi; Parte 2 = decisioni di prodotto.*

### PARTE 1 — REGOLE DEL COACH

**Filosofia di fondo**
Il coach ragiona come il miglior coach del mondo: massima personalizzazione dentro confini non negoziabili. Continuità nella progressione, varietà nello stimolo. Eredita dal blocco precedente per far crescere; varia gli esercizi senza improvvisare. Tutto basato sulla letteratura, mai su sensazioni.

**A) Cosa deve coprire**
1. Ogni programma copre tutto il corpo: 6 pattern + core, sempre tutti presenti.
2. Pattern: spinta orizzontale · spinta verticale · tirata orizzontale · tirata verticale · dominante di ginocchio · dominante d'anca · core. + rifiniture (bicipiti, tricipiti, spalle laterali, polpacci).
3. Equilibrio spinta/tirata: tirata >= spinta.
4. Dominante d'anca irrinunciabile (protegge lombari e ginocchia).
5. Core a due anime: stabilità (protettiva, sempre) + impatto (intenso e breve).
6. Copertura completa e bilanciata sempre garantita: la varietà non salta mai un pattern.

**B) Come sceglie gli esercizi**
7. Libreria universale e ampia: il coach conosce molti esercizi; gli esempi discussi sono indicativi, non liste chiuse.
8. Ogni esercizio = pattern + movimento, adattabile a più attrezzature (stesso esercizio in versione elastico/manubri/bilanciere/corpo libero).
9. Filtra sempre per attrezzatura dichiarata + protezioni dell'utente. Niente esercizi controindicati.

**C) Progressione e varietà**
10. Ogni nuovo blocco eredita i dati del precedente (carichi, reps, RIR, andamento).
11. Varia gli esercizi mantenendo i pattern: cambia l'esercizio, non lo schema motorio.
12. Progressione = non solo "più carico": anche meno aiuto (es. elastico più leggero), più reps, più tempo sotto sforzo.
13. Mai improvvisare: sceglie dentro la cornice.

**D) Struttura e tempo**
14. Periodizzazione: ciclo 4 settimane (3 carico + 1 scarico), DUP (Forza/Ipertrofia), RIR controllato.
15. Ogni blocco dura 4 settimane; a fine blocco si chiude e (se possibile) parte un programma nuovo.
16. Sessione max 45 min (recuperi inclusi). Il tempo decide quanti esercizi entrano.
17. Finisher metabolico: solo se obiettivo dimagrimento/ricomposizione -> +5/10 min (tetto 50 min), a intervalli (Tabata 20/10 o 30/30), basso impatto articolare, rispetto protezioni.

**E) Obiettivi e dosaggio**
18. Sei obiettivi singoli (da onboarding): dimagrimento · ricomposizione · ipertrofia · forza & performance · longevità · mantenimento.
19. Dosaggio per obiettivo: forza (carichi alti, reps basse, rec. lunghi) · ipertrofia (volume alto, reps medie) · ricomposizione (stimolo + densità, finisher moderato) · dimagrimento (densità alta, rec. brevi, finisher, preservando muscolo) · longevità (moderato, sostenibile, mobilità/core/articolazioni) · mantenimento (dose minima efficace).
20. Confini universali: RIR controllato sempre (mai cedimento); il volume parte prudente e cresce nei blocchi.

**F) Relazione e tono**
21. Alert protezione = promemoria di tecnica, non divieti. Il coach incoraggia la crescita; l'utente esperto autoregola.
22. Tutto funziona in automatico da onboarding, senza chat. Le regole valgono per ogni utente.

### PARTE 2 — DECISIONI DI PRODOTTO

**Chiusura blocco (fine 4 settimane)**
- A fine blocco il coach PROPONE il check fisico M2 (non impone).
- Check fatto -> coach legge dati aggiornati -> genera programma nuovo (ereditarietà + variazione).
- Check saltato -> coach NON genera -> ripropone il programma esistente per un altro blocco; riproporrà il check alla chiusura successiva. Il check è la chiave che sblocca il progresso, non un ostacolo.
- Il coach legge due fonti: progressi fisici/estetici (check M2: foto, circonferenze -> se l'obiettivo funziona / correzione rotta) + progressi di forza (training_logs: carichi, reps, RIR -> come progredire).
- Stato attuale: il check M2 ESISTE ed è completo (foto, circonferenze, dati corporei, tabella body_checks), ma oggi è agganciato al LOGIN (m2EntryIntro chiamata all'avvio), non alla fine blocco. Da RI-AGGANCIARE alla chiusura blocco. Manca anche il riconoscimento del momento "blocco finito" (oggi il contatore settimana riparte muto: formula (workout/6)%4+1).

**Programma = prescrizione, non documento editabile**
- Fase 1: il coach genera, l'utente segue. Niente modifica libera dei singoli esercizi (impegno/rischio alti, sporca lo storico della progressione).
- Fase 2 (futuro): modificabilità GUIDATA — l'utente comunica circostanze ("sono fuori sede", "poco tempo questa settimana", "non riesco a fare X") e il coach RI-DECIDE rispettando regole. Adattamento temporaneo e circoscritto (di norma 1 settimana); non altera la progressione del blocco. Richiede la "voce" del coach nel training.

**Buco onboarding da colmare (prima della generazione)**
- Presenti: obiettivo (6, combaciano), livello/esperienza, limitazioni fisiche (lista ricca: lombare, cervicale, spalle, gomiti, polsi, anche, ginocchia, caviglie, ernie, cardiovascolari, ipertensione, altro).
- MANCANO: attrezzatura disponibile e giorni/tempo allenamento a settimana. Entrambi indispensabili al coach Training. Da aggiungere riusando pattern pillole/card esistente (m1-pill-toggle / m1-card-level).

**Catena di generazione del programma (la "fabbrica" del coach)**
1. Leggi chi è (profilo/onboarding) -> 2. Leggi dove è arrivato (forza + check) -> 3. Decidi dosaggio (obiettivo) -> 4. Componi struttura (pattern sulle sessioni, equilibrio, tempo) -> 5. Scegli esercizi (kit + protezioni, varia + eredita) -> 6. Applica periodizzazione (4 sett., DUP, RIR) -> 7. Verifica e consegna.

**Metodo di lavoro (questa fase)**
- Prima tutte le idee, poi la grafica (Claude Design disegna il modulo Training intero, coerente, in un colpo solo).
- Le decisioni si consolidano nel CLAUDE.md (non file separato), in due parti (regole coach / decisioni prodotto).

**Punti ancora aperti (prossimi passi, non bloccanti)**
- Verificare/riusare suggestProgressionAI esistente quando si costruirà la generazione.
- Raffinare "quando" il finisher serve oltre dimagrimento/ricomposizione (es. longevità -> lavoro cardio dolce).
- Idea: invito al check che si rafforza ad ogni blocco saltato.

### ONBOARDING M1 — BLOCCO TRAINING (attrezzatura + giorni + tempo) + INTERRUTTORE
*Design chiuso in sessione chat 25 maggio 2026. **IMPLEMENTATO il 25 maggio 2026** in [zona-tracker.html](zona-tracker.html) — 5 nuovi step nell'onboarding + sequenza dinamica + progress bar dinamica + 5 nuovi campi salvati su `profiles`. Vedi entry log dedicata in "Cosa abbiamo fatto" (25 maggio 2026 sera). La sezione qui sotto resta come riferimento di prodotto consolidato.*

**Perché**: il coach Training non può generare programmi per nuovi utenti senza sapere
attrezzatura disponibile e giorni/tempo. Inoltre non tutti vogliono il Training → serve
un interruttore a monte.

**Interruttore Training (a monte del blocco)**
- Step dedicato "Come vuoi che il coach ti accompagni?" con 2 card a selezione singola:
  - Card 1 — **Alimentazione**: "Il coach pensa ai tuoi pasti e ai tuoi integratori"
  - Card 2 — **Alimentazione e allenamento**: "Il coach ti segue anche con i workout su misura"
- Salvataggio: `profiles.usa_training` (boolean, default true).
- Se `usa_training = false`:
  - il blocco training dell'onboarding viene SALTATO;
  - il modulo/tile Training NON appare in home;
  - il coach NON genera il programma di allenamento.
- Ripensamento: il training è ATTIVABILE in seguito dalle Impostazioni. All'attivazione
  mancheranno attrezzatura/giorni/tempo (mai chiesti) → servirà un mini-onboarding training
  in quel punto (dettaglio da definire in sessione futura).

**Attrezzatura — impianto a IMBUTO**
- Passo 1 — "Dove ti alleni?" card a selezione singola (riusa pattern obiettivo `m1-card-goal`/`m1-card-level`):
  - **Casa** → mostra Passo 2 (pillole attrezzatura)
  - **Palestra attrezzata** → il coach assume "hai tutto", nessuna altra domanda
  - **All'aperto / poco attrezzato** → corpo libero + sbarra/elastici portatili, nessuna pillola
- Passo 2 — solo se "Casa": pillole multi-select (riusa pattern `m1-pill-toggle`), divise in 2 gruppi (come le limitazioni allo step 6):
  - **Attrezzi**: Elastici (a tubo) · Manubri · Bilanciere + dischi · Kettlebell · Panca · Sbarra per trazioni · Fitball · TRX / anelli
  - **Accessori elastici**: Maniglie · Barra corta · Barra lunga · Cavigliere
- **Corpo libero è IMPLICITO** (non è una pillola): è la base sempre disponibile. Nessuna pillola accesa = coach lavora a corpo libero puro.
- Lista aggiungibile in futuro, mai da togliere.
- Salvataggio: `profiles.attrezzatura` (text[]). Per Palestra/Aperto si potrà salvare un marcatore coerente (da definire in implementazione); il "dove" va in `tipo_allenamento`.

**Giorni a settimana**
- Pillole a selezione singola: **2 · 3 · 4 · 5**
- Lettura coach: 2 = full-body · 4 = upper/lower (schema attuale) · 5 = upper/lower + giorno jolly
- Salvataggio: `profiles.giorni_allenamento` (integer).

**Tempo-base a sessione**
- Pillole a selezione singola: **30 · 45 · 60** min
- È il tempo su cui il coach costruisce il blocco (tetto 45 + finisher; nessuna opzione oltre i 60).
- Salvataggio: `profiles.durata_sessione` (integer).

**Idea parcheggiata — Fase 2 "Oggi ho solo X min" (stile Freeletics)**
- Funzione SEPARATA dal tempo-base: l'utente dichiara meno tempo per UNA singola sessione e il
  coach la comprime (taglia serie/esercizi a bassa priorità, tiene i pattern fondamentali) senza
  toccare la progressione del blocco. Vive nella "voce del coach" Training (modificabilità guidata Fase 2).

**Ordine finale onboarding M1** (i nuovi step in grassetto):
1. nome
2. dati corporei
3. obiettivo
4. **interruttore "Come vuoi che il coach ti accompagni?"**
5. attività + esperienza
6. **blocco training (solo se `usa_training = true`): dove+attrezzatura · giorni · tempo**
7. dieta + intolleranze
8. limitazioni fisiche (per tutti, anche solo-nutrition)
9. riepilogo + avvio check

**Mappatura salvataggio su `profiles`** (riepilogo):
- dove → `tipo_allenamento` (text)
- attrezzatura → `attrezzatura` (text[], creata 25 mag)
- giorni → `giorni_allenamento` (integer)
- tempo → `durata_sessione` (integer)
- interruttore → `usa_training` (boolean default true, creata 25 mag)

**Punti aperti per le prossime sessioni** (non bloccanti):
- Mini-onboarding training all'attivazione tardiva da Impostazioni.
- ~~Mostrare gli "Accessori elastici" solo se "Elastici" è acceso~~ ✅ implementato (RITOCCO 2, 25 mag).
- Marcatore di salvataggio per Palestra/Aperto in `attrezzatura` — al momento si salva `NULL` (il coach interpreta dal `tipo_allenamento`).
- Effetto a cascata dell'interruttore su home/moduli (oltre al nascondere il tile Training).

### PARTE 3 — TABELLA PROGRESSIONE (27 mag 2026)
Decisioni consolidate. Valgono per il prompt AI di `suggestProgressionAI` e per il futuro coach generatore. Logica serie-per-serie: ogni serie loggata produce la proposta per quella SUCCESSIVA. Nuova sessione → la 1ª serie riparte dall'ultima serie loggata la volta precedente (storico DB), poi progredisce.

**Elastici a tubo (resistenza in lbs)**
- Tetto reps + RIR ≥ target → **+10 lbs**, riparti dal minimo reps
- Dentro range + RIR = target → stessa resistenza, **+1 rep**
- RIR > target (facile) → stessa resistenza, **alza reps** verso il tetto
- RIR 0 (cedimento) ma reps nel range → stessa resistenza, **abbassa reps**
- Sotto il minimo reps → **-10 lbs**

**Trazioni alla sbarra (resistenza = colore banda)**
Scala da PIÙ DURA a PIÙ FACILE: `Gialla → Rossa → Nera → Viola`. La banda AIUTA: più pesante = più aiuto = trazione più facile. `BAND_COLORS = ['Gialla','Rossa','Nera','Viola']`, indice 0 = più dura. Progredire = scendere verso Gialla.
- Tetto reps + RIR ≥ target → **banda un gradino PIÙ DURA** (verso Gialla, indice minore), riparti dal minimo reps
- Dentro range + RIR = target → **stessa banda, +1 rep**
- RIR > target → stessa banda, **alza reps**
- RIR 0 (cedimento) ma reps nel range → stessa banda, **abbassa reps**
- Sotto il minimo reps → **banda un gradino PIÙ FACILE** (verso Viola, più aiuto)
- Limite raggiunto = già su Gialla al tetto reps con buon RIR → suggerisci **trazione libera senza banda**

### PARTE 4 — COACH GENERATORE (architettura, DA COSTRUIRE)
*Decisioni di product/architettura prese il 27 mag 2026. Implementazione nelle prossime sessioni.*

**Filosofia**: opzione **"catalogo verificato + AI che assembla"** — NON l'AI inventa esercizi. Stesso principio del catalogo integratori Nutrilite: fonte unica, scalabile, l'utente fa onboarding e il coach gli costruisce la scheda. Vale per Ignazio e per i nuovi tester (es. Ginevra).

**Lettura limitazioni utente — niente intervento manuale**
L'utente DICHIARA le limitazioni fisiche nell'onboarding M1 (campo `limitazioni` array + `altre_limitazioni`, già esistenti in `profiles`/`note_salute`). Il coach legge e si regola da solo, nessun intervento manuale di Ignazio per caso singolo.

**Gestione cautele — adatta prima, sostituisci dopo**
Il coach incrocia `limitazioni` utente × tag `zone_rischio` dell'esercizio nel catalogo. Regola:
1. **PRIMA ADATTA** usando la colonna `adattamento` dell'esercizio.
2. **SOLO SE NON BASTA SOSTITUISCE** con l'esercizio in `alternativa` (codice).

**RIR controllato — solo intermedio/avanzato**
Il RIR è ATTIVO solo per livello intermedio/avanzato. Per i **principianti** il coach genera schede SENZA RIR (lo introdurrà quando l'utente raggiunge il livello intermedio).

**Continuità vs varietà — "schede su schede in continuità"**
- **DENTRO il blocco** (~4 settimane): l'esercizio resta lo STESSO. La progressione ha bisogno di un riferimento stabile per lo storico (carichi, reps, RIR confrontabili settimana per settimana).
- **TRA blocchi**: il coach VARIA gli esercizi mantenendo i pattern (cambia esercizio, non schema motorio). Stimolo nuovo, ma il dato di partenza eredita dal blocco precedente.

**Fallback `TRAINING_SESSIONS`**
Gli esercizi fissi nel codice (`TRAINING_SESSIONS`) RESTANO come rete di sicurezza. Logica futura del modulo Training:
1. Cerca la scheda personale dell'utente in DB.
2. Se non c'è → usa `TRAINING_SESSIONS` come fallback.

Nessun utente resta mai senza allenamento.

### PROSSIMI PASSI MODULO TRAINING (ordine)
1. **Coach generatore**: logica che legge onboarding (attrezzatura/giorni/durata/esperienza/obiettivo/limitazioni) + pesca dal catalogo `esercizi_catalog` + applica le regole (cautele, RIR per livello, continuità intra-blocco, varietà tra blocchi). Decisioni di logica PRIMA del codice (stessa metodologia design-prima di Nutrition).
2. **Salvataggio schede per-utente in DB** + lettura dal modulo Training con **fallback** su `TRAINING_SESSIONS` (rete di sicurezza).

**🅿️ PARCHEGGIATO — Progressione per variante (esercizi a corpo libero)** — progetto dedicato. Quando le reps saturano il range, il coach deve proporre una **variante più dura** (es. Affondo → pausa 2s → Bulgarian → Bulgarian con elastico), **non +1 rep all'infinito**. VINCOLO: il cambio variante avviene SOLO al **cambio blocco** (ogni 4 settimane), mai a metà ciclo (la progressione intra-blocco ha bisogno di un riferimento stabile). Vive nella "voce del coach" Training. Emerso accanto al fix "per lato" del 29 mag sera.

**✅ FATTO (1 giu 2026, commit `8023b7d`, APP_VERSION `2026.06.01 · 10:53`) — Quinto allenamento · Upper Pump (split 5 giorni) [Blocco A, parte 1]** — implementata la **Fase A**: lo split a 5 giorni per **intermedio/avanzato** è ora **Upper/Lower** (`_TRAIN_GEN_SPLIT_BY_DAYS` voce `5` → `['upper','lower','upper','lower','upper']`), con la **terza upper = Upper Pump**. Sequenza: **Upper Forza · Lower Forza · Upper Iper · Lower Iper · Upper Pump**. La Pump è una seduta leggera: parametri **3×15-25 reps / RIR 0 / rest 50s** (core iso 20-40s/rest 30), **0 compound pesanti** (`_TRAIN_GEN_COMPOUND_PATTERNS_BY_CATEGORY.upper_pump = []`), iso obbligatori **deltoidi laterali + deltoidi posteriori + bicipiti + tricipiti + petto + core anti-rotazione** (= 6 esercizi = softMax; dorsali solo bonus), **niente Tabata** in coda. Implementazione: `_trainGenResolveSessionType` ritorna `'Pump'` per la 3ª upper (occurrenceIdx===2) dentro il ramo DUP; nuova costante `_TRAIN_GEN_PUMP_PARAMS`; `_trainGenResolveSessionParams` + `_trainGenGetSessionCategory` (→ `'upper_pump'`) gestiscono il tipo Pump; finisher gate `s.resolvedType === 'Pump'`. **Principiante 5gg resta PPL** (no periodizzazione DUP). Aggiunto **`ztSchedaWhy({giorni:N})`** (override giorni in dry-run puro, no DB, no scrittura profilo) per collaudare uno split diverso in app. Collaudo: harness Node resolver 20/20 + dal vivo `ztSchedaWhy({giorni:5})` (5 sessioni corrette, profilo/DB intatti).
  - **Residuo aperto #1 — gating principiante 5gg**: oggi il principiante a 5 giorni resta su PPL (la Pump vive solo nel ramo DUP). Da decidere se/come dargli uno split sensato a 5 giorni quando arriverà la "regola generale dello split".
  - **Residuo aperto #2 — edge non-DUP a 5gg senza Pump**: un obiettivo non-DUP (`forza_performance`/`longevita`/`mantenimento`) a 5 giorni int/avanzato prende lo split U/L/U/L/U **ma senza Pump** (il check Pump è nel ramo DUP) → 5 sessioni dello stesso tipo (es. 3 Upper Forza). Nessun impatto su Ignazio (ricomposizione = DUP) né sui tester (Nutrition-only). Da gestire con la regola generale dello split (Blocco A parte 2) + progressione tra blocchi (Blocco D).
  - **Storia/contesto** nei changelog: entry "BLOCCO C" (blockquote "Caso personale Ignazio — split 5 giorni"), "Blocco B · split 5gg SOSPESO", "(chiusura) — Roadmap/sospesi". Resta da implementare il **ciclo 7 giorni desiderato** (Upper Forza · Lower Forza · mobilità · Upper Iper · Lower Iper · Upper Pump · riposo) e la regola generale dello split (giorni × obiettivo × attrezzatura × limitazioni).

**✅ CANTIERE CHIUSO (30 mag 2026) — Fusione tab "Sessione" dentro "Programma" (progetto dedicato)** — emerso dal restyling tab Programma del 30 mag (vedi changelog + limiti noti). Idea: **unificare le due tab**. In "I tuoi giorni", tap su una card → apre la **sessione di quel giorno** (sotto-livello), così il programma e l'allenamento vivono in un'unica tab. La tab "Sessione" attuale viene **riusata, non riscritta**.

Nodi da rispettare:
- **Anteprima vs attiva**: giorno futuro = **anteprima in sola lettura** (vedi gli esercizi); giorno di **OGGI** = sessione attiva e loggabile. Il log delle serie resta ancorato a oggi (non si logga un allenamento che non si sta facendo).
- **Scorciatoia "Allenamento di oggi"** in cima, per non seppellire l'azione principale.
- **Nomi recuperi corretti** (dalla tab Sessione, da usare al posto di "Rec Upper / Rec Lower"): G3 = **"Recupero Mobilità"**, G6 = **"Recupero Stretching"**. Collocarli nei giorni giusti della rotazione.
- **Aggancio dati reali**: questo cantiere include il collegamento alla **rotazione/scheda reale**, che risolve sia il **badge OGGI sbagliato** (oggi usa `ST.trainHomeData.nextSession`, non la rotazione reale) sia il "dove sono nel blocco".
- **Workflow**: primo passo = **Claude Design**, ma per il **FLUSSO** (cosa apre un tap, com'è l'anteprima, dov'è "oggi"), non solo per l'estetica.

Implementato in 4 passi il 30 mag — vedi changelog sotto.

### PARTE 5 — COACH GENERATORE: DECISIONI DI LOGICA COMPLETE (27 mag sera)
*Sessione dedicata: chiuso TUTTE le decisioni di logica del generatore prima di scrivere codice. La fase decisioni è chiusa. Mancano da fare: (1) SQL tabella `schede_utente` su Supabase, (2) brief tecnico Claude Code del generatore vero.*

**Catalogo — aggiornamenti**
- Aggiunta colonna `uso` (text) a `esercizi_catalog`: valori ammessi `principale` / `finisher` / `recupero` (separati da `;` se più di uno). Indica per quale tipo di sessione l'esercizio è adatto. Migrazione: `alter table public.esercizi_catalog add column if not exists uso text;` (già applicata).
- Catalogo ampliato da 30 a **33 esercizi**: aggiunti Mountain climber controllato (`EX031`, finisher), Hollow hold (`EX032`, finisher), Step-up al ritmo (`EX033`, `finisher;recupero`). Sync via menu "Sync Esercizi" sul Google Sheet (Apps Script v3 con `onOpen()` che crea menu nativo nel foglio, popup risultato invece di log).
- Etichettatura attuale: 27 esercizi `principale`, 12 con tag `finisher`, 6 con tag `recupero` (alcuni multi-uso).

**Split (deciso dai giorni di allenamento dichiarati in M1)**
- **2 giorni** → Full Body × 2
- **3 giorni** → Full Body × 3 (se livello principiante) · Upper / Lower / Full (se intermedio o avanzato)
- **4 giorni** → Upper / Lower × 2
- **5 giorni** → Push / Pull / Legs / Upper / Lower

**Parametri training (decisi da obiettivo × esperienza, NON solo obiettivo)**
4 profili base, modulati dall'esperienza per evitare regressioni su utenti avanzati:
- **Forza** (`forza_performance`): reps 4-6, RIR 2-3, recupero 3 min
- **Ipertrofia** (`ipertrofia`): reps 8-12, RIR 1-2, recupero 90-120s
- **Ricomp / metabolico** (`dimagrimento`, `ricomposizione`): reps 10-15 per principianti, range più bassi per intermedi/avanzati, RIR 1, recupero 60-90s
- **Salute** (`longevita`, `mantenimento`): reps 6-10, RIR 2, recupero 90-120s
- **RIR attivo SOLO per intermedio/avanzato**. Principianti: schede SENZA RIR (già deciso stamattina, qui consolidato).

**Tempo & numero esercizi**
- Il numero esercizi NON è fisso per durata: viene calcolato dal coach come `serie × reps × recupero` finché copre il tempo dichiarato (30/45/60 min). Range orientativo: 2-4 a 30 min, 3-5 a 45 min, 4-6 a 60 min — varia per profilo (Forza ha recuperi lunghi → meno esercizi).
- **Recupero attivo opzionale**: nuovo step in onboarding M1 da aggiungere — chiede 0/1/2 giorni di recupero attivo aggiuntivi rispetto ai giorni di allenamento dichiarati. Genera sessioni con `uso=recupero` dal catalogo.
- **Finisher metabolico Tabata**: ~5 min in coda alla sessione (durata totale = dichiarata + 5), SOLO per obiettivo `dimagrimento` / `ricomposizione`. Pesca esercizi con `uso` che contiene `finisher`. Tutti i finisher rispettano le regole già decise: basso impatto articolare, no salti, no flessione lombare ripetuta (nessun crunch).

**Selezione esercizi (opzione C: equilibrio garantito + libertà di enfasi)**
Pattern obbligatori MINIMI per sessione (sopra il minimo il coach ha libertà):
- **Full Body**: 1 spinta + 1 tirata + 1 dominante ginocchia + 1 dominante anca + 1 core
- **Upper**: 1 spinta orizz + 1 spinta vert + 1 tirata orizz + 1 tirata vert
- **Lower**: 1 dominante ginocchia + 1 dominante anca + 1 core
- **Push**: spinta orizz + spinta vert · **Pull**: tirata orizz + tirata vert · **Legs**: ginocchia + anca
- Sopra il minimo: enfasi/isolamento a scelta del coach in base all'obiettivo.

**Ordine esercizi (regola fissa, valida per tutti)**
1. **Multiarticolari pesanti** (compound: squat, stacco, panca, military, trazioni) all'inizio quando si è freschi
2. **Complementari** (multiarticolari secondari o varianti) al centro
3. **Isolamenti** (curl, push-down, polpacci) alla fine
4. **Core / anti-rotazione** in coda (o all'inizio se attivazione)

**Cautele utente** (già deciso stamattina, qui solo richiamo)
- L'utente dichiara limitazioni in onboarding M1 (campo `limitazioni` array + `altre_limitazioni`).
- Coach incrocia con `zone_rischio` dell'esercizio. **Regola: prima ADATTA (colonna `adattamento`), solo se non basta SOSTITUISCE con `alternativa`**.

**Varietà tra blocchi (approccio misto, calibrato sull'esperienza)**
- **Dentro il blocco** (~4 settimane): esercizi FISSI (la progressione ha bisogno di riferimento stabile per lo storico).
- **Tra blocchi**:
  - **Principianti** → cambiano 1-2 esercizi a blocco (stesso pattern, esercizio diverso), gli altri restano → continuità per imparare la tecnica
  - **Intermedi/avanzati** → maggiore rotazione, possibili blocchi tematici (es. blocco forza → blocco ipertrofia → blocco ricomp/condizionamento)

**Scambio esercizio su richiesta utente (opzione C limitata)**
- Pulsante "cambia esercizio" disponibile, ma con vincoli:
  - **Massimo 1-2 scambi per sessione**
  - **L'alternativa la propone IL COACH** (stesso pattern), non l'utente dal catalogo intero
  - **Lo scambio NON è permanente**: vale solo per la sessione corrente. La sessione successiva torna l'esercizio originale del blocco (la progressione non si spezza).

**Persistenza scheda in DB (decisione architetturale)**
- **Approccio JSON unico** (NON multi-tabelle relazionali). Coerente con pattern esistenti (`weekly_plan_meals.ingredients jsonb`, `profiles.piano_ai jsonb`).
- Nuova tabella da creare: `schede_utente` con colonne minime:
  - `user_id` (uuid)
  - `blocco_n` (int — numero progressivo blocco, per varietà)
  - `scheda` (jsonb — intera scheda con sessioni ed esercizi)
  - `created_at` (timestamptz)
  - `attiva` (boolean — quale scheda l'app deve leggere)
- Statistiche di progressione restano in `workout_sets` e `training_logs` (già esistenti, relazionali) — non si toccano.

**Quando il coach genera la scheda**
1. ✅ **Fine onboarding M1** → genera SUBITO la prima scheda (altrimenti l'utente cade sul fallback `TRAINING_SESSIONS` = scheda di Ignazio, senza senso per altri utenti).
2. ✅ **Fine blocco (~4 settimane)** → genera il successivo, MA solo dopo check-in fisica M2 completata (4 foto + misurazioni). Senza M2 il coach NON genera: aspetta. Il coach legge i nuovi dati M2 (peso, misure, foto) per modulare il blocco successivo basandosi sui progressi reali. Aggancio: `m2EntryIntro()` già presente in codice, è il cancello tra un blocco e il successivo.
3. ❌ **Su richiesta utente "rigenera scheda"** → NO per ora (rischio rigenerazioni ripetute → progressione persa). Rivalutabile in futuro.

### PROSSIMI PASSI COACH GENERATORE (ordine, post-decisioni 27 mag sera)
1. ✅ **SQL creazione tabella `schede_utente`** su Supabase (28 mag — vedi schema sopra + muro UNIQUE PARTIAL).
2. ✅ **Funzione generatrice del coach** (28 mag — `generateTrainingProgram()` + 15 helper + diagnostica. Legge onboarding/profilo + catalogo → produce JSON scheda → salva in `schede_utente`). ⚠️ MA output ancora POVERO vs hardcoded — vedi "PROBLEMATICHE APERTE".
3. ✅ **Lettura scheda dal modulo Training** (28 mag — Mossa 3: `loadActiveScheda` + 4 helper unificati + fallback `TRAINING_SESSIONS`).
4. **Modifica onboarding M1**: aggiungere step "giorni di recupero attivo (0/1/2)". ⏳ NON fatto.
5. **Trigger generazione blocco N+1** dopo M2 completato (aggancio a `m2EntryIntro()`). ⏳ NON fatto.
6. **UI "cambia esercizio"** (opzione C con vincoli). ⏳ NON fatto.
7. ✅ **Hook generazione su `saveOnboarding`** (commit `df4eaf1`, 12 giu 2026): `saveOnboarding` chiama ora `generateTrainingProgram` al completamento — non più solo via `?schedaGen=1` / `ztTestGeneraScheda()` / Impostazioni.

## Bug noti

- `trainLoggedSets` si azzera al reload (in-memory only) — i badge serie spariscono dopo refresh
- `updateSuppSlotTime` presente ma non testata in produzione
- Alcuni integratori vecchi mostrano macro `—` (backfill SQL pendente)
- `body_logs` non ha constraint UNIQUE(user_id, date) su Supabase — il salvataggio usa insert/update manuale
- **Editor Pacchetto: emoji picker e time picker usano `prompt()` nativo** — UX scadente su mobile (il prompt iOS richiede tap doppio, no clipboard suggestion per emoji). Da sostituire con: `<input type="time">` nascosto + emoji-grid custom o sheet picker. Documentato come decisione in autonomia al Blocco 1.

## Note

- L'unico file da toccare normalmente è `zona-tracker.html`
- Il client Supabase si chiama `supa` (non `supabase`)
- La regola d'oro: un passo alla volta, Ignazio conferma con "ok/fatto" prima di procedere

### Debug cross-device

- **Versione attiva:** ogni device mostra in fondo a ogni tab principale `v${APP_VERSION}` nel formato `vYYYY.MM.DD · HH:mm`. Confronta i numeri sui device per capire chi ha la build vecchia.
- **Account loggato senza fare logout:** apri Impostazioni profilo (icona ⚙️ in alto a destra) — la prima card mostra l'email attiva (`ST.user.email`). Evita di consumare OTP per "vedere chi è loggato".
- **Web Inspector iPhone:** collegabile via cavo a Safari Mac (Sviluppo → nome iPhone → pagina). Utile per query diagnostiche dirette a Supabase quando i dati visualizzati non corrispondono al DB. Esempio: `await supa.from('meals').select('*').eq('user_id', ST.user.id).eq('date', '2026-05-04')` per controllare la realtà del DB confrontandola con `ST.db.days[...].meals`.
