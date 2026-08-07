# Cantieri — Zona Tracker

Lista dei lavori aperti e archivio di quelli chiusi. **Le regole tecniche vivono in `CLAUDE.md`; le lezioni apprese in `docs/LEZIONI.md`.** Qui c'è cosa resta da fare e cosa è già stato fatto.

*Aggiornato: 7 agosto 2026.*

Indice: [Cantieri aperti](#cantieri-aperti) · [Zone GIF chiuse](#zone-gif-chiuse) · [Consolidamenti](#consolidamenti) · [Materiale parcheggiato](#materiale-parcheggiato) · [Storico baseline pool](#storico-baseline-pool)

---

# Cantieri aperti

## 1. Test timer su workout reali
Commit `e834320` (timer unificati timestamp-based) in osservazione. **PRIMA di qualunque altro cantiere Training.**

## 2. Cantiere 600 GIF
65 codici senza `gif_slug`, da colmare zona per zona. La vista di conferma visiva è fatta (`tools/biblioteca-nomi/`) e viene riusata: il cantiere procede in coda a quello dei nomi, cartella per cartella.

Vedi anche [L20](LEZIONI.md#l20--la-domanda-giusta-non-è-sempre-diventa-un-esercizio): un terzo dei "liberi" sono in realtà buchi di questo cantiere, non candidati nuovi.

## 3. Pulizia Storage
- **C**: 28 file L2 residui nelle zone curate (indicizzati, non referenziati)
- **D**: bucket `exercise-media` legacy (43 file, 5,9 MB) — verificare se l'app lo usa ancora
- **E**: riallineamento indice `biblioteca_gif` — **924 righe** puntano a file inesistenti (il numero cala a ogni giro di pulizia)

## 4. Lista da consolidare
Coppie di codici distinti che puntano allo **stesso esercizio**. Non è materia di rinomina ma di consolidamento: un codice eliminato resta bruciato.

Registro: `tools/biblioteca-nomi/lavoro/da_consolidare.tsv`, con il sopravvissuto e la motivazione riga per riga.

**Ancora aperte, da Addominali e Core**: EX021/EX176 · EX139/EX184 · EX042/EX178 · `Russian twist` (file Mac di contenuto diverso da EX103).

⚠️ Su queste tre coppie il sospetto è che **non siano consolidamenti**: i due nomi descrivono esercizi diversi (plank sulle mani contro avambracci, crunch contro sit-up, plank statico contro rollout) e condividono il file solo perché a uno dei due è stata attaccata la GIF sbagliata. Se è così la soluzione non è eliminare un codice ma dare a uno dei due la sua immagine: è **cantiere 2, non cantiere 4**. Sei GIF da guardare prima di decidere.

Per il giro già eseguito vedi [Consolidamenti](#consolidamenti).

## 5. Code catalogo
- EX085: `gruppo_target='Gambe e Glutei'` fuori vocabolario
- EX322: `'gambe'` fuori vocabolario
- 56 righe con `nome_italiano` divergente nell'indice (residuo blocco rinomine)
- 5 `alternativa` pendenti già bonificati, da monitorare se ne emergono altri

## 6. Avviso corpo libero puro
Con zero attrezzi non esistono tirate/deltoidi copribili: scelta UX (avviso in onboarding o in generazione). Misurato il 2 agosto: pool principale 101 righe, `compoundMissing` = `tirata orizzontale` + `tirata verticale`.

## 7. "Stacco da terra classico" — candidato senza codice
Il file `Biblioteca di esercizi/Gambe e Glutei/Stacco da terra classico - CANDIDATO da confrontare.gif` è ancora lì e non è mai stato deciso.

⚠️ Una vecchia annotazione diceva "EX287": è **sbagliata**. EX287 è `Stacco rumeno una gamba palla medica` e non c'entra. Il confronto va fatto contro lo stacco da terra che sta a catalogo, da individuare.

## 8. M2 entry point
CTA sempre visibile in Body · reminder fine blocco · blood test history UI.

## 9. F.2b colazione/merenda
Stand-by. Riattivare solo se l'onboarding lo richiede.

## 10. Refresh onboarding M1
Preferenze generazione piano (giorno/ora) + tracking peso.
⚠️ `profiles_plan_day_check` ammette solo `'fri'/'sat'/'sun'`.

## 11. Push notifications
Sistema unico (piano + training + integratori).

## 12. "Oggi ho solo X min"
Compressione di una singola sessione senza toccare la progressione del blocco.

## 13. Surrogati mancanti
Censire gli esercizi con `luogo = palestra` **riproducibili a casa** con `surrogato_attrezzo` vuoto: oggi restano fuori dal pool senza che nessuno lo sappia. È il lavoro che colma buchi tipo "deltoidi posteriori: 1 candidato". Nella sola zona core ne sono già emersi 7.

Metodo identico al cantiere GIF: gruppi da dieci con conferma visiva. Diagnostica di appoggio: `ztSchedaWhy()` → `_diag.compoundMissing`, riparata il 2 agosto (`d40faaf`).

## 14. Dare un attrezzo agli slug inerti — metà fatto
- ✅ `barra_corta`/`barra_lunga → barra`: **risolto** dal 5 agosto. EX642 `Leg press alternato barra elastico supino`, EX646 `Squat barra elastico` ed EX648 `Affondo barra elastico sul posto` sono le prime righe con `attrezzo = barra`.
- ❌ `cavigliere → cavigliera`: ancora a 0 occorrenze. Dichiarabile in onboarding, apre zero esercizi, in silenzio (l'app lo constata, vedi `_diagGear`).

**Strada**: aggiungerlo sul Sheet ai `surrogato_attrezzo` degli esercizi che lo useranno — conferma visiva, natura identica al cantiere 13. In alternativa toglierlo dall'onboarding.

Contesto completo: [L2](LEZIONI.md#l2--un-alias-può-puntare-a-una-parola-che-non-esiste).

## 15. Riclassificazione funzionale delle altre zone
Il vocabolario anatomico vale ancora per le zone non core. Da valutare se il modello a funzioni (natura + piano) serva altrove o resti specifico del core.

## 16. Liberi indicizzati senza codice
GIF nel bucket e in `biblioteca_gif` che nessun codice punta. Se debbano diventare codici a catalogo è **decisione aperta, non presa**.

- **Da Bicipiti e Braccia: 5** — `curl-alternato-macchina` · `curl-alternato-manubri-panca-inclinata` · `curl-bilanciere-presa-larga` · `curl-bilanciere-presa-stretta` · `curl-manubri-panca-inclinata`. Stesso trattamento dei liberi di Addominali e Core.
- **Gambe e Glutei: chiusa il 6 agosto** — delle 36, 10 erano GIF mancanti di codici già esistenti (agganciate), 25 sono diventate esercizi nuovi, 1 era una voce stantia. Zero scartate.

## 17. Cinque attrezzi a catalogo non dichiarabili in onboarding
È il cantiere 14 dal lato opposto: lì gli slug dichiarabili non aprivano esercizi, qui gli esercizi non sono raggiungibili da nessuno slug. Finché l'onboarding non li espone, questi **8 codici non escono mai dal generatore**:

| token | codici |
|---|---|
| `sacco` | EX588 · EX595 |
| `battle rope` | EX587 |
| `scaletta agilità` | EX600 · EX603 |
| `conetti` | EX597 · EX606 |
| `corda per saltare` | EX610 |

Cinque sono comunque eseguibili a casa — EX597/EX600/EX603/EX606 via surrogato `corpo libero`, EX610 di suo — quindi il buco è di **dichiarazione, non di fattibilità**.

⚠️ `corda per saltare` è token distinto **apposta**: `corda` a catalogo è l'attacco al cavo (9 esercizi), e riusarlo aprirebbe i pullover al cavo a chi dichiara la corda per saltare.

**Primo costo concreto misurato (3 agosto).** Sul pool Tabata di Ignazio (casa, avanzato) il grezzo è 30 e ne restano **25**. Dei 5 esclusi, **4 cadono per questi token** — EX587, EX588/EX595, EX610 — e il quinto (EX268) per i manubri, che invece sono dichiarabili. EX610 è il caso che pesa: eseguibile da chiunque abbia una corda, escluso solo perché il token non è dichiarabile.

## 18. Testi di EX049 da riscrivere sulla propria GIF
EX049 è `Skip ginocchia alte`, agganciato e verificato, ma `setup`/`esecuzione`/`errori` sono ancora quelli ereditati da `High knees a marcia`: «mani all'altezza dell'ombelico (pronate, palmi giù)», «alza il ginocchio verso la mano», «marcia non corsa».

Quel testo **non descrive la sua GIF** — braccia libere in opposizione, ginocchio sopra l'orizzontale, fase di volo — ma descrive quasi parola per parola la GIF di **EX613 `Skip sul posto`**, i cui testi sono stati scritti apposta su mani ferme come riferimento e piede basso. Finché EX049 non viene riscritto i due testi si sovrappongono.

## 19. Due attrezzi nuovi introdotti da Gambe e Glutei
`bosu` (EX632) e `box` (EX617, EX643, EX672, EX673, EX675) non esistevano a catalogo e **non sono dichiarabili in onboarding**: è il cantiere 17 che si allarga.

Tutti hanno però un `surrogato_attrezzo` (`corpo libero` per il Bosu, `panca` per il box), quindi restano raggiungibili e non si perde nessun esercizio. Da decidere in blocco col 17 se esporli o lasciarli vivere solo tramite surrogato.

## 20. Generalizzare lo split a 2 e 3 giorni
Oggi solo 4 e 5 giorni sono supportati end-to-end (la regola e il sintomo diagnostico stanno in `CLAUDE.md`, sezione Split). Punti da toccare:

- `SESSION_DAY_NUM` / `SESSION_DAY_NUM_5`
- `_rotationDayMap()` / `getRotationCycle()` — discriminante binario sulla presenza di `upperC`
- `DAY_SPLIT` in "I tuoi giorni" — hardcoded, due soli layout
- `getCycleWeekInfo()` — `workPerGiro` derivato dal ciclo

Da mettere in conto la migrazione di `session_type` nello storico `workouts`.

## 96. Unificare la chiave degli strumenti del cantiere — ✅ chiuso 7 agosto
`cantiere_96_pendente.tsv` era indicizzato per nome file: **44 righe su 96 avevano già perso lo stato**. Convertito alla chiave SHA-256 (`chiave_pendente.py`), 96 righe su 96 risolte, zero perse. `prepara.py` cerca per impronta; `riconcilia.py` verifica che diario e piano coincidano prima di ogni migrazione.

**Resta da guardare** (emerso dalla conversione):
- **EX676-EX682**: sei codici allocati in anticipo e mai scritti a catalogo, mentre EX676 risulta il prossimo libero. Vanno riallocati al momento della scrittura → [L6](LEZIONI.md#l6--codici-allocati-in-anticipo-si-scontrano)
- **2 righe con la cartella sbagliata**: `Pistol jump box` e `Salto monopodalico avanti` risultano in `Gambe e Glutei` ma sul Mac hanno nomi di altri esercizi (`Salti laterali rapidi`, `Skip sul posto`). Sono fra gli "otto salti" ricollocati: da verificare guardando le GIF.
- **1 riga di Cardio** che il piano ha e il diario no (`Salti laterali rapidi`), trovata da `riconcilia.py` al primo giro.

Vedi [L12](LEZIONI.md#l12--il-tsv-del-pannello-e-il-piano-di-migrapy-non-coprono-le-stesse-righe) e [L23](LEZIONI.md#l23--il-codice-scritto-a-mano-in-un-registro-non-è-una-chiave).

---

# Zone GIF chiuse

**Cantiere nomenclatura v2**: chiuso il 24 luglio 2026. La normativa che ne è uscita è in `CLAUDE.md`.

**Cantiere nomi biblioteca** — riordino dei nomi delle GIF in 10 cartelle sotto `Biblioteca di esercizi/`, mobilità compresa.
Strumento: pagina locale `tools/biblioteca-nomi/` (`prepara.py` → `conferma.py` su :8768 → `pianifica.py` → `migra_zona.py` → `verifica_worker.py`).
Metodo in tre tempi: conferma visiva a gruppi di dieci → rinomina sul Mac → migrazione dei tre posti (bucket, `biblioteca_gif`, Sheet).

**In coda per dimensione**: Mobilità 215 · Schiena e Trapezio 112 · Pettorali 80 · **Spalle e Cuffia 63 (prossima)** · Tricipiti 61 · Polpacci 19.

> I gruppi più poveri del pool non sono nelle gambe: il cantiere che cambia davvero l'allenamento è **Spalle e Cuffia**, non la zona più grossa.

## Addominali e Core — chiusa 1 agosto
68 righe migrate. La zona è poi stata **riclassificata** il 2 agosto dal vocabolario anatomico `addominali`/`obliqui` a quello funzionale a quattro valori: 72 righe toccate, 11 a certezza media confermate da Ignazio.

## Bicipiti e Braccia — chiusa 2 agosto
73 righe: 68 codici vivi + 5 liberi indicizzati (→ cantiere 16). Verifica finale 68/68 **via Worker**, con confronto dell'impronta del file effettivamente scaricato.

## Cardio e Conditioning — chiusa 2 agosto, su entrambi i lati

**Immagini**: 31 righe — 23 invariate · 7 rinominate nel bucket · 6 slug aggiornati **in place** · 1 caricata. Zona a 39 righe e 39 oggetti.

**Catalogo**: 3 codici esistenti agganciati e rinominati (EX049 · EX053 · EX114) + **28 righe nuove EX587→EX614**. Catalogo da 582 a **610 righe**.

Verifica finale **31/31 via Worker**. La zona è passata da **0 a 31 codici** che puntano a una sua riga.

**Perché non servì l'ordine a righe doppie.** Quando la zona fu preparata, **0 codici** puntavano a una sua riga: non c'erano catene vive da proteggere. Il popolamento del catalogo fu lavoro separato e successivo.

> **Zona senza codici: slug in place, niente righe doppie.** Se nessun `gif_slug` punta alla zona non esiste la catena da proteggere: lo slug si aggiorna sulla riga esistente e non servono né la riga doppia né il sync del Sheet. `migra_zona.py … slug` lo fa, ma **solo dopo aver verificato che i codici puntanti siano zero**; con anche un codice si ferma. Primo caso: Cardio e Conditioning.

### Gli otto salti parcheggiati — risolti 5 agosto
Erano nel bucket ma non sul Mac, quindi fuori dalla conferma visiva di Cardio. Trattati come pliometria di zona muscolare secondo la **regola 10** della nomenclatura: hanno ricevuto `pattern = dominante ginocchia`, `gruppo_target = quadricipiti` e `uso`, quindi entrano nei pool.

| salto | esito |
|---|---|
| `Pistol jump box` | **EX617** `Jumping pistol box` — doppione di `jumping-pistol-box`, adotta quella riga |
| `Salto all indietro` | **EX618** `Salto all'indietro` |
| `Salto monopodalico avanti` | **EX621** `Salto una gamba avanti` |
| `Salto verticale esplosivo` | **EX622** `Salto verticale esplosivo` |
| `Squat jump ginocchia alte` | **EX619** `Squat jump ginocchia alte` |
| `Squat thrust` | **EX620** `Squat thrust` (`pattern = composto`) |
| `Squat jump box` | **EX650** `Squat jump` |
| `Salto in lungo da fermo` | GIF confermata `Salto lungo da fermo`, **nessun codice** — sta fra le 36 del pezzo 2 |

I quattro rinumerati (EX615+) nascono da una collisione di codici allocati in anticipo: vedi [L6](LEZIONI.md#l6--codici-allocati-in-anticipo-si-scontrano).

## Gambe e Glutei — chiusa 5 agosto, su entrambi i lati

**Immagini**: 35 righe doppie migrate e le vecchie eliminate **una per una**, con verifica via Worker nell'istante prima di ogni cancellazione. 2 catene riparate con slug in place (EX015, EX247). `biblioteca_gif` da 1.609 a 1.570 righe.

**Catalogo**: 40 nomi allineati + **36 righe nuove** (30 pendenti + 6 rinumerate da EX615) + **35 righe dal pezzo 2** (10 agganci a codici esistenti e 25 esercizi nuovi EX623→EX675). Catalogo da 610 a 671 righe, poi a **667** dopo il giro dei consolidamenti.

Verifica finale **602/602 via Worker**, 0 rotti. La zona non ha più GIF senza codice.

---

# Consolidamenti

## Giro eseguito il 6 agosto

| coppia | sopravvive |
|---|---|
| EX228 / EX289 | EX289 |
| EX229 / EX291 | EX291 |
| EX110 / EX448 | EX448 |
| EX015 / EX323 | EX015 |
| oggetto gemello di EX617 in `Cardio e Conditioning/` | — (eliminato) |

**Risultato**: quattro codici bruciati, catalogo 671 → 667, `biblioteca_gif` 1.572 → 1.570. E **le due violazioni della guardia "1 codice per slug" si sono sciolte da sole**: oggi zero slug puntati da più di un codice.

Copie locali degli oggetti eliminati in `tools/biblioteca-nomi/lavoro/_backup/oggetti/`.

Come sono stati stanati i doppioni non identici: [L7](LEZIONI.md#l7--limpronta-trova-i-doppioni-identici-non-tutti-i-doppioni).

---

# Materiale parcheggiato

⚠️ **Due file fuori da ogni tabella.** Spostati e rinominati, contenuto verificato per SHA-256, **non presenti né in `biblioteca_gif` né in `esercizi_catalog`**. Non essendo in nessuna tabella, questa è l'unica traccia che li ritrova:

| file | cartella | da riprendere con |
|---|---|---|
| `Piegamenti sulle dita` | Pettorali | zona Pettorali |
| `Piegamenti mani ruotate all'indietro` | Tricipiti | zona Tricipiti |

---

# Storico baseline pool

Profilo di riferimento: Ignazio, casa, avanzato.

| data | catalogo | principali | finisher | riscaldamento | core | Tabata |
|---|---|---|---|---|---|---|
| 3 ago | 610 | 283 | 115 | 28 | 64 | 25 |
| 5 ago | 646 | 316 | 128 | 38 | 67 | 25 |
| 6 ago (pre-consolidamenti) | 671 | 335 | 131 | 43 | 67 su 68 | 25 |
| **6 ago (attuale)** | **667** | **332** | **130** | **43** | **67 su 67** | **25** |

Precedenti: le 28 righe di Cardio (2 agosto) portarono finisher 103→115 e riscaldamento 17→28. `poolCarry` è sempre stato 1.

Perché va rimisurata dopo ogni sync: [L17](LEZIONI.md#l17--la-baseline-si-sposta-anche-quando-cambia-il-catalogo-non-solo-il-codice).
Perché il core si conta in *pescabili*: [L16](LEZIONI.md#l16--il-pool-core-si-conta-come-pescabili-non-come-righe-ammesse).

---

# Audit del 7 agosto — interventi proposti

Diagnosi dei colli di bottiglia del flusso di lavoro. Top 5 in ordine consigliato:

1. ✅ **Ristrutturare CLAUDE.md** in guida snella + questi due archivi — *eseguito 7 agosto*
2. ✅ **Portare `tools/` sotto git** — *eseguito 7 agosto*
3. ✅ **`verifica_sync.py` + `stato.py`** — *eseguito 7 agosto*. Sola lettura; i numeri vivono in [`STATO.md`](STATO.md)
4. ✅ **Unificare la chiave SHA-256 negli strumenti** — *eseguito 7 agosto*, cantiere 96 chiuso
5. **Wrapper errori Supabase a lotti** (45 chiamate su 116 non controllate) + fix `rollRes` + ricollegamento `?schedaDebug=1`

Fuori dai primi cinque: pulizia delle **27 funzioni mai chiamate** in `zona-tracker.html` e mappa interna del file.

**Lo split del monolite non è raccomandato ora**: il peso di rete non lo giustifica (349 KB gzip serviti) e il rischio di regressione in pieno sviluppo Training supera il beneficio. Da rivalutare a Training chiuso.
