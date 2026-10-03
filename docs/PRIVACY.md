# Privacy — informativa, mappa dei dati, piano «Elimina account»

*Fondamenta 170, 3 ottobre 2026. Scritto in italiano semplice. La parte (a) è una bozza: la approva Ignazio. La parte (c) è solo un piano: «Elimina account» non è realizzato, perché cancella dati e lo decide Ignazio.*

## (a) Bozza dell'informativa e del consenso

È il testo che la persona legge **prima del primo accesso** (schermata «Dove vanno i tuoi dati», tasto «Ho capito, continuo») e che ritrova nelle Impostazioni sotto «Dove vanno i tuoi dati». Vive in `app/comune.js` (`PRIVACY_INFORMATIVA`); se il testo cambia, cambia anche `PRIVACY_VERSIONE` e chi l'aveva già letto lo rilegge. La scelta resta sul telefono (`localStorage`, chiave `zt_privacy_ok`), non nel database.

> **Il tuo account e i tuoi dati.** Email di accesso, profilo, pasti, allenamenti, pesate, misure, esami e foto dei check stanno su Supabase, in uno spazio che solo tu puoi leggere e scrivere. Chi gestisce l'app può vedere i dati, non le foto, per assistenza e controllo.
>
> **I consigli del coach.** Per darti un consiglio, l'app manda a Groq (un servizio esterno) età, sesso, peso, obiettivo, regime alimentare, intolleranze, note di salute, pasti e allenamenti recenti. Non manda il tuo nome.
>
> **Le foto dei check.** Le foto restano nel tuo spazio privato. Vanno a Gemini (un servizio esterno) solo se tocchi tu «Fai leggere le foto», e prima ti viene chiesto il consenso ogni volta che serve.
>
> **Cosa puoi fare.** Dalle Impostazioni puoi scaricare tutti i tuoi dati in un file. Per cancellare l'account scrivi a chi gestisce l'app: i dati, le foto e l'accesso vengono eliminati.

Il consenso alle foto si chiede **alla prima lettura** (foglio «Lettura delle foto», tasti «Acconsento» e «Annulla», `consensoLetturaFoto` in `app/body.js`): se annulla, non parte niente. La risposta sì resta sul telefono (`zt_foto_ok`). Il testo:

> Per leggere il check, le foto del tuo corpo vengono mandate a Gemini, un servizio esterno, insieme alle misure. Servono solo per il confronto e non restano nell'app di Gemini. Vuoi continuare?

Cose da decidere con Ignazio prima di approvare: se citare i gestori per nome (Supabase Inc., Groq Inc., Google per Gemini) e dove stanno i loro server; se aggiungere un indirizzo email a cui scrivere per cancellare l'account; se la frase «non restano nell'app di Gemini» va verificata sui termini del servizio in uso (piano gratuito: va letta la pagina dei termini, non si dà per scontato).

## (b) Mappa dei dati: quale dato va a quale servizio, da quale funzione

| Dato | Dove sta | Chi lo manda | A chi va | Perché |
|---|---|---|---|---|
| Email di accesso | Supabase Auth (`auth.users`) | `signInWithOtp`, `verifyOtp` (`app/onboarding.js`) | Supabase | Accesso con codice via email |
| Profilo: nome, cognome, sesso, età, altezza, peso, obiettivo, regime, intolleranze, note di salute, data inizio allenamento | `profiles` | `saveOnboarding`, `saveSettings` | Supabase | È il profilo |
| Pasti e ingredienti, digiuni | `meals`, `meal_items`, `fasting_days` | `dbAddMeal`, `smartSavePasto`, `dbToggleFasting` (`app/nutrition.js`) | Supabase | Diario |
| Integratori: libreria, presi, extra, pacchetti | `supplements`, `supplements_log`, `supplement_packages`, `supplement_package_items` | `dbToggleSuppTaken`, `dbInsertExtraLog`, editor pacchetti | Supabase | Diario |
| Serie, note, allenamenti, schede | `training_logs`, `training_notes`, `workouts`, `schede_utente` | `saveTrainingSet`, `saveTrainingNote`, `saveWorkoutRecord`, generatore | Supabase | Training |
| Pesate, misure, check, esami | `weight_logs`, `body_logs`, `body_checks`, `body_measurements`, `blood_tests` | `confirmWeighIn`, `saveBodyLog`, flusso M2, esami (`app/body.js`) | Supabase | Body |
| Foto dei check (4 pose) | bucket privato `body-check-photos` + righe `body_check_photos` | caricamento del check M2 (`app/body.js`) | Supabase Storage | Confronto fra check |
| Quadro settimanale, proposte del coach, diario del giorno, piani | `weekly_pictures`, `coach_proposals`, `daily_log`, `weekly_plans`, `weekly_plan_meals` | app e Worker (cron del lunedì) | Supabase | Coach |
| Errori dell'app (messaggio, pagina, versione) | `app_errors` | `reportError` (`app/comune.js`) | Supabase | Capire i guasti sui telefoni |
| **Testi al coach**: sesso, età, altezza, peso e tendenza, obiettivo, regime, intolleranze, note di salute, pasti e serie recenti, settimana del ciclo, infortuni — **mai il nome** (dal 3 ottobre 2026) | costruiti al momento (`ZTRitratto.build` in `shared/ritratto.js`, prompt in `app/nutrition.js`, `app/training.js`, `app/training_generatore.js`) | `callAI` (`app/pirsi.js`) → Worker `/` → Groq | **Groq** (modello `openai/gpt-oss-120b`) | Stime dei pasti, consigli, note della scheda, spunti sugli esercizi, piano settimanale, suggerimento di recupero |
| Lo stesso ritratto, per le proposte del lunedì | Worker, cron | `worker/src` → Groq | **Groq** | «Pirsi propone» |
| **Foto dei check** (quello di oggi e il precedente) + misure + obiettivo | lette dal bucket col ruolo di servizio | `requestBodyCheckAI` (`app/body.js`) → Worker `/vision-check` → Gemini, **solo dopo il consenso** | **Gemini** (`gemini-3.1-flash-lite`), via Cloudflare `IMAGES` per ridurle | Lettura del check; il risultato finisce in `body_check_ai` |
| Nome dell'esercizio | — | Worker `/exercise-media` | Supabase (catalogo GIF) | Trovare la GIF; nessun dato personale |

