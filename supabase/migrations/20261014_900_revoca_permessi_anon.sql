-- Sicurezza, 14 ottobre 2026 (Regia): permessi di tabella al ruolo anonimo.
-- Le tabelle più vecchie di Zona Tracker hanno ancora i permessi di fabbrica di Supabase
-- (anon può tutto sulla tabella). Le regole sulle righe (RLS) bloccano comunque chi non è
-- entrato, quindi nessun dato era esposto: questa è la seconda barriera.
-- Chi non è entrato (anon) resta in sola lettura SOLO sui tre cataloghi pubblici di riferimento;
-- tutto il resto è tolto. authenticated e service_role non cambiano.
-- Idempotente. Per tornare indietro: grant all on public.<tabella> to anon;
do $$
declare t record;
begin
  for t in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('revoke all on public.%I from anon', t.tablename);
  end loop;
  grant select on public.esercizi_catalog, public.exercise_media, public.nutrilite_catalog to anon;
end $$;
