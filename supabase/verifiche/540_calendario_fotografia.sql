-- Training 540: fotografia di profiles, da leggere prima e dopo 20261030_540. Sola lettura.
-- Prima: le tre colonne non esistono (0 nelle prime tre righe), i vincoli neanche, il conto dei profili è N.
-- Dopo: le tre colonne esistono (1), i tre vincoli ci sono, il conto dei profili è ancora N, e nessuna riga ha un
-- valore (0 con ora, 0 con giorni, 0 con token): la migrazione aggiunge e basta.
select
  (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'train_orario')      as colonna_train_orario,
  (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'train_giorni')      as colonna_train_giorni,
  (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'calendario_token')  as colonna_calendario_token,
  (select count(*) from pg_constraint where conname in ('profiles_train_orario_chk', 'profiles_train_giorni_chk', 'profiles_calendario_token_key')) as vincoli,
  (select count(*) from public.profiles) as profili;

-- Solo DOPO la migrazione (prima le colonne non ci sono e la riga non compila):
-- select
--   count(*) filter (where train_orario is not null)     as con_ora,
--   count(*) filter (where train_giorni is not null)     as con_giorni,
--   count(*) filter (where calendario_token is not null) as con_token
-- from public.profiles;
