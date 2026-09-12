-- ═══════════════════════════════════════════════════════════
-- Quadro settimanale — storico dei quadri chiusi (Fase 1, Lavoro C)
-- 12 settembre 2026
-- ═══════════════════════════════════════════════════════════
-- Una riga per utente e settimana chiusa. `picture` è l'oggetto di
-- buildWeeklyPicture (zona-tracker.html): weight · nutrition · training ·
-- body · blood · meta. null dentro il jsonb = "non registrato", mai zero.
-- La settimana corrente non si salva mai: cambia ogni giorno.
--
-- Eseguire in: Supabase Dashboard → SQL Editor → New query
-- Progetto: qxiyeiahpoiliwpqslpr
-- Idempotente: si può rilanciare senza effetti.
-- ═══════════════════════════════════════════════════════════

create table if not exists public.weekly_pictures (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  week_start  date not null,
  picture     jsonb not null,
  computed_at timestamptz not null default now(),
  constraint weekly_pictures_user_week_key unique (user_id, week_start),
  constraint weekly_pictures_week_start_lunedi check (extract(isodow from week_start) = 1)
);

alter table public.weekly_pictures enable row level security;

-- Ogni utente vede e scrive solo le proprie righe.
drop policy if exists "weekly_pictures_select_own" on public.weekly_pictures;
create policy "weekly_pictures_select_own" on public.weekly_pictures
  for select using (auth.uid() = user_id);

drop policy if exists "weekly_pictures_insert_own" on public.weekly_pictures;
create policy "weekly_pictures_insert_own" on public.weekly_pictures
  for insert with check (auth.uid() = user_id);

drop policy if exists "weekly_pictures_update_own" on public.weekly_pictures;
create policy "weekly_pictures_update_own" on public.weekly_pictures
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "weekly_pictures_delete_own" on public.weekly_pictures;
create policy "weekly_pictures_delete_own" on public.weekly_pictures
  for delete using (auth.uid() = user_id);

-- Verifica (deve restituire 0 righe e rls attivo):
-- select count(*) from public.weekly_pictures;
-- select relrowsecurity from pg_class where relname = 'weekly_pictures';
