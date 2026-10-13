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
node tools/banco/funzioni_morte.js  # funzioni dichiarate e mai chiamate: deve dare 2, tutte volute (Fondamenta 180; erano 4 fino a Home 020)
node tools/banco/prova_versione_nuova.js  # versione nuova: striscia «tocca per aggiornare», mai ricarica da sola, in allenamento aspetta; la versione si legge dalla pagina in rete (APP_VERSION), non solo da sw.js (Fondamenta 140)
node tools/banco/prova_senza_rete.js  # senza rete: pasti, digiuni, integratori presi e pesate in coda, inviati al ritorno della rete; striscia «Sei senza rete»; errore dell'API non in coda (Fondamenta 120)
node tools/banco/prova_tabella_unica.js  # una tabella sola per le serie (training_logs, id del telefono, coda unica), codice esercizio e supplement_id scritti e letti, scrivi-o-aggiorna per allenamenti e misure, vecchia WS-QUEUE tolta (Fondamenta 070/080/090)
node tools/banco/prova_privacy.js  # informativa prima del primo accesso, consenso prima che le foto partano, niente nome nei testi al coach, «Scarica i miei dati» (Fondamenta 170)
node tools/banco/prova_variante_facile.js   # Training 330: «variante più facile» nomina l'esercizio (nome, codice, GIF, come si fa): regola pura, card, recupero, senza rete
node tools/banco/prova_training_ondata1.js  # Ondata 1 Training: serie a ripetizioni in silenzio, 3-2-1 sulla tenuta, ripetizioni e RIR con memoria, recupero fra un esercizio e l'altro, audio rifatto dopo un vocale (note 020 030 290 300 340)
node tools/banco/prova_training_280_320.js  # Ondata 4 Training: ripetizioni per lato (due tendine, reps_dx/reps_sx, in reps il lato debole, pillole, APPENA FATTA, «Ultima volta», dettaglio del giorno, correzioni) e la via di progressione nominata dal coach (ritmo più lento, più ripetizioni, carico in mano, …); il generatore legge `unilaterale` dal catalogo (note 280 320)
node tools/banco/prova_training_040.js      # Training 040: l'obiettivo della prima serie di oggi dall'ultima seduta (una regola sola con PROSSIMA: +1 rep, passo di carico in cima, passo indietro sotto il minimo, banda, per lato), registro già compilato alla prima serie e dalla PROSSIMA dopo, obiettivo sotto la GIF, scarico e rientro
node tools/banco/prova_training_350.js      # Training 350: pausa programmata (regola pura pausaInfo/pausaGiorniNel, quadro con pause_days, Pirsi che non propone «meno giorni», Worker che legge le date; card, foglio con le date, striscia, niente debito, blocco fermo, blocco nuovo dopo 3 settimane, rientro che lo dice)
node tools/banco/prova_home_030.js  # card Training in Home: sto caricando, non riesco a leggere, non iniziato, in corso (dalle serie di oggi), completata, prossima, ingresso diretto nella seduta, stato del giorno e giorni di fila (Home 030)
node tools/banco/prova_installazione.js  # manifest, icone PNG (rigenerabili con node tools/icone/genera.js) e suggerimento «Aggiungi alla schermata Home» (Fondamenta 190)
node tools/banco/prova_volume.js         # Training 110: serie a settimana per muscolo (conto dalla scheda, multiarticolari a metà sui secondari, recuperi esclusi), minimi per obiettivo, il generatore riempie (prima una serie in più, poi un esercizio, con le regole del blocco nuovo), la card nel Programma, volume_planned nel quadro
node tools/banco/prova_riepilogo.js      # Training 060: il riepilogo di fine allenamento (serie fatte su previste, tempo, confronto con la volta prima con la misura di ogni esercizio, record, «com'è andata?» su workouts, i tre passi dopo), ▲ sulla serie che supera l'ultima volta
node tools/banco/prova_progressione.js   # Training 100: la Progressione misura ogni esercizio con la sua grandezza (carico con l'unità del profilo, banda per le trazioni, secondi per le tenute, ripetizioni a corpo libero), 1RM solo col carico, volume giusto, card e coach sulla misura, Upper Pump nell'elenco, testo senza «tab Sessione»
node tools/banco/prova_cambio_oggi.js    # Training 160 «Cambia per oggi»: candidati (alternativa, più facile, stesso schema, solo chi si può fare, mai chi è in seduta), scelta nella seduta in memoria coi parametri e i testi giusti, serie sotto l'esercizio scelto col codice, «torna a quello» solo senza serie, per oggi sul telefono, dalla variante facile (330)
node tools/banco/prova_testi_scheda.js   # la scheda tecnica segue il catalogo: setup, esecuzione, errori, muscoli e nota di sicurezza riallineati in memoria da loadActiveScheda con la funzione del generatore; snapshot se il campo è vuoto o il catalogo non risponde; mai scritture (13 ottobre 2026)
node tools/banco/prova_blocco_nuovo.js   # blocco nuovo come anteprima: cardini che restano per codice, complementari nuovi o fermi nella stessa seduta (mai in due), «Cambia ›» con le alternative del posto, anteprima conservata alla chiusura, riscaldamento che ruota e «Rinnova il riscaldamento», «riparti da» fuori dallo scarico, Accetto / Non ora, scheda vecchia riaccesa se il salvataggio fallisce (Training 070)
node tools/banco/prova_segnala.js        # il tasto «Invia Feedback»: regole pure di app/segnala.js, insetto solo dentro l'app, in basso a destra e in alto con un foglio aperto, foglio anche sopra un altro foglio o una conferma, Invia spento senza motivo, riga con dove/versione/telefono, screenshot ridotto caricato prima della riga e tolto se la riga non parte, senza rete «Non inviata» e niente in coda, migrazione 230 (Fondamenta 220 e 230)
node tools/banco/prova_registra_integratori.js  # «Registra integratori» a elenco: spunta che registra subito, «Prendi tutto»/«Togli tutto» per pacchetto, «⋯» con Non oggi · Sostituisci (solo oggi) · Sospendi, Riattiva, senza rete in coda (Nutrition 210 · 190 · 120)
node tools/banco/prova_oggi_integratore_doppio.js  # un integratore preso compare una volta sola in Oggi e nel dettaglio del giorno: la riga è coperta dal gruppo se il suo prodotto (id, poi nome) è tra i presi, mai per orario; i veri extra restano extra (difetto del 12 ottobre 2026)
node tools/banco/prova_registra_sospendi.js  # «Sospendi» per sbaglio si rimedia sul posto: il sospeso resta nel suo pacchetto in grigio con «Riattiva», avviso con «Annulla», riga che spiega, senza rete in coda (12 ottobre 2026)
node tools/banco/prova_detox.js          # «Giorno Detox»: la pagina Oggi si ridisegna col digiuno (anello nuovo coi totali del giorno), si riapre dopo un ricaricamento, si toglie; niente `sTot` (Nutrition 010)
node tools/banco/prova_giorno_vuoto.js   # tornare a un giorno passato rimasto vuoto: ‹ e › giorno per giorno con la data giusta, indietro non oltre il primo giorno con dati (oltre il primo letto si legge il resto), avanti non oltre oggi; in Analisi i quadratini vuoti del passato si aprono e «Modifica giorno» porta lì (Nutrition 100)
node tools/banco/prova_letture_nutrition.js  # letture che non sovrascrivono i dati buoni (integratori, catalogo, pacchetti, digiuni e integratori dello storico), tutte da dbq; orario del pasto dalla coda; modifica del pasto nell'ordine nuovi → testata → via i vecchi, con ritorno indietro se un passo non va (Nutrition 140)
node tools/banco/prova_calorie_obiettivo.js  # calorie e macro legate all'obiettivo (deficit o surplus per obiettivo, il database comanda sulle preferenze del telefono), il peso non riscrive più le calorie (pillola → «Pesati ora», Impostazioni senza ricalcolo), «Ricalcola le calorie» coi numeri in chiaro e dopo un sì (Nutrition 030 · 040, Body 020)
node tools/banco/prova_in_zona.js         # una regola sola per «in Zona» e «Giorno perfetto» (shared/nutrizione.js: percentuali dell'obiettivo, 3 punti in, 6 quasi; perfetto = in zona e calorie entro il 10%), usata da Oggi, card del pasto, Analisi e dettaglio del giorno (Nutrition 020)
node tools/banco/prova_come_stai.js  # Home 020: «Come stai oggi», sonno/energia/stress con la rotellina e nota, salvati subito un campo alla volta, in coda senza rete, tornano com'erano se rifiutati
node tools/banco/prova_prossima_azione.js  # Home 010: «Prossima azione», sette regole per ora e per ciò che è fatto, il pulsante apre seduta, check, pesata o form del pasto
node tools/banco/prova_da_fare_oggi.js  # Home 060: «Anche da fare oggi» sotto Prossima azione: integratori passati non presi, pesata, pasti delle fasce passate, check; ogni voce apre il suo passo
node tools/banco/prova_card_nutrition.js  # Home 040: card Nutrition: piatto del piano per il prossimo pranzo o cena con «Registra» già compilato, «Ultimo pasto N h fa»; il piano dalla Home si chiede al massimo una volta al giorno
node tools/banco/prova_card_body.js  # Home 050: card Body: peso da getWeighIns con la virgola, variazione «da domenica», tocco sul peso = Pesati ora, «+ pesata di oggi», check in parole semplici
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
node tools/banco/prova_pirsi_voce.js      # Pirsi 040: una sola identità e un solo registro (ZTCoachRules.voce), attrezzi dal profilo nel ritratto, Home senza «a digiuno», Worker con la stessa voce
node tools/banco/prova_pirsi_annuncio.js  # Pirsi 050: l'annuncio del piano sa se è il primo, se i numeri restano o cambiano (di quanto e perché); ripiego per caso; il postino passa il contesto
node tools/banco/prova_pirsi_accetto_pasti.js  # Pirsi 060: dopo «Accetto» su calorie o proteine, «Rifaccio pranzi e cene?»: pasti rifatti coi numeri nuovi, ripristino se il coach tace, avviso vero senza piano o con «Lascia così»
node tools/banco/prova_pirsi_tempo.js      # Pirsi 090: tempo massimo in callAI (timeout), cue puliti, errore non tenuto e riprovato, cue buoni salvati sul telefono per 30 giorni
node tools/banco/prova_body_misure.js     # Body 020: «Misure col metro e bilancia» con la data (mai nel futuro), peso in weight_logs come «Pesati ora», metro e bilancia smart in body_logs, profilo solo se è la pesata più recente
node tools/banco/prova_body_percentuale.js # Body 030: la barra «% completato» conta solo il movimento verso l'obiettivo (0% se ci si allontana), in Misure e in Tendenza
node tools/banco/prova_body_lettura.js    # Body 110: «non caricato» non è «vuoto»: letture da dbq, «Non riesco a leggere» con Riprova, dati vecchi tenuti con la striscia, Home in attesa, cancellazione del check da dbq
node tools/banco/prova_body_direzione.js  # Body 070: «bene» e «male» secondo l'obiettivo (direzioneBuona) in Misure e Tendenza; obiettivo vita dal profilo, mai scritto nel codice
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
- **i filtri `.not(col,'in','(a,b)')` e `.not(col,'ilike','recovery%')`** come PostgREST (la lettura della card Training li usa, `prova_home_030.js`)
- **il filtro `.or('a.eq.x,b.eq."y"')`** come PostgREST: solo uguaglianze, i valori fra virgolette possono contenere virgole (`prova_tabella_unica.js`)
- **rete e scritture**: `tables.__rete = false` fa rispondere ogni chiamata come un fetch fallito (errore senza codice); `tables.__rifiuta = { tabella:{code, message} }` fa rispondere le scritture su quella tabella con quell'errore dell'API; gli `insert` conservano le righe in tabella e un id già presente risponde `23505`
- **gli intervalli della pagina** (`setInterval`) sono timer di Node senza presa sul processo (`unref`): una prova senza `process.exit` finisce quando ha finito, non dopo 3 minuti
- **la pagina parte da sola**, come sul telefono (il BOOTSTRAP non aspetta più, Fondamenta 100): senza sessione mostra l'accesso, con `tables.__sessione = { user:{ id, email } }` entra e carica; `opts.locale = { zt_cache: {…} }` riempie localStorage prima che parta. Una prova che avvia a mano (`loadAndStart`) e poi guarda le schermate fa prima `await avviato` (lo restituisce `boot`), altrimenti la partenza automatica le arriva sopra
- lo stato dell'app si prende con `win.eval('ST')` (le `const` di un classic script non stanno su `window`, le `function` sì)
- un giorno di Training diventa loggabile con `ST.trainAnticipato = 'upperA'`, senza toccare rotazione e debito
- una funzione globale si può sostituire per la durata della prova: `win.getCycleWeekInfo = () => ({ isScarico:true, … })`
