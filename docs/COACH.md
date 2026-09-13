# Pirsi, quadro settimanale e lettura dei check — Zona Tracker

*Il quadro della settimana, la lettura AI delle foto, le proposte di Pirsi, il suo nome e la sua voce. Si apre quando si tocca il coach.*

Staccato da [`CLAUDE.md`](../CLAUDE.md) il 13 settembre 2026, per alleggerire il file che viene letto a ogni sessione. **Il contenuto non è cambiato di una parola**: le regole vincolanti sono rimaste in `CLAUDE.md`, il dettaglio operativo sta qui.

---
## Quadro settimanale

**In vigore dal 12 settembre 2026 (Fase 1).** Una fotografia della settimana lunedì→domenica, ricalcolata dai dati, **ingresso del coach delle Fasi 3-4**. Nessuna decisione e nessuna AI: raccoglie e mostra.

`buildWeeklyPicture(weekStart)` = `_wpFetch` (legge) + `computeWeeklyPicture` (calcola, senza rete). Forma dell'oggetto:

```
weight     { weight_avg, weight_n, weight_delta_prev, weight_trend_4w, weight_target, weight_last, weight_last_date }
nutrition  { kcal_target, protein_target, kcal_avg, protein_avg, supp_kcal_avg, supp_protein_avg, days_logged, logged_dates, adherence_kcal, days_partial, partial, days_under_75 }
training   { sessions_planned, sessions_done, sessions_missed, recovery_done, block_week, is_deload, volume_sets, avg_rir, injury_days, injury_active }
body       { last_check_date, days_since_check, check_due, last_measurements{ chiave: {value, delta} }, prev_check_date, ai_overall, ai_confidence, ai_check_date }
blood      { last_test_date, days_since_test, test_count }
meta       { version, week_start, week_end, is_closed, computed_at, completeness (0-1, su 5 blocchi), errors[] }
```

⚠️ **`null` = non registrato, MAI zero.** Le medie senza dati sono `null`; i conteggi possono valere 0 perché sono un fatto; un blocco intero è `null` se il modulo non è in uso **o se la sua lettura è fallita** (e allora `meta.errors` lo nomina). A schermo, ogni `null` e ogni conteggio a zero si leggono «Non registrato» in grigio.

