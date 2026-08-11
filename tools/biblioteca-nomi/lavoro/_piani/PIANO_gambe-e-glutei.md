# Piano di migrazione — zona "Gambe e Glutei"

**Dry-run.** Nessuna scrittura su bucket, `biblioteca_gif`, `esercizi_catalog`,
Sheet, Mac o git. Da approvare prima di qualunque esecuzione.

Costruito con `pianifica.py "Gambe e Glutei"` (164 file del Mac) più le tre
correzioni che quello strumento da solo non può fare, documentate qui sotto.
Aggancio sempre per **SHA-256**, mai per nome.

Dati grezzi: `_piani/piano_gambe-e-glutei.json` · `_piani/piano_gambe-e-glutei.tsv`

---

## Quadratura

| | n |
|---|---|
| file sul Mac | 164 |
| oggetti solo nel bucket | 2 |
| **oggetti della zona** | **166** |
| di cui **fuori dal piano** (doppioni di contenuto) | **3** |
| **oggetti che il piano tratta** | **163** |

Un terzo oggetto solo-bucket, `c200128141d1` *Affondo unilaterale sul posto a
corpo libero*, è **uscito** il 4 ago: EX015 ed EX323 vengono riagganciati alla
GIF `Affondo sul posto` (`fc602a542d5a`, gruppo E). Vedi `da_consolidare.tsv`.

## Le sei popolazioni

| # | popolazione | n | operazione tecnica | righe doppie? |
|---|---|---|---|---|
| A | collegati · slug invariato | **55** | rinomina oggetto + `storage_path` | no |
| B | collegati · slug nuovo | **35** | **ordine a righe doppie** | **sì** |
| C | indicizzati liberi · slug invariato | **19** | rinomina oggetto + `storage_path` | no |
| D | indicizzati liberi · slug nuovo | **27** | rinomina + slug **in place** | no |
| E | mai caricati | **20** | caricamento: oggetto nuovo + riga nuova | no |
| F | salti pliometrici | **7** | **spostamento di cartella** Cardio → Gambe e Glutei | no |
| | **totale** | **163** | | |

Il brief prevedeva cinque insiemi; ne servono sei, perché fra i «collegati» e
gli «indicizzati liberi» la discriminante operativa non è il codice ma **se lo
slug cambia**: 55 collegati su 89 non cambiano slug e non hanno bisogno delle
righe doppie. Solo le **35 righe del gruppo B** aprono la finestra da coprire.

---

## Le tre correzioni a `pianifica.py`

### 1. I 7 salti non sono «nuova»

`pianifica.py` legge le impronte del solo prefisso `Gambe e Glutei/`, quindi
non vede gli oggetti che stanno sotto `Cardio e Conditioning/` e li dichiara
`nuova`. **Non vanno caricati: vanno spostati.** Nessuno dei sette è puntato da
un codice.

| nome confermato | oggetto oggi | slug esistente | operazione |
|---|---|---|---|
| Salto all'indietro | `Cardio e Conditioning/Salto all indietro.gif` | `salto-all-indietro` | sposta, **slug invariato** |
| Salto verticale esplosivo | `Cardio e Conditioning/Salto verticale esplosivo.gif` | `salto-verticale-esplosivo` | sposta, **slug invariato** |
| Squat jump ginocchia alte | `Cardio e Conditioning/Squat jump ginocchia alte.gif` | `squat-jump-ginocchia-alte` | sposta, **slug invariato** |
| Squat thrust | `Cardio e Conditioning/Squat thrust.gif` | `squat-thrust` | sposta, **slug invariato** |
| Jumping box | `Cardio e Conditioning/…` | diverso | sposta + slug in place |
| Salto lungo da fermo | `Cardio e Conditioning/…` | diverso | sposta + slug in place |
| Salto una gamba avanti | `Cardio e Conditioning/…` | diverso | sposta + slug in place |

Per i primi quattro **non si crea una riga nuova**: si aggiorna lo
`storage_path` della riga esistente. Il tool li segnalava come «collisione slug
esterna» proprio perché la riga con quello slug esiste già — ma è la loro.

### 2. I 3 doppioni di contenuto escono dal piano

