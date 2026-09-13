# Media system — Zona Tracker

*Flusso GIF, regole di migrazione, riduzione a 480px, riconciliazione a tre fonti. Si apre quando si lavora su una zona GIF.*

Staccato da [`CLAUDE.md`](../CLAUDE.md) il 13 settembre 2026, per alleggerire il file che viene letto a ogni sessione. **Il contenuto non è cambiato di una parola**: le regole vincolanti sono rimaste in `CLAUDE.md`, il dettaglio operativo sta qui.

---

### Flusso GIF (Worker)
- `?code=EX###` (priorità): cerca `gif_slug` su `esercizi_catalog` → lookup `biblioteca_gif WHERE slug=gif_slug` → URL costruito su **`storage_path` letto dalla riga**, non ricavato da slug o categoria
- Fallback se `gif_slug` NULL: vecchio `MATCH_BY_CODE` ExerciseDB (~39 esercizi storici)
- `?name=...` (legacy): match esatto su dizionario hardcoded ~20 nomi (`MATCH_DATA`), nessuna normalizzazione
- App: `fetchExerciseMedia(exName, exCode)` · `ensureRestGif(exName, exCode)` — cache key = `exCode || exName`

**661/661 `gif_slug` risolvono, 0 rotti** (31 agosto). 64 codici senza slug → fallback ExerciseDB.

