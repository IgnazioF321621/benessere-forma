# Zona Tracker

PWA wellness single-file HTML, hostata su GitHub Pages. *(aggiornato: 13 settembre 2026)*

**Questo file contiene le regole vigenti.** Cosa resta da fare sta in [`docs/CANTIERI.md`](docs/CANTIERI.md); perché una regola esiste sta in [`docs/LEZIONI.md`](docs/LEZIONI.md); come si nominano gli esercizi in [`docs/NOMENCLATURA.md`](docs/NOMENCLATURA.md) (allegato normativo, in vigore). Non serve leggere gli archivi per lavorare: si aprono quando servono.

**Indice**: File e URL · Servizi · Workflow operativo · Pattern tecnici critici · Stato corrente · Bug noti aperti · Autenticazione · Design system · Navigazione · Schema Supabase · Vocabolario obiettivi · Media system · Nomenclatura v2 · Coach (Pirsi) · Training · Indice delle lezioni

**Il dettaglio operativo sta in quattro allegati**, staccati da qui il 13 settembre 2026: [`docs/SCHEMA.md`](docs/SCHEMA.md) · [`docs/MEDIA.md`](docs/MEDIA.md) · [`docs/COACH.md`](docs/COACH.md) · [`docs/TRAINING.md`](docs/TRAINING.md). Le regole che devono valere sempre sono rimaste qui; là c'è come si fanno le cose.

## File e URL

- **App**: `zona-tracker.html` (HTML + JS) più i file in `app/` e i moduli in `shared/` *(dal 2 ottobre 2026 la pagina è divisa in file, Fondamenta 035 chiusa in 11 tappe lo stesso giorno: `app/stile.css`, `app/comune.js` — stato, date, `dbq`, avvisi —, `app/body.js` — il tab Body: check fisico M2, peso e pesata rapida, esami del sangue, Tendenza, `renderBody` —, `app/nutrition.js` — il tab Nutrition: totali, stime AI dei pasti, strato dati, Oggi, Integratori, Analisi, Piano, catalogo ed editor pacchetti —, `app/home.js` — la Home: `renderHome`, dati Training per la Home, quadro settimanale con card e vista completa —, `app/training_generatore.js` — Training: dati di base, lettura della scheda, ciclo e debito, coach generatore —, `app/training.js` — Training, la sessione: serie, note, WS-QUEUE, timer e flussi, `renderTraining` —, `app/pirsi.js` — Pirsi: `callAI` ed errori AI, ritratto della persona, «Pirsi propone» —, `app/onboarding.js` — onboarding: fabbisogno (TDEE), M1 con accesso OTP, `saveOnboarding` —, `app/impostazioni.js` — la finestra delle impostazioni e `saveSettings` — e i quattro moduli condivisi; nella pagina restano configurazione, versione, nome del coach, app chiusa, diario del giorno, cache locale, avvio e accesso, navigazione, `renderPage` e il BOOTSTRAP: 2.247 righe, erano 24.557)*. **Il codice si sposta in un file a parte senza cambiare una riga**, e prima di salvare passano tre prove: `prova_pagina_divisa.js` (file ed elenco del service worker), `prova_ordine_caricamento.js` (niente usa al caricamento un nome che arriva da uno script dopo) e `prova_browser.js` (Chrome vero, in locale). **Ogni file richiamato dalla pagina va elencato in `APP_FILES` di `sw.js`**: lo controlla `node tools/banco/prova_pagina_divisa.js`. Il banco ricompone la pagina da solo (`tools/banco/pagina.js`)
- **Installazione sul telefono** *(Fondamenta 190, 2 ottobre 2026)*: `manifest.webmanifest` (Android: nome, avvio, modo app, icone) e `assets/icone/` (PNG 180 per iPhone, 192 e 512 «any» e «maskable»), disegnate da `node tools/icone/genera.js` senza librerie. Dopo il primo accesso la Home mostra una volta «Aggiungi alla schermata Home» (`installaHintHTML` in `zona-tracker.html`: Installa su Android via `beforeinstallprompt`, istruzioni su iPhone); «Non ora» lo toglie (`zt_installa_visto`). Manifest e icone non entrano in `APP_FILES`: non sono codice. Lo prova `node tools/banco/prova_installazione.js`
- **Admin**: `dashboardzona.html` (email-gated `ignazio.f@me.com`, read-only)
- **URL pubblico**: https://ignaziof321621.github.io/benessere-forma/zona-tracker.html
- **Repo**: https://github.com/IgnazioF321621/benessere-forma · branch `main`
- **Strumenti cantiere GIF**: `tools/biblioteca-nomi/` (nel repo; i materiali di lavoro pesanti restano solo sul Mac)

## Servizi

