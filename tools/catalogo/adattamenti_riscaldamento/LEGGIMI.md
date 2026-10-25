# Adattamenti «zona: …» per il riscaldamento (25 ottobre 2026)

Il riscaldamento tiene una riga che ha un conflitto con le limitazioni della persona solo se il suo `adattamento` ha un tratto «zona: …» per ogni zona in conflitto (`_trainGenAdattamentoCopre`). Con l'ok di Ignazio ho aggiunto i tratti che mancavano in 6 righe di riscaldamento con zona (EX503, EX547, EX647, EX649, EX670, EX693). In EX101 ho cambiato «salute della spalla:» in «spalle:»: oggi la riga è senza zona, ma la correzione era segnalata dalla Regia. Il registro dei campi è in `modifiche.tsv`.

Ordine seguito: foglio esportato e uguale al database → `prepara.py` → incolla in A2 → foglio riletto (0 celle diverse) → backup `2026-10-25_2233` → sync 824 → `verifica_sync.py` tutto a posto → confronto codice per codice: 0 differenze, 7 su 7 → baseline invariata → ricontrollo: nessuna riga di riscaldamento ha più una zona scoperta.
