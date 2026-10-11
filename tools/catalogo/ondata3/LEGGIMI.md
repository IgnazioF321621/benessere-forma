# Ondata 3 · Sessione F — catalogo per Training 280 e 320, testo di EX647

*11 ottobre 2026. Il catalogo si scrive solo dal foglio Google: qui ci sono le righe pronte da incollare. Niente è stato scritto su Supabase.*

## Le due colonne nuove (Catalogo e GIF 040)

Da aggiungere in fondo al foglio, dopo `gif_slug`, in quest'ordine:

| colonna | valori | a cosa serve |
|---|---|---|
| `unilaterale` | `si` · `alternato` · `no` | `si` = un lato per volta, le ripetizioni si contano per lato (Training 280); `alternato` = i lati si alternano dentro la serie; `no` = bilaterale. Sostituisce la lista fissa di 11 codici del generatore |
| `progressione` | `carico` · `elastico più duro` · `meno assistenza` · `carico in mano` · `ritmo più lento` · `variante più difficile` · `più ripetizioni` · `tenuta più lunga` | la via che il coach nomina quando si arriva in cima alle ripetizioni (Training 320), al posto di «aumenta il carico» per chi un carico non ce l'ha |

**Decisione di Ignazio (11 ottobre)**: per i multiarticolari a corpo libero su una gamba (Squat calcio laterale, Squat skater, affondi senza peso) la via è **`ritmo più lento`**.

## Come incollare

1. `unilaterale_progressione.tsv` ha **tutte le 725 righe in ordine di codice**: `codice · nome · unilaterale · progressione`. Prima di incollare controllare che il foglio sia nello stesso ordine (primo e ultimo codice, e il conteggio: 725). Poi incollare le sole colonne `unilaterale` e `progressione` nelle due colonne nuove, dalla seconda riga in giù. `nome` serve solo a controllare l'allineamento riga per riga (L44: lo sfasamento di colonna non si vede).
2. `da_rivedere.tsv`: le 220 righe con `unilaterale` diverso da `no`, per il controllo di Ignazio. Le regole che le hanno prodotte stanno in `ondata3_prepara.py` (`classifica_unilaterale`, `classifica_progressione`): una correzione si fa lì e si rigenera, mai a mano nel TSV.
3. `ex647.tsv`: la riga di **EX647 Squat calcio laterale** nelle 22 colonne del foglio, nel suo ordine. Cambiano `esecuzione` (passo 2: «Nel punto basso porta la mano verso il piede della gamba d'appoggio, busto fermo (non ruota)»), `errori` (schiena arrotondata riletta, più «Busto che ruota verso la gamba tesa») e `nota_sicurezza`. Per una riga sola la forma sicura è `ex647_verticale.txt` (colonna → valore, con «← cambia» dove cambia).
4. Dopo l'incolla: sync, poi `python3 tools/biblioteca-nomi/verifica_sync.py` prima di qualunque altra cosa, poi `python3 tools/baseline_pool.py --gruppi` (L17).

## Cosa serve ancora, in ordine

- La migrazione `supabase/migrations/20261011_040_catalogo_unilaterale_progressione.sql` (due colonne di testo, da eseguire prima del sync) e il **sync** che deve imparare le due colonne nuove: senza, l'incolla resta nel foglio.
- Il codice (brief a parte, dopo il sync verificato): il generatore legge `unilaterale` al posto di `_TRAIN_GEN_UNILATERAL`; il registro delle serie chiede due numeri per lato (campo nuovo in `training_logs`); «Ultima volta» e Progressione li leggono; il coach nomina `progressione` invece di «aumenta il carico».

## Rigenerare

```bash
python3 tools/catalogo/ondata3_prepara.py            # legge il catalogo vivo (chiave pubblica, sola lettura)
python3 tools/catalogo/ondata3_prepara.py --corpo-libero "carico in mano"   # se la decisione cambia
```
