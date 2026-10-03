-- ═══════════════════════════════════════════════════════════
-- Il codice al posto del nome, e una tabella sola per le serie
-- (Fondamenta 070 e 080) · 3 ottobre 2026
-- ═══════════════════════════════════════════════════════════
-- Cosa fa, in ordine:
--   1. tre colonne nuove, tutte facoltative: training_logs.exercise_code,
--      training_notes.exercise_code, supplements_log.supplement_id
--   2. travasa in training_logs le serie che stanno SOLO in workout_sets
--      (stessa persona, giorno, sessione, esercizio, numero di serie)
--   3. scrive il codice nelle righe vecchie di training_logs e training_notes,
--      col ponte nome→codice che usa l'app (le schede salvate, blocco piu'
--      recente vince, poi il catalogo vivo); e il supplement_id nelle righe
--      standard di supplements_log, per nome (libreria, poi catalogo)
--   4. elenca cio' che NON ha trovato: una riga senza codice si vede, non si
--      lascia a NULL in silenzio (L10)
--
-- NON cancella niente: workout_sets resta com'e', l'app non la legge e non
-- la scrive piu' dal rilascio di Fondamenta 080. Toglierla e' una decisione
-- a parte. Idempotente: si puo' rilanciare.
--
-- Ordine: copia di sicurezza → questo file → 20261003_090_vincoli_righe_doppie.sql
-- → rilascio dell'app. L'app nuova scrive exercise_code e supplement_id: senza
-- queste colonne ogni serie e ogni integratore risponderebbe «colonna sconosciuta».
-- L'app vecchia con le colonne nuove va benissimo: le ignora.
--
-- Prima e dopo: supabase/verifiche/070_080_090_fotografia.sql (sola lettura).
-- ═══════════════════════════════════════════════════════════

-- ── Funzioni di appoggio, solo per questa sessione ────────────────────────────
-- zt_norm: la stessa forma normalizzata di _normExName nell'app (minuscolo, senza
-- accenti, spazi collassati). zt_arr: un valore jsonb che non e' un elenco diventa [].
create or replace function pg_temp.zt_norm(t text) returns text language sql immutable as $$
  select lower(trim(regexp_replace(
    translate(coalesce(t, ''), 'àáâäãèéêëìíîïòóôöõùúûüçÀÁÂÄÃÈÉÊËÌÍÎÏÒÓÔÖÕÙÚÛÜÇ',
                               'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'),
    '\s+', ' ', 'g')))
$$;
create or replace function pg_temp.zt_arr(j jsonb) returns jsonb language sql immutable as $$
  select case when jsonb_typeof(j) = 'array' then j else '[]'::jsonb end
$$;

create temp table if not exists zt_esito (voce text, dettaglio text, righe bigint);
delete from zt_esito;

-- ── 1. Colonne ────────────────────────────────────────────────────────────────
alter table public.training_logs   add column if not exists exercise_code text;
alter table public.training_notes  add column if not exists exercise_code text;
-- supplement_id: l'id della riga di `supplements` (la libreria della persona). Senza
-- chiave esterna, di proposito: un prodotto tolto dalla libreria non deve bloccare
-- una registrazione rimasta in coda sul telefono; il nome resta accanto.
alter table public.supplements_log add column if not exists supplement_id uuid;

create index if not exists training_logs_user_code_idx   on public.training_logs  (user_id, exercise_code);
create index if not exists training_notes_user_code_idx  on public.training_notes (user_id, exercise_code);
create index if not exists supplements_log_user_supp_idx on public.supplements_log (user_id, supplement_id);

-- ── 2. Travaso: le serie che stanno solo in workout_sets ─────────────────────
-- Chiave: persona, giorno, sessione (session_type = session_id), esercizio, numero.
-- Se workout_sets ha due righe con la stessa chiave, passa la piu' recente.
-- resistance: in workout_sets e' un intero, in training_logs un testo.
do $$
declare n bigint;
begin
  insert into public.training_logs
    (user_id, date, session_id, exercise_name, set_number, reps, resistance, band_color, rir_actual, notes, created_at)
  select w.user_id, w.date, w.session_type, w.exercise_name, w.set_number, w.reps,
         case when w.resistance is null then null else w.resistance::text end,
         w.band_color, w.rir_actual, w.notes, coalesce(w.created_at, now())
  from (
    select distinct on (user_id, date, session_type, exercise_name, set_number) *
    from public.workout_sets
    order by user_id, date, session_type, exercise_name, set_number, created_at desc nulls last
  ) w
  where not exists (
    select 1 from public.training_logs t
    where t.user_id = w.user_id and t.date = w.date and t.session_id = w.session_type
      and t.exercise_name = w.exercise_name and t.set_number = w.set_number
  );
  get diagnostics n = row_count;
  insert into zt_esito values ('2. serie travasate da workout_sets a training_logs', '', n);
  raise notice 'serie travasate da workout_sets: %', n;
end $$;

