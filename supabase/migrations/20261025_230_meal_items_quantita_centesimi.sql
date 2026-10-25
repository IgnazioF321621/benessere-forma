-- Nutrition 230 (25 ottobre 2026): la quantità di un ingrediente si tiene al centesimo. Dal Nutrition 220 il form
-- scala le porzioni per ½ ¾ 1 1½ 2 e tiene i pezzi al centesimo (¾ di 1 pz = 0,75); con numeric(7,1) la riga
-- entrava come 0,8 pz con le calorie di 0,75, e riaprendo il pasto 1 porzione valeva 750 kcal invece di 800.
-- numeric(7,1) → numeric(8,2): stesse 6 cifre prima della virgola, una in più dopo; nessun valore cambia.
-- Nessuna vista dipende dalla colonna (fotografia 20261002_000). La tabella esiste già: niente GRANT nuovi.
-- Si esegue PRIMA del rilascio del codice che salva al centesimo, dopo la copia di sicurezza; prima e dopo si legge
-- supabase/verifiche/230_quantita_fotografia.sql (i numeri devono coincidere). Idempotente.
-- La copia di sicurezza si fa fuori dal database, con tools/backup_dati.py (una tabella di copia in public
-- prenderebbe i permessi di default e non sarebbe legata agli account).
alter table public.meal_items
  alter column quantity type numeric(8,2);

comment on column public.meal_items.quantity is 'Quantità nell''unità della riga (g · ml · pz), al centesimo (Nutrition 230): ¾ di un pezzo = 0,75.';
