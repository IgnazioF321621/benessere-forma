# Lezioni apprese — Zona Tracker

Archivio dei casi reali. **Qui c'è il racconto di come ci si è arrivati; la regola che ne è nata vive in `CLAUDE.md`.** Si legge quando serve capire *perché* una regola esiste, o quando un sintomo somiglia a qualcosa di già visto.

Indice: L1 script sul logging · L2 alias verso il nulla · L3 riga arenata · L4 il sync riporta indietro · L5 TSV senza intestazione · L6 codici allocati in anticipo · L7 doppioni non identici · L8 catena integra ≠ catena giusta · L9 aggancio per nome · L10 il ripiego silenzioso · L11 sweep e 429 · L12 due liste che non coincidono · L13 paginazione PostgREST · L14 BOM e CRLF · L15 NFD e path · L16 pool core: ammessi ≠ pescabili · L17 baseline che si sposta · L18 indice di rotazione · L19 isometrico per funzione · L20 la domanda giusta sui liberi · L21 strumenti che raccolgono lavoro manuale · L22 supabase-js non lancia · L23 il codice non è una chiave · L24 l'impronta si legge senza scaricare · L25 la verifica circolare

---

## L1 — Uno script che toglie i log si porta via la logica sulla stessa riga

**Il caso.** Il commit `8f46576` (12 giugno 2026) rimuoveva i `console.log` con uno script automatico. I tre guard di `_trainGenFilterPool` erano scritti come one-liner:

```js
if (!X) { if (debug) console.log(…); return; }
```

Lo script ha portato via l'intera riga, `return` compreso. Filtri luogo/attrezzo/livello **morti per 7 settimane**, scoperti il 2 agosto, ripristinati in `7a60a97`.

**Altri danni dello stesso commit**, emersi uno alla volta nelle settimane successive:
- persa `compoundMissing.push(pat)` → riparata in `d40faaf`
- `?schedaDebug=1` rimasto scollegato
- quattro blocchi vuoti residui
- il `rollRes` del postino Nutrition mai più letto

**Il punto.** Il pericolo non è il logging: è la logica inglobata nella stessa riga del logging. Un `return` dentro un one-liner è invisibile a una regex.

**Regola nata:** i `console.log` si rimuovono solo a mano, mai con script automatici (in `CLAUDE.md`, Pattern tecnici).

---

## L2 — Un alias può puntare a una parola che non esiste

**Il caso.** `GEAR_ALIASES` traduceva `barra_corta`/`barra_lunga → barra` e `cavigliere → cavigliera`. Entrambe le destinazioni avevano **0 occorrenze** nel catalogo, né come attrezzo nativo né dentro un `surrogato_attrezzo`. L'utente li dichiarava in onboarding e non aprivano un solo esercizio, in silenzio.

**Come si è chiuso a metà.** Dal 5 agosto `barra` esiste davvero (EX642, EX646, EX648), quindi il token apre esercizi veri. Resta inerte il solo `cavigliere → cavigliera`.

**Lo stesso difetto altrove:** `APERTO_WHITELIST` ha `banda` e `cavigliere` a 0 occorrenze, mentre `corda` (9 esercizi) non è in whitelist.

**Il punto.** Il rimedio non è l'alias, è il **catalogo**: un token vive quando qualche riga lo usa. Constatare non è rimediare — dal 2 agosto `_trainGenFilterPool` segnala i token senza riscontro (`console.warn` + `attrezziInerti` → `scheda._diagGear` → colonna `attrezzi_inerti` in `ztSchedaWhy`), ma segnalare non colma il vuoto.

**Regola nata:** prima di aggiungere un alias, verificare che il termine di destinazione esista davvero nel catalogo.

---

## L3 — Una riga tolta dal foglio non sparisce: si arena