| Servizio | URL | Scopo |
|---|---|---|
| Cloudflare Worker | `zona-ai.ignazio-f.workers.dev` | Proxy Groq (openai/gpt-oss-120b) + lookup GIF + lettura foto dei check (Gemini `gemini-3.1-flash-lite`) + cron del lunedì 06:00 Roma ([Pirsi propone](docs/COACH.md#pirsi-propone)) |
| Supabase | `qxiyeiahpoiliwpqslpr.supabase.co` | DB + Auth + Storage |

Worker: account `ignazio-f` (account_id `2186a57344e459853657cea6213a2c74`). Secrets: `SUPABASE_SERVICE_ROLE_KEY` + `API_KEY` (Groq) + `GEMINI_API_KEY`. Dal 4 ottobre 2026 `SUPABASE_SERVICE_ROLE_KEY` contiene una chiave segreta nuova (`sb_secret_…`, nome `servizio_ottobre_2026_b`) e le chiavi legacy JWT (anon/service_role) sono **disattivate** su Supabase; per cambiarla in `.env`, `worker/.dev.vars` e Cloudflare in un colpo solo: `bash tools/cambia_chiave_servizio.sh` (legge dagli appunti, prova la chiave prima di scrivere). Binding: `IMAGES` (riduzione foto dei check). Deploy: `wrangler deploy` da `worker/` — **non** triggered da git push. Worker Version ID attuale: `e05e8103` (2 ottobre 2026). Cron `0 4 * * 1` e `0 5 * * 1` (UTC): lavora solo in quello che a Roma sono le 6.

---

## Workflow operativo (vincolante)

- **Divisione dei ruoli**: Claude chat = decisioni e brief · Claude Design = mockup · Claude Code = tutte le scritture su codice, Storage, DB, git. Nessuna sovrapposizione.
- **Un passo alla volta**: Ignazio conferma prima di procedere. Nessuna proposta speculativa prima di aver letto DB e codice reali.
- **Costo zero** *(Ignazio, 2 ottobre 2026)*: l'app resta nei piani gratuiti di Supabase, Cloudflare, Groq, Gemini e GitHub. Nessun lavoro può richiedere un piano a pagamento o avvicinare un limite gratuito senza una decisione esplicita di Ignazio: se succede, ci si ferma e si chiede. Sullo stesso account Supabase vivono anche altri progetti (MB21): lo spazio non è solo di Zona Tracker.
- **Dry-run e backup** prima di ogni scrittura su Storage o DB.
- **Resoconto obbligatorio a 6 punti** dopo ogni modifica: (1) file modificati con path esatto · (2) cosa è cambiato · (3) commit hash + branch · (4) push status su `origin/main` · (5) GitHub Pages ETA · (6) APP_VERSION.
- **Commit message con conteggi reali misurati**, mai stimati.
- **Comunicazione**: risposte brevi, dirette, senza gergo da sviluppatore verso Ignazio (non è un developer).
- La cartella locale sul Mac e GitHub devono restare allineate: si fanno da backup a vicenda. **La fonte è GitHub** *(dal 2 ottobre 2026 sera)*: con le sessioni nel cloud ogni sessione ha una copia sua, e il Mac è una copia come le altre, da aggiornare con `git pull` dopo ogni unione in `main`.

---

## Pattern tecnici critici

- **Moduli condivisi app ↔ Worker**: `shared/nutrizione.js` (totali della giornata), `shared/quadro.js` (calcolo del quadro, settimana del ciclo, reminder di fine blocco, orologio Europe/Rome), `shared/coach_rules.js` (regole di Pirsi). **Una fonte sola, `shared/`** *(dal 2 ottobre 2026, Fondamenta 035)*: la pagina li carica con `<script src="shared/…">` prima del proprio codice, il Worker li importa. Non c'è più una copia dentro `zona-tracker.html`; `node tools/moduli.js` (lo lancia anche il pre-commit) controlla che la pagina li richiami tutti, una volta, e che non ne sia rimasta una copia. **Un modulo nuovo in `shared/` va richiamato dalla pagina ed elencato in `APP_FILES` di `sw.js`.** `dayTotals`, `computeWeeklyPicture`, `getCycleWeekInfo`, `getBlockCheckReminder`, `weighInsByDay` nell'app sono involucri che passano `ST`
- **La Home si disegna una volta per fotogramma** *(dal 2 ottobre 2026, Fondamenta 100)*: `renderHome()` prenota il disegno al prossimo `requestAnimationFrame`, chi la chiede nel frattempo trova la prenotazione già fatta; `renderHomeV2()` disegna subito, per chi deve leggere la pagina appena disegnata (le prove del banco). Nello stesso spirito `loadCoachProposals()` legge `coach_proposals` una volta per apertura e `{force:true}` rilegge davvero. Lo misura `node tools/banco/prova_avvio_home.js`. **Le letture di avvio partono insieme** (tappa 3): `caricaDatiAvvio({storico})` in `zona-tracker.html` le lancia in tre ondate — catalogo, scheda, storico e serie di oggi · integratori · pacchetti, extra e presi-oggi — e la usano l'apertura con copia locale, la prima apertura e `refreshInBackground`; `loadAllDays` legge pasti, ingredienti, digiuni e integratori dello storico in parallelo. Una lettura nuova all'avvio entra nell'ondata giusta, non in coda. Lo misura `node tools/banco/prova_avvio_ondate.js`. **Lo storico si legge a finestra** (tappa 4): all'avvio e al rientro `loadAllDays` e `loadExtrasAll` leggono solo gli ultimi `STORICO_AVVIO_GIORNI` (90) giorni; il resto lo aggiunge `caricaStoricoCompleto()`, una volta, quando serve a chi sfoglia lontano — Analisi a 3 e 6 mesi o settimane vecchie, il ‹ del tab Nutrition sul primo giorno letto, la serie di giorni di fila che arriva al bordo. **Chi legge `ST.db.days` o `ST.extrasByDay` per un intervallo lungo deve chiedere prima `storicoCopreDal(chiave)` e, se è falso, `caricaStoricoCompleto()`** (oggi: Analisi, `navDay`, `calcStreak`). Dopo che il resto è stato aperto (`ST.storicoCompleto`) anche il rinfresco legge tutto. Gli ingredienti non hanno una data: si leggono col join `meals!inner(date)`, con ripiego sulla lettura intera. Lo misura `node tools/banco/prova_avvio_finestra.js`. **Il rientro è leggero** (tappa 5): `refreshInBackground` rilegge solo profilo, ultimi `RIENTRO_GIORNI` (7) giorni di pasti, ingredienti, digiuni, integratori ed extra (`loadRecentDays`) e le serie di oggi — 6 richieste *(erano 7 fino al 3 ottobre: la lettura di `workout_sets` non c'è più)*; catalogo, integratori, pacchetti, scheda e storico più vecchio si rileggono al rinfresco completo, che parte se l'ultimo completo è di più di 30 minuti fa, se il giorno è cambiato, se non ce n'è stato uno o se la lettura leggera fallisce. **Una lettura nuova che deve restare aggiornata tra due telefoni va in `loadRecentDays` se riguarda gli ultimi giorni, altrimenti nel rinfresco completo.** Lo misura `node tools/banco/prova_rientro_leggero.js`. **La copia locale è a finestra** (tappa 6): `saveCache` salva solo gli ultimi `CACHE_GIORNI` (90) giorni e, se localStorage rifiuta, riprova con 14; `misuraCache()` dice quanto pesa. Lo misura `node tools/banco/prova_cache_locale.js`
- **Niente finestrelle del telefono** *(Fondamenta 150, 2 ottobre 2026)*: `confirm`, `alert` e `prompt` non si usano. Al loro posto, in `app/comune.js`: `await chiediConferma(testo, {titolo, ok, annulla, pericolo})` → vero/falso · `await chiediTesto(titolo, {valore, tipo, segnaposto})` → testo o `null` · `await avvisa(testo, {titolo})`. Per una svista di chi scrive basta `showToast`. Lo controlla `node tools/banco/prova_conferme.js`, che cerca anche le chiamate rimaste nel codice
- **Il tasto «Segnala»** *(Fondamenta 220, 6 ottobre 2026, copiato da MB21)*: un piccolo insetto fisso in alto a destra (`#segnala`, `.segnala-bottone`, z-index 2500: sopra ogni foglio, sotto il toast) si accende in `showScreen('app')` e solo lì; `foglioSegnala()` in `zona-tracker.html` apre «Cosa non va, o cosa proponi?» (Non funziona · Non capisco · Un'idea, testo facoltativo, «Invia» spento finché non si sceglie), `doveSono()` aggiunge il tab, la sezione e i titoli dei fogli aperti; le regole pure stanno in `app/segnala.js` (`ZTSegnala`). Una scrittura in `segnalazioni` (migrazione `20261006_220_segnalazioni.sql`) e basta: nessuna lettura dall'app, senza rete «Non inviata» e **non** va in coda. Mai la parola «errore». L'insetto non copre niente: quello che stava nell'angolo si sposta (`.h-inner`, `.home-v2-header`, le intestazioni dei fogli interi hanno `padding-right`). Le legge la Regia quando Ignazio dice «leggi le segnalazioni» (Metodo 140). Lo prova `node tools/banco/prova_segnala.js`
- **Ogni lettura passa da `dbq`** *(Fondamenta 180, 2 ottobre 2026)*: le 37 letture scoperte sono state avvolte (silenziose solo quelle di sfondo: serie di oggi, allenamenti completati, profilo al rinfresco). **Nessuna funzione mai chiamata**: le 27 misurate il 7 agosto più le 5 che solo loro usavano sono uscite a mano; lo misura `node tools/banco/funzioni_morte.js`, che deve dare 4 (il diario del giorno, in attesa, e `misuraCache`)
- **Senza rete niente si perde** *(Fondamenta 120, 2 ottobre 2026)*: pasti, ingredienti, digiuni, integratori presi e pesate si scrivono con `scriviConCoda(operazione, {tabella, tipo, righe|filtri, onConflict})` in `app/comune.js`: senza rete o con la rete muta l'operazione va in coda su localStorage (`zt_coda_<utente>`) e `svuotaCoda()` la rimanda al ritorno della rete, al rientro e dopo ogni scrittura riuscita, in ordine, fermandosi alla prima che fallisce; un errore dell'API non va in coda. **Le righe nuove hanno l'id scelto dal telefono (`nuovoId()`)**, così un rinvio doppio risponde 23505 e conta come fatto. La striscia `#senza-rete` (`aggiornaStatoRete`) dice l'ora dei dati e quanti salvataggi aspettano; `dbq` non avvisa quando `senzaRete()`. Il service worker aspetta la rete al massimo 3 secondi (`ATTESA_RETE_MS`) se ha una copia, e salva i caratteri di Google Fonts. Dal 3 ottobre 2026 (Fondamenta 080) anche le serie di allenamento passano da qui, con `tipo:'update'` per le modifiche: la WS-QUEUE non esiste più, e all'avvio la sua vecchia chiave `zt_ws_pending_<utente>` viene tolta. Lo prova `node tools/banco/prova_senza_rete.js`
- Client Supabase si chiama `supa` (non `supabase`)
- SQL Editor gira come admin: `auth.uid()` = NULL → usare UUID espliciti
- **Ogni tabella nuova dichiara i suoi `GRANT` nella stessa migrazione che la crea** *(dal 30 ottobre 2026 Supabase non li dà più da solo)*: senza, l'app riceve «permission denied». Di norma `authenticated` e `service_role`; `anon` solo se serve davvero a chi non è entrato. Insieme ai grant vanno sempre RLS accesa e le sue regole. Le tabelle già esistenti non cambiano
- **supabase-js NON lancia eccezioni sugli errori API**: restituisce `{error}` nel result → i `try/catch` non li vedono. Controllare SEMPRE `res.error` → [L22](docs/LEZIONI.md#l22--supabase-js-non-lancia-eccezioni-sugli-errori-api)
- **Ogni chiamata a Supabase si avvolge in `dbq('cosa sta facendo', …)`**: controlla l'errore, lo scrive in console col nome dell'operazione e mostra un toast da 5500 ms. Restituisce lo stesso `{data, error}`, quindi non cambia la logica di chi la usa. `{silenzioso:true}` per i rollback e le operazioni di sfondo, dove il toast sarebbe rumore. **Tutte le 23 scritture sono coperte** (Nutrition 16 · Training 3 · Body 4). L'esclusione di `_wsExec` (WS-QUEUE) è caduta il 3 ottobre 2026 con la coda unica
- **Il codice esercizio è la chiave, e le serie stanno in una tabella sola** *(Fondamenta 070 e 080, 3 ottobre 2026)*: `training_logs` ha `exercise_code` e `training_notes` anche; ogni salvataggio lo scrive (`_codiceDaNome`: sessione, poi catalogo vivo, poi alias storici) e il nome resta accanto, per leggere le righe vecchie. Le letture cercano **per codice e poi per nome**: «Ultima volta», Progressione, dettaglio del giorno, note. `workout_sets` non si legge e non si scrive più: resta nel database (toglierla è una decisione a parte) e la sua coda (WS-QUEUE) è uscita. Le serie si scrivono con `scriviConCoda` e l'id scelto dal telefono (`setId` in `ST.trainLoggedSets`). Per gli integratori `supplements_log` ha `supplement_id` (la riga di `supplements`): la riga si lega al prodotto con `ZTNutrizione.suppForLog` (id, poi nome) e togliere un preso cerca per id **o** per nome in una richiesta sola (`.or`, valori preparati da `_orEq`). Il ponte nome→codice (`ensureExNameAliases`, `_normExName`) resta come ripiego → [L45](docs/LEZIONI.md#l45--il-nome-mostrato-a-schermo-non-è-una-chiave). **Le migrazioni** `supabase/migrations/20261003_070_080_codice_e_tabella_unica.sql` (colonne, travaso da `workout_sets`, codice nelle righe vecchie, elenco di quelle scoperte) **e** `20261003_090_vincoli_righe_doppie.sql` **vanno eseguite prima del rilascio, con copia di sicurezza**; `supabase/verifiche/070_080_090_fotografia.sql` si legge prima e dopo. Lo prova `node tools/banco/prova_tabella_unica.js`
- **Una riga sola per** serie (persona, giorno, sessione, esercizio, numero), allenamento (persona, giorno, sessione) e misura del corpo (persona, giorno) *(Fondamenta 090, 3 ottobre 2026)*: i tre vincoli stanno nella migrazione `20261003_090`, che si ferma e conta se trova righe doppie (non cancella niente). L'app salva con «scrivi o aggiorna»: `workouts` con `upsert` e `ignoreDuplicates` (la riga che c'è non si tocca, si rilegge l'id), `body_logs` con `upsert` sui soli campi compilati. Mai più «guarda prima di scrivere» per evitare un doppione
- **Privacy** *(Fondamenta 170, 3 ottobre 2026)*: prima del primo accesso la schermata `#privacy-screen` («Dove vanno i tuoi dati», testo `PRIVACY_INFORMATIVA` in `app/comune.js`, bozza in [`docs/PRIVACY.md`](docs/PRIVACY.md)); `showScreen('auth')` la mostra finché non è letta, la scelta sta sul telefono (`zt_privacy_ok` = `PRIVACY_VERSIONE`: se il testo cambia si rilegge). Le foto partono verso Gemini solo dopo `consensoLetturaFoto` («Acconsento»/«Annulla», `zt_foto_ok`). **Il nome della persona non entra nei testi al coach**: non in `rigaPersona` del ritratto, non nel piano, non nella nota di scheda; il nome del coach sì. «Scarica i miei dati» nelle Impostazioni (`raccogliMieiDati`, 23 tabelle, foto solo in elenco). «Elimina account» nelle Impostazioni (`eliminaMioAccount`: parola ELIMINA, foto tolte coi permessi della persona, poi la funzione `elimina_mio_account()` della migrazione `20261003_170`, che cancella l'accesso e a cascata le righe; l'amministrazione non si cancella da lì). Lo prova `node tools/banco/prova_privacy.js`
- **`isPullUpExercise` decide chi si logga a banda**, per prefisso `trazion` **meno** `zavorrat` e `gravitron` (lì la resistenza è carico, non assistenza). Punto unico: nessun altro confronto sul nome va introdotto
- `schedaGen=1` ricostruisce la scheda da zero, cancella storico progressione — solo per correzioni mirate
- **`console.log` da rimuovere solo manualmente, mai con script automatici.** Il pericolo è la logica inglobata nella stessa riga del logging → [L1](docs/LEZIONI.md#l1--uno-script-che-toglie-i-log-si-porta-via-la-logica-sulla-stessa-riga)
- **Prima di aggiungere un alias in `GEAR_ALIASES`, verificare che il termine di destinazione esista davvero nel catalogo.** Un token vive quando qualche riga lo usa → [L2](docs/LEZIONI.md#l2--un-alias-può-puntare-a-una-parola-che-non-esiste). Stesso difetto in `APERTO_WHITELIST` (`banda` e `cavigliere` a 0 occorrenze; `corda`, 9 esercizi, non è in whitelist)
- `TRAINING_SESSIONS`/`SESSION_CYCLE` hardcoded sono fallback; gli helper `getTrainingSession`/`getAllTrainingSessions`/`getSessionCycle` leggono prima da `ST.userTrainingSessions`. ⚠️ Dentro gli helper NON usare i nomi degli helper stessi → ricorsione infinita
- **La versione nuova si segnala, non si impone** *(Fondamenta 140, 2 ottobre 2026)*: quando il service worker nuovo è installato compare la striscia `#aggiorna-banner` («tocca per aggiornare», `aggiornaApp` ricarica); durante una sessione di allenamento (`ST.trainSession`) la striscia aspetta `closeTrainingSession`. Il controllo degli aggiornamenti parte ogni 3 minuti e a ogni ritorno in primo piano (`controllaAggiornamenti`): chiede al service worker **e** legge `zona-tracker.html` dalla rete (`cache:'no-store'`) confrontando `APP_VERSION` con quella in uso, perché il rilascio cambia solo la pagina e non `sw.js` (difetto trovato il 3 ottobre dopo il rilascio); senza rete non fa niente. Mai `location.reload()` da soli. La libreria Supabase resta su jsdelivr come «versione 2 qualsiasi»: fissarla a una versione esatta è una decisione da prendere con la rete aperta. Lo prova `node tools/banco/prova_versione_nuova.js`
- Service Worker: **MAI aggiungere `supabase` al cache-first** (causa sync bug cross-device). Cache-first solo per `cdn.jsdelivr.net` e per i caratteri di Google Fonts; la pagina e i file di `app/` sono network-first con un tempo massimo di 3 secondi quando c'è una copia (sempre freschi in linea, quelli salvati solo senza rete). Cache name: `zt-v2`
- **`APP_VERSION` la mette solo il rilascio** *(dal 2 ottobre 2026)*: `bash tools/rilascio/versione.sh`, ora di Roma, subito prima di pubblicare. Il pre-commit non la tocca più e non fa più `git add` dell'app: controlla solo i moduli di `shared/`. La fonte dell'hook è `tools/hooks/pre-commit`, si installa con `bash tools/hooks/installa.sh`
- **Pubblica solo la sessione «REGIA [Audit/Rilascio]»** *(dal 2 ottobre 2026)*: `git push` e `wrangler` chiedono conferma (`.claude/settings.json`), `git add -A` e `git add .` sono vietati. Le altre sessioni lavorano su un solo titolo, fanno commit aggiungendo i file **per nome**, e **spingono solo sul proprio ramo** (`git push -u origin <ramo>`), mai su `main` *(dal 2 ottobre 2026 sera, con le sessioni nel cloud: un commit lasciato in locale si perde allo spegnimento del contenitore)*. Spingere su un ramo non è pubblicare: GitHub Pages pubblica solo `main`. **Solo la REGIA unisce i rami in `main`**, mette la versione e pubblica il Worker; dopo ogni unione il Mac fa `git pull`. La lista dei lavori è in Evernote, spazio «Zona-Tracker», un taccuino per titolo
- **Paginare sempre** le SELECT su tabelle >1000 righe (es. `biblioteca_gif`): PostgREST tronca al limite default → [L13](docs/LEZIONI.md#l13--postgrest-tronca-le-select-al-limite-default)
- Il ciclo canonico a 7 include `rest`: ogni logica che itera il ciclo deve gestire slot non loggabili (`rest`/`rest_injury`)
- La settimana ciclo si legge SOLO da `getCycleWeekInfo()` — vietato ricalcolarla inline
- **Il peso attuale si legge SOLO da `weighInsByDay`** (`getWeighIns()` nel tab Body): una pesata al giorno, `weight_logs` > `body_logs` > misure del check. Quadro, numero grande del tab Body, pillola in alto, card Body in Home, **grafico Tendenza e «Ultimi log»** (dal 13 settembre, cantiere 35) passano tutti da lì → [L48](docs/LEZIONI.md#l48--quando-si-corregge-la-fonte-di-un-numero-si-cercano-tutti-i-posti-che-rispondono-alla-stessa-domanda)
- TSV/CSV da Google Sheet: **UTF-8 con BOM + CRLF** — usare `encoding='utf-8-sig'` e controllare il conteggio righe parsate → [L14](docs/LEZIONI.md#l14--i-tsv-da-google-sheet-arrivano-utf-8-con-bom-e-crlf)
- **Path e nomi file SEMPRE ASCII**: Storage rifiuta chiavi NFD con `400 InvalidKey`. Normalizzare a NFC, poi traslitterare → [L15](docs/LEZIONI.md#l15--i-nomi-file-macos-sono-in-forma-decomposta). Accenti solo in `nome_italiano`/catalogo, mai nel path o filename
- Il `:` nel filename è ammesso in Storage e NON viene sanificato (verificato su 5 file in `Tricipiti/`)

---

## Stato corrente (13 settembre 2026)

**Nutrition** ✅ completo — Oggi, Integratori v3, Analisi v3, Piano v4 (Step A→F.2a). F.2b in stand-by.

**Pirsi** ✅ chiuso 13 agosto — il coach ha un nome, **provvisorio e in prova**. Prompt allineati su un registro unico, stringhe visibili riscritte nei tre moduli, nome in `COACH_NAME`. Regole in [Pirsi](docs/COACH.md#pirsi--nome-e-voce-del-coach), residui aperti nel [cantiere 26](docs/CANTIERI.md#26-residui-noti-dei-prompt-di-pirsi).

**Training** — in sviluppo attivo, **unico utente Ignazio** (gli altri tester usano Nutrition e Body: un bug del generatore non ha impatto su terzi). Coach generatore funzionante su **725 esercizi**, split 4/5 giorni con rotazione adattiva, Recovery Day unificato, Upper Pump, audio unificato, timer recupero parallelo al form log, WS-QUEUE, infortuni multi-giorno, rientro soft. **I timer sono collaudati su workout reali** durante l'uso normale dell'app: [cantiere 1](docs/CANTIERI.md#1-test-timer-su-workout-reali---chiuso-13-settembre-2026) chiuso il 13 settembre, nessun test aggiuntivo.

**Catalogo GIF** — **661 `gif_slug` attivi, 0 rotti, 64 codici senza slug**. Zero slug puntati da più di un codice. Numeri sempre aggiornati in [`docs/STATO.md`](docs/STATO.md). Zone chiuse: Addominali e Core, Bicipiti e Braccia, Cardio e Conditioning, Gambe e Glutei, **Polpacci** e **Pettorali** — entrambe chiuse il 21 agosto su tutti e tre i lavori (Pettorali: 82 GIF, 82 codici, EX677-EX701 aggiunti in un colpo). **Spalle e Cuffia** — **chiusa il 23 agosto su tutti e tre i lavori**: 63 nomi confermati al pannello, file rinominati, bucket migrato con le righe doppie, EX408 consolidato in EX057, e le ultime **10 GIF senza codice diventate EX702-EX711**. Nessuna GIF della zona è più senza codice. **Tricipiti** — **chiusa il 24 agosto su tutti e tre i lavori**: 59 GIF, 59 righe, 59 codici, i quattro numeri coincidono. Tre sostituzioni di immagine decise lungo il percorso e le ultime **5 GIF senza codice diventate EX712-EX716**. **Schiena e Trapezio** — **chiusa il 31 agosto su tutti e tre i lavori**: 113 oggetti, 113 righe, 110 codici, 0 righe senza oggetto e 0 oggetti senza riga. Le 18 GIF calisthenics senza codice sono diventate **EX721-EX738**, e prima di loro EX717-EX720; 3 righe restano senza codice **per decisione**, non per arretrato. **Resta una zona sola: Mobilità** (133 GIF attive, mai entrate nel bucket, più 76 ritirate che non entrano — contate il 13 settembre). **Il primo lavoro, la conferma dei nomi, è in corso dal 1 settembre**: 139 decisioni nel registro, in git dal 13 settembre. Il piano di Pettorali è stato rigenerato il 13 settembre e descrive lo stato finale: 82 slug invariati, 0 percorsi che cambiano. Una cartella si chiude su tre lavori prima di aprire la successiva → [regola di metodo](docs/MEDIA.md#una-cartella-si-chiude-su-tre-lavori).

**Pirsi propone** ✅ chiuso 13 settembre (Fase 3) — il coach propone correzioni settimanali, l'utente accetta o rimanda. Codice in `main`, Worker deployato, migrazione eseguita e Accetto provato dal vivo il 13 settembre; prima settimana vera nel [cantiere 36](docs/CANTIERI.md#36-pirsi-propone--collaudo-dal-vivo-e-prima-settimana-vera). Regole in [Pirsi propone](docs/COACH.md#pirsi-propone).

**Quadro settimanale** ✅ chiuso 12 settembre — card «La tua settimana» in Home e vista completa, calcolo e storico. Dal 13 settembre il blocco Peso ha il **peso attuale** grande (ultima pesata) con media e obiettivo sotto. `weekly_pictures` creata e collaudata il 13 settembre: 8 settimane, 0 doppioni, 8/8 uguali al ricalcolo. **Dal 13 sera versione 2**: la nutrizione conta pasti + integratori + extra come il tab Nutrition, le 8 righe riscritte. Regole in [Quadro settimanale](docs/COACH.md#quadro-settimanale).

**Body** — M2 check fisico funzionante. Dal 12 settembre la CTA «Nuovo check fisico» è **fissa nell'intestazione del tab**, visibile nei tre tab e in tutti gli stati, con reminder di fine blocco (42 giorni da `train_start_date`, nessun check completato nelle ultime 4 settimane) e **storico degli esami del sangue** in coda al tab Check. Da ri-agganciare a fine blocco Training. **Lettura delle foto dei check** ✅ dal 13 settembre: regole in [Lettura AI dei check](docs/COACH.md#lettura-ai-dei-check).

**Admin** (`dashboardzona.html`) ✅ production-ready.

**Ricompressione a 480px + `cache-control`** — cantieri 21 e 22, ✅ **chiusi il 16 agosto**. Il ciclo egress si è azzerato il 15; il vincolo che stringe non era il traffico ma **lo spazio**: al 15 agosto 639 MB su 1024 del piano Free (62%), e Pettorali + Mobilità ne avrebbero aggiunti 514 a piena risoluzione, sfondando il limite. La regola permanente è in [Ogni GIF entra nel bucket ridotta e con la cache](docs/MEDIA.md#ogni-gif-entra-nel-bucket-ridotta-e-con-la-cache--regola-permanente). **Tutte e 8 le zone migrate sono scese**, fra il 15 e il 16 agosto. Bucket da 639 a **362 MB, 35% del piano Free** — **277 MB liberati**, e tutti gli oggetti servono `public, max-age=31536000, immutable` — **686 oggi**, perché da allora sono entrate le zone nuove, che entrano già ridotte. **Il 13 settembre il bucket pesa 384,7 MB** e `_480/` è sgomberata su tutte le zone. Con Mobilità dentro, già ridotta al caricamento, la biblioteca completa si ferma a **~517 MB, il 50% del piano**. Le altre 8 in [`docs/CANTIERI.md`](docs/CANTIERI.md#21-ricomprimere-le-gif--il-cantiere-che-chiude-il-problema-storage).

**Sul fronte GIF**: **Mobilità**, l'ultima zona, 133 file mai entrati nel bucket — e per regola entrano già ridotti a 480 px. Il 13 settembre si sono chiusi il [cantiere 7](docs/CANTIERI.md#7-stacco-da-terra-classico---chiuso-13-settembre-2026-file-non-più-esistente) (Stacco da terra classico: file non più esistente) e le tre coppie del [cantiere 4](docs/CANTIERI.md#4-lista-da-consolidare), fuse il 21 agosto; del 4 resta aperto solo Russian twist. Lista completa in [`docs/CANTIERI.md`](docs/CANTIERI.md).

---

## Bug noti aperti

- `trainLoggedSets` si azzera al reload — badge serie spariscono dopo refresh
- Alcuni integratori vecchi hanno macro `—` (backfill SQL pendente)
- ~~`body_logs` manca UNIQUE(user_id, date)~~ — chiuso il 3 ottobre 2026 (Fondamenta 090: vincolo in `20261003_090_vincoli_righe_doppie.sql`, salvataggio «scrivi o aggiorna»)
- Isabella: `status=draft`, 0 meals per settimana corrente — non investigato
- **EX576** `Piegamenti tocco ai piedi`: `alternativa` = EX576 (autoriferimento preesistente)
- **`splitTypeFilter` di `ztTrainGenPatternPick`**: il parametro è accettato e ignorato
- **5 candidati core senza GIF** — EX023 Pallof press · EX032 Hollow hold · EX036 Bird dog · EX046 Stir the pot · EX109 Plank shoulder taps. Per Bird dog la GIF esiste in biblioteca: manca solo il `gif_slug`
- **`cavigliere` e `cavigliera`: nessuna delle due esiste a catalogo** (misurato 21 agosto). L'app avvisa che `cavigliere` non apre nessun esercizio, e l'alias `GEAR_ALIASES` lo manda su `cavigliera` — che ha **0 occorrenze** in `attrezzo` e **0** in `surrogato_attrezzo`, esattamente come `cavigliere`. Non è un doppione da unificare: sono **due termini morti**, e la pillola dell'onboarding non può aprire niente in nessuno dei due modi → [L2](docs/LEZIONI.md#l2--un-alias-può-puntare-a-una-parola-che-non-esiste). Le 130 righe che contengono "cavigli" lo hanno nella prosa (`zone_rischio`, `setup`, `esecuzione`) e parlano della **caviglia**, non dell'attrezzo
- **EX508 e EX509 (`Trazioni sbarra gravitron`) hanno `luogo = casa` e surrogato `elastico`** *(visto il 4 ottobre 2026 nell'anteprima del blocco nuovo)*: a casa coincidono con EX505 `Trazioni sbarra assistite elastico`, e `isPullUpExercise` le farebbe loggare in libbre invece che a banda. Il generatore ora le tiene fuori dal blocco nuovo (il surrogato vale come il gesto base della famiglia), ma il `luogo` va corretto nel foglio
- **11 righe a manubri con `luogo = palestra` che a casa si fanno**, residuo aperto rimisurato il 22 agosto sera: EX002 · EX071 · EX099 · EX212 · EX317 · EX354 · EX358 · EX368 · EX375 · EX392 · EX393. Dieci hanno il surrogato ed entrano dal bypass, quindi il `luogo` impreciso non le blocca — le mostra solo come esercizi da palestra. **EX212 `Jumping pliometrico manubri` è l'unica senza surrogato**, e quella resta fuori davvero. Il sync del 22 agosto sera non le ha toccate: le 8 righe con `casa` aggiunto erano quelle a corpo libero (EX038 · EX072 · EX357 · EX570 · EX599 · EX681 · EX682 · EX683)

---

## Autenticazione

OTP a 6 cifre via email. Flusso: `signInWithOtp` → codice email → `verifyOtp({ type: 'email' })`. Rate limit: aspettare 1h se raggiunto.

**Il profilo non letto non è un profilo assente** *(Fondamenta 130, 2 ottobre 2026)*: al primo avvio senza copia locale, se `profiles` non risponde con `PGRST116` (nessuna riga) l'app mostra «Non riesco a collegarmi» con Riprova (`#retry-screen`, `riprovaAvvio`) e non apre mai l'onboarding, che riscriverebbe il profilo vero. Lo prova `node tools/banco/prova_avvio_senza_profilo.js`.

Bootstrap (parte subito al caricamento, *dal 2 ottobre 2026, Fondamenta 100: prima aspettava 1,8 s fissi di splash*; lo splash resta finché `showScreen` non lo toglie): `?test=1` → `#access_token` → `?code=` → `getSession()` → schermata auth → `onAuthStateChange` → `visibilitychange` (polling + `refreshInBackground` throttle 30s).

---

## Design system

Nomi, valori e regole in **[`docs/STILE.md`](docs/STILE.md)** *(dal 6 ottobre 2026, Stile 010)*. **In `app/stile.css` ogni colore e carattere ha un nome in `:root`: fuori da `:root` non si scrive mai un colore a mano** (le trasparenze con i canali, `rgba(var(--acc-rgb),.25)`). Lo controlla `node tools/banco/prova_stile.js`; con lo stile di prima accanto prova anche, in Chrome vero, che l'aspetto non è cambiato.

- **Font**: Syne (titoli/prose) + JetBrains Mono (numeri/label). **MAI Manrope** sulle schermate nuove
- **Background**: bone `#F5F3EE` · **Accent**: evergreen `#2A7A6F`
- **Tinte modulo**: Nutrition `#FAC775` · Training `#B5D4F4` · Body `#AFA9EC` (forte `#5E4A7A` solo checkpoint)
- **Over-target**: `OVER_COLOR='#B45309'`
- **"coach"** sostituisce "AI" in tutti i copy visibili UI. Dal 13 agosto 2026 il coach ha un nome: vedi [Pirsi](docs/COACH.md#pirsi--nome-e-voce-del-coach)
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

Tabelle, colonne e vincoli in **[`docs/SCHEMA.md`](docs/SCHEMA.md)**. Si apre prima di scrivere una query o di aggiungere un campo.

Tabelle: `profiles` · `meals` · `esercizi_catalog` · `schede_utente` · `biblioteca_gif` · `training_logs` (dal 3 ottobre 2026 la tabella unica delle serie, con `exercise_code`) · `weekly_plans` · `weekly_plan_meals`. **`docs/SCHEMA_TABELLE.md` si rigenera dopo ogni migrazione** (`tools/schema_fotografia.py`), non si corregge a mano: dopo le migrazioni del 3 ottobre va rifotografato.

⚠️ **`esercizi_catalog` si scrive dal Google Sheet, mai direttamente in Supabase.** Il sync non elimina: le righe da togliere si cancellano nel foglio prima del sync.
⚠️ **Dopo ogni sync si lancia `verifica_sync.py`**, prima di qualunque altra cosa, e si rimisura la baseline dei pool → [L3](docs/LEZIONI.md#l3--una-riga-tolta-dal-foglio-non-sparisce-si-arena) · [L4](docs/LEZIONI.md#l4--il-sync-riporta-indietro-ciò-che-il-foglio-non-ha) · [L17](docs/LEZIONI.md#l17--la-baseline-si-sposta-anche-quando-cambia-il-catalogo-non-solo-il-codice)

---

## Vocabolario obiettivi (`OBJ_ADAPT`)

6 chiavi: `dimagrimento · ricomposizione · ipertrofia · forza_performance · longevita · mantenimento`.
Migrazione: `perdita_peso→dimagrimento`, `massa_muscolare→ipertrofia` via `migrateObiettivo()` — applicata ovunque si legge `profile.obiettivo`.

Macro % `[carbo/prot/fat]`: dimagrimento 38/32/30 · ricomposizione 38/34/28 · ipertrofia 40/35/25 · forza_performance 42/33/25 · longevita+mantenimento 40/30/30.

---

## Media system

Flusso GIF del Worker, regole di migrazione, riduzione a 480px e riconciliazione a tre fonti in **[`docs/MEDIA.md`](docs/MEDIA.md)**. Si apre prima di toccare una zona GIF.

**Le regole che valgono sempre, anche senza aprire quel file:**

- **Aggancio per impronta, mai per nome.** Un file si collega al suo codice confrontando lo SHA-256 → [L9](docs/LEZIONI.md#l9--aggancio-per-impronta-mai-per-nome)
- **Nessun esercizio entra a catalogo o viene rinominato senza che Ignazio ne abbia visto la GIF.** L'analisi tecnica prepara la decisione, non la sostituisce
- **Nessun nome entra negli strumenti passando dalla chat.** Fonte unica dei nomi è il pannello di conferma
- **Nessuna GIF entra nel bucket a piena risoluzione**: 480px e `cache-control` immutable fanno parte del caricamento, non sono un intervento successivo
- **Ordine a righe doppie obbligatorio quando cambia uno slug.** Non deve esistere un istante in cui una GIF è irraggiungibile. Dopo il sync, confronto codice per codice contro la lista consegnata, prima di qualunque cancellazione → [L41](docs/LEZIONI.md#l41--dopo-ogni-sync-confronto-codice-per-codice-contro-la-lista-consegnata-prima-di-qualunque-cancellazione)
- **Una cartella si chiude su tre lavori** — nomi, immagini, catalogo — **prima di aprire la successiva.** Una zona migrata col catalogo non popolato è aperta, non chiusa
- **Un'impronta non determinabile blocca**: `ignoto` e `indeterminato` non diventano mai "a posto" per silenzio → [L10](docs/LEZIONI.md#l10--il-ripiego-silenzioso-su-libero-è-ciò-che-ha-causato-il-difetto)
- **Le verifiche si fanno con `HEAD`, non scaricando.** Il download è l'eccezione, si chiede a voce e vale per un file solo → [L24](docs/LEZIONI.md#l24--limpronta-di-un-oggetto-si-legge-senza-scaricarlo)
- ⚠️ **La verifica per impronta dice che la catena è integra, non che punta dove è stato deciso** → [L8](docs/LEZIONI.md#l8--che-la-catena-sia-integra-non-significa-che-punti-dove-è-stato-deciso)

---

## Nomenclatura esercizi v2 — normativa vincolante

Le 12 regole per nominare un esercizio e derivarne lo slug stanno in **[`docs/NOMENCLATURA.md`](docs/NOMENCLATURA.md)** — allegato normativo, non archivio: è lo standard in vigore dal 19 luglio 2026 e supera ogni regola precedente. Si apre ogni volta che un esercizio entra a catalogo o viene rinominato.

Indice: 1 nome unico · 2 formula e default omessi · 3 maiuscole · 4 panche · 5 gradi · 6 slug monolingue · 7 codice stabile · 8 storico · 9 estensione attiva del rachide · 10 campo `uso` per i conditioning · 11 famiglia in testa · 12 lato del carico

---

## Coach — Pirsi, quadro settimanale, lettura dei check

Il quadro della settimana, la lettura AI delle foto dei check, le proposte del lunedì, il nome e la voce del coach: tutto in **[`docs/COACH.md`](docs/COACH.md)**.

- **Il coach si chiama Pirsi**, nome provvisorio in prova. Vive in un posto solo: `const COACH_NAME` in `zona-tracker.html`, subito dopo `APP_VERSION`. **Fuori dai prompt non si scrive mai per esteso**; dentro i prompt sì, ed è voluto
- **Pirsi propone, decide Ignazio.** Massimo 3 proposte a settimana, l'utente accetta o rimanda. Cron del lunedì alle 6 di Roma
- ⚠️ **Se il profilo non si aggiorna, la proposta non si segna; se la proposta non si segna, il profilo torna com'era**
- Il calcolo del quadro vive in `shared/quadro.js`, le regole di Pirsi in `shared/coach_rules.js`: **si modificano lì, mai dentro `zona-tracker.html`**

---

## Training — generatore, audio, ciclo

Regole del generatore di schede, pool e split, suoni, rotazione e mesociclo in **[`docs/TRAINING.md`](docs/TRAINING.md)**.

- **Il mesociclo è 5+1**: sei settimane, cinque di carico e una di scarico *(dal 24 agosto 2026)*
- **Il blocco nuovo nasce come anteprima, mai da zero** *(Training 070, 4 ottobre 2026)*: a fine blocco la card nel Programma → `preparaBloccoNuovo()` genera in `dryRun` con `cardiniDa` (per seduta restano fino a 2 cardini del blocco prima, per codice: una spinta e una tirata nelle Upper, ginocchia e anca nelle Lower; i complementari entrano **nuovi** se nel blocco prima non c'erano in nessuna seduta, altrimenti **restano nella stessa seduta**, mai in due sedute se il catalogo offre altro), mostra «riparti da …» (ultima serie fuori dallo scarico), ogni complementare ha «Cambia ›» con le alternative dello stesso posto (il giudizio sulla difficoltà resta alla persona: il catalogo non ha ancora le variabili per deciderla) e scrive solo su «Accetto»: scheda nuova, la vecchia resta, `train_start_date = oggi`. **Il blocco nei testi si chiama coi mesi** («Blocco ottobre–novembre», `_nomeBlocco`), mai col numero: `blocco_n` conta ogni scheda salvata, prove comprese, e non si mostra. Regole in [Blocco nuovo](docs/TRAINING.md#blocco-nuovo--i-cardini-restano-i-complementari-ruotano). Lo prova `node tools/banco/prova_blocco_nuovo.js`
- **La settimana ciclo si legge SOLO da `getCycleWeekInfo()`** — vietato ricalcolarla inline: un calcolo inline è una divergenza che aspetta
- **I recuperi sono trasparenti**: non avanzano il fronte e non generano debito
- ⚠️ **Il divisore del ciclo è `workPerGiro`, non 6**

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
25. [Un'impronta dedotta dal codice non verifica quel codice](docs/LEZIONI.md#l25--unimpronta-dedotta-dal-codice-non-verifica-quel-codice) — criteri di verifica
26. [Una vista dedotta dal nome di una funzione non esiste](docs/LEZIONI.md#l26--una-vista-dedotta-dal-nome-di-una-funzione-non-è-una-vista-che-esiste) — portata di una modifica, funzioni mai chiamate
27. [Due istruzioni opposte nello stesso prompt](docs/LEZIONI.md#l27--due-istruzioni-opposte-nello-stesso-prompt-e-il-modello-obbedisce-alla-vecchia) — registro di Pirsi, esempi contro aggettivi
28. [Una stima sui pixel non è una misura sui byte](docs/LEZIONI.md#l28--una-stima-sui-pixel-non-è-una-misura-sui-byte) — il −82% che era −49%, e il campione preso male
29. [La HEAD autenticata dice sempre `no-cache`](docs/LEZIONI.md#l29--la-head-autenticata-dice-sempre-no-cache-qualunque-cosa-sia-memorizzata) — dove si verifica una scrittura
30. [La CDN convalida per ETag](docs/LEZIONI.md#l30--la-cdn-convalida-per-etag-se-i-byte-non-cambiano-lintestazione-vecchia-resta) — metadati cambiati, contenuto no
31. [Si carica prima e si controlla dopo](docs/LEZIONI.md#l31--per-un-file-che-entra-identico-si-carica-prima-e-si-controlla-dopo) — il sondaggio crea la condizione che escludeva
32. [L'estensione non dice il formato](docs/LEZIONI.md#l32--lestensione-non-dice-il-formato) — due `.gif` erano JPEG
33. [Il mimetype si rilegge, non si scrive fisso](docs/LEZIONI.md#l33--il-mimetype-si-rilegge-dalloggetto-non-si-scrive-fisso) — attributi non dichiarati
34. [Il piano su disco non è il verbale di ciò che è stato fatto](docs/LEZIONI.md#l34--il-piano-su-disco-non-è-il-verbale-di-ciò-che-è-stato-fatto) — la scelta del ramo si dichiara, non si deduce
35. [Alla terza volta si corregge il nome, non il terzo posto](docs/LEZIONI.md#l35--quando-lo-stesso-difetto-ricompare-tre-volte-si-corregge-il-nome-che-lo-permette) — `sha256_mac` · `_bucket_ora` · `_bucket_atteso`
36. [Un servizio che non lancia eccezioni va controllato a mano](docs/LEZIONI.md#l36--un-servizio-che-non-lancia-eccezioni-va-controllato-a-mano) — `response.ok` verso Groq, come `res.error` per supabase-js
37. [Il messaggio nomina chi ha fallito, il codice dice cosa](docs/LEZIONI.md#l37--un-messaggio-derrore-nomina-la-cosa-che-ha-fallito-non-dice-cosa-è-successo) — classificare sul codice, mai sul testo
38. [Per un evento di coda la mediana è la direzione sbagliata](docs/LEZIONI.md#l38--quando-il-difetto-è-un-evento-di-coda-la-mediana-è-una-direzione-sbagliata) — il criterio di lettura si fissa prima di misurare
39. [Uno strumento con stub incompleti genera il difetto che misura](docs/LEZIONI.md#l39--uno-strumento-di-misura-con-stub-incompleti-genera-il-difetto-che-poi-misura) — prima di dire che un dato manca, guardare l'ingresso
40. [Un piano rigenerato a metà strada parla di un mondo che non c'è più](docs/LEZIONI.md#l40--un-piano-rigenerato-a-metà-strada-parla-di-un-mondo-che-non-cè-più) — si congela e si esegue, non si ricostruisce
41. [Confronto codice per codice contro la lista consegnata](docs/LEZIONI.md#l41--dopo-ogni-sync-confronto-codice-per-codice-contro-la-lista-consegnata-prima-di-qualunque-cancellazione) — dopo ogni sync, prima di ogni cancellazione
42. [`updated_at` non distingue il toccato dal non toccato](docs/LEZIONI.md#l42--updated_at-non-distingue-il-toccato-dal-non-toccato-quando-il-sync-riscrive-tutto) — il sync riscrive tutto: si confronta valore per valore contro la fotografia in git
43. [I campi del resoconto si rileggono, non si ereditano](docs/LEZIONI.md#l43--i-campi-del-resoconto-si-rileggono-dalla-fonte-a-ogni-giro-non-si-ereditano-dal-giro-prima) — `APP_VERSION` ripetuta a memoria per dodici ore
44. [L'avviso copriva la riga, il danno è arrivato dalla colonna](docs/LEZIONI.md#l44--lavviso-copriva-lo-sfasamento-di-riga-il-danno-è-arrivato-da-quello-di-colonna) — uno sfasamento di colonna in un incolla, e il valore fuori posto era ben formato
45. [Il nome mostrato a schermo non è una chiave](docs/LEZIONI.md#l45--il-nome-mostrato-a-schermo-non-è-una-chiave) — lo storico si collega per codice, non per nome
46. [Quando la rete è chiusa, il banco si costruisce sul file vero](docs/LEZIONI.md#l46--quando-la-rete-è-chiusa-il-banco-di-prova-si-costruisce-sul-file-vero) — jsdom + fixture, e la stessa prova ripetuta sul codice di prima
47. [Lo schema dice dove un dato può stare, le righe dove sta](docs/LEZIONI.md#l47--lo-schema-dice-dove-un-dato-può-stare-le-righe-dicono-dove-sta) — il peso stava in `weight_logs`, non in `body_logs`
48. [Si cercano tutti i posti che rispondono alla stessa domanda](docs/LEZIONI.md#l48--quando-si-corregge-la-fonte-di-un-numero-si-cercano-tutti-i-posti-che-rispondono-alla-stessa-domanda) — il tab Body diceva 69,95, la pesata di oggi 72,1
49. [Un numero derivato non si scrive in un secondo posto senza decidere chi vince](docs/LEZIONI.md#l49--un-numero-derivato-non-si-scrive-in-un-secondo-posto-senza-decidere-chi-vince) — `ST.TARGET` dalle percentuali, `profiles.target_*` per il Postino
