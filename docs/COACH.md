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
training   { sessions_planned, sessions_done, sessions_missed, recovery_done, block_week, is_deload, volume_sets, volume_planned, avg_rir, injury_days, injury_active, pause_days }   ← volume_planned (Training 110): le serie previste dalla scheda nella settimana (ctx.sessioni; null se chi calcola non le passa)   ← pause_days (Training 350): giorni della settimana in pausa programmata (modulo allenamento, Metodo 210); con una pausa di mezzo sessions_missed è null e Pirsi non propone «meno giorni». Dal 14 ottobre anche nutrition.pause_days (cibo: niente «registra tutti i pasti» né tagli) e weight.pause_days (pesate: niente «pesati di più»)
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

## Promemoria dei pasti

**Notifiche 170, 1 novembre 2026 (ore fisse, decise da Ignazio).** Se la colazione non è registrata entro le 10, il pranzo entro le 15 o la cena entro le 22 (ora di Roma), arriva un avviso sul telefono. **Gli avvisi partono spenti e ognuno li accende da sé**, uno per pasto, nelle Impostazioni › Cibo. Letteratura, in una riga: i promemoria aumentano l'aderenza al diario alimentare (Burke 2011, J Am Diet Assoc; Patel 2019, JMIR mHealth), ma più di 2-3 al giorno stancano e si spengono: per questo l'avviso parte **solo quando il pasto manca**, mai di routine, e mai più di tre al giorno.

### La regola, una sola

`shared/promemoria.js` (`ZTPromemoria`), caricato dalla pagina e importato dal Worker: `pastoMancante({ pasti, giorno, ora, profile, digiuno })` dà il pasto da avvisare **a quell'ora esatta** (alle 15 si parla del pranzo, non della colazione ancora mancante). Conta come pasto una riga di `meals` con slot `colazione`, `pranzo` o `cena` di quel giorno; **gli spuntini (`snack_mattina`, `snack_pomeriggio`, `snack`) e gli `extra` non contano** (controllato sulle righe vere il 1 novembre 2026: sette slot). Niente avviso nei giorni di digiuno (`fasting_days`), con la **pausa cibo** (`ZTQuadro.pausaAttivaIl(profile, giorno, 'cibo')`, Metodo 210) e per i pasti non accesi (`profiles.promemoria_pasti`, text[] fra i tre; nulla o vuoto = spenti). Il testo (`testoAvviso`) è breve, in prima persona, senza la parola «errore»: titolo «Pirsi · Colazione», corpo «Non vedo ancora la colazione di oggi. Se l'hai fatta, registrala adesso: ci metti un minuto.»

### Il Worker

- **Il giro delle ore** (`worker/src/promemoria-cron.js`): il terzo cron del Worker, `0 * * * *` (il piano Free ne dà **5 per account**: con questo sono 3). Lavora solo quando a Roma sono le 10, le 15 o le 22 (ora legale compresa, `ZTPromemoria.oraRoma`). **`scheduled` smista per espressione cron** (`giroPer` in `index.js`): `0 * * * *` fa i promemoria, le due del lunedì fanno Pirsi propone, che per cintura controlla anche il giorno (revisione: senza lo smistamento il giro del lunedì sarebbe partito ogni giorno alle 6, e due volte il lunedì). Le letture sono **per giorno, mai per elenco di persone** (un `in.(…)` con centinaia di uuid sfonderebbe l'indirizzo): profili con promemoria accesi, pasti di oggi, digiuni di oggi, tutti i telefoni iscritti, avvisi già mandati oggi, incrociati in memoria; poi un POST al servizio push per telefono, poi le scritture: `promemoria_inviati` (upsert su persona · giorno · pasto: **un giro ripetuto nella stessa ora non manda due volte**), un PATCH per esito su `ultimo_invio`/`ultimo_esito` (anche i fallimenti, al massimo tre), DELETE degli indirizzi morti (404/410, e **401/403**: la firma non accettata dopo un cambio di chiave), e alle 22 la pulizia delle righe di `promemoria_inviati` più vecchie di `PULIZIA_GIORNI` = 30. Un utente che fallisce non ferma gli altri. **Limiti del piano Free: 50 sottorichieste e 10 ms di CPU a esecuzione**: la firma del JWT VAPID si fa **una volta per origine** (Apple, Google, Mozilla), non per telefono, e il giro si ferma a `MAX_AVVISI_GIRO` = 15 telefoni scrivendolo nei log («rimandato: giro pieno»); prima di alzare il tetto si misura il CPU time con `wrangler dev --test-scheduled`; quando i telefoni saranno di più il giro va diviso, decisione a parte. Variabili per le prove: `PROMEMORIA_FORCE=1` (salta l'ora), `PROMEMORIA_DRY=1` (decide, non manda, non scrive). Nei log solo utente abbreviato, pasto ed esito
- **Web Push senza librerie** (`worker/src/webpush.js`): VAPID (RFC 8292) con JWT ES256 firmato dalla chiave privata del Worker (`aud` = origine del servizio push, `exp` fra 12 ore, `sub` = `VAPID_SUBJECT`) e cifratura dell'avviso RFC 8291 + RFC 8188 (`aes128gcm`: chiave effimera ECDH P-256, HKDF con `auth` e col salt, AES-128-GCM, un record solo col byte 0x02), tutto con la WebCrypto del Worker; **la prova riproduce byte per byte il vettore dell'Appendice A della RFC 8291**. Le chiavi si leggono con `trim()` (un a-capo incollato nel secret non rompe niente). Intestazioni `TTL` 4 ore, `Urgency normal`, `Topic pasto` (un avviso nuovo sostituisce quello non ancora consegnato); niente `Content-Length` a mano. `GET /push-chiave` dà la chiave pubblica all'app (`{ chiave }`, 404 se il Worker non ha le chiavi): la chiave pubblica **non si copia nel codice**
- **Il nome del coach nel titolo** viene da `COACH_NAME` in `promemoria-cron.js`: il Worker non legge la pagina, quindi è la seconda e ultima copia fuori dai prompt (vedi [La costante](#la-costante))

### Nell'app

- **Impostazioni › Cibo, «Promemoria dei pasti»** (`app/notifiche.js`): tre interruttori disegnati (`role=switch`, lo stesso disegno del foglio della pausa), spenti all'inizio. Al primo acceso l'app chiede il permesso delle notifiche **dal tocco della persona**, legge la chiave pubblica dal Worker, iscrive il telefono (`pushManager.subscribe`) e salva l'iscrizione in `push_iscrizioni` (upsert sull'endpoint, `telefono` in breve come «Invia Feedback»); la scelta si scrive **subito** in `profiles.promemoria_pasti`, non al «Salva». Spento l'ultimo, la riga del telefono si toglie e il browser si disiscrive. Se il profilo non si scrive, l'interruttore resta com'era. Le etichette («entro le 10») vengono da `ZTPromemoria.PASTI`, non sono scritte due volte. **Mai `navigator.serviceWorker.ready`** (senza registrazione non si risolve e terrebbe appeso il logout): `_swRegistrazione()` usa `getRegistration` e senza service worker non fa niente
- **Su iPhone solo con l'app aggiunta alla schermata Home** (iOS 16.4+): senza, l'interruttore resta spento e la nota spiega come installarla. Permesso negato una volta → «riaccendili nelle impostazioni del telefono»; Worker senza chiavi → «riprova fra un po'». Mai la parola «errore»
- **A ogni apertura** `pushRiallinea()` (da `showScreen('app')`): promemoria accesi e permesso dato → l'iscrizione c'è ed è a nome di chi è dentro; un marcatore sul telefono (`zt_push_<utente>` = endpoint) evita di riscrivere la stessa riga; una chiave del Worker cambiata o un endpoint ancora a nome di un altro (42501 sull'upsert) fanno disiscrivere e iscrivere di nuovo
- **Al logout** `pushDisiscrivi()` toglie la riga di questo telefono (prima di `signOut`, serve la sessione) e disiscrive il browser: gli avvisi di chi esce non arrivano a chi entra; «Elimina account» disiscrive anche lui il browser (la riga cade a cascata). Un secondo telefono della stessa persona si iscrive quando lì si spegne e riaccende un pasto (lo dice la nota)
- **sw.js**: `push` mostra l'avviso (titolo, corpo, icona dell'app, `tag` per pasto, `renotify`); `notificationclick` porta la pagina aperta sul tab Nutrition (messaggio `{apri:'oggi'}`) o ne apre una con `?apri=oggi` (`apriDaNotifica`). `shared/promemoria.js` e `app/notifiche.js` stanno in `APP_FILES`
- «Scarica i miei dati» include `push_iscrizioni` e `promemoria_inviati` (25 tabelle); «Elimina account» le porta via a cascata
- **L'informativa ha la riga «Gli avvisi sul telefono»** (`PRIVACY_INFORMATIVA`, `PRIVACY_VERSIONE = '2026-11-01'`: chi l'aveva letta la rilegge); il testo è in [`docs/PRIVACY.md`](PRIVACY.md) **e lo approva Ignazio** come le altre righe