**Il caso.** 6 agosto, i quattro consolidamenti (EX110/EX228/EX229/EX323). Le righe erano state cancellate dal Google Sheet, ma su Supabase c'erano ancora. Scambiato **per due volte** per un sync fallito, con tentativi di rimetterci mano nel foglio — dove però la riga non c'era più.

**Cosa succede davvero.** Il sync fa upsert, non elimina. Una riga tolta dal foglio smette semplicemente di essere riscritta: resta su Supabase con il suo vecchio `updated_at` mentre tutte le altre avanzano.

**Come accorgersene.** Confrontare l'`updated_at` della riga con quello dell'ultimo lotto: se è più vecchio, la riga è fuori dal foglio.

**L'unica eccezione al divieto di editare Supabase.** In questo caso — e solo in questo — cancellare direttamente da Supabase è sicuro e definitivo, perché nessun sync futuro può riportare indietro la riga.

---

## L4 — Il sync riporta indietro ciò che il foglio non ha

**Il caso.** 2 agosto, Cardio. EX049/EX053/EX114 erano stati rinominati e agganciati in un passo precedente. Il sync delle 28 righe nuove li ha riportati ai nomi vecchi, con `gif_slug` svuotato e il `livello` di EX114 perso. Stesso lotto, `updated_at` a 4 ms di distanza.

**Effetto sull'app:** due esercizi `missing` e uno che serviva la GIF sbagliata da ExerciseDB.

**Perché.** L'upsert riscrive **ogni** riga presente nel foglio. Se il foglio usato per il sync successivo porta ancora i valori vecchi, una modifica sincronizzata prima viene annullata.

**Regola nata:** dopo ogni sync verificare anche i codici toccati nei passi precedenti, non solo quelli nuovi.

---

## L5 — Un TSV senza intestazione non è verificabile da nessuno

**Il caso.** 6 agosto: la riga di EX015 è stata incollata **sfasata** nel foglio. Il difetto non era visibile nel file, e ci sono voluti **tre giri di sync** per accorgersene. La causa a monte: l'ordine delle colonne del foglio non coincideva più con quello dei TSV generati.

**Il punto.** Un TSV di 22 colonne senza titoli è indistinguibile da uno sfasato di una colonna. Con l'intestazione, l'allineamento si controlla a occhio in due secondi.

**Regole nate:**
- I TSV da incollare si consegnano **con la riga di intestazione**, dicendo di incollare dalla seconda riga in giù.
- Per una **riga singola** la forma più sicura non è il TSV ma l'elenco verticale `colonna → valore`: è indipendente dall'ordine delle colonne, quindi immune al problema.
- Prima di generare TSV posizionali, farsi dare la riga di intestazione del foglio e verificarne l'ordine.

---

## L6 — Codici allocati in anticipo si scontrano

**Il caso.** I codici EX609/EX611/EX613/EX614 erano stati allocati prima del sync di Cardio del 2 agosto, che nel frattempo li aveva presi. Quattro esercizi rinumerati da EX615 in su.

**Regola nata:** allocare i codici al momento della scrittura, mai in anticipo.

---

## L7 — L'impronta trova i doppioni identici, non tutti i doppioni

**Il caso.** EX229/EX291 avevano SHA-256 diversi ed erano lo **stesso disegno** ricodificato: 12 frame identici, differenza solo di temporizzazione. EX617 idem, con in più un riscalamento di 1-3 px che gonfiava la differenza pixel a ~55.000 su 1,17 milioni.

**Il criterio che li ha stanati:** confronto **frame per frame dopo allineamento**. Se il miglior offset cambia da frame a frame si tratta di riscalamento, non di due esecuzioni diverse.

**Il punto.** L'aggancio per impronta resta valido per collegare file a codice; per stanare i doppioni non basta.

---

## L8 — Che la catena sia integra non significa che punti dove è stato deciso

**Il caso.** Dopo la riparazione del 5 agosto, EX015 risolveva perfettamente — **sulla GIF che il piano voleva eliminare**.

