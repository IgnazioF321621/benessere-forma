# Nomenclatura esercizi v2 — normativa vincolante

*In vigore dal 19 luglio 2026.* Regole per dare un nome agli esercizi del catalogo e derivarne lo slug.

Allegato normativo di [`CLAUDE.md`](../CLAUDE.md): **non è un archivio**, è lo standard in vigore. Si consulta ogni volta che un esercizio entra a catalogo o viene rinominato.

> Supera ogni regola precedente. In caso di conflitto vale solo quanto scritto qui.

**Le 12 regole**: 1 nome unico · 2 formula e default omessi · 3 maiuscole · 4 panche · 5 gradi · 6 slug monolingue · 7 codice stabile · 8 storico · 9 estensione attiva del rachide · 10 campo `uso` per i conditioning · 11 famiglia in testa · 12 lato del carico

---

**1. Nome unico.** Catalogo con un solo nome per esercizio. `nome_en` deprecata. Il nome è in italiano se l'italiano è il termine di sala; se il termine di sala è inglese resta inglese (`plank · crunch · hip thrust · face pull · pistol · jump squat · front squat · lat machine`).

**2. Formula**: `[Movimento] [Attrezzo] [Variante] [Posizione]` — preposizioni rimosse, default omessi. Attrezzo = ciò che si impugna: al cavo l'attrezzo è l'attacco (corda, maniglia…), non il cavo.

**Default omessi** — si scrivono solo quando l'esercizio si scosta dal default. Valgono su tutte le zone:

| default | si scrive solo | esempio |
|---|---|---|
| bilaterale · simultaneo | l'alternativa | `Curl alternato manubri` |
| bilanciere = dritto | `bilanciere EZ` | `Curl bilanciere` / `Curl bilanciere EZ` |
| presa = media | `presa larga` · `presa stretta` · `presa inversa` | `Curl bilanciere presa larga` |
| corpo libero | quando distingue da una versione con carico | — |

**3. Maiuscole**: prima lettera del nome + nomi propri (lista chiusa 12 voci: `Scott · Zottman · Arnold · Pendlay · Bulgarian · Jefferson · Svend · Larsen · Kelso · Russian · Yates · Bosu`) + sigle/designazioni tecniche nella forma canonica (`EZ · TRX · IT · Y-W · V · T · X`). Tutto il resto minuscolo anche se inglese.

`Bosu` è un marchio di attrezzo, non un termine comune. `T` e `X` sono designazioni di forma come `Y-W` e `V`: `Push up T prono`, `Corsa conetti a X`.

**4. Panche** — vocabolario chiuso a 5: `panca piana · panca inclinata · panca declinata · panca verticale · panca Scott`. `panca verticale` assorbe "90 gradi/con schienale". `panca romana` (iperestensore 45°) e `sedia romana` (torre verticale) sono **attrezzi distinti**, campo Attrezzo, fuori dal vocabolario delle 5 panche.

**5. Gradi**: simbolo `°` abolito ovunque nel nome — si scrive `gradi` per esteso. Nei campi descrittivi (`setup`, `esecuzione`, `errori`) è ammesso.

**6. Slug monolingue**: `gif_slug` = kebab-case ASCII dal solo nome unico. Schema `slug(IT)-slug(EN)` abolito. Path e filename SEMPRE ASCII. **L'apostrofo diventa trattino** (`Corsa all'indietro` → `corsa-all-indietro`), mai eliminato e mai sostituito da apostrofo tipografico. ⚠️ Normalizzare a NFC prima di traslitterare → [L15](LEZIONI.md#l15--i-nomi-file-macos-sono-in-forma-decomposta)

**7. Codice stabile**: `EX###` mai derivato dalla zona. Gap permanenti, mai renumerare.

**8. Storico**: qualunque rinomina va accompagnata da migrazione parallela su `training_logs` e `workout_sets` (indicizzano per nome testuale).

**9. Estensione attiva del rachide** — gli esercizi che estendono attivamente la schiena (superman, swimming, reverse hyper, iperestensioni) vanno in `Schiena e Trapezio` con `gruppo_target = lombari`, **mai in `Addominali e Core`**. Motivo: gli slot core dell'app sono anti-estensione e anti-rotazione e richiedono tenuta isometrica; un esercizio che estende attivamente la schiena in quello slot produce lo stimolo opposto a quello richiesto.

**10. Campo `uso` per i conditioning** — vale **solo per gli esercizi che stanno nella zona `Cardio e Conditioning`**:

| Tipo | `uso` | Effetto |
|---|---|---|
| Conditioning ciclico ad alta intensità | `finisher` | Entra nel pool Tabata (con `pattern = cardio_metabolico`) |
| Andature, agilità, lavoro tecnico di corsa | `riscaldamento` | Pool riscaldamento |
| Pliometria massimale che resta in Cardio | *vuoto* | Resta fuori da ogni pool |

`uso` vuoto è previsto **solo** per chi resta in `Cardio e Conditioning` e non deve entrare in alcun pool: è espressione di potenza, va eseguita a fresco, e il generatore non ha ancora uno slot dedicato.

Per tutti e tre i gruppi: `pattern = cardio_metabolico` e `gruppo_target` **vuoto**, per non inquinare il picker degli isolamenti.

**La zona comanda.** La pliometria massimale ricollocata in una zona muscolare segue le regole di quella zona: riceve `pattern`, `gruppo_target` e `uso` come ogni altro esercizio di zona, ed entra nei pool. Precedenti: EX268, EX212. Vale anche quando l'esercizio era già a catalogo come conditioning — otto salti identici per natura non possono essere trattati in due modi diversi solo perché uno c'era già ([caso](CANTIERI.md#gli-otto-salti-parcheggiati--risolti-5-agosto)).

**11. Famiglia in testa** — precisazione della regola 2, non sua sostituzione. La parola di famiglia apre sempre il nome, anche dove grammaticalmente suonerebbe meglio in seconda posizione: `Boxe combo gancio-montante`, non `Combo boxe gancio-montante`. Serve a far ordinare vicini gli esercizi imparentati.

- **Eccezione**: una famiglia preceduta da preposizione è un complemento, non la famiglia, e non va anteposta. `Skip con calcio` resta tale.
- Elenco **aperto**. Famiglie note: `squat · corsa · camminata · salto · skip · andatura · plank · boxe · calcio · affondo`. `boxe` copre i colpi di braccia, `calcio` quelli di gamba: un roundhouse al sacco è `Calcio circolare sacco`.
- Non ogni parola ricorrente è una famiglia: `bear crawl` e `wall ball` sono nomi propri e restano interi.

**12. Lato del carico negli esercizi unilaterali** — quando un esercizio si esegue su una gamba o un braccio solo e il carico può stare dallo stesso lato dell'arto che lavora o dal lato opposto, la differenza si dichiara con la coppia chiusa `stesso lato` · `lato opposto`.

- Nessuna altra formulazione è ammessa: **non** si usano `omolaterale`/`controlaterale`, che sono gergo (il catalogo è leggibile da chi si allena, non da chi studia anatomia).
- È una variante: segue l'attrezzo e precede la posizione.
- **Si scrive solo quando distingue.** Se di quell'esercizio esiste una sola versione a catalogo, il lato del carico non si dichiara.
- Nello slug: regole ordinarie (regola 6).