-- ── 3a. Il codice esercizio nelle righe vecchie ───────────────────────────────
-- Ponte nome→codice come ensureExNameAliases nell'app: tutte le schede della persona
-- (esercizi, riscaldamento, finisher, carry; il blocco piu' recente vince), poi il
-- catalogo vivo. Solo le righe senza codice.
create temp table zt_alias as
with ex as (
  select s.user_id, s.blocco_n, e->>'codice' as codice, e->>'name' as name
  from public.schede_utente s
  cross join lateral jsonb_array_elements(pg_temp.zt_arr(s.scheda->'sessioni')) sess
  cross join lateral (
    select e from jsonb_array_elements(pg_temp.zt_arr(sess->'exercises')) e
    union all select e from jsonb_array_elements(pg_temp.zt_arr(sess->'warmup')) e
    union all select e from jsonb_array_elements(pg_temp.zt_arr(sess->'finisher'->'exercises')) e
    union all select sess->'carry_conclusivo' where jsonb_typeof(sess->'carry_conclusivo') = 'object'
  ) e
  where coalesce(e->>'codice', '') <> '' and coalesce(e->>'name', '') <> ''
)
select distinct on (user_id, norm) user_id, norm, codice
from (select user_id, blocco_n, codice, pg_temp.zt_norm(name) as norm from ex) x
order by user_id, norm, blocco_n desc;

create temp table zt_catalogo as
select distinct on (norm) norm, codice
from (select pg_temp.zt_norm(nome) as norm, codice from public.esercizi_catalog) c
order by norm, codice;

do $$
declare n bigint;
begin
  update public.training_logs t set exercise_code = x.codice
  from (
    select t2.id, coalesce(
      (select a.codice from zt_alias a where a.user_id = t2.user_id and a.norm = pg_temp.zt_norm(t2.exercise_name)),
      (select c.codice from zt_catalogo c where c.norm = pg_temp.zt_norm(t2.exercise_name))) as codice
    from public.training_logs t2 where t2.exercise_code is null
  ) x
  where x.id = t.id and x.codice is not null;
  get diagnostics n = row_count;
  insert into zt_esito values ('3a. training_logs: righe passate dal ponte nome→codice', '', n);
  raise notice 'training_logs passate dal ponte: %', n;

  update public.training_notes t set exercise_code = x.codice
  from (
    select t2.id, coalesce(
      (select a.codice from zt_alias a where a.user_id = t2.user_id and a.norm = pg_temp.zt_norm(t2.exercise_name)),
      (select c.codice from zt_catalogo c where c.norm = pg_temp.zt_norm(t2.exercise_name))) as codice
    from public.training_notes t2 where t2.exercise_code is null
  ) x
  where x.id = t.id and x.codice is not null;
  get diagnostics n = row_count;
  insert into zt_esito values ('3a. training_notes: righe passate dal ponte nome→codice', '', n);
  raise notice 'training_notes passate dal ponte: %', n;
end $$;

-- ── 3b. supplement_id nelle righe standard di supplements_log ─────────────────
-- Il nome registrato e' quello mostrato dall'app: il nome della libreria o, se il
-- prodotto e' legato al catalogo per codice, il nome del catalogo. Si lega solo quando
-- per quella persona il nome porta a UN prodotto solo.
do $$
declare n bigint;
begin
  with candidati as (
    select l.id as log_id, s.id as supp_id
    from public.supplements_log l
    join public.supplements s on s.user_id = l.user_id
    left join public.nutrilite_catalog c on c.codice = s.codice
    where l.supplement_id is null and l.is_extra = false
      and (lower(trim(s.name)) = lower(trim(l.supplement_name))
           or lower(trim(coalesce(c.nome, ''))) = lower(trim(l.supplement_name)))
  ), univoci as (
    select log_id, (array_agg(distinct supp_id))[1] as supp_id from candidati group by log_id having count(distinct supp_id) = 1
  )
  update public.supplements_log l set supplement_id = u.supp_id from univoci u where u.log_id = l.id;
  get diagnostics n = row_count;
  insert into zt_esito values ('3b. supplements_log: righe standard legate al prodotto', '', n);
  raise notice 'supplements_log legate al prodotto: %', n;
end $$;

-- ── 4. Cosa resta scoperto (L10: si elenca, non si tace) ─────────────────────
select voce, dettaglio, righe from (
  select voce, dettaglio, righe, 0 as ord from zt_esito
  union all select '4. training_logs: righe', '', count(*), 1 from public.training_logs
  union all select '4. training_logs: con codice', '', count(*), 1 from public.training_logs where exercise_code is not null
  union all select '4. training_logs: SENZA codice — nome', exercise_name, count(*), 2
            from public.training_logs where exercise_code is null group by exercise_name
  union all select '4. training_notes: righe', '', count(*), 3 from public.training_notes
  union all select '4. training_notes: SENZA codice — nome', exercise_name, count(*), 4
            from public.training_notes where exercise_code is null group by exercise_name
  union all select '4. supplements_log standard: righe', '', count(*), 5 from public.supplements_log where is_extra = false
  union all select '4. supplements_log standard: SENZA prodotto — nome', supplement_name, count(*), 6
            from public.supplements_log where is_extra = false and supplement_id is null group by supplement_name
) x order by ord, voce, righe desc, dettaglio;