### Schema

Migrazione `supabase/migrations/20261101_170_promemoria_pasti.sql` (fotografia prima e dopo: `supabase/verifiche/170_promemoria_fotografia.sql`): `profiles.promemoria_pasti` (text[] ⊂ colazione/pranzo/cena, vincolo `profiles_promemoria_pasti_chk`); **`push_iscrizioni`** (`endpoint` unico e https, `p256dh` 87 caratteri esatti e `auth` 22 (65 e 16 byte in base64url), `telefono`, `ultimo_invio`, `ultimo_esito`; RLS: la persona legge, inserisce, aggiorna e toglie le sue; GRANT select/insert/update/delete ad `authenticated`, tutto a `service_role`, niente ad `anon`); **`promemoria_inviati`** (PK persona · giorno · pasto, `telefoni`; scrive solo il Worker, la persona legge le sue; GRANT select ad `authenticated`). Tutte e due `on delete cascade` da `auth.users`.

### Rilascio (la Regia, in quest'ordine)

1. Copia di sicurezza, poi la migrazione `20261101_170_promemoria_pasti.sql`; prima e dopo `170_promemoria_fotografia.sql`; poi `python3 tools/prova_accessi.py` e la rifotografia di `docs/SCHEMA_TABELLE.md`
2. `node tools/vapid/genera.js` in locale: stampa le due chiavi e i comandi. La privata va **solo** in `wrangler secret put VAPID_PRIVATE_KEY` e nel gestore delle password; la pubblica in `wrangler secret put VAPID_PUBLIC_KEY`; `VAPID_SUBJECT` = `mailto:ignazio.f@me.com`. Niente chiavi nel repo né in Evernote. Se la coppia cambia, ogni telefono va iscritto di nuovo (l'app lo fa da sola alla prima apertura, `pushRiallinea`)
3. `wrangler deploy` da `worker/` (il cron nuovo entra con `wrangler.toml`), poi `wrangler tail` a un'ora piena: «[promemoria] … fine» con 0 errori
4. Dal telefono, app installata: Impostazioni › Cibo, accendere un pasto, controllare la riga in `push_iscrizioni`; la prima sera vera, `promemoria_inviati` ha la riga

**Verifica**: `node tools/banco/prova_promemoria_pasti.js` (regola e app, 45 controlli) · `TZ=UTC node worker/test/prova_webpush.mjs` (28: cifratura e firma decifrate e verificate con `node:crypto`, indipendente dalla WebCrypto, più il vettore della RFC 8291) · `TZ=UTC node worker/test/prova_promemoria_cron.mjs` (37: il giro delle ore con fetch finto, lo smistamento dei cron, la cintura del lunedì). Revisione indipendente del 1 novembre 2026: 16 rilievi, tutti applicati.

## Le analisi del sangue

**Body 160, 2 novembre 2026 (decisioni di Ignazio del 14 ottobre e del 2 novembre).** «Voglio caricare il PDF delle analisi, anche quelle vecchie, per avere uno storico e dare i dati al coach», e poi uno spazio tutto suo: la scheda **«Analisi» nel Body**, la quinta accanto a Misure · Tendenza · Check · Energia, con **tutte** le analisi, comprese quelle di ogni **donazione di sangue**. Letteratura, in una riga: a un coach di nutrizione e allenamento servono glicemia e HbA1c, lipidi, ferritina ed emoglobina, vitamina D, TSH, creatinina e ALT, PCR (consenso IOC sul REDs 2018 e 2023, position stand ISSN); chi dona sangue perde circa 200-250 mg di ferro a sacca e **va seguito su ferritina ed emoglobina**, con almeno 90 giorni fra due donazioni (AVIS; Kiss et al., JAMA 2015). **Le fasce sono riferimenti, non diagnosi**: l'app segna basso/alto e dice «Valori da rivedere con il tuo medico»; Pirsi descrive e non cura.

### Il vocabolario, uno solo

`shared/esami.js` (`ZTEsami`), caricato dalla pagina e importato dal Worker: 23 esami con chiave, etichetta, **colonna di `blood_tests` se c'è** (le 11 di sempre), unità attesa, **i nomi e le sigle come li stampano i laboratori** (`riconosci`: un nome del vocabolario combacia solo se è l'intero testo o la sua testa, trattini e barre valgono spazi, e fra più nomi vince il più lungo, così «Colesterolo-HDL» va in `hdl` e non in `colesterolo_tot`; **le parole di esclusione** — corpuscolare, legante, clearance, libero, eritrocitario, urine, rapporto, saturazione… — lasciano la riga senza chiave: «Emoglobina corpuscolare media» non è l'emoglobina, revisione del 3 novembre 2026), **la fascia di riferimento con il sesso dove serve e la fonte scritta accanto** (lipidi ESC/EAS 2019 a rischio basso, glicemia e HbA1c ADA 2024, vitamina D Endocrine Society 2011, PCR AHA/CDC 2003, il resto «valori comuni dei laboratori italiani»). `fasciaPer`: **la fascia stampata sul referto vince** sulla tabella (`rif_min`/`rif_max` nella riga, fonte «referto»). `valida` pulisce ciò che il modello risponde (numero vero anche con la virgola, «< 5» non è un valore, nome e unità **come scritti**, chiave dal nome prima che dal modello, **una seconda riga con la stessa chiave resta col suo nome e senza chiave**, righe non numeriche via); `inColonne` riempie le 11 colonne **solo se l'unità stampata è quella attesa o una equivalente** (`UNITA_EQ`: ng/mL ≡ µg/L, µUI/mL ≡ mUI/L, U/L ≡ UI/L…): vitamina D in nmol/L o glicemia in mmol/L restano solo in `esami`, altrimenti quadro e coach leggerebbero numeri sbagliati; `daRiga` legge una riga di `blood_tests` (`esami` se c'è, altrimenti le colonne delle righe del check); `serie` dà l'andamento di una chiave; `riassunto` la riga per il coach.

### Il Worker

`POST /esami-report` (`worker/src/esami.js`, prompt `src/prompts/esami-2026-11-02.js`), come `/fitdays-report`: token della persona, `user_id` uguale, immagine o **PDF anche di più pagine** in base64 fino a 8 MB (Gemini legge tutto il documento in una chiamata), **3 letture al minuto** per persona (`LIMITE_FOTO`), Gemini `gemini-3.1-flash-lite` con schema JSON (`riconosciuto`, `data_prelievo`, `esami[]` con nome · chiave · valore · unità · `rif_min` · `rif_max`, `note`), `maxOutputTokens` 8192 (un referto intero sono ~4000 token di JSON e i token di pensiero contano nel tetto; **da verificare dal vivo** se il modello ne spende troppi: la risposta tagliata esce come «non JSON» e si paga un secondo tentativo), un solo nuovo tentativo, `validate` che passa dal vocabolario; le righe con un limite al posto del numero («< 5») si saltano. **Il file non si conserva da nessuna parte** e nei log stanno solo esito, quante righe e se c'è la data. Al modello va solo il file, e il prompt gli dice di **non leggere nome, cognome, data di nascita, codice fiscale, indirizzo e medico** stampati sul referto. Niente scritto: salva l'app, al «Salva» del foglio. Lo prova `TZ=UTC node worker/test/prova_esami.mjs`; **il Worker va ripubblicato** (la Regia).

### Nell'app (`app/analisi.js`)

- **Il conto delle donazioni** in cima (`donazione` = true sulle righe), poi **la panoramica** (Body 170), poi **«Carica analisi (PDF o foto)»**, **«Importa da file CSV»** e **«Aggiungi a mano»**, poi **i valori per famiglia**, **l'elenco per data** (righe `.b5-log-riga`, «donazione» segnato, «N valori · M fuori fascia») e **la tabella**; ogni analisi si apre e mostra **tutti i suoi valori** con l'unità come scritta, la fascia (referto o tabella, con la fonte), il segno basso/alto e la differenza dalla volta prima; sotto «Segna come donazione», «Modifica», «Elimina» (con conferma)
- **La lettura di Pirsi in due righe** (`pirsiAnalisi`): all'apertura di un'analisi, una chiamata a `callAI` (Groq) con `voce()`, l'analisi di adesso e la volta prima (`ZTEsami.riassunto`, con unità e fasce, **mai il nome**), regole: descrive, non fa diagnosi né terapie, un valore fuori fascia → «parlane col medico», massimo 50 parole; senza una volta prima lo dice. Il testo **resta sul telefono** per analisi e contenuto (`zt_analisi_pirsi_<utente>`, al massimo 100): una chiamata per analisi. Senza rete all'apertura resta il tasto «Cosa è cambiato?»; coach muto → toast senza «errore»
- **Il foglio** (`apriFoglioAnalisi`, costruito con `_foglio` di comune.js): la data del prelievo (correggibile, mai nel futuro), le righe nome · valore · unità (correggibili, si tolgono, se ne aggiungono), l'interruttore «Donazione di sangue» disegnato; «Salva» → `salvaAnalisi`: **upsert su (user_id, test_date)** con le 11 colonne dalle chiavi riconosciute, tutte le righe in `esami`, `fonte` (lettura · mano · check), `prompt_version`; con una data cambiata in «Modifica» la riga vecchia si toglie, e **la data di un'altra analisi si rifiuta** (due prelievi non diventano uno). **Se la scrittura fallisce** (senza rete, migrazione non eseguita) **il foglio torna com'era**, con le righe corrette, e un toast lo dice: la lettura del referto non si perde. **Si salva con la data delle analisi, non quella di oggi.** Lo stesso foglio vuoto serve per «Aggiungi a mano»
- **Il grafico di un valore** (`_anGrafico`): SVG inline come quello di Energia (linea, punti, **la fascia come rettangolo chiaro**, i punti fuori fascia segnati), nessuna libreria; dal Body 170 **si apre toccando il valore**, in una card della panoramica o nella riga della famiglia, e la fascia è quella dell'ultima misura (referto o tabella). La fila di card «L'andamento» non c'è più
- **Il referto** (`leggiReferto`): parte solo da un tocco, l'immagine si riduce come per Fitdays (`fitdaysPreparaFile`), un PDF parte com'è; `consensoLetturaEsami` (`zt_esami_ok`) **c'è ma è spento** (`CONSENSO_ESAMI_ATTIVO = false`) finché l'app ha un utente solo (Ignazio, 1 novembre 2026, come la privacy); un file che non è immagine o PDF si rifiuta prima di chiedere; «Non mi sembra un referto» se non riconosciuto
- **Il check fisico** (passi s9/s10) continua a scrivere `blood_tests`, ora con **upsert sulle sole caselle compilate** (su una data che ha già le righe di un referto, le colonne vuote non cancellano quelle lette e `fonte` resta); `loadBloodTests` passa da `dbq` e una lettura fallita mostra «Non riesco a leggere le analisi» con Riprova, mai «nessuna analisi». **Le Impostazioni › Salute** non hanno più la lista dei 14 valori: resta «Note sulla salute» e il tasto «Apri le analisi in Body ›» (`vaiAlleAnalisi`); `saveSettings` **non scrive più `profiles.esami_sangue`**, che resta com'è. Le proposte di Pirsi sugli esami (`blood_test`) portano alla scheda
- **Il coach**: il ritratto (`ZTRitratto.build`, `rigaEsami`) prende una riga «Analisi del sangue del <data>: …» dall'analisi **più recente** (`ST.bloodTests`, se già lette), con unità, segni fuori fascia e fasce, mai il nome, e la frase «le fasce sono riferimenti, non diagnosi»; il quadro settimanale conta la data più recente come prima
- A veste spenta la scheda c'è con i riquadri di prima (`html:not(.v5)` in `stile.css`); a veste accesa i gruppi bianchi e le righe da 52 px del giro 2, coi colori della zona Body

### Lo storico dal CSV e la scheda compatta (Body 170, 3 novembre 2026)

Ignazio ha salvato il primo referto e ha detto che la scheda è «molto dispersiva e lunga», e vuole caricare tutto lo storico delle donazioni (37 prelievi dal 2013, in un foglio). Decisioni della Regia per Ignazio, tutte applicate:

- **«Importa da file CSV»** (`importaCSV` in `app/analisi.js`, lettura in `ZTEsami.leggiCSV`): una riga per prelievo, la prima colonna **«Data»** in gg/mm/aa (anno a due cifre → 20aa) o gg/mm/aaaa, le altre intestazioni **«Nome (min–max unità)»** (la fascia può mancare: «Nome (unità)» o «Nome»); BOM e CRLF ammessi, virgolette, separatore virgola o punto e virgola (Excel in italiano), decimali col punto o con la virgola, **le celle vuote si saltano**, una cella che non è un numero si scarta e si conta; **la lettura si ferma alla prima riga vuota o a una riga che non comincia con una cifra** (la sezione «RANGE DI RIFERIMENTO» del foglio viene dopo una riga vuota: non entra); una riga con una data che non esiste, con più celle dell'intestazione o con una data dopo oggi **si salta e si conta**, senza fermare le altre (revisione del 3 novembre). Le date sono ancorate («2026-3-28» non è più il 2028) e l'anno a due cifre ha il pivot a 50 («99» è il 1999). **La fascia scritta nell'intestazione vale come fascia del referto** (`rif_min`/`rif_max`, fonte «referto»). I nomi passano dal vocabolario; un nome che non conosce resta come scritto, senza chiave, e l'anteprima lo elenca. Una data ripetuta nel file tiene la prima riga
- **L'anteprima prima di scrivere** (`_anFoglioImporta`): «N prelievi dal … al …, V valori in C colonne; X date già presenti, che salto»; l'interruttore **«Sono donazioni» parte acceso** (le sue sono tutte donazioni, Ignazio); «Importa N» conta solo i nuovi; l'anteprima dice anche le righe saltate e le celle senza numero. Con tutte le date già presenti non si apre niente e lo dice; **un file che non ha il formato lo dice in chiaro e non scrive niente**
- **La scrittura** (`_anScriviImportati`): a blocchi di 10 (`ANALISI_CSV_BLOCCO`), `upsert` con `dbq` su **(user_id, test_date) con `ignoreDuplicates`**: **una data già presente non si sovrascrive mai**, né dall'app (che la salta) né dal database; le 11 colonne da `ZTEsami.inColonne` come «Salva», tutte le righe in `esami`, `fonte` **'csv'**, `prompt_version` nulla. Il conto delle righe scritte si rilegge dall'upsert (`.select('test_date')`: con `ignoreDuplicates` tornano solo quelle entrate). Se un blocco non parte ci si ferma e il toast dice «Importati N prelievi su M: riprova con lo stesso file» (le date salvate si saltano al giro dopo). **Pirsi non parte da solo** su 37 righe: si chiama al tocco come sempre
- **La scheda compatta** (modello: le vecchie dashboard di Ignazio, Panoramica · Ferritina e Ferro · Ematologia · Lipidi e Glicemia · Tutti i valori · Storico donazioni): in cima **la panoramica**, card dei valori chiave (`ZTEsami.PANORAMICA`: emoglobina, ferritina, glicemia, LDL, HDL, trigliceridi, piastrine, globuli bianchi, se ci sono) con l'ultimo valore, **la freccia di tendenza** (↑ ↓ → rispetto alla misura prima, sotto il 3 % è stabile) e il segno fuori fascia; poi **le famiglie chiuse** (`ZTEsami.FAMIGLIE`: Ferro · Ematologia · Lipidi e glicemia · Fegato e reni · Altro; `famiglia` su ogni esame del vocabolario, i nomi non riconosciuti in Altro), che si aprono con un tocco su una riga compatta per valore (nome, data, ultimo valore con l'unità, tendenza, segno) e **il grafico si apre solo toccando il valore**; **«Per data» mostra 5 righe** (`ANALISI_PER_DATA`) e «Mostra tutte»; in fondo **«Tutti i valori»**, chiusa, che aperta è la tabella con **le date in colonna** dalla più recente, scorre di lato (`.an-tab-scroll`) e **la colonna del nome resta ferma** (`position:sticky`). Tutto chiuso finché non si tocca: **con 38 prelievi e 30 valori la scheda chiusa è alta 1 715 px** a 390 px (misurato in Chrome da `prova_body_170.js`, prima erano decine di card). Lo stile in `app/stile.css` (`.an-pan*`, `.an-fam*`, `.an-val*`, `.an-tab*`), solo nomi di `:root`, Syne e JetBrains Mono
- **Il vocabolario cresce** (`shared/esami.js`, versione `2026-11-03`): l'emocromo completo (globuli rossi e bianchi, MCV, MCH, MCHC, RDW, piastrine, MPV, la formula leucocitaria in percentuale **e** in numero assoluto: «Neutrofili %» e «Neutrofili #» sono due esami, e con l'unità «%» la chiave passa alla percentuale, `perUnita`), proteine totali, l'indice di rischio totale/HDL (indice di Castelli); gli alias del foglio («Colest. Totale», «Colest. HDL», «Ind. Rischio CV», «Protidemia totale», «ALT (GPT)»…); la regola delle esclusioni cambia: **una parola di esclusione nel testo è ammessa solo se sta in uno dei nomi dell'esame che combacia** («Emoglobina corpuscolare media» e «MCH (emoglobina corpuscolare media)» → MCH, «Creatinina clearance» → nessuna chiave); esclusioni in più: vldl, a1c, egfr, urinarie, sd, t b («Colesterolo VLDL» non è il totale, «RDW-SD» non è l'RDW in %). **Rilascio: prima la migrazione, poi la pagina**, altrimenti ogni importazione risponde 23514. Resta da decidere con Ignazio se per l'HDL il massimo del referto (es. 60) debba segnare «alto»: oggi la fascia del referto vince, com'è per tutti. Le righe salvate prima senza chiave si riconoscono per nome al disegno. **Le 11 colonne di `blood_tests` non cambiano.** Il Worker importa il modulo: **va ripubblicato**
- **Per l'HDL conta solo il minimo** (Body 171, decisione di Ignazio del 3 novembre 2026): un HDL alto non si segna mai come fuori fascia, qualunque massimo stampi il referto o porti il CSV; la riga conserva `rif_max` com'è, ma `ZTEsami.fasciaPer` lo lascia cadere per gli esami con `solo_min` (oggi solo `hdl`) e la fascia mostrata è «≥ 40» (M) o «≥ 50» (F). È il punto unico: lettura, CSV, panoramica, grafico, elenco per data, Pirsi e ritratto passano tutti da lì. Nello stesso giro `mostraFascia` scrive «≥» e «≤» invece di «>» e «<», perché uguale al limite è dentro. Lo prova `node tools/banco/prova_body_160.js` (HDL 65 con fascia del referto 40–60 → non è fuori)
- **Due valori sospetti nel file di Ignazio** (18/02/23 globuli bianchi 1,3; 01/06/24 MCHC 25,7) entrano come sono: li segnala la Regia a Ignazio, l'app non corregge i dati

Migrazione `supabase/migrations/20261103_170_analisi_csv.sql` (fotografia: `supabase/verifiche/170_analisi_csv_fotografia.sql`): il vincolo `blood_tests_fonte_chk` ammette anche **'csv'**; nessuna riga si tocca, idempotente. Lo prova `node tools/banco/prova_body_170.js` (il lettore sulla fixture finta `tools/banco/dati/esami_finti_20261103.csv`, stesso formato del file vero con valori inventati; l'app: anteprima, date saltate, blocchi, scrittura che si ferma, donazioni spente, file sbagliato, la scheda con 38 prelievi e l'altezza in Chrome). **Il file vero non entra nel repo.**

### Schema

Migrazione `supabase/migrations/20261102_160_analisi_del_sangue.sql (fotografia prima e dopo: `supabase/verifiche/160_analisi_fotografia.sql`, **la esegue la Regia col backup prima**): `blood_tests` prende `esami` jsonb (vincolo: array), `donazione` boolean default false, `fonte` (lettura · mano · check), `prompt_version`, e **UNIQUE (user_id, test_date)** (si ferma e conta se trova doppioni). **Nessuna tabella nuova**: una donazione porta sempre le sue analisi, è un segno sulla riga. Lo stesso file **travasa** `profiles.esami_sangue` (i valori scritti a mano, ognuno con la sua data) in righe di `blood_tests` con `fonte` 'mano', saltando le date già presenti e contando i valori senza data; **`profiles` non si tocca** (il 2 novembre 2026: 0 righe in `blood_tests`, 0 profili con esami a mano). Tabella esistente: RLS, regole e GRANT invariati.

**Verifica**: `node tools/banco/prova_body_160.js` (56: vocabolario, ritratto, scheda, dettaglio, Pirsi, donazioni, andamento, referto e foglio, scrittura fallita, check, Impostazioni) · `TZ=UTC node worker/test/prova_esami.mjs` (30) · `prova_impostazioni_livelli.js` e `prova_veste.js` aggiornate (Salute rimanda; cinque schede, e la scheda Analisi nel giro in Chrome: contrasto 4,5:1 e tasti da 44 px). Revisione indipendente del 3 novembre 2026: 14 rilievi, tutti applicati. **`shared/esami.js` si carica prima di `shared/ritratto.js`**, che lo usa in testa.

## Lettura del report Fitdays

**Body 150, 13 ottobre 2026 (strada A, decisa da Ignazio).** La bilancia Fitdays non parla con l'app (niente Apple Health, Shortcuts, app a pagamento o client non ufficiali): dopo la pesata la persona fa lo **screenshot o il PDF del report** e lo dà al coach, che lo trascrive con Gemini. **Il file non si conserva da nessuna parte**: non in un bucket, non nel database, non nei log del Worker.

### Nell'app

- nel modulo «Misure col metro e bilancia» del tab Body, sotto il titolo, il tasto **«Leggi il report Fitdays con Pirsi →»** apre la scelta del file (`image/*,application/pdf`); `leggiReportFitdays` in `app/body.js`. **Parte solo da un tocco**
- prima che il file parta, il consenso `consensoLetturaReport` («Acconsento»/«Annulla», `zt_report_ok` sul telefono, come `zt_foto_ok` per le foto): se annulla non parte niente
- un'immagine si riduce sul telefono a **2400 px** sul lato lungo (`fitdaysPreparaFile`, JPEG 0,85: il report è alto e stretto, a 1200 px i numeri non si leggono più); un PDF parte com'è. Al Worker vanno solo `user_id`, `mime` e il file in base64, col token nell'intestazione: **nessun nome, nessun dato del profilo**
- la lettura **compila le caselle che Body aveva già** — peso, grasso %, massa muscolare, grasso viscerale, età corporea (`ZTFitdays.inCaselle`) — e porta il modulo al **giorno stampato sul report** (se non è nel futuro); sotto le caselle la card «Report Fitdays letto da Pirsi» con tutti i 22 indicatori e «Togli». **La persona controlla e tocca «Salva misure»**: solo allora si scrive (scelta di Ignazio): peso in `weight_logs`, bilancia in `body_logs`, come prima, e la **lettura completa in `fitdays_letture`** (una riga per persona e giorno, `scriviConCoda` con upsert su `user_id,date`)
- errori detti con parole (`fitdaysErrorMessage`); un file che non è immagine o PDF si rifiuta prima di chiedere; un'immagine che non è un report Fitdays non compila niente («Non mi sembra un report Fitdays»)
- **la lettura resta sul telefono finché non è salvata** *(Body 180, 27 ottobre 2026, segnalazione 0d3ff717: report letto, caselle compilate, «Salva misure» mai arrivato al server, e la sera Nutrition diceva «4 giorni dall'ultima pesata»)*: `fitdaysRicorda` la scrive in `zt_fitdays_lettura_<utente>` alla lettura, `fitdaysDimentica` la toglie a «Salva misure» riuscito o a «Togli»; dopo un ricaricamento `fitdaysInSospeso` la rimette in memoria e il modulo Misure torna al giorno del report con le caselle e la card. **Non torna, e si toglie dal telefono, se è superata** (`_fitdaysSuperata`: le misure della bilancia di quel giorno sono già salvate, cioè una riga `body_logs` con almeno una delle caselle del report; se il report aveva solo il peso basta una pesata di quel giorno; oppure il report ha più di `FITDAYS_SOSPESA_GIORNI` = 7 giorni. **La sola pesata non basta**: «Salva misure» scrive prima il peso e poi le misure, e se le misure non partono, o se «Pesati ora» è venuto prima del report, le caselle della bilancia non sono da nessuna parte; rimessa dopo un ricaricamento, la lettura compila solo le caselle vuote e non copre quello che intanto è sul server), **se è di un altro utente** (la lettura porta `user_id`, `_fitdaysMia`; il logout azzera `ST.fitdaysLettura` e `ST.bodyLogDate`) **o se è illeggibile**; quella appena letta in questa apertura (`fresca`) compila le caselle per intero. Finché le sue misure non sono salvate (`_fitdaysDaSalvare`), la striscia di Nutrition dice «Il report Fitdays del … è letto ma non ancora salvato» con «Salva misure», e la Home lo mette come Prossima azione («Salva il report Fitdays», azione `misure`) prima della pesata, a qualunque ora, solo quando pesate e misure sono già lette (come la pesata). **I giorni dall'ultima pesata si contano da `weighInsByDay`** (`_weightReminderDaysSinceLast` → `getWeighIns`): una pesata entrata con le misure o col check vale come una di «Pesati ora»

### `POST /fitdays-report`

Corpo `{ user_id, mime, data }` (base64; JPEG, PNG, WebP o PDF; corpo fino a 8 MB), header `Authorization: Bearer <token utente Supabase>`. Codice in `worker/src/fitdays.js`, prompt in `worker/src/prompts/fitdays-<data>.js` (un file per versione, la data in `meta.prompt_version`).

1. token verificato (`personaDaToken`, la stessa porta dei testi) → **401**; `user_id` diverso dal token → **403**; file non ammesso → **415** `bad-file`; troppo grande → **413**
2. **3 letture al minuto** per persona (binding `LIMITE_FOTO`, chiave `fitdays:<id>`) → **429** `rate-limit`
3. Gemini `gemini-3.1-flash-lite` con schema JSON, temperatura 0; **un solo nuovo tentativo**, poi **502** `invalid-json`; tempo massimo **60 s** → **504** `timeout`
4. risposta `{ ok, lettura: { riconosciuto, data_ora_testo, data_report, valori, letti, note, meta } }`. **Non scrive niente**: la lettura la salva l'app

Il prompt **non ha la voce di Pirsi né il ritratto**: è un lavoro di trascrizione, non un testo per la persona. Dice al modello di non leggere né ripetere il nickname stampato sul report.

### I 22 indicatori

Vocabolario in **`shared/fitdays.js`** (`ZTFitdays.CAMPI`: chiave, etichetta del report, nostra etichetta, unità, limiti di buon senso), una fonte per app e Worker. Un numero fuori dai limiti è una lettura sbagliata e diventa `null`, mai un dato. **«Perdita di grasso» nel report Fitdays è il peso senza il grasso** (peso − massa grassa): da noi è `massa_magra_kg`. Le due voci a parole (livello di obesità, tipo di corpo) restano testo. Il BMR (`bmr_kcal`) resta nella lettura: usarlo per il fabbisogno è una decisione a parte.

**Verifica**: `node worker/test/prova_fitdays.mjs` (Worker con fetch finto) · `node tools/banco/prova_body_fitdays.js` (app, senza rete) · `node tools/banco/prova_body_180.js` (lettura ricordata sul telefono, promemoria da `weighInsByDay`). Migrazione `supabase/migrations/20261013_150_fitdays_letture.sql` (GRANT + RLS: la persona legge, scrive e cancella le sue), da eseguire al rilascio con copia di sicurezza, poi rifotografare lo schema.

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
| `weigh_in` | meno di 3 pesate nella settimana (lo ricorda); **sotto 2** vale come dati sporchi *(Pirsi 080: titolo e soglia allineati)* | — |
| `logging` | meno di 4 giorni registrati, o «parziale» | — |
| `kcal` dimagrire | ritmo < −0,7 → +100 (e `keep` proteine) · −0,3/−0,7 → `keep` · fermo (−0,3/+0,2) 2 sett. con aderenza ≥ 70% → −150 · > +0,2 con aderenza ≥ 70% → −200, altrimenti `logging` | `target_kcal` |
| `kcal` massa | < +0,2 per 2 sett. con aderenza ≥ 70% → +150 · > +0,5 → −100 | `target_kcal` |
| `kcal` mantenere | fuori da ±0,3 per 2 sett. → ±100 | `target_kcal` |
| `protein` | proteine medie < 1,6 g/kg per 2 sett. → 1,8 g/kg arrotondato a 5, **solo se alza il target** | `target_protein` |
| `training_volume` | fatte < previste per 2 sett., niente infortuni, previste > 3 | `giorni_allenamento` −1 |
| `deload` | RIR medio ≤ 0,5 per 2 sett., o infortunio + settimana ≥ 4 | settimana del ciclo → 6 |
| `check` | settimana 6 senza check nelle ultime 4 sett., o ultimo check ≥ 42 giorni | — |
| `blood_test` | nessun esame, o l'ultimo ≥ 180 giorni: «parlane con il medico» | — |
| `eat_first` | **fatica alta** (sedute dette «dure» ≥ metà, o RIR medio ≤ 0,5) **e calorie medie < 90% dell'obiettivo** con ≥ 4 giorni registrati: «Prima mangia, poi lo scarico»; quella settimana niente `deload` e niente taglio *(Pirsi 080)* | — |
| `keep` | nulla da proporre, o peso nel ritmo, o peso fermo con foto `migliorato` · `alta`; **oppure il contesto ferma le calorie** *(Pirsi 080, 14 ottobre 2026, le quattro regole scelte da Ignazio)*: settimana di **scarico** → le calorie non si toccano, né giù né su · **infortunio** in corso o nella settimana → nessun taglio · **fatica alta con calorie sotto l'obiettivo** → prima mangia, nessun taglio · **peso fermo ma vita o grasso % in calo** (medie di 2 settimane contro le 2 prima: vita −1 cm, grasso −0,5 punti, o vita al check della settimana −1 cm) → stai ricomponendo, nessun taglio. Un'aggiunta di calorie passa sempre, tranne in scarico | — |

- **Ritmo del peso** = (media settimane 0-1 − media settimane 2-3) / 2, in kg/settimana. Mai una pesata sola
- **Direzione**: `dimagrimento` → dimagrire · `ipertrofia` → massa · `ricomposizione` → dal peso obiettivo (±1 kg) · il resto → mantenere
- **Dati sporchi** (`weigh_in` sotto 2 pesate, o `logging`) → niente `kcal` né `protein`
- **Il contesto arriva dal quadro** *(Pirsi 080)*: `training.feel` = quante sedute di lavoro la persona ha detto facili, giuste, dure (`workouts.sensazione`, Training 060, migrazione `20261014_060`: **va eseguita prima**, la lettura del quadro chiede la colonna); `body.waist_avg` e `body.bf_avg` = vita e grasso % medi della settimana da `body_logs` (metro, bilancia smart, report Fitdays). Un fatto che manca è `null` e non fa scattare niente. Le letture Fitdays complete (`fitdays_letture`) non si leggono: bastano le caselle di `body_logs`. Ogni proposta fermata dal contesto porta in `evidence.dati.contesto` i fatti che l'hanno fermata
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
- **«Accetto» su calorie o proteine e i pasti già pianificati** *(dal 13 ottobre 2026, Pirsi 060, scelta B della nota)*: la proposta arriva il lunedì alle 6, il piano della settimana è nato la domenica coi numeri vecchi. Dopo l'aggiornamento di profilo e target, `pirsiPastiConNumeriNuovi` in `app/pirsi.js` legge i piani da questa settimana in poi (`weekly_plans`, al massimo 4 righe, la prossima compresa se c'è già): **senza piano** l'avviso resta «Da domani il piano usa X kcal», che lì è vero; **con un piano** chiede «Il piano di questa settimana è nato coi numeri di prima. Rifaccio pranzi e cene con quelli nuovi?» (Rifai i pasti / Lascia così). Col sì, per ogni piano: i pasti di prima si leggono e si tolgono, `_pianoV4GenerateAndInsertMeals` ne scrive 14 nuovi coi target nuovi, la riga del piano prende i target e un annuncio «cambiati» (`_pianoV4ContestoAnnuncio` con base = i numeri vecchi del piano stesso), la cache del Piano si svuota e l'overlay di benvenuto di quel piano si chiude. **Se il coach non risponde, i pasti di prima tornano con gli stessi id** e la riga del piano non si tocca. Col no: «Numeri nuovi salvati. I pasti già pianificati restano com'erano». Lo prova `node tools/banco/prova_pirsi_accetto_pasti.js`
- **«Perché?»** *(Pirsi 120, 14 ottobre 2026)*: sotto i numeri di ogni proposta in attesa, il tasto chiede al coach di spiegarla in 3-4 frasi **usando solo i numeri salvati con la proposta** (`evidence.numeri`) e cosa cambia con «Accetto» (`change`): `spiegaProposta` in `app/pirsi.js`, prompt `_perchePrompt` con `ZTCoachRules.voce()`, **mai il nome della persona**, una chiamata per tocco. La spiegazione compare sotto i numeri (`.cp-why-text`) e resta sul telefono (`zt_perche_<utente>`, al massimo 60): riaprire la Home non la richiede. Se il coach tace, un avviso e il tasto resta. Il coach racconta, non decide: i numeri restano quelli delle regole. `eat_first` accettata porta a Nutrition, come `logging`
- **Non ora** → `rejected`. Nel quadro, sotto la settimana, «Cosa ha proposto Pirsi» con lo stato
- Se il profilo non si aggiorna, la proposta non si segna; se la proposta non si segna, il profilo torna com'era

**Verifica**: `node tools/banco/prova_coach_rules.js` · `prova_pirsi_080.js` (regole incrociate e quadro con feel, vita, grasso) · `prova_pirsi_perche.js` («Perché?») · `prova_pirsi_generazione.js` · `prova_pirsi_card.js` · `TZ=UTC node worker/test/prova_coach_cron.mjs` · dal vivo `verifica_proposte_vivo.js`, `verifica_nutrizione_quadro.js`, `TZ=UTC node worker/test/vivo_coach_cron.mjs` (in prova, niente scritto).

---

## Ritratto unico

**In vigore dal 2 ottobre 2026 (Pirsi 020).** Un blocco di testo «CHI È», uguale per ogni chiamata del coach, scritto in un posto solo: `shared/ritratto.js` (`ZTRitratto.build`). Prima ogni chiamata si costruiva da zero il suo pezzetto.

- **Cosa contiene**, una riga per fatto: persona · obiettivo e attività · dieta e intolleranze · note di salute · obiettivi del giorno · peso vero (ultima pesata, media, tendenza, peso obiettivo) · oggi (seduta da fare/in corso/fatta/riposo, settimana del ciclo) · infortunio o rientro graduale · settimana in corso e settimana scorsa (dal quadro) · ultimo check e lettura delle foto · ultime 4 proposte con l'esito
- **`null` = non registrato, mai zero**, come il quadro: un fatto che manca non produce una riga. **Il peso del profilo non si usa mai**: è quello dell'iscrizione; senza pesate la riga dice «nessuna pesata recente»
- **Nell'app**: `coachRitratto()` raccoglie da `ST` ciò che è già in memoria, senza rete e senza mai lanciare errori; `coachRitrattoPronto()` prima carica i due quadri se mancano. La settimana del ciclo arriva da `getCycleWeekInfo()`, il peso dal quadro
- **Chi lo riceve**: consiglio sul pasto (`getAdvice`, al posto delle vecchie righe UTENTE/DIETA/…), nota alla scheda (`_trainGenAINote`), annuncio del piano (`_pianoV4GenerateReasoning`), consigli tecnici (`buildCoachPrompt`)
- **Chi non lo riceve, per scelta**: le tre stime dei macro (sono calcoli su un alimento, il ritratto sarebbe solo rumore) e la generazione del piano settimanale (la richiesta è già a ridosso del limite di 8000 token al minuto di Groq: ~450 token in più la farebbero rifiutare)
- **Lettura delle foto**: il Worker legge da sé l'obiettivo dal profilo e lo passa al modello, solo per scegliere cosa guardare nelle settimane dopo; il giudizio sulle foto non cambia
- **Non ancora fatto**: il Worker non ricostruisce il ritratto intero dal token (seduta di oggi e infortunio vivono sul telefono); «come sta» aspetta il diario del giorno (Fondamenta 050), il posto è già previsto (`dati.wellbeing`)
- **Verifica**: `tools/banco/prova_ritratto.js` (modulo da solo + app vera) · `worker/test/prova_vision_check.mjs`

---

## Pirsi — nome e voce del coach

**In vigore dal 13 agosto 2026.** Il coach si chiama **Pirsi**. Il nome è **provvisorio, in fase di test**: è per questo che vive in un posto solo.

### La costante

```js
const COACH_NAME = 'Pirsi';   // zona-tracker.html, subito dopo APP_VERSION
```

**Fuori dai prompt il nome non si scrive mai per esteso**: 22 usi, tutti da `COACH_NAME`. Cambiarlo è una riga. **Eccezione dichiarata** *(Notifiche 170, 1 novembre 2026)*: il titolo dell'avviso push lo compone il Worker, che la pagina non la legge: `COACH_NAME` in `worker/src/promemoria-cron.js` è la seconda e ultima copia. Chi cambia il nome cambia due righe.

⚠️ **Nei prompt il nome è scritto per esteso, ed è voluto.** Lì il modello lo legge come testo dentro la frase d'identità, non come dato: passarlo da una variabile non darebbe nessun vantaggio e renderebbe i prompt illeggibili nel sorgente. **Dal 13 ottobre 2026 (Pirsi 040) la frase d'identità sta in un posto solo**, `ZTCoachRules.voce()` in `shared/coach_rules.js`: «Sei Pirsi» è scritto lì e in nessun altro file.

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

**Una sola identità e un solo registro, in un posto solo** *(dal 13 ottobre 2026, Pirsi 040)*: `ZTCoachRules.voce()` in `shared/coach_rules.js` restituisce la frase d'identità («Sei Pirsi, il coach di Zona Tracker: segui la stessa persona nell'allenamento, nel cibo e in come sta», prima persona, del tu, mai nominarsi né firmarsi) seguita dal registro; `voce({ registro:false })` dà la sola identità. Prima ogni prompt si presentava a modo suo («coach di forza e ipertrofia», «coach nutrizionale esperto in dieta a Zona 40-30-30», «coach nutrizionale di Zona Tracker»…): il «40-30-30» contraddiceva i macro per obiettivo, e il registro era copiato a mano in cinque posti. Lo controlla `node tools/banco/prova_pirsi_voce.js`, che cerca anche «Sei Pirsi» fuori dal modulo.

I prompt che parlano all'utente (**A** cue · **B** nota scheda · **C** annuncio piano · **D** 14 pasti · **E** riequilibrio · **I** lettura delle foto dei check, nel Worker dal 13 settembre) iniziano tutti con `voce()`; A con la sola identità. **F, G, H restituiscono solo JSON e non hanno identità.** I restituisce JSON anche lui, ma `summary` e `suggested_focus` si leggono a schermo: per questo ha identità e registro. **Il Worker importa `shared/coach_rules.js` anche per questo**: se la voce cambia, va ripubblicato.

**Il registro è un paragrafo di 377 caratteri**, messo vicino all'identità e non in fondo tra le regole di formato: amico diretto e schietto · dati buoni detti senza enfasi · dati cattivi col fatto prima e la spinta dopo · sempre concreto sui numeri veri invece che frasi motivazionali generiche.

**Tempo massimo e cue che non si tengono sbagliati** *(dal 13 ottobre 2026, Pirsi 090)*: `callAI` ha un tempo massimo (`AI_TEMPO_MAX_MS`: 40 s ai testi, 90 s ai 14 pasti) e scaduto lancia kind `timeout` («Ci ho messo troppo: riprova»); il Worker ferma Groq a 60 s (`TEMPO_MAX_GROQ_MS`, 504 kind `timeout`). I cue tecnici passano tutti da `cuePer(exName, sessionId, eq)` in `app/pirsi.js` (recupero e foglio dell'esercizio): il testo del modello entra nella pagina con `esc()` e poi solo grassetto e a capo (`cuePulito`); **un errore non va in `ST.aiCue`** ma in `ST.aiCueErrori` e si riprova alla richiesta dopo, non prima di 15 s (`CUE_RIPROVA_MS`); una risposta vuota è un errore; **il cue buono si salva sul telefono** (`zt_cue_<utente>`, 30 giorni, al massimo 200) e la seduta dopo non chiama il coach. Lo prova `node tools/banco/prova_pirsi_tempo.js`; il Worker in `worker/test/prova_porta_coach.mjs` (caso «Groq appeso»).

**Niente della persona nei prompt**: età, note di salute, luogo e attrezzi arrivano dal [ritratto](#ritratto-unico), che dal 13 ottobre ha la riga «Allenamento a casa · attrezzi: elastici a tubo, manubri» presa da `tipo_allenamento` e `attrezzatura` del profilo. Prima il prompt dei cue diceva fisso «Allena con elastici a tubo», e sarebbe arrivato uguale a chiunque. Nello stesso giro la Home ha smesso di dire «Sessione X a digiuno»: il profilo non sa a che ora ci si allena.

⚠️ **Gli esempi valgono più degli aggettivi.** "Amico diretto" al modello dice poco; una frase scritta come la direbbe Pirsi gli dice tutto. B, C, E hanno un **esempio di tono** dichiarato come modello di *voce e non di contenuto*, coi suoi numeri e alimenti dichiarati inventati. L'esempio di C contiene un rimprovero (cene saltate) e porta con sé una guardia esplicita: **mai attribuire all'utente mancanze che non risultano dai dati ricevuti**.

**L'annuncio del piano (C) sa cosa è successo prima** *(dal 13 ottobre 2026, Pirsi 050)*: prima diceva fisso «stanno funzionando, non li tocco», falso al primo piano di una persona nuova, dopo una proposta accettata o col peso fermo. `_pianoV4ContestoAnnuncio(weekStart, targets)` in `app/nutrition.js` legge l'ultimo piano prima di questa settimana (`weekly_plans`), le proposte accettate negli ultimi 14 giorni su calorie o proteine e il ritmo del peso dal quadro della settimana che si chiude; il confronto lo fa `_pianoV4WelcomeComputeDiff(draft, base)`, la stessa funzione dell'overlay di benvenuto. Tre casi: **primo** (punto di partenza, niente da confermare) · **invariati** (restano fermi: «stanno funzionando» solo se il ritmo del peso va nella direzione dell'obiettivo, altrimenti una settimana in più di dati) · **cambiati** (cosa cambia e di quanto, e il perché: la proposta accettata, o le impostazioni). L'esempio di tono e il ripiego senza coach seguono il caso (`_pianoV4AnnuncioEsempio`, `_pianoV4AnnuncioRipiego`): un esempio che dice «non li tocco» a un cambio farebbe obbedire il modello all'esempio ([L27](LEZIONI.md#l27--due-istruzioni-opposte-nello-stesso-prompt-e-il-modello-obbedisce-alla-vecchia)). Lo prova `node tools/banco/prova_pirsi_annuncio.js`.

⚠️ **Il "noi" non possiede il corpo dell'utente.** Ammesso solo per il lavoro fatto insieme — *ripartiamo*, *vediamo come va*, *abbiamo costruito*. Corpo, peso, risultati e progressi sono suoi e vanno al **"tuo"**, mai al "nostro". Regola presente in B e in C.

**Storia dell'intervento**: `ece8d66` nome nei prompt · `264851b` registro unico · `edbb7da` prosa in E · `7cf1cb8` esempi di tono · `4e8a4b8` contraddizione tolta da E · `5089e09` stringhe Piano · `f895056` stringhe Training · `04dcb85` onboarding e presentazione.

---

