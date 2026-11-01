-- ═══════════════════════════════════════════════════════════
-- Notifiche 170 · Il promemoria del pasto non registrato (1 novembre 2026)
-- Da eseguire al rilascio, con copia di sicurezza (la Regia). Idempotente.
-- ═══════════════════════════════════════════════════════════
-- Ignazio ha scelto le ore fisse: se manca la colazione entro le 10, il pranzo entro le 15 o la cena
-- entro le 22 (ora di Roma), arriva un avviso sul telefono (Web Push dalla PWA installata). La regola
-- sta in shared/promemoria.js, il giro delle ore nel Worker (src/promemoria-cron.js).
--
--   profiles.promemoria_pasti  text[] fra colazione, pranzo, cena: quali avvisi la persona ha acceso.
--                              Nulla o vuoto = tutti spenti. Gli avvisi partono SPENTI e ognuno li
--                              accende da sé, nelle Impostazioni (Regia, 1 novembre 2026).
--   push_iscrizioni            un telefono iscritto alle notifiche: l'indirizzo del servizio push
--                              (endpoint, unico) e le due chiavi che il browser dà all'app (p256dh,
--                              auth), con cui il Worker cifra l'avviso (RFC 8291). Scrive e cancella
--                              la persona, dall'app; il Worker legge con la chiave di servizio e
--                              cancella gli indirizzi morti (404/410 dal servizio push).
--   promemoria_inviati         un avviso mandato: (persona, giorno, pasto). È quello che rende il giro
--                              del Worker idempotente: un giro ripetuto nella stessa ora non manda due
--                              volte. Scrive solo il Worker; la persona può leggere i suoi.
--
-- Le righe cadono con l'account (on delete cascade): elimina_mio_account() (Fondamenta 170) le porta via.
-- Tabelle NUOVE: non toccano niente di ciò che esiste. Ogni tabella dichiara i suoi GRANT qui (regola
-- del 30 ottobre 2026) e ha RLS accesa con le sue regole.
-- Prima e dopo: supabase/verifiche/170_promemoria_fotografia.sql.
-- Dopo: python3 tools/prova_accessi.py deve dare «tutto OK» e si rifotografa docs/SCHEMA_TABELLE.md
-- (tools/schema_fotografia.py).
-- ═══════════════════════════════════════════════════════════

-- 1. Quali avvisi la persona ha acceso (la tabella esiste già: niente GRANT nuovi, RLS e regole invariate)
alter table public.profiles
  add column if not exists promemoria_pasti text[];

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_promemoria_pasti_chk') then
    alter table public.profiles add constraint profiles_promemoria_pasti_chk
      check (promemoria_pasti is null or promemoria_pasti <@ array['colazione', 'pranzo', 'cena']::text[]);
  end if;
end $$;

comment on column public.profiles.promemoria_pasti is 'Notifiche 170: quali promemoria del pasto non registrato sono accesi (colazione entro le 10, pranzo entro le 15, cena entro le 22, ora di Roma). Nulla o vuoto = spenti.';

-- 2. I telefoni iscritti alle notifiche
create table if not exists public.push_iscrizioni (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  endpoint     text not null,
  p256dh       text not null,
  auth         text not null,
  telefono     text,
  created_at   timestamptz not null default now(),
  ultimo_invio timestamptz,
  ultimo_esito text,
  constraint push_iscrizioni_endpoint_key unique (endpoint),
  constraint push_iscrizioni_endpoint_https check (endpoint ~ '^https://'),
  constraint push_iscrizioni_endpoint_len check (char_length(endpoint) <= 2048),
  constraint push_iscrizioni_chiavi_len check (char_length(p256dh) between 80 and 120 and char_length(auth) between 16 and 32)
);

create index if not exists push_iscrizioni_user_idx on public.push_iscrizioni (user_id);

alter table public.push_iscrizioni enable row level security;

-- Permessi di tabella, dichiarati qui: la persona iscrive, rilegge, aggiorna e toglie i SUOI telefoni
-- (le regole sotto); il Worker tutto, con la chiave di servizio; chi non è entrato (anon): niente.
revoke all on public.push_iscrizioni from public, anon, authenticated;
grant select, insert, update, delete on public.push_iscrizioni to authenticated;
grant all on public.push_iscrizioni to service_role;

drop policy if exists "push_iscrizioni_select_own" on public.push_iscrizioni;
create policy "push_iscrizioni_select_own" on public.push_iscrizioni
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "push_iscrizioni_insert_own" on public.push_iscrizioni;
create policy "push_iscrizioni_insert_own" on public.push_iscrizioni
  for insert to authenticated with check (auth.uid() = user_id);

-- Lo stesso telefono che passa a un'altra persona (logout e accesso di un altro) riscrive la riga a suo
-- nome: l'upsert sull'endpoint è un update, e la regola deve lasciar cambiare user_id SOLO verso chi scrive
drop policy if exists "push_iscrizioni_update_own" on public.push_iscrizioni;
create policy "push_iscrizioni_update_own" on public.push_iscrizioni
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "push_iscrizioni_delete_own" on public.push_iscrizioni;
create policy "push_iscrizioni_delete_own" on public.push_iscrizioni
  for delete to authenticated using (auth.uid() = user_id);

comment on table public.push_iscrizioni is 'Notifiche 170: i telefoni iscritti alle notifiche (endpoint del servizio push, chiavi p256dh e auth del browser). Scrive la persona, legge il Worker, che cancella gli indirizzi morti.';

-- 3. Gli avvisi mandati, uno per (persona, giorno, pasto): il giro del Worker non ripete
create table if not exists public.promemoria_inviati (
  user_id    uuid not null references auth.users(id) on delete cascade,
  date       date not null,
  slot       text not null,
  inviato_il timestamptz not null default now(),
  telefoni   smallint not null default 0,
  constraint promemoria_inviati_pkey primary key (user_id, date, slot),
  constraint promemoria_inviati_slot_chk check (slot in ('colazione', 'pranzo', 'cena'))
);

alter table public.promemoria_inviati enable row level security;

-- Scrive solo il Worker (chiave di servizio); la persona rilegge i suoi; anon niente.
revoke all on public.promemoria_inviati from public, anon, authenticated;
grant select on public.promemoria_inviati to authenticated;
grant all on public.promemoria_inviati to service_role;

drop policy if exists "promemoria_inviati_select_own" on public.promemoria_inviati;
create policy "promemoria_inviati_select_own" on public.promemoria_inviati
  for select to authenticated using (auth.uid() = user_id);

comment on table public.promemoria_inviati is 'Notifiche 170: gli avvisi del pasto non registrato già mandati (persona, giorno, pasto); rende idempotente il giro delle ore del Worker.';