Chi può vedere cosa dentro Supabase: ogni persona legge e scrive solo le proprie righe (RLS); l'email di amministrazione (`ignazio.f@me.com`) può **leggere** le tabelle con la regola `admin_read_all_*` per assistenza, non le foto (bucket privato). Il Worker usa la chiave di servizio e vede tutto: per questo le sue strade sono poche e chiuse (token della persona, limiti).

Dove il nome entrava nei testi al coach, e da dove è uscito il 3 ottobre 2026: la riga «Persona» del ritratto (`rigaPersona` in `shared/ritratto.js`, usata da tutte le chiamate che portano il ritratto), la riga «Nome:» del piano settimanale (`app/nutrition.js`), il saluto «parla all'utente Ignazio» della nota di scheda (`app/training_generatore.js`). Il nome del coach, Pirsi, resta nei prompt per scelta. Nel Worker non c'è lo stesso difetto: i suoi testi non leggono `first_name`. Dopo la modifica i prompt non si contraddicono (L27): nessuno chiede più di «rivolgersi per nome». Lo prova `node tools/banco/prova_privacy.js`.

«Scarica i miei dati» (`raccogliMieiDati`, `scaricaMieiDati` in `app/impostazioni.js`): legge 23 tabelle coi permessi normali della persona, a pagine, e scrive un file JSON `zona-tracker-dati-<giorno>.json`. Delle foto mette solo l'elenco (pose e nome del file nel bucket), mai i byte. Una tabella che non si legge resta scritta come «non letta».

## (c) Piano «Elimina account» — solo scritto, non realizzato

**Cosa cancellerebbe, in quest'ordine.**

1. Le foto nel bucket `body-check-photos` sotto la cartella della persona (elenco da `body_check_photos.storage_path`): prima le foto, perché le righe che le elencano servono a trovarle.
2. Le righe in tutte le tabelle della persona. Quasi tutte hanno `user_id → auth.users ON DELETE CASCADE`: cancellando l'utente di accesso spariscono da sole. Da controllare una per una le eccezioni (`body_check_ai`, `weekly_plan_meals`, `supplement_package_items`, `body_check_photos`, `body_measurements`): se dipendono da un'altra tabella della persona, cadono con quella; se no, vanno cancellate a mano prima.
3. L'utente di accesso (`auth.users`): è l'ultimo passo, e trascina tutto il resto.
4. Sul telefono: `localStorage` (copia locale, code, scelte) e la cache del service worker.

**Cosa serve.** Cancellare l'utente di accesso e le foto di un bucket privato richiede la **chiave di servizio**, che l'app non ha e non deve avere. Due strade: una strada nuova del Worker (`/elimina-account`, col token della persona come `/vision-check`, che verifica chi chiede e cancella) oppure una funzione del database (`security definer`) chiamata dall'app. La strada del Worker è quella già in uso per le cose che l'app non può fare da sola.

**Cosa può andare storto.** Una cancellazione a metà (foto sparite, righe rimaste, o il contrario); un doppio tocco che riparte mentre la prima è in corso; una persona che cancella per sbaglio (serve una conferma con la parola scritta, non un tasto); l'email di amministrazione che cancella se stessa; i quadri settimanali già calcolati che contengono numeri della persona (cadono col cascade, ma vanno contati); le proposte del cron del lunedì che partono mentre la persona non c'è più.

**Copia di sicurezza prima.** Sempre, con la procedura di Fondamenta 020, e in più il file di «Scarica i miei dati» consegnato alla persona prima di cancellare.

**Piani gratuiti.** Resta tutto dentro: una strada in più del Worker non cambia i limiti, cancellare righe e foto libera spazio. Nessun servizio nuovo.

**Chi decide.** Ignazio, caso per caso, finché non esiste il tasto. Fino ad allora l'informativa dice: «scrivi a chi gestisce l'app».
