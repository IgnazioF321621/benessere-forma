# Parole di `zone_rischio` uguali ai tasti delle limitazioni (25 ottobre 2026)

Il generatore confronta le limitazioni scelte dalla persona con `zone_rischio` parola per parola, quindi «lombari» non incontra il tasto «lombare». Con l'ok di Ignazio ho cambiato solo la forma della parola in 170 righe: gomito → gomiti (86), polso → polsi (59), lombari → lombare (32), anca → anche (30), spalla → spalle (6), caviglia → caviglie (1). Nessun doppione nato nella stessa cella. Il registro dei campi è in `modifiche.tsv`.

Restano come sono le parole che non hanno un tasto: equilibrio 49, ischiocrurali 10, core 7, e una riga ciascuna per nessuna, toracico, bacino, pressione (EX574), polpacci, nocche e dita. Nel catalogo non ci sono «schiena bassa», «collo», «ginocchio» né altri sinonimi.

Ordine seguito: foglio esportato e confrontato col database (0 differenze) → `prepara.py` → incolla in A2 → foglio riletto (0 celle diverse) → backup `2026-10-25_2205` → sync 824 → `verifica_sync.py` tutto a posto → confronto codice per codice: 0 differenze, 170 righe su 170, nessun'altra riga cambiata → baseline invariata (principali 417, riscaldamento 86).
