-- Nutrition 230: fotografia di meal_items.quantity, da leggere prima e dopo 20261025_230. Sola lettura.
-- Prima e dopo: righe, somma e massimo devono coincidere; il tipo passa da numeric(7,1) a numeric(8,2).
select
  (select format_type(atttypid, atttypmod) from pg_attribute
    where attrelid = 'public.meal_items'::regclass and attname = 'quantity') as tipo,
  count(*)                                   as righe,
  sum(quantity)                              as somma_quantita,
  max(quantity)                              as quantita_massima,
  count(*) filter (where quantity = 0 and kcal > 0) as righe_zero_con_calorie,
  count(*) filter (where unit = 'pz')        as righe_pezzi
from public.meal_items;
