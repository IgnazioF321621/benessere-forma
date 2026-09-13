-- ═══════════════════════════════════════════════════════════
-- Pirsi propone — le proposte settimanali del coach (Fase 3, Lavoro C)
-- 13 settembre 2026
-- ═══════════════════════════════════════════════════════════
-- Una riga per utente, settimana chiusa e tipo di proposta. Le genera
-- shared/coach_rules.js (buildProposals) dal quadro della settimana:
-- il cron del Worker il lunedì mattina, o l'app se il cron non l'ha fatto.
--
-- Pirsi propone, l'utente decide: niente cambia finché la riga non passa
-- ad `accepted` con un tocco. `change` dice cosa cambia se accettata,
-- `evidence` i numeri che l'hanno generata.
--
-- L'utente legge le proprie righe, le inserisce (sempre `pending`, sempre
-- col proprio user_id) e ne aggiorna SOLO status, decided_at e applied_at:
-- titolo, motivazione, numeri e cambiamento non si toccano dall'app.
-- Il Worker scrive con la chiave di servizio, che ignora la RLS.
--
-- Eseguire in: Supabase Dashboard → SQL Editor → New query
-- Progetto: qxiyeiahpoiliwpqslpr
-- Idempotente: si può rilanciare senza effetti.
-- ═══════════════════════════════════════════════════════════

create table if not exists public.coach_proposals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  week_start  date not null,
  kind        text not null,
  title       text not null,
  reason      text not null,
  evidence    jsonb not null default '{}'::jsonb,
  change      jsonb,
  status      text not null default 'pending',
  decided_at  timestamptz,
  applied_at  timestamptz,
  created_at  timestamptz not null default now(),
  constraint coach_proposals_user_week_kind_key unique (user_id, week_start, kind),
  constraint coach_proposals_week_start_lunedi check (extract(isodow from week_start) = 1),
  constraint coach_proposals_kind_check check (kind in
    ('kcal', 'protein', 'training_volume', 'deload', 'check', 'weigh_in', 'logging', 'blood_test', 'keep')),
  constraint coach_proposals_status_check check (status in ('pending', 'accepted', 'rejected', 'expired'))
);

create index if not exists coach_proposals_user_idx on public.coach_proposals (user_id, week_start desc);

alter table public.coach_proposals enable row level security;

drop policy if exists "coach_proposals_select_own" on public.coach_proposals;
create policy "coach_proposals_select_own" on public.coach_proposals
  for select using (auth.uid() = user_id);

-- Inserimento dall'app (ripiego del cron): solo righe proprie e solo in attesa.
drop policy if exists "coach_proposals_insert_own" on public.coach_proposals;
create policy "coach_proposals_insert_own" on public.coach_proposals
  for insert with check (auth.uid() = user_id and status = 'pending' and decided_at is null and applied_at is null);

drop policy if exists "coach_proposals_update_own" on public.coach_proposals;
create policy "coach_proposals_update_own" on public.coach_proposals
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Nessuna policy di delete: le proposte decise restano consultabili.

-- Aggiornamento limitato alle tre colonne della decisione.
revoke update on public.coach_proposals from authenticated, anon;
grant select, insert on public.coach_proposals to authenticated;
grant update (status, decided_at, applied_at) on public.coach_proposals to authenticated;

-- Verifica (0 righe, rls attivo, tre policy, update solo su tre colonne):
-- select count(*) from public.coach_proposals;
-- select relrowsecurity from pg_class where relname = 'coach_proposals';
-- select policyname, cmd from pg_policies where tablename = 'coach_proposals';
-- select column_name from information_schema.column_privileges
--   where table_name = 'coach_proposals' and grantee = 'authenticated' and privilege_type = 'UPDATE';
