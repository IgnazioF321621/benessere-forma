-- Training 360 · fotografia prima e dopo la migrazione 20261103_360_pause_multiple.sql (sola lettura).
-- Prima: la colonna non c'è ancora (la seconda e la terza lettura falliscono: va bene, si legge la prima).
-- Dopo: ogni profilo con una pausa nei campi di prima ha lo stesso periodo nell'elenco, e nessun altro ne ha uno.

-- 1. Le pause di adesso, nei campi di prima
select id, pausa_inizio, pausa_fine, pausa_motivo, pausa_moduli
  from public.profiles
 where pausa_inizio is not null
 order by id;

-- 2. Dopo: l'elenco accanto ai campi di prima
select id, pausa_inizio, pausa_fine, pausa_motivo, pausa_moduli, pause
  from public.profiles
 where pausa_inizio is not null or pause is not null
 order by id;

-- 3. Dopo: i conti (devono coincidere i primi due; il terzo è 0)
select count(*) filter (where pausa_inizio is not null)                                         as con_pausa_vecchia,
       count(*) filter (where pause is not null and jsonb_array_length(pause) > 0)               as con_elenco,
       count(*) filter (where pause is not null and pause->0->>'inizio' <> to_char(pausa_inizio, 'YYYY-MM-DD')) as diversi
  from public.profiles;
