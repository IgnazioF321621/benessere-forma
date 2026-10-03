-- ═══════════════════════════════════════════════════════════
-- Impedire le righe doppie: serie, allenamenti e misure (Fondamenta 090)
-- 3 ottobre 2026
-- ═══════════════════════════════════════════════════════════
-- Tre vincoli «una riga sola per»:
--   training_logs  (persona, giorno, sessione, esercizio, numero di serie)
--   workouts       (persona, giorno, sessione) — e' la chiave che l'app controllava
--                  «guardando prima di scrivere»; un giorno puo' avere una sessione
--                  di lavoro e un recupero, non due righe della stessa sessione
--   body_logs      (persona, giorno) — fra i bug noti da mesi
--
-- Se ci sono gia' righe doppie il file SI FERMA e dice quante: non cancella
-- niente da solo (decide Ignazio, con l'elenco di
-- supabase/verifiche/070_080_090_fotografia.sql). Idempotente.
--
-- Da lanciare DOPO 20261003_070_080_codice_e_tabella_unica.sql (che travasa le
-- serie in training_logs) e PRIMA del rilascio: l'app nuova salva allenamenti e
-- misure con «scrivi o aggiorna» (upsert) sopra questi vincoli, e senza di essi
-- Postgres risponde «nessun vincolo corrisponde» (42P10).
-- ═══════════════════════════════════════════════════════════

do $$
declare n bigint;
begin
  -- training_logs
  select count(*) into n from (
    select 1 from public.training_logs
    group by user_id, date, session_id, exercise_name, set_number having count(*) > 1) d;
  if n > 0 then
    raise exception 'training_logs: % chiavi con righe doppie. Niente vincolo finche'' non si decide cosa tenere (vedi supabase/verifiche/070_080_090_fotografia.sql).', n;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'training_logs_serie_key') then
    alter table public.training_logs
      add constraint training_logs_serie_key unique (user_id, date, session_id, exercise_name, set_number);
  end if;

  -- workouts
  select count(*) into n from (
    select 1 from public.workouts group by user_id, date, session_type having count(*) > 1) d;
  if n > 0 then
    raise exception 'workouts: % chiavi con righe doppie. Niente vincolo finche'' non si decide cosa tenere.', n;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'workouts_user_date_session_key') then
    alter table public.workouts
      add constraint workouts_user_date_session_key unique (user_id, date, session_type);
  end if;

  -- body_logs
  select count(*) into n from (
    select 1 from public.body_logs group by user_id, date having count(*) > 1) d;
  if n > 0 then
    raise exception 'body_logs: % giorni con righe doppie. Niente vincolo finche'' non si decide cosa tenere.', n;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'body_logs_user_date_key') then
    alter table public.body_logs
      add constraint body_logs_user_date_key unique (user_id, date);
  end if;
end $$;

select conname as vincolo, conrelid::regclass as tabella, pg_get_constraintdef(oid) as regola
from pg_constraint
where conname in ('training_logs_serie_key', 'workouts_user_date_session_key', 'body_logs_user_date_key')
order by 2;
