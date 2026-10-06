# Banco di prova — l'app vera, senza rete

Carica `zona-tracker.html` **così com'è** dentro [jsdom](https://github.com/jsdom/jsdom) e gli mette accanto un finto client Supabase che serve righe scritte a mano. Serve a verificare una modifica **eseguendola**, anche quando il DB, il Worker e la CDN non sono raggiungibili → [L46](../../docs/LEZIONI.md#l46--quando-la-rete-è-chiusa-il-banco-di-prova-si-costruisce-sul-file-vero).

```bash
npm install jsdom          # unica dipendenza, fuori dal repo
node tools/banco/prova_trazioni.js
node tools/banco/prova_storico.js
node tools/banco/prova_body_cta.js
node tools/banco/prova_esami.js
node tools/banco/prova_app_chiusa.js    # app chiusa per lavori: entra solo APP_ONLY_EMAIL, gli altri vedono «in aggiornamento»
node tools/banco/prova_quadro_peso.js   # peso attuale: 0/1/3 pesate, obiettivo, tab Body
node tools/banco/prova_lettura_foto.js  # lettura delle foto del check: card, pulsante, errori, quadro
node tools/banco/prova_body_tendenza.js # Tendenza e «Ultimi log» con le pesate rapide (cantiere 35)
node tools/banco/prova_storico_pasti.js  # storico oltre le 1000 righe: pasti, ingredienti e catalogo letti a pagine (Fondamenta 010)
node tools/banco/prova_errori.js         # errori dei telefoni in app_errors: dbq, errori di pagina, promesse rifiutate (Fondamenta 060)
node tools/banco/prova_diario.js         # diario del giorno (daily_log): lettura, scrittura dei soli campi passati, valori fuori scala (Fondamenta 050)
node tools/banco/prova_pagina_divisa.js [file di prima]  # pagina divisa in più file: file presenti, elenco del service worker, senza rete; col file di prima, identità byte per byte (Fondamenta 035)
node tools/banco/prova_ordine_caricamento.js [--elenco]  # la pagina divisa: nessun pezzo usa al caricamento un nome dichiarato in uno script che viene dopo (serve acorn: npm install acorn)
node tools/banco/prova_browser.js [file di prima]         # la pagina divisa in Chrome vero, servita in locale: errori al caricamento, cose comuni presenti, schermate uguali a prima
node tools/banco/conta_richieste.js                      # quante richieste a Supabase per apertura, rientro e giro dei tab, tabella per tabella (Fondamenta 045)
node tools/banco/prova_avvio_home.js [cartella di prima]  # apertura della Home: proposte di Pirsi lette una volta, Home disegnata una volta per fotogramma (Fondamenta 100, tappa 1)
node tools/banco/prova_avvio_subito.js [cartella di prima]  # la pagina parte da sola, senza l'attesa fissa di 1,8 s: millisecondi fino alla schermata, entrato e non (Fondamenta 100, tappa 2)
node tools/banco/prova_avvio_ondate.js [cartella di prima]  # le letture di avvio partono insieme: ondate di risposte fino all'app e al rientro, col finto Supabase che risponde solo al via (Fondamenta 100, tappa 3)
node tools/banco/prova_avvio_finestra.js [cartella di prima]  # all'avvio solo gli ultimi 90 giorni di storico, il resto a richiesta (serie di giorni, ‹, Analisi a 3 mesi); a fine lettura lo stato e' identico a quello di prima (Fondamenta 100, tappa 4)
node tools/banco/prova_rientro_leggero.js  # il rientro nell'app rilegge solo gli ultimi 7 giorni, il profilo e le serie di oggi (7 richieste invece di 14); dopo 30 minuti, a giorno cambiato o se una lettura fallisce torna completo (Fondamenta 100, tappa 5)
node tools/banco/prova_cache_locale.js [cartella di prima]  # la copia locale salva solo gli ultimi 90 giorni e, se non entra nel tetto, 14 (Fondamenta 100, tappa 6)
node tools/banco/prova_avvio_senza_profilo.js  # primo avvio senza copia locale: profilo non leggibile → «Non riesco a collegarmi» e Riprova, mai l'onboarding; nessuna riga → onboarding (Fondamenta 130)
node tools/banco/prova_conferme.js  # chiediConferma, chiediTesto e avvisa al posto di confirm/alert/prompt; il toast non spegne il successivo (Fondamenta 150)
node tools/banco/prova_cestino_pasto.js  # il cestino a scorrimento del pasto chiede conferma come quello piccolo; nessun onclick chiama deleteMeal (Fondamenta 150, dalla prova sul telefono)
node tools/banco/funzioni_morte.js  # funzioni dichiarate e mai chiamate: deve dare 4, tutte volute (Fondamenta 180)
node tools/banco/prova_versione_nuova.js  # versione nuova: striscia «tocca per aggiornare», mai ricarica da sola, in allenamento aspetta; la versione si legge dalla pagina in rete (APP_VERSION), non solo da sw.js (Fondamenta 140)
node tools/banco/prova_senza_rete.js  # senza rete: pasti, digiuni, integratori presi e pesate in coda, inviati al ritorno della rete; striscia «Sei senza rete»; errore dell'API non in coda (Fondamenta 120)
node tools/banco/prova_tabella_unica.js  # una tabella sola per le serie (training_logs, id del telefono, coda unica), codice esercizio e supplement_id scritti e letti, scrivi-o-aggiorna per allenamenti e misure, vecchia WS-QUEUE tolta (Fondamenta 070/080/090)
node tools/banco/prova_privacy.js  # informativa prima del primo accesso, consenso prima che le foto partano, niente nome nei testi al coach, «Scarica i miei dati» (Fondamenta 170)
node tools/banco/prova_installazione.js  # manifest, icone PNG (rigenerabili con node tools/icone/genera.js) e suggerimento «Aggiungi alla schermata Home» (Fondamenta 190)
node tools/banco/prova_blocco_nuovo.js   # blocco nuovo come anteprima: cardini che restano per codice, complementari nuovi o fermi nella stessa seduta (mai in due), «Cambia ›» con le alternative del posto, anteprima conservata alla chiusura, riscaldamento che ruota e «Rinnova il riscaldamento», «riparti da» fuori dallo scarico, Accetto / Non ora, scheda vecchia riaccesa se il salvataggio fallisce (Training 070)
node tools/banco/prova_stile.js [stile di prima]  # Stile 010: nessun colore a mano fuori da :root, caratteri per nome; con lo stile di prima, regole uguali coi nomi risolti e 15 schermate in Chrome vero con stessi pixel e stesso stile calcolato (FOTO=cartella tiene le foto)
node tools/banco/prova_ripristino.js <cartella della copia>  # dal vivo: l'app sulla copia di sicurezza contro l'app sul database (Fondamenta 020)
node tools/banco/verifica_nutrizione_quadro.js [lunedì]  # dal vivo: giorno per giorno, tab Nutrition contro quadro
node tools/banco/prova_coach_rules.js    # regole di Pirsi: 47 controlli su scenari, niente jsdom
node tools/banco/verifica_proposte_vivo.js [user] [N]  # dal vivo: proposte sulle ultime N settimane salvate
node tools/banco/prova_pirsi_generazione.js # ripiego dell'app che genera le proposte + scarico anticipato nel ciclo
node tools/banco/prova_pirsi_card.js [cartella] # card «Pirsi propone», Accetto / Non ora, cronologia nel quadro, schermate
TZ=UTC node worker/test/prova_coach_cron.mjs # il cron del lunedì con fetch finto, in UTC come Cloudflare
TZ=UTC node worker/test/vivo_coach_cron.mjs  # dal vivo, in prova: quadri del Worker contro quelli del telefono, giro senza scritture
node worker/test/prova_vision_check.mjs # il Worker /vision-check con fetch finto (niente jsdom)
node tools/banco/prova_ritratto.js        # ritratto unico: il modulo da solo, poi le chiamate del coach nell'app vera (Pirsi 020)
node tools/banco/prova_porta_coach.js    # callAI manda il token della persona; senza sessione non chiama (Pirsi 010)
node worker/test/prova_porta_coach.mjs   # la porta dei testi del Worker: token, sito, tetti, 404, limite per persona (Pirsi 010)
```