**Il punto.** Un conto «534/534 risolvono» misura l'integrità tecnica della catena, non la corrispondenza alle decisioni prese. Non sostituisce il controllo di `da_consolidare.tsv`.

---

## L9 — Aggancio per impronta, mai per nome

**Il caso.** In un cantiere in cui i nomi sono proprio ciò che cambia, l'aggancio per nome classifica come *libere* righe che sono vive: **6 righe su 69** in Addominali e Core, **58 su 75** in Bicipiti e Braccia.

**Perché.** Nel bucket i nomi sono già normalizzati da cantieri precedenti, mentre sul Mac sono ancora quelli originali: lo stesso contenuto ha due nomi diversi sui due lati.

**Dove vive ora la regola.** Non solo nel metodo: `prepara.py` aggancia file → riga → codice per SHA-256 tramite `impronte.py`. Il basename di `storage_path` non entra più nella classificazione.

---

## L10 — Il ripiego silenzioso su "libero" è ciò che ha causato il difetto

**Il caso.** Se un oggetto del bucket non era scaricabile, i file senza riscontro venivano classificati `libero` — ma potevano essere proprio quello.

**Il rimedio.** Esiste lo stato **`indeterminato`**: se anche un solo oggetto del bucket non è scaricabile, i file senza riscontro **non** diventano `libero`. Nel dubbio la GIF vale come viva: `conferma.py` e `conferma.html` la trattano come tale e non le applicano mai lo slug.

---

## L11 — Lo sweep completo va lanciato con concorrenza bassa

A 6 thread Storage risponde `429 Too Many Requests` su una manciata di codici. Con 3 il problema non si presenta.

Lo strumento marca i codici non scaricati come **non verificabili**, non come a posto: un oggetto che non si scarica non diventa mai «a posto» per silenzio. Ma il rumore va evitato alla fonte.

---

## L12 — Il TSV del pannello e il piano di `migra.py` non coprono le stesse righe

**Il caso.** Su Addominali e Core sei righe non finirono in `slug_da_migrare.tsv` e furono recuperate da `migra.py`.

**Perché.** `migra.py` costruisce il piano per impronta; `slug_da_migrare.tsv` scritto da `conferma.py` include solo le righe `collegato`/`pendente`. È una rete, non un progetto, e non regge volumi grandi.

**Chiuso il 7 agosto.** `cantiere_96_pendente.tsv` era indicizzato **per nome file sul Mac**: dopo una rinomina le chiavi non corrispondevano più e lo stato `pendente` decadeva. Non era un rischio teorico — alla conversione **44 righe su 96 (il 46%) avevano già perso lo stato**.

Il registro è ora indicizzato per SHA-256 (`chiave_pendente.py`), `prepara.py` cerca per impronta, e `riconcilia.py` verifica prima di ogni migrazione che diario e piano coincidano. **Il piano di `pianifica.py` è l'unica fonte di cosa si migra**; il diario resta la prova che la conferma è stata salvata nell'istante in cui è stata data.

Al primo giro riconciliato, `riconcilia.py` ha subito trovato una riga che il piano di Cardio aveva e il diario no (`Salti laterali rapidi`): lo stesso difetto, colto prima che facesse danno invece che dopo.

