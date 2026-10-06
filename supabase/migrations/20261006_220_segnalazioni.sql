-- ═══════════════════════════════════════════════════════════
-- Le segnalazioni delle persone dal tasto «Segnala» (Fondamenta 220)
-- 6 ottobre 2026 — da eseguire al rilascio, con copia di sicurezza (la Regia).
-- ═══════════════════════════════════════════════════════════
-- Da ogni schermata dell'app un piccolo insetto apre «Cosa non va, o cosa proponi?»
-- (Non funziona · Non capisco · Un'idea, più un testo facoltativo). Le segnalazioni
-- finiscono qui, con dove era la persona (`dove` jsonb: pagina, sezione, fogli aperti),
-- la versione dell'app e il telefono in breve. Copiato da MB21 (nota Pagine 009,
-- migrazione 20261006001000_segnalazioni.sql) e adattato: qui non esistono
-- utente_corrente() e is_admin(), si usano auth.uid() e l'email nel gettone, come
-- nelle altre tabelle (docs/ACCESSI.md).
--
-- Chi è entrato inserisce SOLO righe a proprio nome e rilegge solo le sue (l'app oggi
-- non le rilegge: nessuna lettura ricorrente, costo zero). Nessuno le modifica o le
-- cancella dall'app. L'amministratore legge tutto e scrive letta_il / risolta_il /
-- risposta. Chi non è entrato (anon): niente. Le righe cadono con l'account
-- (on delete cascade), quindi elimina_mio_account() (Fondamenta 170) le porta via.
--
-- Tabella NUOVA: non tocca niente di ciò che esiste. Idempotente.
-- Dopo: python3 tools/prova_accessi.py deve dare «tutto OK» e si rifotografa
-- docs/SCHEMA_TABELLE.md (tools/schema_fotografia.py).
-- ═══════════════════════════════════════════════════════════

create table if not exists public.segnalazioni (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  dove        jsonb not null default '{}'::jsonb,
  motivo      text not null,
  testo       text,
  versione    text,
  telefono    text,
  creata_il   timestamptz not null default now(),
  letta_il    timestamptz,
  risolta_il  timestamptz,
  risposta    text,
  constraint segnalazioni_motivo_check check (motivo in ('non_funziona', 'non_capisco', 'idea')),
  constraint segnalazioni_testo_len check (testo is null or char_length(testo) <= 1000)
);

-- le aperte, dalla più recente: è quello che legge la Regia
create index if not exists segnalazioni_aperte_idx on public.segnalazioni (creata_il desc) where risolta_il is null;
create index if not exists segnalazioni_user_idx on public.segnalazioni (user_id, creata_il desc);

alter table public.segnalazioni enable row level security;

-- Permessi di tabella, dichiarati qui (regola del 30 ottobre 2026): si tolgono quelli
-- predefiniti e si ridanno solo quelli che servono. Chi è entrato legge (le sue, per la
-- regola sotto), inserisce e aggiorna (solo l'amministratore, per la regola sotto);
-- niente delete. Chi non è entrato (anon): niente.
revoke all on public.segnalazioni from public, anon, authenticated;
grant select, insert, update on public.segnalazioni to authenticated;
grant all on public.segnalazioni to service_role;

-- la persona legge le sue; l'amministratore tutte
drop policy if exists "segnalazioni_select_own_or_admin" on public.segnalazioni;
create policy "segnalazioni_select_own_or_admin" on public.segnalazioni
  for select to authenticated
  using (auth.uid() = user_id or (auth.jwt() ->> 'email') = 'ignazio.f@me.com');

-- la persona scrive solo a suo nome
drop policy if exists "segnalazioni_insert_own" on public.segnalazioni;
create policy "segnalazioni_insert_own" on public.segnalazioni
  for insert to authenticated with check (auth.uid() = user_id);

-- «Letta» · «Risolta» · la risposta: solo l'amministratore
drop policy if exists "segnalazioni_update_admin" on public.segnalazioni;
create policy "segnalazioni_update_admin" on public.segnalazioni
  for update to authenticated
  using ((auth.jwt() ->> 'email') = 'ignazio.f@me.com')
  with check ((auth.jwt() ->> 'email') = 'ignazio.f@me.com');

-- Nessuna regola di delete: dall'app le segnalazioni non si cancellano.

comment on table public.segnalazioni is 'Fondamenta 220: le segnalazioni dal tasto «Segnala» (dove, motivo, testo, versione, telefono); letta_il/risolta_il/risposta dall''amministratore';