⚠️ **La verifica per impronta dice che la catena è integra, non che punta dove è stato deciso** → [L8](LEZIONI.md#l8--che-la-catena-sia-integra-non-significa-che-punti-dove-è-stato-deciso)
⚠️ **Lo sweep completo va lanciato con concorrenza 3, non 6** (Storage risponde 429) → [L11](LEZIONI.md#l11--lo-sweep-completo-va-lanciato-con-concorrenza-bassa). Vale per gli sweep che scaricano davvero: dal 7 agosto la verifica normale usa `HEAD` e non ha più questo limite → [L24](LEZIONI.md#l24--limpronta-di-un-oggetto-si-legge-senza-scaricarlo)

### Regole di migrazione (bucket + `biblioteca_gif` + Sheet)

**Aggancio per impronta, mai per nome.** Un file si collega al suo codice confrontando lo **SHA-256** → [L9](LEZIONI.md#l9--aggancio-per-impronta-mai-per-nome). La regola vive nello strumento: `prepara.py` aggancia file → riga → codice per SHA-256 tramite `impronte.py`; il basename di `storage_path` non entra nella classificazione.

- `biblioteca_gif` si legge **live** con la chiave di servizio da `worker/.dev.vars` (mai stampata). L'export CSV è solo ripiego: invecchia a ogni migrazione.
- Stato **`indeterminato`**: se anche un solo oggetto del bucket non ha impronta determinabile, i file senza riscontro **non** diventano `libero`. Nel dubbio la GIF vale come viva → [L10](LEZIONI.md#l10--il-ripiego-silenzioso-su-libero-è-ciò-che-ha-causato-il-difetto)
- **Nessun nome entra nello strumento passando dalla chat.** Fonte unica dei nomi è il pannello di conferma, l'unico posto in cui il nome è stato scelto guardando la GIF.
- **Un solo traslitteratore**, `nomenclatura.senza_accenti()`, usato sia da `slug()` sia da `percorso_ascii()` → [L15](LEZIONI.md#l15--i-nomi-file-macos-sono-in-forma-decomposta)
- ⚠️ Il TSV del pannello e il piano di `migra.py` non coprono le stesse righe → [L12](LEZIONI.md#l12--il-tsv-del-pannello-e-il-piano-di-migrapy-non-coprono-le-stesse-righe)

**L'impronta si legge dall'`eTag`, il contenuto dal Mac — mai scaricando** *(dal 7 agosto 2026)* → [L24](LEZIONI.md#l24--limpronta-di-un-oggetto-si-legge-senza-scaricarlo)

L'`eTag` che Storage dichiara **è l'MD5 del contenuto**: dall'`eTag` si risale al file gemello sul Mac e quindi al suo SHA-256, senza far uscire un byte dal bucket. Copertura misurata: **686 oggetti su 686** *(rimisurata il 31 agosto, 0 byte scaricati)*. È ciò che ha portato il costo di una zona da ~200 MB a 0.

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
4. **confronta i valori vivi codice per codice contro la lista consegnata al foglio** — non contro l'esito degli strumenti → [L41](LEZIONI.md#l41--dopo-ogni-sync-confronto-codice-per-codice-contro-la-lista-consegnata-prima-di-qualunque-cancellazione). Se un codice **fuori** dalla lista ha preso un valore della lista, fermarsi: la cancellazione consoliderebbe lo sfasamento invece di lasciarlo riparabile
5. verifica tutti i codici, poi cancella le righe vecchie **una per una e solo se nessun codice le punta più**

Non deve esistere un istante in cui una GIF è irraggiungibile.

**Eccezione — zona senza codici**: se nessun `gif_slug` punta alla zona non esiste catena da proteggere, lo slug si aggiorna in place e non servono né righe doppie né sync. `migra_zona.py … slug` lo fa, ma **solo dopo aver verificato che i codici puntanti siano zero**; con anche un codice si ferma.

**La stessa eccezione vale per la singola riga, e la domanda va posta alla riga.** «La zona ha codici» e «questa riga ha codici» non sono la stessa domanda: su Pettorali 57 codici puntano alla zona e le 2 righe del gruppo D — GIF indicizzate che nessun esercizio usa — non ne hanno nessuno. La guardia di zona resta com'è ed è giusta per l'uso di zona; per una riga sola c'è `migra_zona.py "<zona>" slug-riga --solo="<slug, nome o percorso>"`, che **rilegge vivo** chi punta a quella riga, si ferma se qualcuno la punta indicando l'ordine a righe doppie, e lavora **una riga per volta di proposito**. `--prova` non scrive.

⚠️ **Il piano dice chi non aveva codici quando è stato scritto, non chi non ne ha adesso** → [L34](LEZIONI.md#l34--il-piano-su-disco-non-è-il-verbale-di-ciò-che-è-stato-fatto). La verifica si rifà viva a ogni chiamata.

**Rinominare i file nel bucket è cosmesi.** L'app risolve via `storage_path`: il nome del file non è ciò che rompe o aggiusta le immagini.

### Ogni GIF entra nel bucket ridotta e con la cache — regola permanente

**In vigore dal 15 agosto 2026.** Nessuna GIF entra nel bucket a piena risoluzione. La riduzione **fa parte della procedura di caricamento**, non è un intervento da fare dopo: fra due cantieri ci si ritroverebbe di nuovo con lo Storage pieno.

**Nessun file entra nel bucket con i byte di prima.** Due casi, un comando ciascuno:

```bash
# sopra i 480 px: si ridimensiona
tools/bin/gifsicle --resize-fit 480x480 --resize-method mix -O3 <src> -o <dst>
# già sotto i 480 px: si riscrive la sola codifica, i pixel non si toccano
tools/bin/gifsicle -O3 <src> -o <dst>
```

Tre proprietà, tutte obbligatorie:

| | valore | dove si controlla |
|---|---|---|
| lato lungo | **massimo 480 px** | `max(Image.open(p).size)` |
| byte | **diversi da quelli di prima** | `md5_nuovo != md5_bucket` |
| `cache-control` | `public, max-age=31536000, immutable` | `metadata.cacheControl` nell'elenco |

⚠️ **480 px è un tetto, non una misura: chi sta sotto non si ridimensiona.** Nel bucket 371 oggetti su 647 erano già a 360 px o meno; portarli a 480 li **ingrandirebbe**, più pesanti e più sfocati. Passano comunque per `-O3`, che cambia i byte senza toccare un pixel.

⚠️ **Il perché dei byte nuovi non è il peso, è l'ETag.** *(regola dal 15 agosto 2026)* Un file ricaricato identico lascia l'ETag invariato, e la CDN può restare bloccata sull'intestazione vecchia — ma solo se quell'oggetto era in cache in quel momento, cioè **a seconda della fortuna**. Una procedura che riesce o fallisce a seconda di questo non va bene: si toglie la condizione alla radice. `ripara_cache.py` resta come rete di sicurezza, non come metodo → [L30](LEZIONI.md#l30--la-cdn-convalida-per-etag-se-i-byte-non-cambiano-lintestazione-vecchia-resta)

**Le guardie, uguali nei due casi.** Durata totale invariata (tolleranza 2%), fotogrammi mai in aumento, e confronto **a tempi uguali** — mai a indici uguali, perché `-O3` fonde i fotogrammi consecutivi identici e gli indici non si corrispondono più. Lo scostamento si misura e si stampa:

- **riottimizzati `-O3`**: differenza massima su qualsiasi pixel **deve essere 0**. Se non lo è, lo strumento si ferma: `-O3` riscrive la codifica, non i colori.
- **ridimensionati**: media a tempi uguali, con la mediana e il massimo della zona in fondo. Sopra 3,0 vanno guardati; oltre 5,0 lo strumento si ferma. Misurato su 85 file di Gambe e Glutei: mediana 0,53, massimo 1,17.

⚠️ **`--colors` non si usa.** Deciso il 15 agosto: si ridimensiona e basta. Il solo 480 px toglie il 49% del peso del bucket; ridurre anche i colori ne toglierebbe un altro 6% o 22% in cambio di banding permanente, e il margine non serve — con la sola riduzione di dimensione la biblioteca completa sta a metà del piano Free. Su queste GIF `--colors 256` è per giunta **identico byte per byte** al solo ridimensionamento: hanno già 256 colori esatti → [L28](LEZIONI.md#l28--una-stima-sui-pixel-non-è-una-misura-sui-byte)

⚠️ **gifsicle, non Pillow.** Pillow rifà i fotogrammi da capo e perde la codifica differenziale: misurato, due file su sei uscivano **più pesanti dell'originale** (+89%). gifsicle non sta sul Mac di serie e non c'è Homebrew: si compila con `bash tools/biblioteca-nomi/installa_gifsicle.sh` in `tools/bin/`, fuori da git.

**Le tre fasi, in quest'ordine** — la seconda non parte se la prima non ha prodotto un piano, la terza legge il piano:

```bash
python3 tools/biblioteca-nomi/ricomprimi.py "<zona>"          # solo Mac, 0 byte
python3 tools/biblioteca-nomi/carica_480.py "<zona>" --prova  # controlla, non scrive
python3 tools/biblioteca-nomi/carica_480.py "<zona>"          # carica e verifica
python3 tools/biblioteca-nomi/verifica_480.py "<zona>"        # collauda e sgombera
python3 tools/biblioteca-nomi/ripara_cache.py "<zona>"        # solo se il collaudo si ferma
```

Il collaudo fa **due** verifiche, e la seconda non basta da sola: tutti gli oggetti del piano letti dall'elenco del bucket (impronta, dimensione, `cache-control`), **e** i codici chiesti al Worker come fa l'app. Solo la prima copre i "liberi", che nel bucket ci sono anche se nessun codice li punta.

**Le righe doppie qui non servono, e non è una scorciatoia.** Quell'ordine protegge la catena quando cambia uno **slug**: qui non cambiano né lo slug, né `storage_path`, né `biblioteca_gif`, né il Sheet — **il database non si tocca affatto**. Cambiano solo i byte all'indirizzo di sempre e un'intestazione. La garanzia che serve — mai un istante con la GIF irraggiungibile — la dà il caricamento stesso, che è una sostituzione e non una cancellazione seguita da una scrittura: se fallisce, quello che c'era resta dov'era.

**Il backup è la biblioteca sul Mac**, e il piano lo dimostra riga per riga: registra md5, sha256 e dimensione di ciò che sta nel bucket *ora* e il file locale da cui quei byte provengono. Prima di scrivere si ricontrolla che il bucket sia ancora in quello stato; se anche un solo oggetto è cambiato, ci si ferma senza scrivere. Un oggetto **senza gemello sul Mac non è ripristinabile e quindi non si tocca**: `ricomprimi.py` lo esclude dal piano da solo.

I file ridotti stanno in `Biblioteca di esercizi/_480/<Zona>/`, con **il nome che hanno nel bucket** — così il caricamento è una corrispondenza uno a uno. La cartella sta dentro la biblioteca, quindi è già fuori da git, e `impronte.py` fa `rglob` sulla radice: le impronte nuove entrano nell'indice da sole, senza toccare `RADICI_LOCALI`.

⚠️ **`_480/` è una cartella di transito, non un archivio.** A zona verificata i ricompressi si cancellano: gli originali restano sul Mac e `ricomprimi.py` li rigenera identici byte per byte (verificato, 4 su 4). Con il disco al 98% non ha senso tenerne due copie. Lo fa `verifica_480.py` da solo quando il collaudo passa; `--tieni` lo trattiene.

⚠️ **Prima di cancellare si registrano le impronte nella cache per contenuto, e non è un dettaglio.** Nel bucket ci sono byte ricompressi, e una volta sgomberata `_480/` **nessun file sul Mac ha più quell'impronta**: senza registrarla, ogni strumento vedrebbe quegli oggetti come "impronta ignota", che per [L10](LEZIONI.md#l10--il-ripiego-silenzioso-su-libero-è-ciò-che-ha-causato-il-difetto) blocca come "diverso". `verifica_480.py` la registra, cancella, e **ricontrolla dopo** che tutti gli oggetti risolvano ancora. Misurato su Polpacci: 7 dal Mac (quelli non toccati), 12 dalla cache, 0 ignoti.

**Il piano `lavoro/_480/<zona>.json` non si cancella mai**: è il registro che tiene insieme byte nuovi ed esercizio — `storage_path`, file di origine sul Mac, impronta prima e impronta dopo. È l'unico posto in cui quel legame resta scritto una volta sgomberata la cartella.

⚠️ **Un oggetto ricaricato identico può continuare a servire l'intestazione vecchia.** La CDN indicizza per URL e convalida per **ETag**: se i byte non cambiano l'ETag non cambia, e la voce vecchia resta anche forzando la rivalidazione. Colpisce solo i file già sotto i 480px (ricaricati identici) che erano in cache in quel momento — misurato: **2 su 219** nelle prime tre zone. Li sblocca `ripara_cache.py`, che li riscrive con `gifsicle -O3`: **non tocca un pixel** (verificato fotogramma per fotogramma, differenza 0) ma cambia i byte, quindi la CDN è costretta a sostituire la voce → [L30](LEZIONI.md#l30--la-cdn-convalida-per-etag-se-i-byte-non-cambiano-lintestazione-vecchia-resta)

⚠️ **Il `cache-control` non si verifica con una HEAD.** La HEAD autenticata risponde sempre `no-cache`, qualunque cosa sia memorizzata: un caricamento perfettamente riuscito sembra fallito. Si legge da `metadata.cacheControl` nell'elenco del bucket, o dall'URL pubblico → [L29](LEZIONI.md#l29--la-head-autenticata-dice-sempre-no-cache-qualunque-cosa-sia-memorizzata)

**Nel bucket non ci sono solo GIF.** Misurato sul contenuto, non sul nome: **645 GIF, 1 PNG, 3 JPEG** su 647, tutti e quattro i non-GIF in Addominali e Core e tutti puntati da un codice vivo. Due dei tre JPEG **si chiamano `.gif`** e sono registrati `image/gif`: funzionano perché il browser guarda i byte → [L32](LEZIONI.md#l32--lestensione-non-dice-il-formato). Gli strumenti devono reggerli, non morirci sopra:

- il formato si legge **dal contenuto** (`Image.open(p).format`), mai dall'estensione
- **PNG**: si riscrive con `optimize=True` — senza perdita per definizione, differenza 0 sui pixel
- **JPEG e altri formati con perdita**: non si riscrivono **mai** in automatico. Ogni riscrittura sposta i pixel e su un file già compresso il ridimensionamento lo fa pure crescere. Entrano identici, dichiarati nel piano
- il **mimetype si rilegge dall'oggetto e si rimanda uguale**, mai un valore fisso: un `image/gif` scritto nel codice riscriverebbe il tipo del PNG → [L33](LEZIONI.md#l33--il-mimetype-si-rilegge-dalloggetto-non-si-scrive-fisso)
- per un file che entra **identico** si carica **prima** e si controlla **dopo**: sondare la cache è ciò che ce lo mette → [L31](LEZIONI.md#l31--per-un-file-che-entra-identico-si-carica-prima-e-si-controlla-dopo)

**I nomi dei campi dicono di quale file parlano** *(dal 16 agosto 2026)*. Con la riduzione, lo stesso esercizio esiste come **due artefatti con due impronte diverse**: il file sul Mac e l'oggetto ridotto nel bucket. Un campo chiamato `sha256` non dice quale dei due, e in poche ore ha prodotto lo stesso difetto in tre punti → [L35](LEZIONI.md#l35--quando-lo-stesso-difetto-ricompare-tre-volte-si-corregge-il-nome-che-lo-permette). Tre suffissi, obbligatori in ogni piano e in ogni strumento:

| campo | descrive |
|---|---|
| `sha256_mac` | il file com'è sul Mac (piano di `pianifica.py`) |
| `md5_bucket_ora` · `byte_bucket_ora` · `cache_bucket_ora` | ciò che nel bucket c'è **adesso** |
| `md5_bucket_atteso` · `sha256_bucket_atteso` · `byte_bucket_atteso` | ciò che nel bucket ci **deve** essere dopo la scrittura |

⚠️ **Chi verifica un oggetto del bucket usa `_bucket_atteso`, mai `sha256_mac`**: sono byte diversi per definizione, ed è il punto della regola dei 480px. Il registro del pannello (`registro_decisioni.tsv`) tiene il suo `sha256` lato Mac e non è toccato.

**Le eccezioni si dichiarano nel piano**, in `eccezioni`: quale scostamento si tollera, su quale oggetto, perché e da quando. `verifica_480.py` le legge, tollera **solo** quello scostamento e controlla tutto il resto come sempre. Senza, una zona con una decisione presa a voce resterebbe bloccata per sempre.

**Per una zona non ancora migrata** — oggi Mobilità — non esiste un "dopo": le GIF entrano nel bucket **già ridotte e già con l'intestazione**, al momento della migrazione. Non si carica a piena risoluzione per ricomprimere in un secondo giro. Vale anche per i file già sotto i 480 px: entrano passati per `-O3`, mai con i byte del Mac.

**Procedura sicura per file Storage**: copia server-side → verifica hash → aggiorna indice → cancella vecchio. Mai invertire l'ordine.

**Strada A (due codici, stessa GIF)**: seconda riga in `biblioteca_gif` con stesso `storage_path`, slug derivato dal secondo nome. Nessun file duplicato in Storage. È la soluzione quando due codici **devono** restare distinti pur condividendo l'immagine; quando invece sono lo stesso esercizio la strada è il consolidamento (cantiere 4).

### Una cartella si chiude su tre lavori

**Regola di metodo vincolante, dall'11 agosto 2026.** Ogni cartella della biblioteca si chiude su **tre lavori, in quest'ordine**, prima di aprire la successiva:

1. **conferma dei nomi** — pannello locale, dieci alla volta, guardando la GIF
2. **migrazione delle immagini** — bucket + `biblioteca_gif` + Sheet
3. **popolamento del catalogo** — le GIF della zona che restano senza codice diventano righe di `esercizi_catalog`, o si decide esplicitamente che non lo diventino

**Nessuna cartella nuova con lavori arretrati su quella precedente.** Il terzo lavoro non è una coda opzionale: una zona con le immagini migrate e il catalogo non popolato è una zona **aperta**, non chiusa, e non autorizza ad aprirne un'altra.

Perché la regola esiste: i primi quattro giri hanno lasciato dietro di sé i 65 codici senza `gif_slug` del [cantiere 2](CANTIERI.md#2-cantiere-600-gif) e le 46 righe libere del [cantiere 16](CANTIERI.md#16-liberi-indicizzati-senza-codice). Sono arretrati nati dall'aver aperto la cartella dopo prima di aver chiuso quella prima.

**Ordine delle zone rimanenti** *(registrato l'11 agosto, aggiornato il 21 sera)*: ~~Polpacci~~ · ~~Pettorali~~ · ~~Spalle e Cuffia~~ · ~~Tricipiti~~ · ~~Schiena e Trapezio~~ **chiuse** → **Mobilità**, l'ultima.

L'arretrato di Pettorali è saldato: le 25 GIF senza codice sono diventate EX677-EX701, tutte con i 14 campi portanti compilati.

Non era più l'ordine per dimensione: **Spalle e Cuffia era stata anticipata** rispetto alle zone più grosse perché conteneva i gruppi più poveri del pool — deltoidi posteriori 1 candidato, anteriori 1, laterali 3. **La scommessa ha pagato a metà**: chiusa il 23 agosto, ha portato i laterali a 4 e gli anteriori a 2, ma non ha aggiunto un solo deltoide posteriore. Quel gruppo resta a 1 e va cercato altrove, verosimilmente in **Schiena e Trapezio**.

### Regole cantiere GIF (riconciliazione a tre fonti)

Per ogni zona confrontare: **(1)** file `.gif` sul Mac · **(2)** righe `biblioteca_gif` + bucket Storage · **(3)** righe `esercizi_catalog`. Output = tabella stati: `OK · MANCA_STORAGE · MANCA_CATALOGO · NOME_DIVERSO · ORFANO · GIF_ROTTA`. L'appaiamento è sempre per SHA-256, mai per nome.

**La regola che non si negozia**: nessun esercizio entra in catalogo o viene rinominato senza che Ignazio ne abbia visto la GIF. L'analisi tecnica prepara la decisione, non la sostituisce — anche quando la spiegazione tecnica torna perfettamente.

**Strumenti di controllo** (sola lettura, si lanciano dalla radice del repo):

| comando | quando | cosa dice |
|---|---|---|
| `python3 tools/biblioteca-nomi/stato.py` | dopo ogni sync e ogni migrazione | fotografa tutto in `STATO.md` + `STATO.json` |
| `python3 tools/biblioteca-nomi/verifica_sync.py` | **dopo ogni sync**, prima di ogni altra cosa | righe arenate, valori riportati indietro, catene rotte |
| `python3 tools/biblioteca-nomi/riconcilia.py "<zona>"` | prima di migrare una zona | dove il diario del pannello e il piano divergono |
| `python3 tools/biblioteca-nomi/collaudo_egress.py` | dopo ogni modifica a `impronte.py` | che l'impronta da `eTag` coincida con quella da download, oggetto per oggetto |

**I numeri di riferimento stanno in [`STATO.md`](STATO.md), non qui.** Quel file si rigenera con un comando; i numeri scritti a mano in un documento invecchiano in silenzio.

**Chiave unica SHA-256.** Tutti i registri del cantiere sono indicizzati per impronta, mai per nome file: il cantiere rinomina i file, e una chiave sul nome decade alla prima rinomina. Vale anche per `cantiere_96_pendente.tsv`, convertito il 7 agosto → [L12](LEZIONI.md#l12--il-tsv-del-pannello-e-il-piano-di-migrapy-non-coprono-le-stesse-righe), e per le cache delle impronte, convertite lo stesso giorno → [L24](LEZIONI.md#l24--limpronta-di-un-oggetto-si-legge-senza-scaricarlo)

**Il piano di `pianifica.py` è l'unica fonte di cosa si migra.** Il diario `slug_da_migrare.tsv` resta la prova che una conferma è stata salvata nell'istante in cui è stata data, ma non decide più cosa migrare: `riconcilia.py` verifica che i due coincidano prima di partire.

⚠️ **Il campo `codice` dei registri scritti a mano non è affidabile**: su `cantiere_96_pendente.tsv` 22 righe su 96 puntavano a un codice diverso da quello vero. Il codice si **ricava dall'impronta** (file → riga → codice), non si crede → [L5](LEZIONI.md#l5--un-tsv-senza-intestazione-non-è-verificabile-da-nessuno)

**Guardie tecniche** (sempre attive):
1. "1 codice per slug" — contare quanti codici puntano allo stesso `gif_slug` prima di rinomine massive
2. SHA-256 prima di ogni rinomina massiva. ⚠️ Stana i doppioni identici, non tutti: per gli altri serve il confronto frame per frame dopo allineamento → [L7](LEZIONI.md#l7--limpronta-trova-i-doppioni-identici-non-tutti-i-doppioni)
3. Script idempotenti con timeout esteso
4. Righe dei codici eliminati vanno cancellate a mano nel Sheet (il sync non elimina)
5. Prima di eliminare un codice: scansione regex `\bEX\d{3}\b` su tutti i campi testuali di tutte le righe (`alternativa` non ha FK)
6. **Allocare i codici al momento della scrittura, mai in anticipo** → [L6](LEZIONI.md#l6--codici-allocati-in-anticipo-si-scontrano). Vale anche **dentro i registri**: un `EX###` scritto in un TSV prima di esistere a catalogo non è una prenotazione, è una collisione che aspetta — nessuno tiene il posto, e quando il foglio assegna quel codice a qualcos'altro si scontrano. Le righe in attesa si tengono per **impronta e nome**, senza codice; `libera_prenotati.py` toglie quelli già scritti (6 liberati il 7 agosto: EX676-EX680, EX682)

**I TSV da incollare nel foglio vanno consegnati CON la riga di intestazione**, dicendo di incollare dalla seconda riga in giù. Per una **riga singola** la forma più sicura non è il TSV ma l'elenco verticale `colonna → valore`, immune allo sfasamento. Prima di generare TSV posizionali, farsi dare la riga di intestazione del foglio e verificarne l'ordine → [L5](LEZIONI.md#l5--un-tsv-senza-intestazione-non-è-verificabile-da-nessuno)

**Prima di aprire una lista di liberi**, incrociare i nomi col catalogo e separare i due mucchi: candidati nuovi contro codici già esistenti senza `gif_slug` → [L20](LEZIONI.md#l20--la-domanda-giusta-non-è-sempre-diventa-un-esercizio)

**Strumenti che raccolgono lavoro manuale**: ogni conferma si salva su disco **nell'istante in cui viene data**, con `fsync`. Si collauda chiudendo la scheda e riavviando il processo **prima** di consegnarlo → [L21](LEZIONI.md#l21--uno-strumento-che-raccoglie-lavoro-manuale-salva-nellistante-della-scelta)

### Mappe muscolari
19 esercizi storici: PNG locali in `assets/exercises/` (Wger CC BY-SA 4.0). EX031+: mancanti (cantiere futuro).

---

