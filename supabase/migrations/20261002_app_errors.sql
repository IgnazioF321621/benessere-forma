-- ═══════════════════════════════════════════════════════════
-- Gli errori che succedono sui telefoni (Fondamenta 060)
-- 2 ottobre 2026
-- ═══════════════════════════════════════════════════════════
-- Una riga per ogni errore che l'app incontra sul telefono di una persona:
-- una lettura o scrittura del database fallita (dbq), un errore generale della
-- pagina, una promessa rifiutata e non gestita. Le scrive reportError() in
-- zona-tracker.html: al massimo una volta per errore uguale e 20 per sessione.
--
-- Chi è entrato inserisce SOLO righe a proprio nome. Nessuno le modifica o le
-- cancella dall'app. Le legge solo l'admin (stessa regola delle altre tabelle,
-- vedi docs/ACCESSI.md): chi usa l'app non rilegge nemmeno le proprie.
-- Chi non è entrato non scrive: niente porta aperta a chi ha solo la chiave pubblica.
--
-- Tabella NUOVA: non tocca niente di ciò che esiste. Idempotente.
-- ═══════════════════════════════════════════════════════════

create table if not exists public.app_errors (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  app_version  text,
  kind         text not null,
  operation    text,
  message      text not null,
  detail       jsonb not null default '{}'::jsonb,
  constraint app_errors_kind_check check (kind in ('db', 'js', 'promise')),
  constraint app_errors_message_len check (char_length(message) <= 600),
  constraint app_errors_operation_len check (operation is null or char_length(operation) <= 200),
  constraint app_errors_detail_len check (pg_column_size(detail) <= 8192)
);

create index if not exists app_errors_created_idx on public.app_errors (created_at desc);
create index if not exists app_errors_user_idx on public.app_errors (user_id, created_at desc);

alter table public.app_errors enable row level security;

-- Permessi di tabella, dichiarati qui: dal 30 ottobre 2026 Supabase non li dà più da solo
-- e senza l'app riceve «permission denied». Chi è entrato inserisce e (solo l'admin, per
-- la regola qui sotto) legge; niente update né delete. Chi non è entrato (anon): niente.
grant select, insert on public.app_errors to authenticated;
grant all on public.app_errors to service_role;

drop policy if exists "app_errors_insert_own" on public.app_errors;
create policy "app_errors_insert_own" on public.app_errors
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "admin_read_all_app_errors" on public.app_errors;
create policy "admin_read_all_app_errors" on public.app_errors
  for select to authenticated using ((auth.jwt() ->> 'email') = 'ignazio.f@me.com');

-- Nessuna regola di update o delete: dall'app gli errori non si toccano.
