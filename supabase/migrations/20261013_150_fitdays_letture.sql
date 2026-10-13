-- ═══════════════════════════════════════════════════════════
-- Il report Fitdays letto dal coach (Body 150)
-- 13 ottobre 2026 — da eseguire al rilascio, con copia di sicurezza (la Regia).
-- ═══════════════════════════════════════════════════════════
-- La bilancia Fitdays non parla con l'app: dopo la pesata la persona dà al coach lo
-- screenshot (o il PDF) del report, Gemini lo trascrive (Worker /fitdays-report) e i
-- numeri che Body aveva già (peso, grasso %, massa muscolare, grasso viscerale, età
-- corporea) finiscono nelle caselle di «Misure col metro e bilancia», che la persona
-- controlla e salva: weight_logs e body_logs come prima. Qui sta la lettura COMPLETA
-- dei 22 indicatori (`result` jsonb: valori, letti, data_ora_testo, note, meta,
-- letto_il), una riga per persona e per giorno, scritta dall'app quando la persona
-- tocca «Salva misure» (scriviConCoda, upsert su user_id+date). Il file del report
-- non si conserva da nessuna parte.
--
-- Chi è entrato legge, inserisce, aggiorna e cancella SOLO le proprie righe. Il Worker
-- non scrive qui. Le righe cadono con l'account (on delete cascade): elimina_mio_account()
-- (Fondamenta 170) le porta via. «Scarica i miei dati» le include.
--
-- Tabella NUOVA: non tocca niente di ciò che esiste. Idempotente.
-- Dopo: python3 tools/prova_accessi.py deve dare «tutto OK» e si rifotografa
-- docs/SCHEMA_TABELLE.md (tools/schema_fotografia.py).
-- ═══════════════════════════════════════════════════════════

create table if not exists public.fitdays_letture (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  date            date not null,
  model           text,
  prompt_version  text,
  result          jsonb not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint fitdays_letture_user_date_key unique (user_id, date)
);

create index if not exists fitdays_letture_user_idx on public.fitdays_letture (user_id, date desc);

alter table public.fitdays_letture enable row level security;

-- Permessi di tabella, dichiarati qui (regola del 30 ottobre 2026): si tolgono quelli
-- predefiniti e si ridanno solo quelli che servono. Chi non è entrato (anon): niente.
revoke all on public.fitdays_letture from public, anon, authenticated;
grant select, insert, update, delete on public.fitdays_letture to authenticated;
grant all on public.fitdays_letture to service_role;

drop policy if exists "fitdays_letture_select_own" on public.fitdays_letture;
create policy "fitdays_letture_select_own" on public.fitdays_letture
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "fitdays_letture_insert_own" on public.fitdays_letture;
create policy "fitdays_letture_insert_own" on public.fitdays_letture
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "fitdays_letture_update_own" on public.fitdays_letture;
create policy "fitdays_letture_update_own" on public.fitdays_letture
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "fitdays_letture_delete_own" on public.fitdays_letture;
create policy "fitdays_letture_delete_own" on public.fitdays_letture
  for delete to authenticated using (auth.uid() = user_id);

-- updated_at si aggiorna da solo a ogni riscrittura (una lettura nuova sullo stesso giorno)
create or replace function public.fitdays_letture_tocca()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists fitdays_letture_tocca on public.fitdays_letture;
create trigger fitdays_letture_tocca before update on public.fitdays_letture
  for each row execute function public.fitdays_letture_tocca();

comment on table public.fitdays_letture is 'Body 150: la lettura completa del report Fitdays (22 indicatori in result), una per persona e per giorno; le caselle di Body restano in weight_logs e body_logs';

-- Verifica (deve dare: rls attivo, quattro regole, 0 righe):
-- select relrowsecurity from pg_class where relname = 'fitdays_letture';
-- select policyname, cmd from pg_policies where tablename = 'fitdays_letture';
-- select count(*) from public.fitdays_letture;
