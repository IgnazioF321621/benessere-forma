-- ═══════════════════════════════════════════════════════════
-- «Come stai adesso?» più volte al giorno (Home 170)
-- 14 ottobre 2026 — da eseguire al rilascio, con copia di sicurezza (la Regia).
-- ═══════════════════════════════════════════════════════════
-- Un foglio compare con l'app aperta a orari fissi (di base 11 · 15 · 19, massimo 3) e chiede
-- energia e stress (1-5, le parole di Home 160) e «Hai dormito ulteriormente?» (minuti di
-- riposino: 0 = no). Una riga qui SOLO alla risposta; l'id lo sceglie il telefono, così un
-- rinvio dalla coda risponde 23505 e conta come fatto. Circa 1.100 righe all'anno a persona.
--
-- Il dato ufficiale del giorno resta daily_log («Come stai oggi», una riga al giorno): questa
-- tabella è separata e non entra in giorni di fila, quadro della settimana né proposte di Pirsi
-- finché non si decide di farle leggere.
--
-- Gli orari della persona stanno in profiles.come_stai_orari (ore 0-23, al massimo 3; vuoto =
-- spento; nullo = quelli di base). Il profilo si legge già all'avvio: nessuna richiesta in più.
--
-- La persona legge, scrive e toglie solo le proprie righe; nessuna regola admin. Chi non è
-- entrato (anon): niente. Le righe cadono con l'account (on delete cascade).
--
-- Tabella NUOVA e colonna nuova: non toccano niente di ciò che esiste. Idempotente.
-- Dopo: python3 tools/prova_accessi.py deve dare «tutto OK» e si rifotografa
-- docs/SCHEMA_TABELLE.md (tools/schema_fotografia.py).
-- ═══════════════════════════════════════════════════════════

create table if not exists public.rilevazioni (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  rilevata_il   timestamptz not null default now(),
  giorno        date not null,
  orario        smallint,
  energy        smallint,
  stress        smallint,
  riposino_min  smallint,
  note          text,
  created_at    timestamptz not null default now(),
  constraint rilevazioni_orario_check check (orario is null or orario between 0 and 23),
  constraint rilevazioni_energy_check check (energy is null or energy between 1 and 5),
  constraint rilevazioni_stress_check check (stress is null or stress between 1 and 5),
  constraint rilevazioni_riposino_check check (riposino_min is null or riposino_min between 0 and 600),
  constraint rilevazioni_note_len check (note is null or char_length(note) <= 1000)
);

-- le statistiche leggono per persona e per periodo
create index if not exists rilevazioni_user_giorno_idx on public.rilevazioni (user_id, giorno);

alter table public.rilevazioni enable row level security;

-- Permessi di tabella, dichiarati qui (regola del 30 ottobre 2026): si tolgono quelli
-- predefiniti e si ridanno solo quelli che servono.
revoke all on public.rilevazioni from public, anon, authenticated;
grant select, insert, update, delete on public.rilevazioni to authenticated;
grant all on public.rilevazioni to service_role;

drop policy if exists "rilevazioni_select_own" on public.rilevazioni;
create policy "rilevazioni_select_own" on public.rilevazioni
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "rilevazioni_insert_own" on public.rilevazioni;
create policy "rilevazioni_insert_own" on public.rilevazioni
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "rilevazioni_update_own" on public.rilevazioni;
create policy "rilevazioni_update_own" on public.rilevazioni
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "rilevazioni_delete_own" on public.rilevazioni;
create policy "rilevazioni_delete_own" on public.rilevazioni
  for delete to authenticated using (auth.uid() = user_id);

comment on table public.rilevazioni is 'Come stai adesso? (Home 170): energia, stress e riposino a orari fissi, più volte al giorno. Separata da daily_log.';

-- Gli orari del foglio, nel profilo (già letto all'avvio)
alter table public.profiles
  add column if not exists come_stai_orari smallint[];

alter table public.profiles
  drop constraint if exists profiles_come_stai_orari_chk;
alter table public.profiles
  add constraint profiles_come_stai_orari_chk
  check (come_stai_orari is null or (coalesce(array_length(come_stai_orari, 1), 0) <= 3
         and 0 <= all(come_stai_orari) and 23 >= all(come_stai_orari)));

comment on column public.profiles.come_stai_orari is 'Ore del foglio «Come stai adesso?» (Home 170), 0-23, al massimo 3. Vuoto = spento, nullo = 11 · 15 · 19.';