## Cosa è finto e cosa no

| | |
|---|---|
| finto | `window.supabase` (catena `.select/.eq/.in/.lt/.order/.range`, **troncamento a 1000 righe compreso**; `tables.__assenti = ['tabella']` risponde `PGRST205`), `AudioContext`, `matchMedia`, `scrollTo` |
| vero | tutto il resto: render, stato, helper, il file byte per byte — la pagina e i suoi file di `app/`, ricomposti da `pagina.js` |

⚠️ **Il confronto prima/dopo è il punto.** Il file di prima si carica nello stesso banco e con le stesse fixture:

```js
const { boot } = require('./banco');
// git show HEAD:zona-tracker.html > /tmp/prima.html
boot(fixture, { file: '/tmp/prima.html' });
```

Se la prova che sul nuovo dà OK non dà **KO** sul vecchio, non sta misurando quello che si crede.

⚠️ **Non sostituisce la prova sul telefono.** Dice che la logica fa ciò che deve con quei dati; non dice come si legge a 375 px, né cosa risponde il DB vero.

## Appigli utili

- l'orologio si ferma con `boot(fixture, { now: '2026-09-13T09:00:00' })`: `new Date()` e `Date.now()` danno sempre quell'istante, le date esplicite restano vere. Serve quando la prova dipende dal giorno della settimana (`prova_quadro_peso.js`)
- **le risposte si possono trattenere**: `tables.__attesa = () => promessa` fa aspettare ogni risposta del finto Supabase finché quella promessa non si risolve. Serve a contare le ondate di letture (`prova_avvio_ondate.js`): un conteggio che non dipende dalla velocità della macchina
- **il join degli ingredienti**: `select('..., meals!inner(date)')` porta nella riga il pasto (`riga.meals = {date}`), scarta gli ingredienti senza pasto e i filtri `meals.date` guardano là, come PostgREST. `tables.__joinRotto = true` fa rispondere il join con un errore, per provare il ripiego (`prova_avvio_finestra.js`)
- **`.single()` senza righe** risponde con l'errore `PGRST116` come PostgREST; `.maybeSingle()` risponde `null` senza errore
- **`select('id', { count:'exact', head:true })`** risponde con `count` (le righe che passano i filtri) e, con `head`, senza righe: così `rigenIdx` e `blocco_n` del generatore contano davvero (`prova_blocco_nuovo.js`)
- **il filtro `.or('a.eq.x,b.eq."y"')`** come PostgREST: solo uguaglianze, i valori fra virgolette possono contenere virgole (`prova_tabella_unica.js`)
- **rete e scritture**: `tables.__rete = false` fa rispondere ogni chiamata come un fetch fallito (errore senza codice); `tables.__rifiuta = { tabella:{code, message} }` fa rispondere le scritture su quella tabella con quell'errore dell'API; gli `insert` conservano le righe in tabella e un id già presente risponde `23505`
- **gli intervalli della pagina** (`setInterval`) sono timer di Node senza presa sul processo (`unref`): una prova senza `process.exit` finisce quando ha finito, non dopo 3 minuti
- **la pagina parte da sola**, come sul telefono (il BOOTSTRAP non aspetta più, Fondamenta 100): senza sessione mostra l'accesso, con `tables.__sessione = { user:{ id, email } }` entra e carica; `opts.locale = { zt_cache: {…} }` riempie localStorage prima che parta. Una prova che avvia a mano (`loadAndStart`) e poi guarda le schermate fa prima `await avviato` (lo restituisce `boot`), altrimenti la partenza automatica le arriva sopra
- lo stato dell'app si prende con `win.eval('ST')` (le `const` di un classic script non stanno su `window`, le `function` sì)
- un giorno di Training diventa loggabile con `ST.trainAnticipato = 'upperA'`, senza toccare rotazione e debito
- una funzione globale si può sostituire per la durata della prova: `win.getCycleWeekInfo = () => ({ isScarico:true, … })`