**Scoperta collaterale, più grave del difetto stesso** → vedi [L23](#l23--il-codice-scritto-a-mano-in-un-registro-non-è-una-chiave).

---

## L13 — PostgREST tronca le SELECT al limite default

Su tabelle sopra le 1.000 righe (es. `biblioteca_gif`, che le supera) senza paginazione compaiono **orfani fantasma** nelle verifiche: righe che sembrano mancare e invece sono solo oltre il taglio.

**Regola nata:** paginare sempre.

---

## L14 — I TSV da Google Sheet arrivano UTF-8 con BOM e CRLF

`csv.DictReader` senza `encoding='utf-8-sig'` produce silenziosamente **0 righe valide**: la prima chiave diventa `﻿slug` (con il BOM attaccato) e nessun confronto va a segno.

**Regola nata:** controllare sempre il conteggio delle righe parsate.

---

## L15 — I nomi file macOS sono in forma decomposta

Sul Mac la `à` non è un carattere solo: è `a` + U+0300 (NFD). Storage rifiuta le chiavi NFD con `400 InvalidKey`.

**Come si sbaglia:** tagliare byte per byte, che su NFD lascia la lettera base seguita dal segno diacritico orfano.

**Come si fa:** normalizzare a NFC (`unicodedata.normalize('NFC', s)`), **poi** traslitterare.

**Un solo traslitteratore.** `nomenclatura.senza_accenti()` è usato sia da `slug()` sia da `percorso_ascii()`. `pianifica.py` scriveva il percorso col nome confermato tal quale, quindi un nome accentato avrebbe portato l'accento dentro `storage_path` — emerso su Cardio e Conditioning (`agilità`), corretto alla fonte prima di eseguire.

**Attenzione residua:** `senza_accenti` toglie i diacritici, non un `ø` o un `°`. Il piano conta i percorsi non-ASCII residui (`percorsi_non_ascii`) e li stampa.

---

## L16 — Il pool core si conta come *pescabili*, non come righe ammesse

**Il caso.** Gli slot core pescano per **funzione** (`gruppo_target`). Una riga `pattern = core` con `gruppo_target` vuoto passa tutti i filtri, occupa un posto nel pool e **non può essere scelta da nessuno slot**. I due numeri divergono finché esiste una riga così.

**Come si è chiuso.** Dal 6 agosto i due numeri coincidono: EX110 `Superman`, l'ultima riga senza funzione, è stata eliminata come doppione di EX448. Le altre quattro erano state colmate il 5 agosto: EX102 e EX108 → `core rotazione`, EX106 → `core anti-estensione`, EX111 → `core rotazione`.

**Il segnale:** se i due numeri tornano a divergere, c'è una riga nuova da classificare.

---

## L17 — La baseline si sposta anche quando cambia il catalogo, non solo il codice

**I casi.** Le 28 righe di Cardio (2 agosto) hanno portato finisher 103→115 e riscaldamento 17→28 senza che nessuno toccasse i filtri. Le 36 righe di Gambe e Glutei (5 agosto) hanno portato principali 283→316, finisher 115→128, riscaldamento 28→38. Il Tabata è rimasto 25 in entrambi i casi.

**Regola nata:** rimisurare la baseline dopo ogni sync del Sheet, non solo dopo le modifiche al codice.

---

## L18 — L'indice di rotazione deve essere assoluto, non l'occorrenza dentro il tipo

**Il caso.** `occurrenceIdx` vale `0` sia per Upper A sia per Lower A: due sessioni di categoria diversa che attingono alla **stessa lista** con lo **stesso indice** convergono sullo stesso esercizio.

**Dove ha morso:**
- slot core → corretto in `f16e035`, ora `sessionIdx + rigenIdx`, con `+0` e `+1` per i due slot
- Tabata → in più non riceveva affatto `rigenIdx`; corretto in `054a495` con `sessionIdx + rigenIdx × numero di sessioni`

**Perché il fattore moltiplicativo.** Fa avanzare la finestra di un blocco intero, così una scheda non ripropone ciò che aveva la precedente. A passo 1, la Upper A della scheda N riceverebbe quello che aveva la Lower A della N−1.

**Perché i compound non manifestano il difetto.** Hanno la stessa forma di indice, ma Upper e Lower chiedono pattern diversi, quindi pescano da liste disgiunte. **Il discrimine non è l'offset, è se le liste sono disgiunte.** Il carry conclusivo è il riferimento corretto: distribuisce su `sessionIdx` e non collide mai.

**Effetto noto e accettato:** con indice lineare gli esercizi scorrono lungo lo split a ogni rigenerazione invece di ripescare in modo imprevedibile. Spezzare la regolarità richiede un offset non lineare — decisione aperta.

---

## L19 — `_trainGenIsIsometric` deve discriminare sulla funzione, non sul pattern

**Il caso.** Prima classificava isometrico ogni `pattern = core` non intercettato da regex sui nomi. Con le funzioni nuove **tutti e 43 i dinamici** sarebbero usciti prescritti in secondi — un crunch «30-45 sec».

**Il rimedio.** La natura la dichiara il `gruppo_target`, controllato **prima** delle euristiche sul nome. Serve davvero: «Plank laterale crunch obliquo» è `core rotazione` ma cade sulla regex `/plank/`.

**Nota sul vocabolario.** Le funzioni non hanno un piano frontale. `EX111 Side bend` è flessione laterale pura — il suo stesso campo `errori` mette «rotazione del busto» fra gli sbagli — ed è stato messo in `core rotazione` come casella dei dinamici sugli obliqui. Adattamento consapevole: la prescrizione che ne esce (ripetizioni, non secondi) resta corretta.

---

## L20 — La domanda giusta non è sempre «diventa un esercizio?»

**Il caso.** Delle 36 GIF libere di Gambe e Glutei, **un terzo corrispondeva a codici già a catalogo ma senza `gif_slug`**. Non erano candidate del cantiere 16 (liberi da promuovere), erano buchi del cantiere 2 (codici senza GIF).

**Il costo è completamente diverso:** una cella da riempire invece di una riga nuova a 22 colonne.

**Regola nata:** prima di aprire una lista di liberi, incrociare i nomi col catalogo e separare i due mucchi.

---

## L21 — Uno strumento che raccoglie lavoro manuale salva nell'istante della scelta

Ogni conferma si salva su disco **nell'istante in cui viene data**, con `fsync`, senza dipendere da un bottone di applicazione o dalla chiusura di un blocco. Registrare la scelta e agire sui file sono operazioni separate.

**Come si collauda:** chiudendo la scheda e riavviando il processo **prima** di consegnarlo. Se il lavoro non si ritrova, lo strumento non è pronto.

---

## L22 — supabase-js non lancia eccezioni sugli errori API

Restituisce `{error}` nel result: i `try/catch` non li vedono. Un'operazione fallita passa per riuscita.

**Casi noti a cui questo ha dato origine:**
- il rollback di `weekly_plans` nel postino Nutrition: `rollRes` è assegnato e mai letto (residuo di L1). Un rollback fallito non viene rilevato da nessuno.
- l'audit del 7 agosto ha misurato **45 chiamate `await supa.` su 116 senza alcun controllo dell'errore**.

**Regola nata:** controllare SEMPRE `res.error`.

---

## L23 — Il codice scritto a mano in un registro non è una chiave

**Il caso.** 7 agosto, convertendo `cantiere_96_pendente.tsv` alla chiave SHA-256, è emerso che la colonna `codice` **non descriveva le righe accanto a cui era scritta**. Su 96 righe: 44 concordavano col catalogo, **22 puntavano a un codice diverso da quello vero**, le altre non erano verificabili.

Lo sfasamento è sistematico e leggibile a occhio nudo — un blocco intero spostato di una posizione:

| il registro dice | ma quel nome è in realtà |
|---|---|
| EX591 = `Boxe footwork` | EX590 |
| EX592 = `Boxe gancio` | EX591 |
| EX593 = `Boxe jab` | EX592 |
| EX595 = `Burpee` | EX593 |
| EX597 = `Corsa all'indietro` | EX598 |
| EX602 = `Corsa falcata lunga` | EX599 |

**Perché è successo.** È la stessa radice di [L5](#l5--un-tsv-senza-intestazione-non-è-verificabile-da-nessuno): un blocco di righe incollato disallineato di una posizione. Nessuno se ne è accorto perché il nome, da solo, era giusto — a essere sbagliato era solo l'accostamento fra nome e codice, che nessun controllo confrontava.

**Perché non ha ancora fatto danno.** `prepara.py` controlla prima i codici veri (ricavati per impronta) e solo dopo il registro: `collegato` vince su `pendente`. La priorità del codice sul registro ha coperto il difetto per settimane.

**Come si è chiuso.** Il codice non si legge più dal registro: si **ricava dall'impronta**, con la catena file → `biblioteca_gif` → `esercizi_catalog`. Il valore scritto a mano resta nel TSV in una colonna sua (`codice_registro`) accanto a quello ricavato (`codice_reale`) e a una colonna che dice se concordano: si conserva il dato invece di buttarlo, e la divergenza resta visibile.

**Il punto generale.** In questo cantiere l'unica chiave che regge è l'impronta del contenuto. Il nome cambia perché rinominare è il lavoro; il codice scritto a mano può essere sbagliato dal momento in cui è stato scritto. Tutto ciò che si scrive a mano in un registro è un'annotazione, non una chiave.

**Corollario emerso lo stesso giorno**: nel registro vivevano ancora **EX676-EX682, sei codici allocati in anticipo e mai scritti a catalogo** — mentre EX676 risulta il prossimo libero. Erano pronti a scontrarsi esattamente come in [L6](#l6--codici-allocati-in-anticipo-si-scontrano).

---

## L24 — L'impronta di un oggetto si legge senza scaricarlo

**Il caso.** Il 7 agosto il piano Supabase Free è andato al **171% di Cached Egress** (8,55 GB su 5). La ricognizione ha trovato che il colpevole non era l'app — l'uso normale di Ignazio e dei tester spiega meno di 1,5 GB — ma gli strumenti del cantiere, che per rispondere a una sola domanda («questo oggetto ha l'impronta che ho deciso?») **scaricavano l'oggetto intero**. A ~1 MB a GIF: 797 download solo per il calcolo delle impronte, ~660 MB per ogni sweep dei 602 codici vivi.

**Cosa non si era visto.** Supabase espone l'`eTag` di ogni oggetto già nell'elenco del bucket e nelle intestazioni di una richiesta `HEAD`. E **l'`eTag` è l'MD5 del contenuto**. Misurato su tutti e 647 gli oggetti: 640 combaciano con l'MD5 di un file già presente sul Mac, dimensione compresa. Con le copie in `lavoro/_bucket` e la cache storica, la copertura è **647 su 647**.

Quindi la catena che serve esisteva già, e non passa dalla rete:

```
elenco del bucket (pochi kB)  →  eTag = MD5  →  file gemello sul Mac  →  il suo SHA-256
```

**Il difetto dentro il difetto.** La cache delle impronte esisteva, ma era **indicizzata sul percorso**. Il cantiere rinomina i file: ogni rinomina rendeva la voce irriconoscibile e faceva ripartire il download. Misurato: 797 voci in cache per 647 oggetti reali, cioè **150 file scaricati due volte per il solo fatto di essere stati rinominati** — la stessa radice di [L23](#l23--il-codice-scritto-a-mano-in-un-registro-non-è-una-chiave), una chiave che non è il contenuto.

**Cosa si è perso in rigore: niente.** Il collaudo ha confrontato l'impronta ricavata dall'`eTag` con quella ottenuta scaricando davvero, su tutti e 647 gli oggetti: **647 coincidono, 0 divergono**, e 644 dei confronti sono indipendenti (impronta dal Mac contro impronta storica scaricata). La controprova con un'impronta falsa viene respinta.

L'MD5 non regge contro chi costruisce apposta due file diversi con la stessa impronta. Qui i file sono i nostri, la dimensione fa da secondo riscontro, e dove serve la certezza SHA-256 piena resta la strada esplicita (`--sha`, `--scarica`) su un singolo oggetto, mai a tappeto.

**La regola che non cambia.** Un'impronta che non si riesce a determinare **non diventa "a posto" per silenzio**: `verifica_oggetto` risponde `ignoto`, che blocca esattamente come `diverso`. È [L10](#l10--il-ripiego-silenzioso-su-libero-è-ciò-che-ha-causato-il-difetto) applicata al nuovo meccanismo.

**Regole nate:**
1. **L'impronta si legge dall'`eTag`, il contenuto dal Mac.** Il download di un oggetto è l'eccezione, si chiede a voce e vale per un file solo.
2. **Ogni registro di impronte si indicizza sul contenuto**, mai sul percorso — vale per la cache come per i TSV.
3. **Ogni strumento che può scaricare stampa i byte scaricati a fine esecuzione, anche quando sono zero.** Prima nessuno strumento lo sapeva, ed è il motivo per cui la ricognizione dei consumi ha dovuto scrivere "stima" su una voce da 3 GB.

**Effetto misurato**: preparare una zona passa da ~200 MB a **0 byte**; verificare i 68 codici di Bicipiti e Braccia da ~38 MB a **0 byte**.

---

## L25 — Un'impronta dedotta dal codice non verifica quel codice

**Il caso.** 7 agosto, conversione di `cantiere_96_pendente.tsv` alla chiave SHA-256. Per le righe il cui file non si trovava più col nome scritto nel registro, lo strumento ricavava l'impronta così:

> codice del registro → `gif_slug` → `storage_path` → oggetto nel bucket → impronta

Poi usava quell'impronta per ricavare il codice «vero», e lo confrontava col codice del registro. Tornava sempre conferma. **Ovvio: era lo stesso codice, fatto girare in tondo.**

Un cerchio non verifica niente. E siccome il codice del registro è proprio il dato che [L23](#l23--il-codice-scritto-a-mano-in-un-registro-non-è-una-chiave) aveva appena dimostrato inaffidabile, il giro produceva impronte sbagliate con l'aria di essere confermate.

**Quanto è costato.** 20 righe su 96 risolte così. Su tutte e 20 il nome del registro non coincideva col nome del codice ottenuto; in **4** erano esercizi proprio diversi:

| il registro dice | il codice ottenuto è |
|---|---|
| EX598 `Corsa zigzag conetti` | `Corsa all'indietro` |
| EX609 `Pistol jump box` | `Salti laterali rapidi` |
| EX610 `Jumping rimbalzi` | `Salto con la corda` |
| EX613 `Salto monopodalico avanti` | `Skip sul posto` |

Nessun danno operativo: erano tutte già sincronizzate, e in `prepara.py` lo stato `collegato` vince comunque.

**La seconda occorrenza, lo stesso giorno.** Lo strumento che ritira le righe concluse (`ritira_concluse.py`) è nato col criterio «la riga è conclusa se il suo codice ha un `gif_slug`». Sembra ragionevole e non lo è: **23 righe su 89** lo superavano pur avendo il file ancora da migrare, perché quel codice ha sì la sua GIF — ma un'altra. Applicarlo avrebbe tolto la protezione a 23 file ancora da lavorare, **8 dei quali in Spalle e Cuffia**, la prossima zona da aprire. Fermato in prova a vuoto.

**La regola.** Una verifica deve partire da qualcosa che non dipende da ciò che si sta verificando. In questo cantiere l'unico dato indipendente è **il contenuto del file**: l'impronta si legge da un file che esiste, non si deduce da un codice.

Se il file non si trova, la risposta giusta è **non lo so** — riga senza impronta, marcata `da riverificare`. Una risposta assente si vede; una risposta falsa che si conferma da sola, no.

**Corollario, valido per ogni criterio di questo cantiere:** «il codice ha un `gif_slug`» dice qualcosa sul *codice*, mai sul *file* della riga accanto. Per sapere se il lavoro su un file è concluso si parte dalla sua impronta e si guarda se un codice vivo la serve — `impronta → oggetto → riga → codice`. È la stessa direzione di [L9](#l9--aggancio-per-impronta-mai-per-nome), applicata a una domanda diversa.
