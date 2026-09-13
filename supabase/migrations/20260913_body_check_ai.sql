-- ═══════════════════════════════════════════════════════════
-- Lettura AI dei check fisici (Fase 2, Lavoro C)
-- 13 settembre 2026
-- ═══════════════════════════════════════════════════════════
-- Una riga per check: il giudizio qualitativo del modello sulle foto,
-- confrontate col check precedente se c'è. `result` è il JSON validato
-- dal Worker (overall · confidence · areas · photo_quality · summary ·
-- suggested_focus). È un suggerimento: l'app lo mostra, non cambia niente.
--
-- Scrive SOLO il Worker con la chiave di servizio (che ignora la RLS):
-- per questo non esistono policy di insert/update/delete.
--
-- Eseguire in: Supabase Dashboard → SQL Editor → New query
-- Progetto: qxiyeiahpoiliwpqslpr
-- Idempotente: si può rilanciare senza effetti.
-- ═══════════════════════════════════════════════════════════

create table if not exists public.body_check_ai (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  check_id          uuid not null references public.body_checks(id) on delete cascade,
  previous_check_id uuid references public.body_checks(id) on delete set null,
  model             text not null,
  result            jsonb not null,
  confidence        text not null,
  created_at        timestamptz not null default now(),
  constraint body_check_ai_check_key unique (check_id),
  constraint body_check_ai_confidence_check check (confidence in ('bassa', 'media', 'alta'))
);

create index if not exists body_check_ai_user_idx on public.body_check_ai (user_id);

alter table public.body_check_ai enable row level security;

-- L'utente legge solo le proprie righe. Nessuna policy di scrittura: scrive il Worker.
drop policy if exists "body_check_ai_select_own" on public.body_check_ai;
create policy "body_check_ai_select_own" on public.body_check_ai
  for select using (auth.uid() = user_id);

-- Verifica (deve restituire 0 righe, rls attivo, una sola policy):
-- select count(*) from public.body_check_ai;
-- select relrowsecurity from pg_class where relname = 'body_check_ai';
-- select policyname, cmd from pg_policies where tablename = 'body_check_ai';
