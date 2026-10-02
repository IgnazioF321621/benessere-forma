-- ═══════════════════════════════════════════════════════════
-- Il diario del giorno (Fondamenta 050)
-- 2 ottobre 2026
-- ═══════════════════════════════════════════════════════════
-- Una riga per persona e per giorno, unica da subito. Tiene SOLO ciò che l'app
-- non sa già (deciso da Ignazio il 2 ottobre): come stai — ore di sonno, energia,
-- stress, una nota — e il tipo di giornata dichiarato.
--
-- NON tiene i totali del giorno: calorie, macro e serie si calcolano al momento
-- da pasti e allenamenti, come sempre. Un numero sta in un posto solo (L49).
--
-- day_type è ciò che la persona dichiara, e può restare vuoto. Digiuni e riposi
-- già registrati restano dove sono (fasting_days, workouts): qui non si ricopiano.
--
-- La persona legge e scrive solo le proprie righe. Nessuna regola admin:
-- sonno, energia e stress non si vedono dalla dashboard finché non lo si decide.
--
-- Tabella NUOVA: non tocca niente di ciò che esiste. Idempotente.
-- ═══════════════════════════════════════════════════════════

create table if not exists public.daily_log (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  date         date not null,
  sleep_hours  numeric(3,1),
  energy       smallint,
  stress       smallint,
  day_type     text,
  note         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint daily_log_user_date_key unique (user_id, date),
  constraint daily_log_sleep_check check (sleep_hours is null or (sleep_hours >= 0 and sleep_hours <= 24)),
  constraint daily_log_energy_check check (energy is null or energy between 1 and 5),
  constraint daily_log_stress_check check (stress is null or stress between 1 and 5),
  constraint daily_log_day_type_check check (day_type is null or day_type in ('training', 'rest', 'deload', 'injury', 'fasting')),
  constraint daily_log_note_len check (note is null or char_length(note) <= 1000)
);

drop trigger if exists trg_daily_log_updated_at on public.daily_log;
create trigger trg_daily_log_updated_at before update on public.daily_log
  for each row execute function public.set_updated_at();

alter table public.daily_log enable row level security;

-- Permessi di tabella, dichiarati qui: dal 30 ottobre 2026 Supabase non li dà più da solo
-- e senza l'app riceve «permission denied». Chi è entrato fa tutto sulle proprie righe
-- (le regole qui sotto dicono quali); chi non è entrato (anon): niente.
grant select, insert, update, delete on public.daily_log to authenticated;
grant all on public.daily_log to service_role;

drop policy if exists "daily_log_select_own" on public.daily_log;
create policy "daily_log_select_own" on public.daily_log
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "daily_log_insert_own" on public.daily_log;
create policy "daily_log_insert_own" on public.daily_log
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "daily_log_update_own" on public.daily_log;
create policy "daily_log_update_own" on public.daily_log
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "daily_log_delete_own" on public.daily_log;
create policy "daily_log_delete_own" on public.daily_log
  for delete to authenticated using (auth.uid() = user_id);
