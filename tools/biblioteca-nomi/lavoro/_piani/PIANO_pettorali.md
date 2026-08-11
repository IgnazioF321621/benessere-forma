# Piano di migrazione — zona Pettorali

**Piano approvato, esecuzione dal 15 agosto 2026.** Alla data di scrittura (11 agosto) nulla è stato eseguito: nessuna scrittura su bucket, `biblioteca_gif`, `esercizi_catalog`, Sheet o Mac.

Costruito replicando la logica di `pianifica.py` sugli 82 file del Mac. Aggancio sempre per **SHA-256**, mai per nome. Letture live e paginate: `biblioteca_gif` 1.570 righe, `esercizi_catalog` 667. **Zero byte scaricati dal bucket.**

Le tre decisioni prese in chat l'11 agosto sono recepite: le due `Piegamenti *ati panca` restano come sono, `panche piane` resta al plurale, il caricamento di `dip-parallele` va in coda.

⚠️ **Manca la coppia leggibile dalla macchina.** Le altre zone hanno `piano_<zona>.json` + `.tsv`, che è ciò che `migra_zona.py` consuma. Qui c'è solo questo documento. **Il 15 agosto si lancia `pianifica.py "Pettorali"` prima di eseguire**: rigenera i due file e rimisura sul vivo. Se i suoi conteggi divergono da quelli qui sotto, vince lui e il piano si rilegge — la baseline si sposta anche solo perché il catalogo è cambiato → [L17](../../../docs/LEZIONI.md#l17--la-baseline-si-sposta-anche-quando-cambia-il-catalogo-non-solo-il-codice).

---

## ⛔ Prima di tutto: la finestra di quota

CLAUDE.md dichiara il **cantiere biblioteca in pausa fino al 15 agosto 2026** — Cached Egress al 171%, il ciclo si azzera il 15.

**Deciso l'11 agosto: si parte dal 15, come da regola.** La migrazione consumerebbe pochissimo egress — copie server-side, caricamenti in ingresso, verifica via `HEAD` — ma la regola non si aggira per convenienza.

---

## Quadratura

| | n |
|---|---|
| file sul Mac in `Pettorali/` | 82 |
| oggetti solo nel bucket (senza file sul Mac) | **0** |
| **oggetti che il piano tratta** | **82** |
| oggetti oggi nel bucket | 60 |
| da caricare | 22 |

Nessun doppione di contenuto, nessun oggetto orfano, nessuna riga fuori dal piano. Le tre fonti chiudono senza residui.

**I nomi sul Mac sono già tutti allineati: 82 su 82.** Le rinomine locali sono state fatte nel giro di conferma (85 eventi `rinominato` in `log_rinomine.tsv`). Il Mac non va più toccato.

---

## Le sei popolazioni

| # | popolazione | n | operazione tecnica | righe doppie? |
|---|---|---|---|---|
| **A** | collegati · slug invariato | **35** | rinomina oggetto + `storage_path` | no |
| **B** | collegati · slug nuovo | **22** | **ordine a righe doppie** | **sì** |
| **C** | indicizzati liberi · slug invariato | **1** | **niente da fare** — già allineato | no |
| **D** | indicizzati liberi · slug nuovo | **2** | rinomina + slug **in place** | no |
| **E** | mai caricati, liberi | **21** | caricamento: oggetto nuovo + riga nuova | no |
| **F** | mai caricato, slug occupato | **1** | caricamento **in coda**, dopo la liberazione dello slug | no |
| | **totale** | **82** | | |

La discriminante fra A e B non è il codice, è **se lo slug cambia**: 35 collegati su 57 non lo cambiano e non aprono nessuna finestra. **Solo le 22 righe del gruppo B** richiedono le righe doppie e quindi la fermata.

**Rinomine reali nel bucket: 59** su 60 oggetti (35 A + 22 B + 2 D). L'unico già a posto è il gruppo C. Il motivo per cui sono così tante: i nomi nel bucket portano ancora la coda inglese fra parentesi (`Dip parallele (Chest dip parallel bars).gif`), che i nomi confermati non hanno.

---

## Ordine delle operazioni

### Fase 0 — Backup (obbligatoria, prima di ogni scrittura)

1. elenco oggetti del bucket di `Pettorali/` **con impronte** → `lavoro/_backup/bucket_pettorali_<ts>.tsv`
2. le 60 righe `biblioteca_gif` con `storage_path` nella zona → `lavoro/_backup/bib_pettorali_<ts>.tsv`
3. righe `esercizi_catalog` dei 57 codici coinvolti (`codice`, `nome`, `gif_slug`) → `lavoro/_backup/catalogo_pettorali_<ts>.tsv`

Senza i tre file, non si parte.

### Fase 1 — Righe doppie, parte alta (gruppo B, 22 righe)

