# Correzioni di testi del 20 ottobre 2026

Tre feedback di Ignazio (Catalogo 110, Catalogo 090, Training 360), decisi da lui guardando la GIF.

- **EX120 Affondo con rotazione**: setup, esecuzione ed errori riscritti sulla sua GIF (ExerciseDB `K9VL0Jq`: affondo in piedi, busto che ruota, mani al petto, nessuna mano a terra). La mano a terra non era nel catalogo: è nel Recovery Day scritto nel codice (`app/training_generatore.js`, «Affondo basso con rotazione dx/sx» col codice EX120), che resta alla sessione Training.
- **EX117**: la sua GIF (ExerciseDB `DFGXwZr`) non è World's greatest stretch e non ruota. Ignazio ha deciso che il codice diventa quello che si vede: **Lunge to hamstring stretch** (nome scelto da lui nella pagina locale, `esiti/correzioni_ottobre.tsv`), testi, muscoli, adattamento e zone di rischio rifatti. World's greatest stretch esce dal catalogo.
- **8 rematori con petto in appoggio** (EX076 · EX460 · EX462 · EX467 · EX469 · EX482 · EX484 · EX485): nella versione con l'elastico, «sotto i piedi» → «ancorato in basso davanti alla panca» (`nota_surrogato`, `esecuzione_surrogato`).
- **Sforbiciate** (EX136 · EX149 · EX191 · EX604): passo in fondo all'esecuzione con cosa vale una ripetizione. Nelle GIF di EX136 ed EX149 le gambe salgono e scendono (tolto «incrociandosi» da EX136); in EX191 si incrociano, una sopra e una sotto (Ignazio). `unilaterale` resta `alternato`.

Ordine: foglio esportato e confrontato col database (0 differenze) → `prepara.py` → incolla del foglio intero in A2 → riletto il foglio (0 celle diverse) → backup `2026-10-20_1607` → sync 824 → `verifica_sync.py` tutto a posto → confronto codice per codice 0 differenze, 31 campi su 31 → baseline invariata (riscaldamento 81). Registro dei campi: `modifiche.tsv`.
