# Generatore, audio e ciclo — Zona Tracker

*Regole del generatore di schede, suoni del Training, rotazione e mesociclo. Si apre quando si tocca l'allenamento.*

Staccato da [`CLAUDE.md`](../CLAUDE.md) il 13 settembre 2026, per alleggerire il file che viene letto a ogni sessione. **Il contenuto non è cambiato di una parola**: le regole vincolanti sono rimaste in `CLAUDE.md`, il dettaglio operativo sta qui.

---
## Coach generatore — regole

**Filosofia**: catalogo verificato + AI che assembla. Mai inventare esercizi. Esercizi fissi dentro il blocco (4 sett.), variazione tra blocchi.

**Filtri del pool (`_trainGenFilterPool`) — guardia critica.** Tre guard in cascata, tutti obbligatori: luogo → attrezzo → livello. Se uno solo manca, ogni riga del catalogo entra nei pool in base al solo campo `uso` e la scheda si riempie di esercizi non eseguibili. **Verificare la loro presenza prima di qualunque intervento sul generatore** → [L1](LEZIONI.md#l1--uno-script-che-toglie-i-log-si-porta-via-la-logica-sulla-stessa-riga)

**Criterio di ammissibilità a casa**: la riproducibilità del movimento, non il nome dell'esercizio. Un rematore alla macchina replicato con elastico è legittimo: stesso pattern, stessa posizione, resistenza equivalente. Una leg curl prona alla macchina non lo è: nulla in casa riproduce quella resistenza in quella posizione.

Il surrogato non è un ripiego da tollerare, è il meccanismo che dà ampiezza al catalogo casalingo: **177 dei 406 esercizi** ammessi al pool principale di un profilo casa entrano da lì — quasi la metà. Su tutto il catalogo, **263 delle 593 righe** ammesse a casa passano dal ramo surrogato, e le righe con `surrogato_attrezzo` popolato sono **302 su 725** *(rimisurato il 31 agosto con `tools/baseline_pool.py`)*. Chi tocca i filtri non deve stringere il ramo surrogato per ridurre i nomi da palestra: il nome mostrato resta quello nativo, la versione casalinga vive in `nota_surrogato` → campo `setup`.

**Baseline di riferimento** (profilo Ignazio, casa, avanzato, catalogo **725 righe, 1 settembre**): `poolPrincipali` **417** · `poolFinisher` **253** · `poolRiscaldamento` **49** · pool core **64 pescabili su 64 ammessi** · `poolFinisherTabata` **25** · `poolCarry` **1**. Righe ammesse dai tre filtri: **593 su 725**, di cui **263 dal ramo surrogato**.

**Si rimisura con un comando, e la replica sta su disco:**

```bash
python3 tools/baseline_pool.py --gruppi
```

Il profilo lo legge dal vivo da `profiles` — anche il livello, che sta dentro `note_salute` (`Esperienza: avanzato`) come fa `_trainGenParseEsperienzaFromNote`. Sola lettura.

**Cosa l'ha spostata, 1 settembre**: **11 celle del campo `uso`**, nessuna riga nuova. Alle 11 righe `deltoidi posteriori` che erano solo `finisher` o `riscaldamento` è stato aggiunto `principale`: `poolPrincipali` **406 → 417**, e **nient'altro si muove** — finisher, riscaldamento, core, Tabata, carry e ammesse restano identici, perché nessuna riga ha perso un uso e nessuna è entrata o uscita dai tre filtri. Lo scarto è **+11 e solo +11**: la verifica più pulita che la baseline abbia mai dato.

**Cosa l'ha spostata, 31 agosto**: le 27 righe entrate dal 24 agosto in poi — Tricipiti (EX712-EX716), EX717-EX720 e le 18 calisthenics (EX721-EX738). Lo scarto si attribuisce blocco per blocco e la somma coincide con la misura: **+5 principali · +13 finisher · +2 riscaldamento · +25 ammesse**, carry e core fermi. Delle 18 calisthenics ne entrano **17**: l'unica fuori è **EX721 `Rematore invertito anelli`**, che cade sul filtro attrezzo perché `anelli` non è fra quelli dichiarati e la riga non ha surrogato. Tabella in [`CANTIERI.md`](CANTIERI.md#storico-baseline-pool).

⚠️ **Un gruppo povero nuovo: il petto ha 2 candidati pescabili su 29 righe col gruppo giusto.** Le altre 27 sono `spinta orizzontale`, e `_trainGenPickIsoByGruppoTarget` scarta tutto ciò che non è `isolamento` o `core` prima di guardare il gruppo. Stesso errore di lettura dei deltoidi anteriori, su un gruppo che nessuno sospettava. Deltoidi posteriori restano **1**, laterali **4**.

**Cosa l'ha spostata**: le 10 righe nuove di Spalle e Cuffia (EX702-EX711), quasi tutte a elastico o corpo libero, quindi quasi tutte ammesse a casa — **+4 principali · +3 finisher · +2 riscaldamento**. Il consolidamento di EX408 invece non l'aveva spostata: era `finisher` e `luogo = palestra` senza surrogato, e dal profilo casa non entrava in nessun pool. Se dopo una modifica i numeri divergono, qualcosa nei filtri è cambiato.

**Cosa l'ha spostata**: il sync delle 50 righe del 22 agosto sera — 35 righe a cavi con surrogato `elastico` nuovo e 8 righe a corpo libero con `casa` aggiunto al `luogo`. Lo scarto torna per intero e si attribuisce riga per riga: **+21 principali** (18 dalle cavi, 3 dalle otto) · **+23 finisher** (tutte dalle cavi) · **+1 riscaldamento** (EX599 Corsa falcata lunga) · **+42 ammesse**. Delle 8 righe, tre — EX570, EX681, EX683 — hanno `uso = skill` e restano fuori da ogni pool per regola. Core e carry non si muovono.

⚠️ **Questi numeri vengono da `tools/baseline_pool.py`, una replica dei filtri, non da `?schedaDebug=1`.** Il cerchio resta chiuso su sé stesso — misurare una deriva nei filtri dell'app con una copia di quegli stessi filtri — e la verità è l'app. Se i due divergono, **il sospettato è lo strumento**. Quello che è cambiato il 31 agosto è che la replica non si riscrive più a ogni misura: è **una sola, sta nel repo, e va tenuta allineata a mano quando `_trainGenFilterPool` cambia** (i punti portati sono elencati nella sua intestazione).

✅ **Il dubbio del 22 agosto è chiuso, e la prova è una misura.** Quella sera due repliche diverse davano `poolFinisher` 214 contro 208 sullo stesso catalogo, e nessuna delle due esisteva più: uno scarto di poche unità non provava niente. La replica su disco, **rieseguita sul catalogo privato delle 27 righe aggiunte dal 24 agosto in poi, restituisce `698 · 401 · 240 · 47 · 1 · 568`: tutti e sei i numeri della baseline documentata**. Lo scostamento dei blocchi nuovi si attribuisce riga per riga in [`CANTIERI.md`](CANTIERI.md#storico-baseline-pool).

⚠️ **Le 88 righe sanate il 22 agosto sono diventate tutte `finisher`, nessuna `principale`.** Da lì il salto del `poolFinisher` da 144 a **208** e il `poolPrincipali` fermo a 376. Conta perché fra quelle 88 c'erano **8 deltoidi posteriori e 12 laterali**, cioè i due gruppi più poveri — ma gli slot di isolamento obbligatorio pescano da `poolPrincipali` (`_trainGenPickIsoByGruppoTarget(pools.poolPrincipali, …)`), quindi **non li vedono**. Il gruppo che stava a 1 candidato sta ancora a 1.

**Cosa ha spostato la baseline**, in due passi lo stesso giorno: le fusioni EX139/EX176/EX178 (−3 righe) hanno portato il 6 agosto da 332/130/43 a **329/129/42** su 664 righe; poi i **57 surrogati elastici** aggiunti alle righe manubri-unico hanno portato i principali a **366** e i finisher a **142**, senza aggiungere una sola riga a catalogo. Il riscaldamento non si muove: i surrogati nuovi sono tutti `uso=principale` o `finisher`.

**Lo scostamento dal 6 agosto torna per intero, ed è questo il valore della misura**: −3 su `poolPrincipali` e −3 sul core sono le tre righe eliminate dalle fusioni (EX139, EX176, EX178, tutte e tre core); −1 su `poolFinisher` e −1 su `poolRiscaldamento` sono le stesse tre righe, che comparivano anche in quei due pool. **Nessuna riga persa oltre le tre volute.** Storico completo in [`CANTIERI.md`](CANTIERI.md#storico-baseline-pool).

⚠️ Il pool core si conta come **pescabili**, non come righe ammesse: una riga `pattern = core` con `gruppo_target` vuoto passa i filtri e non può essere scelta da nessuno slot. Se i due numeri tornano a divergere, c'è una riga nuova da classificare → [L16](LEZIONI.md#l16--il-pool-core-si-conta-come-pescabili-non-come-righe-ammesse)

⚠️ **Rimisurare dopo ogni sync del Sheet**: la baseline si sposta anche quando cambia solo il catalogo → [L17](LEZIONI.md#l17--la-baseline-si-sposta-anche-quando-cambia-il-catalogo-non-solo-il-codice). Storico in [`CANTIERI.md`](CANTIERI.md#storico-baseline-pool).

**I gruppi più poveri del pool non sono nelle gambe.** Rimisurati il **1 settembre** col comando qui sopra, contando i **pescabili** e non le righe col gruppo giusto:

| gruppo | pescabili | righe nel pool col gruppo |
|---|---|---|
| deltoidi posteriori | 12 | 12 |
| deltoidi anteriori | **2** | 9 |
| **petto** | **2** | **29** |
| deltoidi laterali | 4 | 4 |
| adduttori | 5 | 7 |
| avambracci | 7 | 7 |
| ischiocrurali | 7 | 20 |
| dorsali | **0** | 49 |

I deltoidi posteriori erano il caso peggiore, **a 1 candidato per mesi**, e sono usciti dalla lista il 1 settembre con 11 celle del campo `uso` — non con una zona GIF. Tre zone chiuse di fila non li avevano spostati di un'unità, perché il collo di bottiglia non era mai stato nelle immagini: a 11 delle 12 righe già ammesse mancava `principale` nel campo `uso`. Prima di aprire un cantiere per riempire un gruppo povero, **guardare il campo `uso` delle righe che quel gruppo ce l'hanno già** — racconto completo nello [storico baseline](CANTIERI.md#storico-baseline-pool). **Il gruppo peggiore adesso è il petto**, e la sua causa è diversa: non il campo `uso` ma il `pattern`.

⚠️ **`dorsali` è il caso limite: 49 righe nel pool, 0 pescabili.** Nessuna è `isolamento`, quindi lo slot non ne vede una — i dorsali entrano in scheda solo dai pattern di tirata, mai come isolamento. Insieme a `trapezi`, `lombari` e al dentato anteriore è il [cantiere 30](CANTIERI.md#30-i-gruppi-muscolari-che-il-generatore-sa-chiedere).

⚠️ **Il candidato si conta sui pescabili, non sulle righe col gruppo giusto — e per i deltoidi anteriori i due numeri differiscono di sei volte.** `_trainGenPickIsoByGruppoTarget` scarta tutto ciò che non ha `pattern` `isolamento` o `core`, prima ancora di guardare il `gruppo_target`. I deltoidi anteriori hanno **6 righe** nel `poolPrincipali` ma **1 sola pescabile**: le altre cinque — EX006, EX074, EX425, EX571, EX572 — sono `spinta verticale`, e lo slot di isolamento non le vede. Contare le righe col gruppo giusto dice 6 e fa sembrare il gruppo sano; è lo stesso errore di lettura di [L16](LEZIONI.md#l16--il-pool-core-si-conta-come-pescabili-non-come-righe-ammesse), su un campo diverso.

### Core: quattro funzioni, due nature
(2 ago 2026, commit `f16e035`)

| Funzione | Natura | Righe a catalogo |
|---|---|---|
| `core anti-estensione` | tenuta | 21 |
| `core anti-rotazione` | tenuta | 8 |
| `core flessione` | dinamica | 31 |
| `core rotazione` | dinamica | 15 |

Tutte con `pattern = core`. Ogni sessione ha **due slot core: uno di tenuta, uno dinamico** — il core va allenato sia nel resistere al movimento sia nel produrlo. Mappa categoria → coppia in `_TRAIN_GEN_CORE_BY_TYPE`; il core è uscito da `_TRAIN_GEN_ISO_OBBLIGATORI_BY_TYPE`, che torna solo muscolare.

Upper/Push/Pull → piano trasverso (anti-rotazione + rotazione). Lower/Legs → piano sagittale (anti-estensione + flessione). Fullbody alterna.

**Fallback**: se una funzione non ha candidati, si ripiega sull'altra della **stessa natura** (`_TRAIN_GEN_CORE_FALLBACK`). Mai attraversare le nature: slot vuoto è preferibile a due esercizi della stessa natura.

⚠️ **`_trainGenIsIsometric` discrimina sulla funzione, non sul pattern.** La natura la dichiara il `gruppo_target`, **controllato prima delle euristiche sul nome**. Le tenute vanno a tempo, i dinamici a ripetizioni → [L19](LEZIONI.md#l19--_traingenisisometric-deve-discriminare-sulla-funzione-non-sul-pattern)

⚠️ Il vocabolario delle funzioni **non ha un piano frontale**: `EX111 Side bend` è flessione laterale pura ed è stato messo in `core rotazione` come casella dei dinamici sugli obliqui. Adattamento consapevole.

### Indice di rotazione
**`sessionIdx` (assoluto), non `occurrenceIdx`.** Due sessioni di categoria diversa che attingono alla stessa lista con lo stesso indice convergono sullo stesso esercizio. Slot core: `sessionIdx + rigenIdx` (`+0` e `+1` per i due slot). Tabata: `sessionIdx + rigenIdx × numero di sessioni`.

**Il discrimine non è l'offset, è se le liste sono disgiunte** — i compound non manifestano il difetto perché Upper e Lower chiedono pattern diversi. Il carry conclusivo è il riferimento corretto → [L18](LEZIONI.md#l18--lindice-di-rotazione-deve-essere-assoluto-non-loccorrenza-dentro-il-tipo)

### Pattern minimi per sessione
- Full Body: spinta + tirata + dom.ginocchia + dom.anca + core
- Upper: spinta orizz + spinta vert + tirata orizz + tirata vert
- Lower: dom.ginocchia + dom.anca + core

Tirata ≥ spinta. Core sempre obbligatorio. Ordine: compound pesanti → complementari → isolamenti → core.

### Split
| Giorni | Split |
|---|---|
| 2 | Full Body × 2 |
| 3 | Full Body × 3 (princ.) · Upper/Lower/Full (int/avanzato) |
| 4 | Upper/Lower × 2 |
| 5 | Upper/Lower DUP + Upper Pump (int/avanzato) · PPL (princ.) |

⚠️ **Solo 4 e 5 giorni sono realmente supportati end-to-end.** Il generatore produce correttamente anche schede a 2 e 3 giorni e le salva in `schede_utente`, ma rotazione e rendering sono ancorati a id di sessione fissi (`upperA`/`lowerA`/`upperB`/`lowerB`/`recoveryUpper`/`recoveryLower`, più `upperC` per il 5 giorni). Una scheda a 3 giorni produce id `upper`/`lower`/`fullbody` che non combaciano con nessuna mappa: `getTrainingSession()` cade sul fallback `TRAINING_SESSIONS` hardcoded e l'utente vede la scheda d'emergenza con nomi esercizio non aggiornati — sintomo diagnostico utile. Punti da toccare per generalizzare: [cantiere 20](CANTIERI.md#20-generalizzare-lo-split-a-2-e-3-giorni).

Split 5gg DUP: 7 posizioni — upperA · lowerA · recoveryUpper · upperB · lowerB · upperC(Pump) · rest.

### Parametri
| Obiettivo | Reps | RIR | Recupero |
|---|---|---|---|
| Forza | 4-6 | 2-3 | 3 min |
| Ipertrofia | 8-12 | 1-2 | 90-120s |
| Ricomp/Dimagrimento | 10-15 (princ.) / ridotti (avanzato) | 1 | 60-90s |
| Salute | 6-10 | 2 | 90-120s |

RIR attivo SOLO per intermedio/avanzato.

**Cautele**: `limitazioni` × `zone_rischio` → prima ADATTA (`adattamento`), poi SOSTITUISCE (`alternativa`). Alternativa accettata solo se nel Set ammissibili (unione 5 pool filtrati luogo/attrezzo/livello), altrimenti skip `alternative-not-eligible`. Vale anche per Tabata.

**Finisher Tabata**: solo `dimagrimento`/`ricomposizione`, ~5 min, basso impatto, `uso=finisher`. Upper Pump: niente Tabata. 4 esercizi distinti per sessione, fissi dentro la scheda e rinnovati a ogni rigenerazione.

**Isolamenti bonus**: pescano SOLO da `uso=principale`.

**Generazione**: trigger a fine M1 (`saveOnboarding→generateTrainingProgram`). Fine blocco: solo dopo M2. Manuale: `rigeneraSchedaDaImpostazioni()`.

**Suggerimenti progressione**: `ST.profile.unit` → kg step 2.5 / lbs step 10 (default lbs). Bande trazioni senza unità.

---

## Audio Training

- `playPrepBeep` 660Hz — ultimi 5s di ogni countdown
- `playStopBeep` 659Hz — fine fase/lato/serie
- `playLongBeep` 1100Hz — GO/inizio timer

Pausa cambio lato iso (5s) → silenzio totale. Avvio serie a reps → silenzio. Fine recupero → solo STOP.

---

## Rotazione e ciclo Training

**Recuperi TRASPARENTI**: non avanzano il fronte, non generano debito. `computeTrainingDebt`: skip recuperi nel loop; guard `test-user-001` → `{ debt:[], target:null }`. `nextSession` dall'ultimo workout di LAVORO (filtro `!/^recovery/i`).

**Il mesociclo è 5+1: sei settimane, cinque di carico e una di scarico** *(dal 24 agosto 2026, prima era 3+1)*. La tabella, uguale in `CYCLE_WEEKS` e nella card Ciclo del Programma:

| Sett. | Progressione | RIR |
|---|---|---|
| 1 | Base | 2 / 1 |
| 2 | +1 rep | 2 / 1 |
| 3 | +1 set | 2 / 1 |
| 4 | +1 rep | 1 / 1 |
| 5 | Picco | 1 / 1 |
| 6 | Scarico −40% vol | 3+ |

⚠️ **La S3 prima dichiarava `RIR 1 / 0`, e RIR 0 è il cedimento**: contraddiceva il modale info, che promette margine in ogni settimana di carico. Ora è `2 / 1`.

**`getCycleWeekInfo()`**: helper canonico UNICO per la settimana ciclo. Conta SOLO giorni di lavoro (recovery esclusi). `workPerGiro` derivato dal ciclo (6gg→4, 5gg→5). Settimana = `floor(workCount / workPerGiro) % 6`, `isScarico` = `weekIdx === 5`. **Non ricalcolare inline.**

⚠️ **Il divisore del ciclo è `workPerGiro`, non 6.** Fino al 24 agosto la card Training in Home ricalcolava la settimana con `Math.floor(validWorkouts / 6) % 4` — divisore hardcoded **e** recovery contati — quindi Home e Programma potevano mostrare due numeri diversi. Ora la card chiama `getCycleWeekInfo().weekNum`: un calcolo inline della settimana è per definizione una divergenza che aspetta.

**`getNextCheckpointInfo()`**: `overdue:true` solo se `isScarico` **e** `workCount >= 5*workPerGiro` **e** `daysUntil < 0`. Settimane 1-5 carico: `overdue:false` sempre. Frequenza checkpoint **42 giorni**, allineata alla durata del mesociclo: le due cadenze si muovono insieme, se una cambia cambia anche l'altra.

**WS-QUEUE**: `wsWrite()` = 1 retry immediato → coda `zt_ws_pending_<userId>` in localStorage → toast discreto. Flush al boot, a ogni scrittura riuscita, al rientro in foreground. Insert idempotente al replay, cap 200 op.

**Scarico**: stessi esercizi e set, SOLO carichi ridotti + RIR forzato a 3. MAI ridurre set/reps.

**Infortuni multi-giorno**: periodo 1/3/7 gg o aperto in `zt_injury_<userId>`. Righe `rest_injury` materializzate una al giorno al passaggio (idempotenti). Barra in Training con data rientro e "Sto bene, riprendo".

**Rientro soft**: pausa ≥10 gg → banner non bloccante. L1 (10-29 gg) −20%/RIR+1, L2 (≥30 gg) −35%/RIR+2. Solo suggerimenti, zero effetti su scheda/DB/settimana ciclo.

---

