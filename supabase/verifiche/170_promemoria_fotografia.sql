-- Notifiche 170: fotografia da leggere prima e dopo 20261101_170_promemoria_pasti.sql. Sola lettura.
-- Prima: colonna 0, tabelle 0, vincolo 0, regole 0, il conto dei profili è N.
-- Dopo: colonna 1, tabelle 2, vincolo 1, regole 5 (4 su push_iscrizioni, 1 su promemoria_inviati), RLS accesa
-- su tutte e due (2), i profili sono ancora N e nessuno ha promemoria accesi (0): la migrazione aggiunge e basta.
select
  (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'promemoria_pasti') as colonna_promemoria_pasti,
  (select count(*) from information_schema.tables  where table_schema = 'public' and table_name in ('push_iscrizioni', 'promemoria_inviati')) as tabelle,
  (select count(*) from pg_constraint where conname = 'profiles_promemoria_pasti_chk') as vincolo,
  (select count(*) from pg_policies where schemaname = 'public' and tablename in ('push_iscrizioni', 'promemoria_inviati')) as regole,
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname in ('push_iscrizioni', 'promemoria_inviati') and c.relrowsecurity) as rls_accesa,
  (select count(*) from public.profiles) as profili;

-- I permessi di tabella, solo DOPO: authenticated deve avere SELECT/INSERT/UPDATE/DELETE su push_iscrizioni e il solo
-- SELECT su promemoria_inviati; anon niente su tutte e due.
-- select table_name, grantee, string_agg(privilege_type, ',' order by privilege_type) as permessi
-- from information_schema.role_table_grants
-- where table_schema = 'public' and table_name in ('push_iscrizioni', 'promemoria_inviati') and grantee in ('anon', 'authenticated', 'service_role')
-- group by 1, 2 order by 1, 2;

-- Solo DOPO (prima la colonna non c'è e la riga non compila):
-- select count(*) filter (where promemoria_pasti is not null and cardinality(promemoria_pasti) > 0) as con_promemoria from public.profiles;