Per ciascuna: **prima** si aggiunge in `biblioteca_gif` una riga con lo **slug nuovo** e lo **stesso `storage_path` attuale**. Da questo istante slug vecchio e nuovo risolvono entrambi, e non esiste un istante in cui la GIF è irraggiungibile.

### Fase 2 — Bucket (gruppi A, B, D — 59 oggetti)

Per ognuno: **copia server-side → verifica hash → aggiorna `storage_path` → cancella il vecchio.** Mai invertire l'ordine.

Il gruppo C non entra: `Lancio al petto palla medica al muro` ha già il percorso di destinazione.

### Fase 3 — Slug in place (gruppo D, 2 righe)

Nessun codice punta a queste due righe: lo slug si aggiorna sulla riga esistente, niente riga doppia, niente sync. È l'eccezione «zona senza codici» applicata alla singola riga.

| slug attuale | slug nuovo |
|---|---|
| `adduzione-spalla-elastico-un-braccio-in-piedi` | `adduzione-braccio-elastico-in-piedi` |
| `chest-press-elastico-maniglie-in-piedi` | `chest-press-elastico-inclinato` |

### Fase 4 — Caricamenti liberi (gruppo E, 21 righe)

Upload dell'oggetto nuovo + riga nuova. Nessuno di questi 21 slug è occupato: verificato contro tutte e 1.570 le righe. **Volume: 56,5 MB** in ingresso per E+F.

⚠️ `Piegamenti indù` è l'unico nome con accento: resta `Piegamenti indù` nel `nome_italiano` e sul Mac, diventa `Pettorali/Piegamenti indu.gif` nel bucket e `piegamenti-indu` nello slug. Traslitterato da `percorso_ascii()`, non a mano.

### ⛔ Fase 5 — FERMATA: sync del Google Sheet

**Qui il piano si ferma e passa a te.** I **22 codici del gruppo B** vanno aggiornati sul foglio con il `gif_slug` nuovo, poi si esegue il sync.

