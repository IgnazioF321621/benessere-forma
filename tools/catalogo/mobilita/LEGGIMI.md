# Mobilità · terzo lavoro (catalogo) — 14 ottobre 2026

Il catalogo si scrive solo dal foglio Google. Qui ci sono le righe pronte; niente è stato scritto su Supabase.

## Cosa entra
- **99 esercizi nuovi**, EX739-EX837 (`righe_nuove.tsv`, 25 colonne con intestazione: le 24 del foglio più `spiegazione` in fondo).
- **8 esercizi già a catalogo** che prendono la loro GIF (`esistenti_verticale.txt`, colonna → valore): EX121 EX123 EX124 EX126 EX127 EX129 EX130 EX131. Prendono il nome inglese della GIF (decisione di Ignazio).
- **Non entrano**: 6 GIF escluse da Ignazio (Arm hug stretch, Band ankle eversion, Band calf stretch, Band tibialis posterior stretch, Double leg stretch, Stick shoulder stretch) e Vacuum addominale (immagine del blocco attivazione, Training 390). Restano nella biblioteca come immagini.
- Restano senza GIF: EX029 Cat-cow, EX117, EX118, EX119, EX120, EX122, EX125 Child's pose, EX128 Stretch petto al muro.

Come si è deciso: abbinamenti e righe in `tools/biblioteca-nomi/abbina.py` (pagina locale, porta 8769), proposte in `tools/biblioteca-nomi/mobilita_catalogo_bozze.json`, scelte di Ignazio in `tools/biblioteca-nomi/esiti/mobilita_abbinamenti.tsv`, `mobilita_catalogo_righe.tsv`, `mobilita_catalogo_decisioni.tsv`. Ignazio ha guardato le 33 GIF con un dubbio; i testi di tutte sono stati scritti e poi ricontrollati contro la GIF (22 corretti).

## Ordine (non saltare)
1. **Migrazione** `supabase/migrations/20261014_010_catalogo_spiegazione.sql` (colonna `spiegazione`). Senza, il sync si ferma su una colonna che non esiste.
2. Copia di sicurezza: `python3 tools/backup_dati.py --senza-foto`.
3. Nel foglio: colonna `spiegazione` in fondo, dopo `progressione`; le 8 righe esistenti a mano da `esistenti_verticale.txt`; le 99 nuove incollate in fondo dalla **seconda riga** del TSV.
   **I codici sono assegnati sull'ultimo vivo al 14 ottobre (EX738)**: se nel frattempo il catalogo ha preso altri codici, rigenerare prima di incollare (L6).
4. Sync, poi `python3 tools/biblioteca-nomi/verifica_sync.py` prima di qualunque altra cosa, confronto codice per codice contro questa lista (L41), `python3 tools/baseline_pool.py --gruppi` (L17).

## Cosa cambia nell'app
33 esercizi nuovi hanno `uso = riscaldamento` (solo movimenti dinamici): il riscaldamento Lower pesca per muscolo a rotazione sul codice, quindi le schede nuove possono proporne alcuni. Gli altri 66 sono `recupero;mobilita`, che oggi il generatore non usa. La riga `spiegazione` sotto il nome va mostrata dall'app: Training 390.
