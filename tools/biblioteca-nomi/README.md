# Conferma nomi — intera biblioteca esercizi

Vista di conferma visiva a blocchi, primo passo del cantiere 600 GIF.
Pagina locale sul Mac: **non** fa parte dell'app, **non** è una pagina pubblicata.

## Uso

```bash
cd tools/biblioteca-nomi
python3 prepara.py "Addominali e Core"     # sola lettura, costruisce lavoro/<zona>.json
python3 server.py                          # poi apri http://localhost:8767
```

`prepara.py` cerca l'export di `biblioteca_gif` in `~/Downloads/Biblioteca GIF Rows.csv`;
si cambia con `--bib percorso.csv`. Rilancialo quando esporti una versione più fresca.

Per rifare la preparazione di un'altra cartella basta ripetere `prepara.py` con il suo nome:
la pagina mostra un menù con tutte le zone preparate.

## Doppio binario

Ogni riga è classificata, e da lì dipende cosa succede allo slug:

| stato | significato | file | slug |
|---|---|---|---|
| `collegato` | un codice a catalogo punta a questa GIF: è viva nell'app | si rinomina | **solo registrato** in `esiti/slug_da_migrare.tsv` |
| `pendente` | impegnato dal cantiere 96 righe non ancora sincronizzato sullo Sheet | si rinomina | **solo registrato** |
| `indicizzato` | riga in `biblioteca_gif` ma nessun codice | si rinomina | libero |
| `libero` | nessun aggancio | si rinomina | libero |
| `indeterminato` | impronta di un oggetto del bucket non calcolabile: non si può dire | si rinomina | **solo registrato** |

## L'aggancio si fa per impronta, mai per nome

Un file si collega alla sua riga confrontando lo **SHA-256** con quello dell'oggetto
nel bucket. Il nome non entra nella classificazione.

Non è una raffinatezza. Nel bucket i nomi sono già stati normalizzati da cantieri
precedenti, mentre sul Mac sono ancora quelli originali: lo stesso identico contenuto
ha due nomi diversi sui due lati. La prima versione dello strumento confrontava i nomi
e su `Bicipiti e Braccia` dichiarava `libere` **58 GIF su 75** che sono vive nell'app —
cioè con slug liberamente applicabile. Su `Addominali e Core` lo stesso difetto pesava
6 righe su 69 e fu corretto a valle.

Se l'impronta di un oggetto del bucket non si riesce a calcolare, i file senza riscontro
diventano `indeterminato`, **non** `libero`: potrebbero corrispondere proprio a
quell'oggetto. Il ripiego silenzioso su `libero` è ciò che ha causato il difetto.

Le impronte del bucket sono in cache in `lavoro/_impronte/<zona>.json`, indicizzate per
`eTag` e dimensione: si ricalcolano solo se l'oggetto cambia.

⚠️ `cantiere_96_pendente.tsv` è invece ancora indicizzato per **nome file sul Mac**.
Dopo una rinomina quelle chiavi non corrispondono più, e lo stato `pendente` decade.

Lo slug **non viene mai applicato** su Storage o database da questo strumento.
Quella è un'operazione a parte, in cui bucket e database si aggiornano insieme.
In `slug_da_migrare.tsv` finiscono solo le righe in cui lo slug cambia davvero.

Se più codici puntano allo stesso `gif_slug` la riga è marcata `condiviso`: vale la
strada dei due codici sulla stessa GIF, non si applica.

## Sicurezza

- **Prova a vuoto** obbligatoria: il bottone "Applica" resta spento finché non l'hai fatta.
- **Backup** in `backup/mappa_<zona>_<data>.json` prima di ogni rinomina: la mappa
  nome vecchio → nome nuovo con SHA-256, più l'impronta di tutta la cartella.
- Prima di rinominare si ricontrolla che il file esista e che il suo SHA-256 sia ancora
  quello della preparazione. Se il contenuto è cambiato la riga **si salta**, non si indovina.
- Non si sovrascrive mai: se il nome di destinazione esiste già, la riga si salta.
- **Ripresa**: l'avanzamento è in `esiti/registro_decisioni.tsv`, con chiave SHA-256.
  L'impronta sopravvive alla rinomina, quindi chiudere e riaprire la pagina funziona
  anche dopo che i file hanno cambiato nome.

## Output

| file | contenuto |
|---|---|
| `esiti/registro_decisioni.tsv` | una riga per esercizio deciso |
| `esiti/slug_da_migrare.tsv` | gli slug da portare su Storage + DB nel passo dedicato |
| `esiti/log_rinomine.tsv` | cosa è stato rinominato, saltato o andato in errore |
| `backup/mappa_*.json` | mappa completa con SHA-256, una per applicazione di blocco |

Tutti i TSV sono UTF-8 con BOM e terminatori CRLF, in append.

## Nome proposto

`nomenclatura.py` applica la nomenclatura v2 di `CLAUDE.md` per quello che si può
dedurre dal testo: toglie la parte inglese fra parentesi, scrive `gradi` per esteso,
toglie i default (`bilaterale`, `simultaneo`), sentence case con la lista chiusa dei
nomi propri e delle sigle.

**Non riordina** i termini in `[Movimento][Attrezzo][Variante][Posizione]`: quello
richiede di sapere cosa mostra la GIF. La proposta è una proposta — decide Ignazio
guardando l'immagine.

Da dove parte la proposta, in ordine di autorevolezza: nome già scelto nel cantiere 96 →
nome a catalogo (già passato per il cantiere v2) → nome dedotto dal file. I chip sotto
il campo permettono di passare da una fonte all'altra con un click.

## Variabile d'ambiente

`BIBLIOTECA_ROOT` cambia la cartella radice delle GIF. Serve per collaudare su copie
senza toccare la biblioteca vera.
