-- Catalogo e GIF 040 · Training 280 e 320 (11 ottobre 2026): due colonne nuove di esercizi_catalog.
-- Aggiungere è libero; la tabella esiste già, quindi niente GRANT nuovi. Si esegue PRIMA del sync che
-- porta i valori dal foglio Google (tools/catalogo/ondata3/LEGGIMI.md). Idempotente.
--   unilaterale   si · alternato · no   (un lato per volta: le ripetizioni si contano per lato)
--   progressione  la via che il coach nomina in cima alle ripetizioni (carico · elastico più duro ·
--                 meno assistenza · carico in mano · ritmo più lento · variante più difficile ·
--                 più ripetizioni · tenuta più lunga)
alter table public.esercizi_catalog
  add column if not exists unilaterale  text,
  add column if not exists progressione text;

alter table public.esercizi_catalog
  drop constraint if exists esercizi_catalog_unilaterale_chk;
alter table public.esercizi_catalog
  add constraint esercizi_catalog_unilaterale_chk
  check (unilaterale is null or unilaterale in ('si','alternato','no'));

comment on column public.esercizi_catalog.unilaterale  is 'si = un lato per volta (ripetizioni per lato) · alternato · no. Fonte: foglio Google (Catalogo 040).';
comment on column public.esercizi_catalog.progressione is 'La via di progressione che il coach nomina in cima alle ripetizioni (Training 320). Fonte: foglio Google.';
