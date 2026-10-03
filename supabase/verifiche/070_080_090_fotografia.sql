-- ═══════════════════════════════════════════════════════════
-- Fotografia per Fondamenta 070/080/090 — SOLA LETTURA
-- 3 ottobre 2026 · si lancia prima e dopo le due migrazioni del 3 ottobre
-- ═══════════════════════════════════════════════════════════
-- Un risultato solo, a righe: quante serie in ogni tabella, quante stanno in una
-- sola delle due, quante hanno valori diversi, quali nomi non sono piu' a catalogo,
-- quante righe doppie fermerebbero i vincoli, quali integratori non si legano.
-- Non scrive niente.

with
chiave_wt as (
  select w.user_id, w.date, w.session_type, w.exercise_name, w.set_number, w.reps, w.resistance, w.band_color, w.rir_actual
  from public.workout_sets w),
chiave_tl as (
  select t.user_id, t.date, t.session_id, t.exercise_name, t.set_number, t.reps, t.resistance, t.band_color, t.rir_actual
  from public.training_logs t),
solo_ws as (
  select * from chiave_wt w where not exists (select 1 from chiave_tl t
    where t.user_id = w.user_id and t.date = w.date and t.session_id = w.session_type
      and t.exercise_name = w.exercise_name and t.set_number = w.set_number)),
solo_tl as (
  select * from chiave_tl t where not exists (select 1 from chiave_wt w
    where t.user_id = w.user_id and t.date = w.date and t.session_id = w.session_type
      and t.exercise_name = w.exercise_name and t.set_number = w.set_number)),
diversi as (
  select t.* from chiave_tl t join chiave_wt w
    on t.user_id = w.user_id and t.date = w.date and t.session_id = w.session_type
   and t.exercise_name = w.exercise_name and t.set_number = w.set_number
  where t.reps is distinct from w.reps
     or coalesce(t.band_color, '') <> coalesce(w.band_color, '')
     or t.rir_actual is distinct from w.rir_actual
     or coalesce(nullif(t.resistance, '')::numeric, -1) <> coalesce(w.resistance, -1)),
nomi_tl as (select distinct exercise_name from public.training_logs),
fuori_catalogo as (
  select n.exercise_name from nomi_tl n
  where not exists (select 1 from public.esercizi_catalog c where lower(trim(c.nome)) = lower(trim(n.exercise_name))))
select voce, dettaglio, righe from (
  select 'A. training_logs: righe' as voce, '' as dettaglio, count(*) as righe, 1 as ord from public.training_logs
  union all select 'A. workout_sets: righe', '', count(*), 1 from public.workout_sets
  union all select 'A. training_notes: righe', '', count(*), 1 from public.training_notes
  union all select 'A. supplements_log: righe standard', '', count(*), 1 from public.supplements_log where is_extra = false
  union all select 'A. supplements_log: righe extra', '', count(*), 1 from public.supplements_log where is_extra = true
  union all select 'A. workouts: righe', '', count(*), 1 from public.workouts
  union all select 'A. body_logs: righe', '', count(*), 1 from public.body_logs
  union all select 'B. serie solo in workout_sets (da travasare)', '', count(*), 2 from solo_ws
  union all select 'B. serie solo in training_logs (restano)', '', count(*), 2 from solo_tl
  union all select 'B. serie in entrambe con valori diversi (vince training_logs)', '', count(*), 2 from diversi
  union all select 'B. serie con valori diversi — giorno · esercizio · n.', date::text || ' · ' || exercise_name || ' · ' || set_number, 1, 3 from diversi
  union all select 'C. training_logs: con codice', '', count(*), 4 from public.training_logs
            where exists (select 1 from information_schema.columns where table_name = 'training_logs' and column_name = 'exercise_code')
              and (to_jsonb(training_logs) ->> 'exercise_code') is not null
  union all select 'C. training_logs: nomi che oggi non sono a catalogo', exercise_name, 1, 5 from fuori_catalogo
  union all select 'C. training_notes: nomi che oggi non sono a catalogo', exercise_name, 1, 5
            from (select distinct exercise_name from public.training_notes) n
            where not exists (select 1 from public.esercizi_catalog c where lower(trim(c.nome)) = lower(trim(n.exercise_name)))
  union all select 'D. training_logs: chiavi con righe doppie (fermano il vincolo)', '', count(*), 6 from (
            select 1 from public.training_logs group by user_id, date, session_id, exercise_name, set_number having count(*) > 1) d
  union all select 'D. workouts: chiavi con righe doppie (fermano il vincolo)', '', count(*), 6 from (
            select 1 from public.workouts group by user_id, date, session_type having count(*) > 1) d
  union all select 'D. workouts: righe doppie — giorno · sessione', date::text || ' · ' || session_type, count(*), 7
            from public.workouts group by user_id, date, session_type having count(*) > 1
  union all select 'D. body_logs: giorni con righe doppie (fermano il vincolo)', '', count(*), 6 from (
            select 1 from public.body_logs group by user_id, date having count(*) > 1) d
  union all select 'D. body_logs: righe doppie — giorno', date::text, count(*), 7
            from public.body_logs group by user_id, date having count(*) > 1
  union all select 'E. supplements_log standard: nomi che non portano a un prodotto della libreria', l.supplement_name, count(*), 8
            from public.supplements_log l
            where l.is_extra = false and not exists (
              select 1 from public.supplements s left join public.nutrilite_catalog c on c.codice = s.codice
              where s.user_id = l.user_id and (lower(trim(s.name)) = lower(trim(l.supplement_name))
                 or lower(trim(coalesce(c.nome, ''))) = lower(trim(l.supplement_name))))
            group by l.supplement_name
) x order by ord, voce, righe desc, dettaglio;