⚠️ Il sync riscrive **ogni** riga presente nel foglio: dopo, verificare anche i codici toccati nei passi precedenti, non solo questi 22 → [L4](docs/LEZIONI.md#l4--il-sync-riporta-indietro-ciò-che-il-foglio-non-ha).
⚠️ Subito dopo il sync: `verifica_sync.py`, prima di ogni altra cosa.

Fino a qui la vecchia catena regge: entrambi gli slug risolvono.

### Fase 6 — Verifica via Worker, prima di ogni cancellazione

```bash
python3 tools/biblioteca-nomi/verifica_worker.py "Pettorali"
```

Per **tutti e 57** i codici della zona, non solo i 22. Tre condizioni perché un codice conti come risolto:

1. `status = cached` **e** `source = biblioteca` — non il fallback ExerciseDB;
2. l'oggetto all'URL restituito esiste davvero;
3. la sua **impronta è quella attesa per quel codice**.

**Il 200 non basta**, e nemmeno la coerenza del DB con se stesso: il DB può tornare e l'app vedere altro → [L8](docs/LEZIONI.md#l8--che-la-catena-sia-integra-non-significa-che-punti-dove-è-stato-deciso). La verifica usa `HEAD`, quindi non consuma egress; un esito `IGNOTO` si scioglie sul singolo codice con `--sha EX###`, che scarica quel file e basta.

Un codice che non risolve → **non si cancella niente**, si torna indietro.

### Fase 7 — Cancellazione delle righe vecchie (22)

Solo dopo la fase 6, **una per una**, e solo se **nessun codice punta più** a quello slug. Un solo codice residuo su uno slug → quella riga non si tocca.

### Fase 8 — Il caricamento in coda: `dip-parallele` (gruppo F)

**Ultima operazione della migrazione**, e non è un dettaglio d'ordine: è un vincolo.

Il file `Dip parallele (Parallel bars dip).gif` (`f1a212b4872d`, mai caricato) è stato confermato **`Dip parallele`** → slug `dip-parallele`. Quello slug oggi appartiene alla riga di **EX072**, che nel gruppo B lo sta lasciando per `dip-station`.

`slug` è **unico su tutte e 1.570 le righe** — zero duplicati misurati. Quindi la riga nuova non entra finché EX072 non ha lasciato lo slug, e EX072 non può lasciarlo prima del sync del foglio. L'ordine è obbligato:

| | quando |
|---|---|
| EX072 prende `dip-station` (riga nuova) | fase 1 |
| il foglio dice `dip-station` per EX072 | fase 5 |
| Worker conferma EX072 su `dip-station` | fase 6 |
| si cancella la riga `dip-parallele` di EX072 | fase 7 |
| **si carica `Dip parallele.gif` e si crea la sua riga** | **fase 8** |

**Sul bucket non c'è conflitto**: la destinazione di EX072 è `Pettorali/Dip station.gif`, quella del file nuovo è `Pettorali/Dip parallele.gif`. Percorsi diversi, nessuna sovrascrittura. Il vincolo è **solo** sull'unicità dello slug — ed è per questo che guardando i 22 caricamenti da soli non si vedeva.

---

## I 22 codici della fermata (gruppo B)

| # | codice | nome confermato | slug vecchio | slug nuovo |
|---|---|---|---|---|
| 1 | EX072 | Dip station | `dip-parallele` | `dip-station` |
| 2 | EX073 | Distensioni manubri sdraiato a terra | `distensioni-manubri-terra` | `distensioni-manubri-sdraiato-a-terra` |
| 3 | EX104 | Croci cavi medi traiettoria alta | `croci-cavi-alti-traiettoria-alta` | `croci-cavi-medi-traiettoria-alta` |
| 4 | EX207 | Croci cavi medi in piedi | `croci-cavi-in-piedi` | `croci-cavi-medi-in-piedi` |
| 5 | EX319 | Croci cavi medi presa prona | `croci-cavi-presa-prona` | `croci-cavi-medi-presa-prona` |
| 6 | EX350 | Croci cavi bassi panca declinata | `croci-cavi-panca-declinata` | `croci-cavi-bassi-panca-declinata` |
| 7 | EX351 | Croci cavi bassi panca inclinata | `croci-cavi-panca-inclinata` | `croci-cavi-bassi-panca-inclinata` |
| 8 | EX352 | Croci cavi bassi panca piana | `croci-cavi-panca-piana` | `croci-cavi-bassi-panca-piana` |
| 9 | EX355 | Croci cavi bassi un braccio panca declinata | `croci-cavi-un-braccio-panca-declinata` | `croci-cavi-bassi-un-braccio-panca-declinata` |
| 10 | EX357 | Dip station sovraccarico | `dip-parallele-sovraccarico` | `dip-station-sovraccarico` |
| 11 | EX365 | Distensioni cavi bassi panca piana | `distensioni-cavi-panca-piana` | `distensioni-cavi-bassi-panca-piana` |
| 12 | EX366 | Distensioni cavi panca verticale | `distensioni-cavi-seduto` | `distensioni-cavi-panca-verticale` |
| 13 | EX376 | Distensioni orizzontali macchina presa neutra seduto | `distensioni-verticali-macchina-presa-neutra-seduto` | `distensioni-orizzontali-macchina-presa-neutra-seduto` |
| 14 | EX377 | Piegamenti archer | `piegamenti-alternati-un-braccio-assistenza-braccio-teso` | `piegamenti-archer` |
| 15 | EX380 | Piegamenti deficit rialzo | `piegamenti-deficit` | `piegamenti-deficit-rialzo` |
| 16 | EX381 | Piegamenti facilitati ginocchia | `piegamenti-ginocchia` | `piegamenti-facilitati-ginocchia` |
| 17 | EX382 | Piegamenti inclinati box | `piegamenti-mani-elevate-box` | `piegamenti-inclinati-box` |
| 18 | EX383 | Piegamenti inclinati panca | `piegamenti-mani-elevate-panca` | `piegamenti-inclinati-panca` |
| 19 | EX385 | Piegamenti mani neutre step | `piegamenti-mani-step` | `piegamenti-mani-neutre-step` |
| 20 | EX386 | Piegamenti deficit dip station | `piegamenti-maniglie` | `piegamenti-deficit-dip-station` |
| 21 | EX388 | Piegamenti deficit un braccio palla medica | `piegamenti-una-mano-palla-medica` | `piegamenti-deficit-un-braccio-palla-medica` |
| 22 | EX577 | Piegamenti tocco incrociato | `piegamenti-tocco-incrociato-spalla` | `piegamenti-tocco-incrociato` |

Il grosso è coerente a blocchi: sei `croci-cavi-*` che guadagnano `bassi`/`medi` per dichiarare l'altezza del cavo, otto `piegamenti-*` riformulati, due `dip-*` che passano a `dip-station`.

## I 21 caricamenti liberi (gruppo E)

| # | nome confermato | slug |
|---|---|---|
| 1 | Croci TRX | `croci-trx` |
| 2 | Dip anelli | `dip-anelli` |
| 3 | Dip coreano parallele | `dip-coreano-parallele` |
| 4 | Dip parallele impossible | `dip-parallele-impossible` |
| 5 | Dip sedie | `dip-sedie` |
| 6 | Piegamenti TRX | `piegamenti-trx` |
| 7 | Piegamenti archer braccio rialzato | `piegamenti-archer-braccio-rialzato` |
| 8 | Piegamenti declinati fitball | `piegamenti-declinati-fitball` |
| 9 | Piegamenti deficit kettlebell | `piegamenti-deficit-kettlebell` |
| 10 | Piegamenti deficit slancio panche piane | `piegamenti-deficit-slancio-panche-piane` |
| 11 | Piegamenti fitball | `piegamenti-fitball` |
| 12 | Piegamenti gamba sollevata | `piegamenti-gamba-sollevata` |
| 13 | Piegamenti indù | `piegamenti-indu` |
| 14 | Piegamenti mani incrociate | `piegamenti-mani-incrociate` |
| 15 | Piegamenti planche | `piegamenti-planche` |
| 16 | Piegamenti pliometrici tocco petto | `piegamenti-pliometrici-tocco-petto` |
| 17 | Piegamenti sovraccarico disco | `piegamenti-sovraccarico-disco` |
| 18 | Piegamenti sui pugni | `piegamenti-sui-pugni` |
| 19 | Piegamenti sulle dita | `piegamenti-sulle-dita` |
| 20 | Piegamenti un braccio | `piegamenti-un-braccio` |
| 21 | Piegamenti un braccio palla medica | `piegamenti-un-braccio-palla-medica` |

Venti dei ventuno sono piegamenti o dip a corpo libero: è il blocco che mancava alla zona, ed è quello che più tocca il pool casa.

---

## Controlli già eseguiti

| controllo | esito |
|---|---|
| slug nuovi distinti fra loro | **nessuna collisione** |
| slug nuovi contro righe esistenti | **1** — `dip-parallele`, gestita dal gruppo F |
| collisioni di percorso fra righe del piano | **nessuna** |
| destinazioni oggi occupate da un altro oggetto | **0** |
| percorsi non ASCII | **0** |
| codici che resterebbero senza GIF | **0** |
| doppioni di contenuto nella zona | **0** |
| oggetti del bucket senza impronta determinabile | **0** su 60 |
| simbolo `°` nei nomi | **0** |
| apostrofi nei nomi | **0** |
| nomi sul Mac già allineati | **82 su 82** |

## Verifica finale per dichiarare la zona chiusa

1. tutti e 57 i codici risolvono via Worker, con impronta uguale a quella attesa;
2. `biblioteca_gif` non ha più righe di Pettorali con slug vecchi;
3. ogni oggetto del bucket della zona ha esattamente una riga che lo punta;
4. nessun file sul Mac senza oggetto corrispondente per impronta — atteso **82 oggetti**, da 60;
5. `stato.py` rilanciato: `biblioteca_gif` da 1.570 a **1.592** righe attese (+22 nuove del gruppo B, +22 caricamenti, −22 vecchie cancellate in fase 7);
6. baseline dei pool rimisurata dopo il sync → [L17](docs/LEZIONI.md#l17--la-baseline-si-sposta-anche-quando-cambia-il-catalogo-non-solo-il-codice).

⚠️ Il punto 5 è una **previsione, non una misura**: la verifico dopo, non prima.

---

## Le due decisioni chiuse l'11 agosto

1. **Quando si parte**: **dal 15 agosto**, come da regola sulla quota. Il piano resta valido così com'è.
2. **I 22 caricamenti restano GIF libere, senza codice.** Entrano in `biblioteca_gif` e basta. Il popolamento del catalogo è una **fase separata, dopo la migrazione** → [L20](../../../docs/LEZIONI.md#l20--la-domanda-giusta-non-è-sempre-diventa-un-esercizio). Quando si farà, i codici si allocano **al momento della scrittura**, mai in anticipo → [L6](../../../docs/LEZIONI.md#l6--codici-allocati-in-anticipo-si-scontrano).

Conseguenza sul punto 5 della verifica finale: dopo la migrazione la zona avrà **22 righe libere senza codice**, che è uno stato atteso e non un difetto. Confluiscono nel [cantiere 16](../../../docs/CANTIERI.md#16-liberi-indicizzati-senza-codice).

## Voci aperte da riprendere

- **Le 85 rinomine sul Mac non sono state verificate contro il disco.** `log_rinomine.tsv` dichiara 85 eventi `rinominato` e il file di lavoro dice che gli 82 nomi sono allineati, ma il confronto con ciò che sta davvero sul disco non è stato fatto: costa rileggere 109 MB e non era nel brief. Da fare prima della fase 2, che dal nome del file sul Mac non dipende — ma se un nome fosse fuori posto, si scoprirebbe qui.
- **Il termine `medi` in `Croci cavi medi in piedi`** (EX207, e con lui EX104 `traiettoria alta` ed EX319 `presa prona`) introduce una terza altezza del cavo accanto a `alti` e `bassi`. Nella nomenclatura v2 non è un termine dichiarato. Non blocca la migrazione — è un nome confermato guardando la GIF — ma è un valore nuovo entrato nel vocabolario senza passare da una decisione esplicita, come è successo per le panche.
