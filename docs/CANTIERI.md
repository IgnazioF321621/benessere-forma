# Cantieri — Zona Tracker

Lista dei lavori aperti e archivio di quelli chiusi. **Le regole tecniche vivono in `CLAUDE.md`; le lezioni apprese in `docs/LEZIONI.md`.** Qui c'è cosa resta da fare e cosa è già stato fatto.

*Aggiornato: 13 agosto 2026.*

Indice: [Cantieri aperti](#cantieri-aperti) · [Zone GIF](#zone-gif) · [Consolidamenti](#consolidamenti) · [Materiale parcheggiato](#materiale-parcheggiato) · [Storico baseline pool](#storico-baseline-pool)

---

# Cantieri aperti

## 1. Test timer su workout reali
Commit `e834320` (timer unificati timestamp-based) in osservazione. **PRIMA di qualunque altro cantiere Training.**

## 2. Cantiere 600 GIF
65 codici senza `gif_slug`, da colmare zona per zona. La vista di conferma visiva è fatta (`tools/biblioteca-nomi/`) e viene riusata: il cantiere procede in coda a quello dei nomi, cartella per cartella.

Vedi anche [L20](LEZIONI.md#l20--la-domanda-giusta-non-è-sempre-diventa-un-esercizio): un terzo dei "liberi" sono in realtà buchi di questo cantiere, non candidati nuovi.

## 3. Pulizia Storage
- **C**: 28 file L2 residui nelle zone curate (indicizzati, non referenziati)
- **D**: bucket `exercise-media` legacy (**52 file, 6,9 MB** — rimisurato 7 agosto) — serve ancora ai 65 codici senza `gif_slug`: non si tocca finché il cantiere 2 non è chiuso
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

⚠️ **Questo cantiere non cresce più.** Dall'11 agosto il popolamento del catalogo è il terzo lavoro obbligatorio di ogni cartella → [regola di metodo](#una-cartella-si-chiude-su-tre-lavori). Quello che resta qui è l'arretrato delle zone chiuse **prima** della regola; le zone da Pettorali in poi si chiudono col catalogo già popolato.

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

## 21. Ricomprimere le GIF — il cantiere che chiude il problema Storage
## 22. Rimettere il `cache-control` sulle GIF
*I due si fanno insieme: si sta gia' ricaricando tutto, l'intestazione viene gratis. Aperti il 15 agosto 2026.*

**La regola operativa sta in [CLAUDE.md](../CLAUDE.md#ogni-gif-entra-nel-bucket-ridotta-e-con-la-cache--regola-permanente)** — qui resta solo cosa manca da fare e cosa e' stato misurato.

**Il vincolo vero e' lo spazio, non il traffico.** Il bucket occupa **639 MB su 1024** del piano Free (62%). Pettorali per intero (+109 MB) e Mobilita' (+405 MB) a piena risoluzione portano a ~1150 MB e **sfondano il limite**. Con la sola riduzione a 480 px la biblioteca completa sta intorno ai **513 MB, il 50% del piano**.

**I numeri veri, misurati il 15 agosto** su 54 file estratti a caso e stratificati sulle 9 zone. Le stime precedenti in questo file — −82%, «tutte 1080×1080», «bucket ~115 MB» — **erano sbagliate su entrambi i fronti** e sono state tolte: il −82% era un rapporto fra aree mai misurato, e le GIF a 1080 px erano 283 su 674, non tutte → [L28](LEZIONI.md#l28--una-stima-sui-pixel-non-è-una-misura-sui-byte).

| | bucket | risparmio | del piano |
|---|---|---|---|
| oggi | 639 MB | | 62% |
| **solo 480 px** (scelta) | **326 MB** | **−49%** | 32% |
| + palette 128 colori | 305 MB | −52% | 30% |
| + palette 64 colori | 253 MB | −60% | 25% |

La palette **non si tocca**: aggiunge 6 o 22 punti in cambio di banding permanente, e il margine c'e' gia'.

### Stato zona per zona

| zona | oggetti | da ridurre | MB prima | MB dopo | stato |
|---|---|---|---|---|---|
| Polpacci | 19 | 12 | 19,6 | 8,9 | ✅ 15 agosto |
| Addominali e Core | 77 | 26 | 55,1 | ~34 | da fare |
| Bicipiti e Braccia | 73 | 16 | 40,1 | ~28 | da fare |
| Cardio e Conditioning | 31 | 31 | 87,7 | ~37 | da fare |
| Gambe e Glutei | 169 | 85 | 201,6 | ~104 | da fare |
| Pettorali | 60 | 25 | 52,5 | ~32 | ⚠️ vedi sotto |
| Schiena e Trapezio | 96 | 31 | 70,2 | ~44 | da fare, 3 senza gemello |
| Spalle e Cuffia | 63 | 27 | 62,2 | ~38 | da fare |
| Tricipiti | 59 | 20 | 50,0 | ~33 | da fare |

**Pettorali sta fuori da questo giro.** La zona non e' ancora migrata: le sue GIF entreranno nel bucket **gia' ridotte e gia' con l'intestazione** al momento della migrazione, non ricompresse a posteriori. Il piano in `lavoro/_piani/` resta valido; va eseguito dopo questo cantiere.

**Tre oggetti di Schiena e Trapezio non hanno gemello sul Mac** — `Rematore invertito TRX`, `Trazioni sbarra assistite elastico`, `Trazioni sbarra presa neutra`. Senza originale locale non sono ripristinabili: `ricomprimi.py` li esclude dal piano da solo e restano intatti con `no-cache`. Per trattarli servirebbe scaricarli una volta (~3 MB), da decidere a voce quando si arriva a quella zona.

### Cosa e' rimasto aperto

- **Il contatore misura il contenuto, non le intestazioni.** Una zona costa qualche decina di byte di contenuto e qualche decina di kB di intestazioni HTTP, che nessuno strumento conta oggi. Non e' un problema di quota; e' un limite da sapere quando si legge «0 byte».
- **Il disco del Mac e' al 98%** (12 GB liberi). Non e' piu' un vincolo per questo cantiere: dal 15 agosto `_480/` si sgombera a zona verificata e non accumula. Il picco e' una zona alla volta — al massimo ~104 MB, Gambe e Glutei.

## 26. Residui noti dei prompt di Pirsi
*Aperto il 13 agosto 2026, a fine cantiere Pirsi. Nessuno di questi nasce dal registro: erano lì prima.*

- **C ripete i numeri uno per uno.** Il prompt dice `NIENTE numeri ripetuti uno per uno`, e su quattro generazioni tre elencano per intero «2150 kcal, 160g di proteine, 215g di carboidrati e 60g di grassi». La leva probabilmente non è irrigidire il divieto ma **togliere i numeri dal prompt**: sono l'unico contenuto fattuale che il modello ha in mano, e senza quelli non gli resta che l'incoraggiamento generico.
- **E non ha whitelist della dispensa.** Riceve solo `DIETA: pescetariano` e può proporre ingredienti fuori regime: in un collaudo ha suggerito **seitan**, che è glutine di frumento. La whitelist per categorie esiste già in D (`_pianoV4F2aBuildPantry`) e non è mai stata passata a E.
- **Aritmetica dei macro in D.** In un collaudo, 100g di uova + 50g di tofu dichiarati 50g di proteine, e 750 kcal con 10g di carboidrati. Il prompt ha già una regola 11 che chiede di far quadrare le dosi prima di rispondere. Problema del modello, indipendente dal nome e dal registro.
- **Asimmetria nella card dei cue.** Il messaggio di caricamento è in prima persona — «Genero un cue avanzato per te…» — mentre l'errore accanto è neutro per decisione presa (`Cue non disponibile — connessione assente`). Voluto finché non si guarda a schermo.

**Il nome è in prova.** Se cambia, si cambia `COACH_NAME` in `zona-tracker.html` e basta: fuori dai prompt non esiste nessun'altra riga che contenga «Pirsi». Nei prompt il nome è scritto per esteso in cinque punti (identità di A, B, C, D, E) e va cambiato a mano — è la scelta dichiarata in `CLAUDE.md`.

**Body**: nessuna stringa del modulo nominava il coach, quindi non c'è un quarto giro da fare.

## 24. Striscia settimanale cieca sullo storico — ✅ chiuso 9 agosto (`2b2fe95`)
**Il titolo di questa voce era sbagliato, e con esso la diagnosi.** Non era «cieca a cavallo di mese»: era cieca su **qualunque settimana precedente al mese corrente**, per intero.

Il motivo l'ha detto il codice, non l'intuizione: la striscia (`renderCalStrip`) va solo all'indietro e cambiando settimana **non ricarica niente** — sposta un contatore e ridisegna. I dati venivano da `loadWorkouts(anno, mese)`, che caricava il solo mese corrente. Misurato sui dati veri il 9 agosto: **81 allenamenti, 6 nel mese corrente e 75 fuori** — il 93% dello storico spariva al primo tocco della freccia indietro. Non i giorni di bordo: tutto.

I tre sintomi, tutti raggiungibili:
- pallino assente nella casella
- dettaglio del giorno senza nome sessione in intestazione (`ST.trainWorkouts` non aveva quella data)
- *Elimina allenamento* rispondeva «Workout non trovato in calendario» e non eliminava

Le serie in `training_logs` si vedevano comunque: `openDayDetail` le interroga per conto suo. Mancava solo la riga `workouts`.

**Rimedio adottato**: `loadWorkouts()` carica tutto lo storico dell'utente, paginato (L13) e con `{error}` controllato. Sparisce la classe di difetto invece di spostarne il confine — niente logica sui bordi, niente rete a ogni tocco di freccia. È il criterio che `loadTrainingAllCompleted` usa da sempre, ed è il motivo per cui rotazione, streak e debito non hanno mai sbagliato mentre la striscia sì.

Collaudo sulla settimana reale 27 lug – 2 ago 2026 (5 allenamenti): pallini da 1/5 a **5/5**, nomi sessione da 4 intestazioni vuote a `upperA · lowerA · upperB · lowerB · upperC`, eliminazione da 4 blocchi a **0**. Settimana corrente invariata a 5 pallini. Copertura da 6/81 a **81/81**.

Emerso il 9 agosto verificando la portata attribuita a `b88a3b5` → [L26](LEZIONI.md#l26--una-vista-dedotta-dal-nome-di-una-funzione-non-è-una-vista-che-esiste).

## 25. `renderCalendar` — codice morto rimosso — ✅ chiuso 9 agosto
La griglia mensile con le frecce ← → e il piedino *Sessioni · Streak · Freq.* è nata l'1 maggio (`f9616d7`) ed è stata sostituita dalla striscia settimanale nel redesign di Progressione del 10 giugno (`e0fa603`). Il redesign ha tolto la chiamata e lasciato il corpo: **73 righe mai eseguite per due mesi**.

Era una delle 27 funzioni mai chiamate censite in `CLAUDE.md`, segnalata a parte perché è quella che ha fatto attribuire a `b88a3b5` una portata che non aveva: leggendo il codice sembrava esistere una vista mensile, e non esisteva.

**Rimosso**: la funzione (73 righe, con le sue `SESS_LABEL`/`SESS_COLOR`/`MONTH_NAMES` e le due frecce, ultimi punti che passavano anno e mese a `loadWorkouts`) e lo stato `ST.trainCalMonth`, che **nessuno impostava mai**. Il suo unico lettore vivo era in `saveWorkoutRecord`, dentro un «se siamo nel mese corrente» sempre vero: semplificato alla sola riga che conta, l'invalidazione della cache dopo un allenamento salvato.

Niente markup né CSS orfani da togliere: la funzione restituiva una stringa che nessuno inseriva nel documento e usava solo stili in linea. La vista non era nascosta, era scollegata.

## 23. Strumenti del cantiere a consumo zero — ✅ chiuso 7 agosto
`impronte.py` scaricava ogni oggetto per calcolarne l'impronta, e le verifiche riscaricavano il file per confrontarlo: la voce più grossa dell'egress che ha portato il piano Free al 171%.

Ora l'impronta si ricava dall'`eTag` (che è l'MD5 del contenuto) e si risale al file gemello sul Mac. Copertura **647 su 647**. Le verifiche usano `HEAD`. Ogni strumento stampa i byte scaricati a fine esecuzione.

Collaudo: `collaudo_egress.py` confronta l'impronta da `eTag` con quella ottenuta scaricando davvero — **647 coincidono, 0 divergono**, 644 dei confronti indipendenti.

| operazione | prima | dopo |
|---|---|---|
| preparare una zona (Polpacci) | ~20 MB | **0 byte** |
| verificare 68 codici (Bicipiti) | ~38 MB | **0 byte** |
| sweep dei 602 codici vivi | ~660 MB | **0 byte** |

Dettaglio in [L24](LEZIONI.md#l24--limpronta-di-un-oggetto-si-legge-senza-scaricarlo).

## 21. Wrapper errori Supabase — ✅ scritture chiuse 8 agosto
Tre lotti, uno per sessione, mai a tappeto ([L1](LEZIONI.md#l1--uno-script-che-toglie-i-log-si-porta-via-la-logica-sulla-stessa-riga)): Nutrition 16 scritture (7 ago) · Training 3 · Body 4 (8 ago). **Scritture scoperte: 0.**

**Una sola esclusione, voluta**: `_wsExec` della WS-QUEUE. Un censimento la segnala come scoperta e non lo è — tutti e quattro i chiamanti (`wsWrite` ×2 per il retry, `_wsReplayOp` ×2) leggono `res.error`. La coda è una rete più fitta di `dbq`: riprova, persiste su localStorage e riconsegna. Avvolgerla darebbe un allarme d'errore a ogni intoppo passeggero che la coda sta già gestendo da sola. La motivazione è scritta accanto alla funzione perché nessuno la "corregga".

**Tre punti dove è emerso più di un avvolgimento:**
- **Serie aggiornata** — se l'update di `training_logs` falliva, `workout_sets` veniva aggiornato lo stesso (via WS-QUEUE, affidabile) e i due archivi divergevano, mentre l'utente leggeva «Serie aggiornata». Ora il messaggio di riuscita compare solo se l'operazione è riuscita.
- **Serie eliminata** — il `return` sull'errore esisteva già ma solo per le cadute di rete; ora vale anche per gli errori dell'API, così non si cancella da `workout_sets` una riga che in `training_logs` è rimasta.
- **Scarto del checkpoint Body** — quattro pulizie in cascata, prima completamente silenziose. Ora ognuna lascia traccia in console e un solo avviso riassume cosa è rimasto indietro. Il caso che pesa è `body_checks`: se non si cancella, il check resta `in_progress` e l'app riproporrà di riprendere un lavoro buttato.

**Restano 37 letture su 93** senza controllo: una lettura fallita di solito si vede subito a schermo, quindi non hanno urgenza.

## 96. Unificare la chiave degli strumenti del cantiere — ✅ chiuso 7 agosto
`cantiere_96_pendente.tsv` era indicizzato per nome file: **44 righe su 96 avevano già perso lo stato**. Convertito alla chiave SHA-256 (`chiave_pendente.py`), 96 righe su 96 risolte, zero perse. `prepara.py` cerca per impronta; `riconcilia.py` verifica che diario e piano coincidano prima di ogni migrazione.

**Chiuso il 7 agosto anche il seguito** (`libera_prenotati.py`): i **6 codici prenotati e mai scritti** (EX676-EX680, EX682) sono stati tolti dal registro. Le righe restano con impronta e nome; il codice si assegna alla scrittura. Verificato: 96 righe prima e dopo, impronte identiche, zero campi portanti toccati, `prepara.py` continua a vedere quei file come impegnati (5 pendenti in Tricipiti).

## 96-bis. Registro ripulito e verifica circolare tolta — ✅ chiuso 7 agosto

Emerso il 7 agosto guardando le due righe che sembravano "GIF ricollocate". Due cose distinte:

**a) Il registro è quasi tutto lavoro già fatto.** Delle 96 righe: **89 sincronizzate**, 6 liberate (Spalle e Cuffia, Tricipiti — ancora da scrivere), **1 sola davvero pendente** (`Pettorali/Chest press elastico maniglie in piedi`). Un registro che per il 93% descrive lavoro concluso non è un registro, è un archivio: tenerlo così fa lavorare `prepara.py` a vuoto e conserva dati vecchi.

**b) Venti righe hanno un'impronta ricavata in modo circolare.** Nella conversione del 7 agosto, le righe il cui file non era più trovabile per nome sono state risolte partendo dal **codice del registro** → `gif_slug` → oggetto nel bucket → impronta. Ma quel codice è proprio ciò che [L23](LEZIONI.md#l23--il-codice-scritto-a-mano-in-un-registro-non-è-una-chiave) ha dimostrato inaffidabile: si usa il codice per trovare l'impronta e poi l'impronta restituisce lo stesso codice. **Non è una verifica, è un'eco.**

Su tutte e 20 il nome del registro non coincide col nome del codice risolto. Per la maggior parte è solo rifinitura del nome (`Boxe diretto sacco` → `Boxe diretto al sacco`), ma su quattro sono **esercizi diversi**:

| il registro dice | il codice risolto è |
|---|---|
| EX598 `Corsa zigzag conetti` | `Corsa all'indietro` |
| EX609 `Pistol jump box` | `Salti laterali rapidi` |
| EX610 `Jumping rimbalzi` | `Salto con la corda` |
| EX613 `Salto monopodalico avanti` | `Skip sul posto` |

Sono esattamente i codici toccati dalla rinumerazione di [L6](LEZIONI.md#l6--codici-allocati-in-anticipo-si-scontrano) e dallo sfasamento del blocco Cardio: `Pistol jump box` è diventato **EX617** e `Salto monopodalico avanti` **EX621** — entrambi a catalogo con la loro GIF in `Gambe e Glutei/`, cioè la zona che il registro dichiarava — mentre EX609/EX613 sono andati ad altri esercizi di Cardio. I file originali (`Squat Pistol box jump.gif`, `Salto monopodalico in avanti.gif`) non esistono più sul Mac: **il lavoro è concluso, le righe sono il residuo**.

Scheda di confronto pronta in `tools/biblioteca-nomi/lavoro/revisione_2_gif.md` (locale). Restano da confermare guardando le due GIF: che EX617 e EX621 siano davvero gli esercizi confermati allora.

**Nessun danno operativo**: tutte e 20 risultano già sincronizzate, e in `prepara.py` lo stato `collegato` vince su `pendente`.

**Fatto il 7 agosto**, con una correzione importante rispetto alla proposta.

Il criterio proposto — «conclusa se il codice ha un `gif_slug`» — è stato **misurato e scartato**: su 89 righe ne avrebbe ritirate **23 il cui file è ancora da migrare**, 8 delle quali in Spalle e Cuffia, la prossima zona. Il codice ha sì la sua GIF, ma un'altra: dice qualcosa sul codice, niente sul file della riga accanto.

Il criterio giusto parte dall'**impronta**: una riga è conclusa se il suo file è servito da un codice vivo (`impronta → oggetto → riga → codice`). Con quello: **66 ritirate, 30 restano** (archivio in `backup/cantiere_96_concluse_*.tsv`).

Verifica funzionale: `prepara.py` su Tricipiti, Pettorali, Spalle e Cuffia e Gambe e Glutei dà **classificazione identica prima e dopo** — nessun file ha perso la protezione del nome. Spalle e Cuffia conserva i suoi 10 pendenti.

Tolto anche da `chiave_pendente.py` il terzo tentativo di risoluzione: se un file non si ritrova per nome, l'impronta resta vuota e la riga si marca *da riverificare*. Vedi [L25](LEZIONI.md#l25--unimpronta-dedotta-dal-codice-non-verifica-quel-codice).

## 96-ter. Falso allarme di `riconcilia.py` — ✅ chiuso 7 agosto

La riga `Salti laterali rapidi` che `riconcilia.py` dava come divergente nel piano di Cardio **non è un'anomalia**: al momento della decisione (2 agosto) era in stato `indicizzato`, e `conferma.py` scrive nel diario `slug_da_migrare.tsv` **solo** per gli stati `collegato`/`pendente`/`indeterminato`. Una riga `indicizzato` cambia slug in place e nel diario non ci entra per costruzione.

Verificato su tutte e 6 le righe con slug che cambia: le 5 in stato `pendente` sono nel diario, l'unica `indicizzato` no — e per tutte e sei lo slug vecchio è morto e il nuovo è vivo, cioè **la migrazione è già stata fatta**. Il piano di Cardio è un reperto storico.

**Fatto il 7 agosto.** `riconcilia.py` ora pretende nel diario solo le righe con `slug_applicabile = no`, e riconosce le righe già migrate (slug vecchio morto, nuovo vivo) invece di segnalarle.

Esiti dopo la correzione: **Cardio pulito** (6 su 6 già migrate, 0 da migrare) · Bicipiti e Braccia pulito · Gambe e Glutei segnala 4 righe presenti nel diario e non nel piano — segnali veri, non falsi allarmi (file consolidati o già migrati: EX609, EX221, EX229, EX015).

Collaudato anche su uno scenario costruito apposta: una riga `collegato` mancante dal diario viene segnalata, una riga `indicizzato` no. Il filtro non nasconde i problemi veri.

---

# Zone GIF

**Cantiere nomenclatura v2**: chiuso il 24 luglio 2026. La normativa che ne è uscita è in `CLAUDE.md`.

**Cantiere nomi biblioteca** — riordino dei nomi delle GIF in 10 cartelle sotto `Biblioteca di esercizi/`, mobilità compresa.
Strumento: pagina locale `tools/biblioteca-nomi/` (`prepara.py` → `conferma.py` su :8768 → `pianifica.py` → `migra_zona.py` → `verifica_worker.py`).
Metodo in tre tempi: conferma visiva a gruppi di dieci → rinomina sul Mac → migrazione dei tre posti (bucket, `biblioteca_gif`, Sheet).

## Una cartella si chiude su tre lavori

**Regola di metodo vincolante, dall'11 agosto 2026.** In `CLAUDE.md` sotto *Media system*.

Ogni cartella si chiude su **tre lavori, in quest'ordine**, prima di aprire la successiva:

1. **conferma dei nomi** — pannello locale, dieci alla volta, guardando la GIF
2. **migrazione delle immagini** — bucket + `biblioteca_gif` + Sheet
3. **popolamento del catalogo** — le GIF della zona rimaste senza codice diventano righe di `esercizi_catalog`, o si decide esplicitamente che non lo diventino

**Nessuna cartella nuova con lavori arretrati su quella precedente.** Una zona con le immagini migrate e il catalogo non popolato è **aperta**, non chiusa, e non autorizza ad aprirne un'altra.

Perché la regola esiste: i primi quattro giri hanno lasciato dietro i 65 codici senza `gif_slug` del [cantiere 2](#2-cantiere-600-gif) e le 46 righe libere del [cantiere 16](#16-liberi-indicizzati-senza-codice). Sono arretrati nati dall'aver aperto la cartella dopo prima di aver chiuso quella prima.

### Ordine delle zone rimanenti

Registrato l'11 agosto. **Non è più l'ordine per dimensione.**

| # | zona | file | nota |
|---|---|---|---|
| 1 | **Pettorali** | 82 | in corso — nomi confermati, migrazione dal 15 agosto |
| 2 | **Polpacci** | 19 | la più piccola: si chiude in un giro |
| 3 | **Spalle e Cuffia** | 63 | **anticipata** rispetto alle zone più grosse |
| 4 | Tricipiti | 61 | |
| 5 | Schiena e Trapezio | 112 | |
| 6 | Mobilità | 215 | |

> **Perché Spalle e Cuffia passa avanti a Tricipiti, Schiena e Mobilità**: contiene i gruppi più poveri del pool — deltoidi posteriori **1 solo candidato**, laterali **3**, anteriori **4**. Il deltoide posteriore è slot obbligatorio in quasi ogni Upper, quindi oggi esce lo stesso esercizio blocco dopo blocco. È il cantiere che cambia davvero l'allenamento, non la zona più grossa.

## Pettorali — nomi confermati, migrazione ferma al 15 agosto

**82 nomi su 82 confermati** nel pannello l'11 agosto. Piano di migrazione pronto e approvato: [`lavoro/_piani/PIANO_pettorali.md`](../tools/biblioteca-nomi/lavoro/_piani/PIANO_pettorali.md), nel repo dall'11 agosto insieme a quello di Gambe e Glutei — un piano che vive solo sul Mac è senza backup.

**Esecuzione dal 15 agosto**, quando si azzera il ciclo dell'egress. La migrazione consumerebbe pochissimo — copie server-side, caricamenti in ingresso, verifica via `HEAD` — ma la regola sulla pausa non si aggira per convenienza.

Le sei popolazioni: **A** collegati slug invariato 35 · **B** collegati slug nuovo **22** · **C** indicizzato libero invariato 1 · **D** indicizzati liberi slug nuovo 2 · **E** caricamenti liberi 21 · **F** caricamento in coda 1. Solo il gruppo B apre la finestra da coprire con le righe doppie, e quindi la fermata per il sync del foglio.

Controlli tutti puliti: 0 collisioni interne, 0 di percorso, 0 sovrascritture, 0 percorsi non-ASCII, 0 codici che resterebbero senza GIF, 0 doppioni di contenuto, 0 impronte non determinabili su 60 oggetti.

**I 22 caricamenti entrano in `biblioteca_gif` senza codice.** Diventare esercizi a catalogo è il **terzo lavoro**, non una coda: dall'11 agosto il popolamento è obbligatorio prima di aprire Polpacci → [regola di metodo](#una-cartella-si-chiude-su-tre-lavori). Non confluiscono più nel [cantiere 16](#16-liberi-indicizzati-senza-codice): quel cantiere raccoglie l'arretrato delle zone chiuse prima della regola, e Pettorali non deve aggiungerne.

### Alla ripresa, in quest'ordine

1. **Lanciare `pianifica.py "Pettorali"`.** Il piano scritto è leggibile ma non eseguibile: manca la coppia `_piani/piano_pettorali.json` + `.tsv`, che è ciò che `migra_zona.py` consuma davvero. Lo strumento la genera e nel farlo rimisura sul vivo. **Se i suoi numeri divergono dal piano scritto, vince lo strumento** e il piano si rilegge prima di eseguire: la baseline si sposta anche solo perché è cambiato il catalogo → [L17](LEZIONI.md#l17--la-baseline-si-sposta-anche-quando-cambia-il-catalogo-non-solo-il-codice).

```bash
python3 tools/biblioteca-nomi/pianifica.py "Pettorali"
```

2. **Verificare le 85 rinomine sul Mac contro il disco.** `log_rinomine.tsv` dichiara 85 eventi `rinominato` e il file di lavoro dà gli 82 nomi come allineati, ma il confronto con ciò che sta davvero sul disco non è stato fatto: costa rileggere 109 MB. Da fare **prima della fase 2**.

3. **Decidere sul termine `medi`**, comparso in `Croci cavi medi in piedi` (EX207, con EX104 e EX319). Introduce una terza altezza del cavo accanto ad `alti` e `bassi` e non è un termine dichiarato nella nomenclatura v2. Non blocca la migrazione — il nome è stato confermato guardando la GIF — ma è un valore nuovo entrato senza una decisione esplicita, esattamente come stava per succedere alle panche.

4. **Eseguire la migrazione** secondo le otto fasi del piano, dal 15 agosto.

5. **Popolare il catalogo — terzo lavoro, obbligatorio.** Le 22 GIF caricate avranno riga in `biblioteca_gif` e nessun codice in `esercizi_catalog`. Per ognuna si decide, guardando la GIF, se diventa un esercizio: in caso affermativo entra a catalogo dal Sheet, altrimenti resta libera **con la decisione scritta**, non per omissione. Prima di aprire la lista, incrociare i nomi col catalogo e separare i due mucchi — candidati nuovi contro codici già esistenti senza `gif_slug` → [L20](LEZIONI.md#l20--la-domanda-giusta-non-è-sempre-diventa-un-esercizio). I codici si allocano **al momento della scrittura** → [L6](LEZIONI.md#l6--codici-allocati-in-anticipo-si-scontrano).

**Pettorali è chiusa solo dopo il punto 5.** Fino ad allora Polpacci non si apre.

I punti 2 e 3 sono le due voci rimaste aperte l'11 agosto; il punto 1 è il prerequisito tecnico dell'esecuzione.

### Le tre decisioni sul vocabolario, prese l'11 agosto

| caso | decisione |
|---|---|
| `Piegamenti declinati panca` · `Piegamenti inclinati panca` | **restano come sono.** Qui `panca` è il supporto su cui appoggiano mani o piedi, non un valore del vocabolario delle panche: l'inclinazione la dichiara l'aggettivo del movimento. Non sono una sesta panca |
| `Piegamenti deficit slancio panche piane` | **resta al plurale.** Il vocabolario chiude i termini, non il numero: `piana` è dentro, e due panche affiancate sono due |
| `dip-parallele` conteso | **il caricamento va in coda**, dopo il sync e dopo che EX072 ha liberato lo slug passando a `dip-station` |

Le prime due chiudono la domanda "esiste una sesta panca?": no. Il vocabolario resta a cinque — piana, inclinata, declinata, verticale, Scott.

Sul terzo: `slug` è unico su tutte e 1.570 le righe di `biblioteca_gif`, quindi la riga nuova non entra finché la vecchia non se ne va. **Sul bucket non c'è conflitto** — `Dip station.gif` e `Dip parallele.gif` sono percorsi diversi. Il vincolo è solo sull'unicità dello slug, ed è per questo che guardando i 22 caricamenti da soli non si vedeva.

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

| file | cartella | da riprendere con | stato |
|---|---|---|---|
| `Piegamenti sulle dita` | Pettorali | zona Pettorali | ✅ **ripreso 11 agosto**: confermato e dentro il piano Pettorali, gruppo E |
| `Piegamenti mani ruotate all'indietro` | Tricipiti | zona Tricipiti | ancora fuori da ogni tabella |

⚠️ La decisione su `Piegamenti sulle dita` porta l'etichetta di zona **`Bicipiti e Braccia`**: era stata presa il 1 agosto, quando il file stava lì, prima dello spostamento in Pettorali. Stessa impronta (`18a5654fce02`), stesso nome, conferma data guardando la GIF — vale, ed è stata contata come l'82ª di Pettorali. È il motivo per cui il registro, filtrato per etichetta di zona, ne mostra 81.

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