Tre righe hanno lo stesso contenuto su **due percorsi** nel bucket. Il piano ne
modella uno solo: eseguirle sovrascriverebbe un oggetto vivo e rivendicherebbe
uno slug già assegnato (`slug` è di fatto unico: 1.554 righe, 1.554 slug).

| contenuto | oggetti | codici | dove va |
|---|---|---|---|
| `cb6e1394…` | `Estensione anca bilanciere (…)` + `Stacco rumeno una gamba bilanciere.gif` | **EX228 + EX289** | consolidamento |
| `fe67588e…` | `Leg curl macchina ginocchio rialzato (…)` + `Leg curl unilaterale … supporto coscia` | **EX247** | consolidamento |
| `bc6053d0…` | `Leg curl bilaterale … prese anteriori` + `Leg curl bilaterale … seduta` | — | consolidamento |

Sono le tre coppie già in `da_consolidare.tsv`. **Non si toccano in questa
migrazione**: un codice eliminato resta bruciato, e la scelta di quale
sopravvive è del giro unico di consolidamento.

### 3. Due slug collidono con righe morte

`pistol-squat-assistito` e `squat-hawaiano` sono già usati da righe che
puntano a `calisthenics/…`, cartella legacy: **gli oggetti non esistono più**
(HTTP 400) e **nessun codice** li punta. Sono due delle 924 righe orfane.

Poiché lo slug è di fatto unico, l'inserimento delle righe nuove sarebbe
fallito. **RISOLTO il 4 ago**: le due righe sono state cancellate, previo
dry-run (oggetto assente + zero codici, verificati) e backup completo in
`lavoro/_backup/bib_righe_morte_calisthenics_20260804T212747.tsv`.
`biblioteca_gif`: 1.556 → 1.554 righe. I due slug sono liberi e i nomi
confermati restano quelli giusti — non sono stati piegati per aggirare righe
fantasma.

---

## Ordine delle operazioni

### Fase 0 — Backup (obbligatoria, prima di ogni scrittura)

1. elenco oggetti del bucket della zona **con impronte** →
   `lavoro/_backup/bucket_gambe-e-glutei_<ts>.tsv`
2. tutte le righe `biblioteca_gif` con `storage_path` nella zona **e** i 7 slug
   dei salti sotto Cardio → `lavoro/_backup/bib_gambe-e-glutei_<ts>.tsv`
3. righe `esercizi_catalog` dei 92 codici coinvolti (`codice`, `nome`,
   `gif_slug`) → `lavoro/_backup/catalogo_gambe-e-glutei_<ts>.tsv`

Senza i tre file, non si parte.

### Fase 1 — Righe doppie, parte alta (gruppo B, 35 righe)

Per ciascuna: **prima** si aggiunge in `biblioteca_gif` una riga con lo **slug
nuovo** e lo **stesso `storage_path` attuale**. Da questo istante lo slug
vecchio e quello nuovo risolvono entrambi. Nessuna finestra scoperta.

### Fase 2 — Bucket (gruppi A, B, C, D, F)

Copia server-side → **verifica hash** → aggiorna `storage_path` → cancella il
vecchio. Mai invertire l'ordine. Per il gruppo F la copia attraversa la
cartella (`Cardio e Conditioning/` → `Gambe e Glutei/`).

Nei gruppi A e C il percorso cambia ma lo slug no: **5 righe su 74** hanno
davvero il percorso diverso, le altre 69 sono già allineate e non richiedono
alcuna operazione sul bucket.

### Fase 3 — Slug in place (gruppi D, F-parziale)

Nessun codice punta a queste righe: lo slug si aggiorna sulla riga esistente,
niente riga doppia. È la regola «zona senza codici: slug in place».

### Fase 4 — Caricamenti (gruppo E, 20 righe)

Upload dell'oggetto nuovo + riga nuova. Prerequisito: risolte le due
collisioni con `calisthenics/`.

### ⛔ Fase 5 — FERMATA: sync del Google Sheet

**Qui il piano si ferma e passa a Ignazio.** I 35 codici del gruppo B (più
quelli dei salti, se qualcuno ne acquisisce) vanno aggiornati sul foglio con il
`gif_slug` nuovo, poi si esegue il sync.

