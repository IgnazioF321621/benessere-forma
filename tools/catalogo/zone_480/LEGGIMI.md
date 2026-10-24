# Zona del corpo per il riscaldamento (Training 480, 24 ottobre 2026)

Colonna nuova `zona` in `esercizi_catalog`. È una lista con «;», al massimo due valori. I valori ammessi sono sette: spalle · scapole · colonna toracica · polsi · anche · caviglie · ginocchia. Il generatore la usa per scegliere un esercizio per zona: quattro zone nelle sedute Upper, tre nelle Lower. Una riga senza zona non entra nel riscaldamento specifico.

- **Da dove vengono i valori.** 36 righe le ha confermate Ignazio nella pagina locale, con la GIF davanti; le sue scelte sono in `esiti/zone_480.tsv`. Le altre vengono da `proposta_480.tsv`, perché Ignazio ha detto «vedi tu, le sistemiamo con i feedback». In `decisioni_480.tsv` c'è la fonte di ogni riga.
- **Regola di Ignazio, decisa con i pulsanti.** Nel riscaldamento specifico entrano solo esercizi a corpo libero o con l'elastico. I quattro esercizi al cavo (EX058, EX101, EX416, EX500) restano senza zona, anche dove nella pagina ne aveva data una.
- **Senza GIF.** EX085, EX094, EX118 ed EX122 non hanno immagine, quindi restano senza zona.
- **Cinque righe passano dal recupero al riscaldamento.** EX784, EX786 ed EX788 per i polsi, EX823 ed EX834 per le caviglie. A queste `uso` prende anche «riscaldamento». Sono allungamenti fermi: prima dei pesi vanno tenuti brevi, 30 secondi (nota di ZT-Training dalla letteratura).
- **31 righe ricevono la `spiegazione` che non avevano.** Quelle già scritte non si toccano.

Il file per ZT-Training è `zone_480.tsv` (codice, zona, entra_nel_riscaldamento). Il registro dei campi è `modifiche.tsv`.

**Ordine.** Prima la Regia esegue la migrazione `20261024_480_catalogo_zona.sql`. Il sync manda come colonne tutte le intestazioni della prima riga, quindi con «zona» nel foglio e la colonna non ancora nel database fallisce tutto. Poi si esporta il foglio e si confronta col database → `prepara.py foglio.csv uscita` → si incolla il foglio intero in A1 (26 colonne) → si rilegge il foglio → backup → sync → `verifica_sync.py` → confronto codice per codice → baseline dei pool.