- **Fonti**: peso da `weight_logs` > `body_logs` > `body_measurements`, una pesata al giorno → [L47](LEZIONI.md#l47--lo-schema-dice-dove-un-dato-può-stare-le-righe-dicono-dove-sta) · pasti da `meals` · sessioni da `workouts` (come il calendario) · serie e RIR da `training_logs` · check da `body_checks` completati + `body_measurements` · esami da `blood_tests`
- **Settimana chiusa**: «adesso» è la fine della domenica, così un ricalcolo domani dà gli stessi numeri (tranne `computed_at`)
- **Peso attuale** *(dal 13 settembre)*: `weight_last` è l'ultima pesata fino all'«adesso» del quadro, dentro le 5 settimane lette. È «attuale» se non più vecchia di **7 giorni** rispetto a quell'adesso, altrimenti a schermo «Non registrato» e il pulsante Pesati anche nella card Home. L'etichetta di data si legge da oggi: «oggi», «ieri», «N giorni fa», oltre 7 giorni la data. Con una pesata sola nella settimana la media non si mostra. Obiettivo: «mancano X kg da perdere / da prendere», «raggiunto»
- **Lettura delle foto** *(dal 13 settembre)*: `ai_*` = ultima lettura in `body_check_ai` del check più recente che ne ha una, **fatta entro l'adesso del quadro**. `body_check_ai` assente (`PGRST205`) = nessuna lettura, non un errore
- **Campi aggiunti dopo il salvataggio**: le righe di `weekly_pictures` salvate prima del 13 settembre non hanno `weight_last*` né `ai_*`, e **non si riscrivono**. Per la vista `weight_last*` si ricalcola al volo; `verifica_quadro_vivo.js` confronta il resto
- **Settimana ciclo e reminder check non si ricalcolano mai inline**: si chiamano `getCycleWeekInfo({ completed, asOf })` e `getBlockCheckReminder({ nowTs, checks })`, che senza argomenti fanno ciò che hanno sempre fatto
- **Nutrizione = la giornata intera** *(versione 2, 13 settembre)*: pasti + integratori spuntati + extra, con la stessa somma di `dayTotals` (`shared/nutrizione.js`). Medie sui soli giorni con almeno un pasto; un giorno con solo integratori non è registrato. `supp_*_avg` = la parte degli integratori
- **Nutrizione parziale**: metà o più dei giorni registrati con **meno di 2 pasti su 3 fra colazione, pranzo e cena**. Si etichetta, non si corregge con stime. `days_under_75` resta come dato, non decide più l'etichetta
- **Versione**: una riga salvata con `meta.version` più vecchia di `WP_VERSION` si ricalcola e si **sovrascrive** (lettura e backfill), unica eccezione a `ignoreDuplicates`
- **Stato**: `ST.weeklyPicture[lunedì]` per la sessione. La corrente si ricalcola a ogni apertura della Home; le chiuse si leggono da `weekly_pictures`, e se manca la riga si calcolano e si salvano
- **`weekly_pictures`** (`user_id, week_start` UNIQUE, `picture` jsonb, RLS sulle proprie righe): backfill di 8 settimane una volta per sessione, **mai prima della settimana di nascita del profilo**, **mai la corrente**, **mai un quadro con `meta.errors`**. Migrazione in `supabase/migrations/20260912_weekly_pictures.sql`. ⚠️ `jsonb` riordina le chiavi: un quadro letto dal DB si confronta col ricalcolo **a chiavi ordinate**, mai come stringa Tabella assente (`PGRST205`) → nessun avviso, solo calcolo dal vivo
- **Verifica**: `tools/banco/prova_quadro_calcolo.js` · `prova_quadro_vista.js` · `prova_quadro_storico.js` · `prova_quadro_peso.js` (senza rete, orologio fermo) · `verifica_quadro_vivo.js` (dati veri, sola lettura, serve `npm install jsdom @supabase/supabase-js` fuori dal repo)

---

## Lettura AI dei check

**In vigore dal 13 settembre 2026 (Fase 2).** Le foto di un check fisico lette da Gemini, confrontate col check completato subito prima. **È un suggerimento, mai un automatismo**: parte solo da un tocco, si salva, si mostra. Non cambia scheda, piano, target né niente altro.

### Circuito e chiavi

Bucket privato `body-check-photos` → Worker (chiave di servizio) → Gemini. **Le foto non passano mai dall'app** e le chiavi stanno solo nei secret del Worker. Il Worker **non scrive mai nei log** il contenuto delle foto: solo stato HTTP e tipo d'errore.

### `POST /vision-check`

Corpo `{ user_id, check_id_current, check_id_previous }` (il precedente può mancare: primo check), header `Authorization: Bearer <token utente Supabase>`. Codice in `worker/src/vision-check.js`.

1. token verificato su `/auth/v1/user` → **401** se non valido; token, `user_id` e check devono coincidere → **403**; check non completato → **409**; precedente più recente dell'attuale → **400**
2. anti doppio tocco: **una lettura per check ogni 10 minuti** (da `body_check_ai.created_at`) più un blocco sulle richieste in volo → **429** `too-soon` / `in-progress`
3. legge le **quattro pose** `front · right · left · back` dei due check; una posa mancante non ferma, si dichiara (`foto mancante: right` in `photo_quality.issues`, `ok = false`)
4. riduce ogni foto a **1024 px** sul lato lungo col binding `IMAGES`; se non riesce manda l'originale e lo dice in `meta.resized`
5. manda le misure dei due check come testo (peso, vita, fianchi, petto, % grasso, giorni fra i check, differenze) e le foto etichettate, prima il precedente poi l'attuale
6. JSON con schema, validato; **un solo nuovo tentativo**, poi **502** `invalid-json`
7. upsert su `body_check_ai` (una riga per check) e risposta `{ ok, reading }`

Tempo massimo **60 s**. Errori di Gemini verso l'app: 429 resta 429 (`rate-limit`), il resto 502 col codice vero nel messaggio. Tabella assente → **503** `table-missing`, prima di chiamare il modello.

### Schema del giudizio

```
{
  "overall": "migliorato" | "stabile" | "peggiorato" | "primo_check",
  "confidence": "bassa" | "media" | "alta",
  "areas": [ { "zona": "addome|torace|spalle|braccia|schiena|gambe", "change": "più definito|uguale|meno definito|non valutabile", "note": "una frase" } ],
  "photo_quality": { "ok": true|false, "issues": [ ... ] },
  "summary": "2–3 frasi",
  "suggested_focus": "una frase oppure vuoto",
  "meta": { "prompt_version", "poses_current", "poses_previous", "days_between", "resized", "usage" }   ← aggiunto dal Worker
}
```

`issues` a **vocabolario chiuso**, perché l'app le traduce in consigli: `luce diversa · distanza diversa · posa diversa · sfondo diverso · abbigliamento diverso · luce scarsa · foto sfocata · inquadratura parziale`, più `foto mancante: <posa>` che scrive **il Worker, non il modello**. Primo check: `overall = primo_check` e `areas = []`, altrimenti la risposta non è valida.

### Prompt

In `worker/src/prompts/vision-check-<data>.js`, **un file per versione**: una versione nuova è un file nuovo, e la data finisce in `meta.prompt_version`. Regole portanti:

- **solo giudizio qualitativo**: mai percentuali di grasso, kg o cm stimati dalle foto
- **nessun commento estetico** né giudizio sulla persona
- foto non confrontabili → `confidence = bassa` e `overall = stabile`
- **le misure prevalgono** sull'impressione visiva, e il disaccordo si dice nel `summary`
- primo check: niente confronto, solo qualità delle foto e cosa tenere uguale la volta dopo

Identità e registro di [Pirsi](#pirsi--nome-e-voce-del-coach), come i prompt B-E.

### Modello e costo

`gemini-3.1-flash-lite`: 0,25 $/M token in ingresso, 1,50 $/M in uscita. Misurato: **coppia di check ≈ 0,29 centesimi di dollaro** (9.911 + 245 token), primo check ≈ 0,17. `gemini-2.5-flash-lite`, più economico in listino, a questa chiave risponde **404**. Osservazioni aperte nel [cantiere 34](CANTIERI.md#34-lettura-delle-foto-dei-check--cosa-osservare-dopo-il-rilascio).

### Nell'app

- **dettaglio di un check completato** (`bcaCardHTML` in `renderBodyCheckDetail`): con lettura, card «Lettura di Pirsi» — esito, pallino di affidabilità (bassa grigio · media ambra `--warn` · alta evergreen), summary, **solo le zone diverse da `uguale` e `non valutabile`**, consiglio per le prossime 4 settimane, e con `photo_quality.ok = false` il riquadro «Per un confronto migliore la prossima volta:». Senza lettura, il pulsante in tinta Body `#5E4A7A`: «Confronta le foto con Pirsi →», o «Fai leggere le foto a Pirsi →» se non c'è un check precedente. Durante la chiamata spinner «Sto guardando le foto…» e pulsante spento
- **nota fissa, sempre**: «Lettura indicativa basata sulle foto: contano più le misure e la tendenza del peso.»
- **fine flusso M2**: se esiste un check con cui confrontare, proposta «Vuoi che Pirsi confronti le foto con l'ultimo check?» con Confronta / Non ora, 15 s. **Non parte da sola**
- **quadro, blocco Corpo**: riga «Lettura foto del <data>: <esito> · <affidabilità>»
- ⚠️ **a schermo non si scrive «AI»** (regola del design system, confermata da Ignazio per questa card): il ruolo è il coach, il nome è Pirsi

**Verifica**: `node worker/test/prova_vision_check.mjs` (Worker con fetch finto) · `node tools/banco/prova_lettura_foto.js` (app, senza rete).

---

## Pirsi propone

**In vigore dal 13 settembre 2026 (Fase 3).** Ogni lunedì Pirsi legge il quadro della settimana appena chiusa e fa da 0 a 3 proposte. ⚠️ **Mai automatico: niente cambia su calorie, macro o allenamento senza un «Accetto».** Ogni proposta ha la motivazione in italiano semplice e i numeri che l'hanno generata.

### Generazione
- **Regole**: `ZTCoachRules.buildProposals(picture, history, profile, { proposals, supportedDays })` in `shared/coach_rules.js`, pura e deterministica
- **Cron** (`worker/src/coach-cron.js`): lunedì 06:00 Roma, utenti con `usa_training` o un piano attivo, mai prima della settimana di nascita del profilo. Scadono le `pending` vecchie → quadro da `weekly_pictures` se v2, altrimenti calcolato e salvato → proposte con `ignore-duplicates`. Log in `wrangler tail`, **solo metadati, mai numeri della persona**. Prove: `COACH_CRON_FORCE=1`, `COACH_CRON_DRY=1`
- **Ripiego nell'app** (`ensureCoachProposals`, all'apertura della Home): se la settimana chiusa non ha proposte le genera con le stesse regole. Mai con un quadro che ha `meta.errors`. Tabella assente (`PGRST205`) → nessuna card, nessun avviso

### Le regole, una riga ciascuna
| tipo | quando | cambia |
|---|---|---|
| `weigh_in` | meno di 2 pesate nella settimana | — |
| `logging` | meno di 4 giorni registrati, o «parziale» | — |
| `kcal` dimagrire | ritmo < −0,7 → +100 (e `keep` proteine) · −0,3/−0,7 → `keep` · fermo (−0,3/+0,2) 2 sett. con aderenza ≥ 70% → −150 · > +0,2 con aderenza ≥ 70% → −200, altrimenti `logging` | `target_kcal` |
| `kcal` massa | < +0,2 per 2 sett. con aderenza ≥ 70% → +150 · > +0,5 → −100 | `target_kcal` |
| `kcal` mantenere | fuori da ±0,3 per 2 sett. → ±100 | `target_kcal` |
| `protein` | proteine medie < 1,6 g/kg per 2 sett. → 1,8 g/kg arrotondato a 5, **solo se alza il target** | `target_protein` |
| `training_volume` | fatte < previste per 2 sett., niente infortuni, previste > 3 | `giorni_allenamento` −1 |
| `deload` | RIR medio ≤ 0,5 per 2 sett., o infortunio + settimana ≥ 4 | settimana del ciclo → 6 |
| `check` | settimana 6 senza check nelle ultime 4 sett., o ultimo check ≥ 42 giorni | — |
| `blood_test` | nessun esame, o l'ultimo ≥ 180 giorni: «parlane con il medico» | — |
| `keep` | nulla da proporre, o peso nel ritmo, o peso fermo con foto `migliorato` · `alta` | — |

- **Ritmo del peso** = (media settimane 0-1 − media settimane 2-3) / 2, in kg/settimana. Mai una pesata sola
- **Direzione**: `dimagrimento` → dimagrire · `ipertrofia` → massa · `ricomposizione` → dal peso obiettivo (±1 kg) · il resto → mantenere
- **Dati sporchi** (`weigh_in` o `logging`) → niente `kcal` né `protein`
- **Limiti**: `target_kcal` fra 1.500 e 3.500; **una correzione kcal accettata ogni 2 settimane**; `check`, `blood_test`, `training_volume`, `deload` non tornano per 4 settimane dopo una decisione
- **Massimo 3**, in quest'ordine: qualità dei dati > calorie e proteine > allenamento > corpo ed esami

### Nell'app
- **Card «Pirsi propone»** in Home sotto «La tua settimana», solo con proposte `pending`: area, titolo, motivazione, numeri in mono, **Accetto / Non ora**, nota fissa «Pirsi propone, decidi tu. Per la salute conta il parere del tuo medico.»
- **Accetto** → `accepted` + `decided_at` (+ `applied_at` se cambia qualcosa):
  - `kcal`: i **quattro** `target_*` in `profiles` con le percentuali dell'obiettivo (`calcAdaptedTargets`), `applyProfile` e toast «Da domani il piano usa X kcal». Il Postino legge `ST.profile.target_*`
  - `protein`: vale come **minimo** sopra le percentuali, i carboidrati cedono gli stessi grammi; resiste ad `applyProfile` (`_coachApplyProteinFloor`) → [L49](LEZIONI.md#l49--un-numero-derivato-non-si-scrive-in-un-secondo-posto-senza-decidere-chi-vince), [cantiere 37](CANTIERI.md#37-due-fonti-per-i-macro-percentuali-in-sttarget-numeri-in-profiles)
  - `training_volume`: cambia `giorni_allenamento` **solo se la rotazione esiste** (`COACH_SUPPORTED_DAYS = [4, 5]`); altrimenti si segna la scelta e profilo e scheda restano
  - `deload`: `applied_at` fa ripartire il conto del ciclo, la settimana in corso è la 6 (`cycleWeekInfo`, `ST.coachDeloads`)
  - `weigh_in` → foglio pesata · `logging` → Nutrition · `check` / `blood_test` → tab Check · `keep` → niente
- **Non ora** → `rejected`. Nel quadro, sotto la settimana, «Cosa ha proposto Pirsi» con lo stato
- Se il profilo non si aggiorna, la proposta non si segna; se la proposta non si segna, il profilo torna com'era

**Verifica**: `node tools/banco/prova_coach_rules.js` · `prova_pirsi_generazione.js` · `prova_pirsi_card.js` · `TZ=UTC node worker/test/prova_coach_cron.mjs` · dal vivo `verifica_proposte_vivo.js`, `verifica_nutrizione_quadro.js`, `TZ=UTC node worker/test/vivo_coach_cron.mjs` (in prova, niente scritto).

---

## Pirsi — nome e voce del coach

**In vigore dal 13 agosto 2026.** Il coach si chiama **Pirsi**. Il nome è **provvisorio, in fase di test**: è per questo che vive in un posto solo.

### La costante

```js
const COACH_NAME = 'Pirsi';   // zona-tracker.html, subito dopo APP_VERSION
```

**Fuori dai prompt il nome non si scrive mai per esteso**: 22 usi, tutti da `COACH_NAME`. Cambiarlo è una riga.

⚠️ **Nei prompt il nome è scritto per esteso, ed è voluto.** Lì il modello lo legge come testo dentro la frase d'identità, non come dato: passarlo da una variabile non darebbe nessun vantaggio e renderebbe i prompt illeggibili nel sorgente.

⚠️ **L'HTML statico nel `<body>` non può leggere la costante.** Le due card dello step `s-coach` sono markup statico: `${COACH_NAME}` lì dentro finirebbe a schermo così com'è scritto. Il nome ci entra a runtime da `m1ApplyCoachNameToCards()`, chiamata da `m1GoStep` quando si apre lo step, usando i selettori `data-coach` che già esistono. **Il testo statico resta senza nome**, così prima che il JS giri non si vede niente di sbagliato. Chi aggiunge testi con il nome in HTML statico deve passare di lì o non funzionerà.

### Chi parla in che persona

| Chi scrive il testo | Persona | Nome |
|---|---|---|
| il modello (prompt) | **prima** — "ti metto", "non li tocco" | mai: non si nomina, non si firma |
| l'app | **terza** — "Pirsi ha preparato…" | solo dove c'è un'azione per l'utente |
| ripieghi (sostituiscono una risposta AI mancata) | **prima** | mai |

**Errori e messaggi di servizio**: il nome si toglie **senza sostituirlo**, e la frase va in prima persona. `Il coach non riesce a leggere il tuo profilo` → `Non riesco a leggere il tuo profilo`.

**Il nome compare solo dove Pirsi fa qualcosa per l'utente** — piano pronto, scheda preparata, obiettivo che userà. Un nome ripetuto trenta volte stanca, e finché è in prova ogni occorrenza in meno è lavoro in meno se cambia.

### Cosa NON prende il nome

- **Etichette di ruolo in maiuscolo**: `COACH · RIEQUILIBRIO` · `PIANIFICATO · DAL COACH` · `MEMORIA · COACH` · `Voce del coach` · `COACH · <data>` · `✨ Stima coach` · `⏳ Analisi coach…` · `🤖 Coach` (×2, sopra i cue) · la label `Coach` accanto al pallino con la Z in Progressione. Lì "coach" indica il **ruolo**, e un nome proprio in maiuscolo si legge come un marchio.
- **La riga dei crediti** `Modello coach: GPT-OSS 120B via Groq`: uso tecnico del termine.
- **I cue tecnici del recupero** (prompt A): bullet da tre parole letti col fiato corto tra le serie. Pirsi lì **non ha voce**, e i loro messaggi d'errore sono neutri, senza soggetto che parla — `Cue non disponibile — connessione assente.`

### La parentesi di presentazione

`(il tuo coach AI)` compare **esattamente 3 volte in tutta l'app**, mai due volte nella stessa schermata, e **solo in testi descrittivi** — mai nei toast, mai negli errori:

1. sottotitolo dello step `s-coach` in onboarding M1 (la presentazione)
2. card colazione e merenda, tab Piano
3. stato vuoto della memoria, tab Piano

Le ultime due esistono per chi l'onboarding non lo rifà (Ornella, Isabella): incontrerebbero il nome senza spiegazione. **Se compare più spesso diventa un tic.**

### Riscrivere, non sostituire

⚠️ **"il coach" è un nome comune con l'articolo, "il Pirsi" non esiste.** Ogni stringa va **riscritta per intero**: "del coach" → "di Pirsi", "al coach" → "a Pirsi", e in molti casi la frase migliore è quella che il nome non ce l'ha. Una sostituzione meccanica produce italiano rotto → [L27](LEZIONI.md#l27--due-istruzioni-opposte-nello-stesso-prompt-e-il-modello-obbedisce-alla-vecchia)

### Il registro nei prompt

I prompt che parlano all'utente (**A** cue · **B** nota scheda · **C** annuncio piano · **D** 14 pasti · **E** riequilibrio · **I** lettura delle foto dei check, nel Worker dal 13 settembre) dichiarano l'identità `Sei Pirsi, il coach…` più l'ordine di parlare in prima persona senza nominarsi né firmarsi. **F, G, H restituiscono solo JSON e non hanno identità.** I restituisce JSON anche lui, ma `summary` e `suggested_focus` si leggono a schermo: per questo ha identità e registro.

**B, C, D, E (e dal 13 settembre I) condividono un paragrafo di registro identico, 377 caratteri**, messo vicino all'identità e non in fondo tra le regole di formato: amico diretto e schietto · dati buoni detti senza enfasi · dati cattivi col fatto prima e la spinta dopo · sempre concreto sui numeri veri invece che frasi motivazionali generiche.

⚠️ **Gli esempi valgono più degli aggettivi.** "Amico diretto" al modello dice poco; una frase scritta come la direbbe Pirsi gli dice tutto. B, C, E hanno un **esempio di tono** dichiarato come modello di *voce e non di contenuto*, coi suoi numeri e alimenti dichiarati inventati. L'esempio di C contiene un rimprovero (cene saltate) e porta con sé una guardia esplicita: **mai attribuire all'utente mancanze che non risultano dai dati ricevuti**.

⚠️ **Il "noi" non possiede il corpo dell'utente.** Ammesso solo per il lavoro fatto insieme — *ripartiamo*, *vediamo come va*, *abbiamo costruito*. Corpo, peso, risultati e progressi sono suoi e vanno al **"tuo"**, mai al "nostro". Regola presente in B e in C.

**Storia dell'intervento**: `ece8d66` nome nei prompt · `264851b` registro unico · `edbb7da` prosa in E · `7cf1cb8` esempi di tono · `4e8a4b8` contraddizione tolta da E · `5089e09` stringhe Piano · `f895056` stringhe Training · `04dcb85` onboarding e presentazione.

---