⚠️ Il sync riscrive **ogni** riga presente nel foglio: verificare anche i
codici toccati nei passi precedenti, non solo quelli nuovi.

Fino a qui la vecchia catena regge: entrambi gli slug risolvono.

### Fase 6 — Verifica prima di cancellare

Per **tutti** i codici della zona, interrogare il Worker con `?code=EX###` e
confrontare l'**impronta del file effettivamente scaricato** con quella attesa.
Non basta il 200.

### Fase 7 — Cancellazione delle righe vecchie

Solo dopo la fase 6, **una per una**, e solo se **nessun codice punta più** a
quello slug. Un solo codice residuo → non si cancella.

---

## Controlli già eseguiti

| controllo | esito |
|---|---|
| slug nuovi distinti fra loro | **nessuna collisione** |
| slug nuovi contro slug esistenti fuori zona | **7 segnalati** → 4 sono i salti (stessa riga), 2 sono righe morte `calisthenics/`, 1 è un doppione di contenuto |
| collisioni di percorso fra righe del piano | **nessuna** |
| destinazioni occupate da altri oggetti | **0** dal tool; **3** trovate a mano (i doppioni di contenuto) |
| percorsi non ASCII | **0** |
| codici che resterebbero senza GIF | **0** |
| simbolo `°` nei nomi | **0** — nessun nome confermato lo contiene |
| apostrofo | **1**: `Salto all'indietro` → slug `salto-all-indietro` (trattino), percorso `Gambe e Glutei/Salto all'indietro.gif` (apostrofo mantenuto, ASCII) ✓ |

## I 2 «solo bucket», dentro il piano

Entrambi **già confermati nel pannello**: il nome sta in
`registro_decisioni.tsv`, non nel `nome_proposto` del set di lavoro, che è solo
la proposta iniziale e resta indietro.

| impronta | nome confermato | slug attuale → nuovo | codici | gruppo |
|---|---|---|---|---|
| `680dae8c4cc4` | **Estensione anca elastico** | `estensione-anca-appoggio-bilanciere` → `estensione-anca-elastico` | **EX221** | **B** |
| `a0e304b97dce` | **Hip thrust bilanciere una gamba** | `hip-thrust-unilaterale-schiena-su-panca` → `hip-thrust-bilanciere-una-gamba` | — | **D** |

Slug nuovi e percorsi di destinazione verificati **liberi** in `biblioteca_gif`.
L'immagine si prende dalla cache `lavoro/_bucket/`, non dal Mac.

## ⚠️ EX221 — il catalogo va allineato su due campi, non uno

La GIF mostra un'**estensione d'anca con elastico**. Il codice dice un'altra
cosa, e su due campi:

| campo | oggi | deve diventare |
|---|---|---|
| `nome` | `Estensione anca appoggio bilanciere` | **`Estensione anca elastico`** |
| `attrezzo` | `corpo libero` | **`elastico`** |
| `gif_slug` | `estensione-anca-appoggio-bilanciere` | `estensione-anca-elastico` |

`attrezzo` era già sbagliato **prima** di questo cantiere: il `setup` recita
«mani appoggiate a un bilanciere verticale/struttura fissa per equilibrio», cioè
il bilanciere è un appoggio, non un carico — ma l'attrezzo che dà resistenza è
l'elastico, e non compare da nessuna parte. Con `attrezzo = corpo libero` il
codice entra oggi nei pool di chi non ha elastici, e non dovrebbe.

Tutti e tre i campi si correggono **sul Sheet nella fase 5**, insieme.

## Rinviato

- **Swing elastico maniglie**: resta in questa zona e migra normalmente. Il
  trasferimento a Spalle e Cuffia è registrato in coda e **non** va anticipato.

## Verifica finale per dichiarare la zona chiusa

1. ogni codice della zona risolve via Worker, con **impronta del file
   scaricato** uguale a quella attesa;
2. `biblioteca_gif` non ha più righe della zona con slug vecchi;
3. ogni oggetto del bucket della zona ha esattamente una riga che lo punta;
4. nessun file sul Mac senza oggetto corrispondente per impronta;
5. i conteggi tornano: 161 trattati + 3 doppioni + 3 rinviati = 167;
6. `da_consolidare.tsv` aggiornato con ciò che resta aperto.
