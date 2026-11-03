-- ═══════════════════════════════════════════════════════════
-- Body 160 · Le analisi del sangue: storico, lettura dal referto, donazioni (2 novembre 2026)
-- Da eseguire al rilascio, con copia di sicurezza (la Regia). Idempotente.
-- ═══════════════════════════════════════════════════════════
-- Ignazio (14 ottobre 2026): «voglio caricare il PDF delle analisi, anche quelle vecchie, per avere uno
-- storico e dare i dati al coach»; e il 2 novembre: una scheda «Analisi» nel Body con TUTTE le analisi,
-- comprese quelle di ogni donazione di sangue. La tabella blood_tests resta (le 11 colonne le leggono il
-- quadro settimanale e il check fisico) e prende:
--   esami           jsonb: TUTTE le righe lette dal referto (o scritte nel foglio), ognuna
--                   { nome, chiave, valore, unita, rif_min, rif_max }: il nome come stampato, la chiave del
--                   vocabolario (shared/esami.js) se riconosciuto, l'unità COME SCRITTA, la fascia del
--                   referto se stampata. Nulla per le righe del check di prima (le colonne bastano).
--   donazione       boolean: l'analisi è quella di una donazione di sangue; il conto delle donazioni è il
--                   numero di righe segnate. Non serve una tabella: una donazione porta sempre le sue analisi.
--   fonte           'lettura' (dal referto) · 'mano' (foglio compilato a mano) · 'check' (passi s9/s10)
--   prompt_version  la versione del prompt e del vocabolario con cui il referto è stato letto
--   UNIQUE (user_id, test_date): una riga per prelievo; un secondo caricamento della stessa data la aggiorna.
-- Tabella esistente: RLS, regole e GRANT non cambiano. In profiles NON si cancella niente (la colonna
-- esami_sangue resta com'è): i valori scritti a mano, se ci sono, vengono TRAVASATI qui in fondo, una riga
-- per data, saltando le date che hanno già una riga. Il 2 novembre 2026 blood_tests ha 0 righe e nessun
-- profilo ha esami_sangue: il travaso oggi non sposta niente, ma resta per chi lo avesse.
-- Prima e dopo: supabase/verifiche/160_analisi_fotografia.sql. Dopo: rifotografare docs/SCHEMA_TABELLE.md.
-- ═══════════════════════════════════════════════════════════

alter table public.blood_tests
  add column if not exists esami          jsonb,
  add column if not exists donazione      boolean not null default false,
  add column if not exists fonte          text,
  add column if not exists prompt_version text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'blood_tests_fonte_chk') then
    alter table public.blood_tests add constraint blood_tests_fonte_chk
      check (fonte is null or fonte in ('lettura', 'mano', 'check'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'blood_tests_esami_chk') then
    alter table public.blood_tests add constraint blood_tests_esami_chk
      check (esami is null or jsonb_typeof(esami) = 'array');
  end if;
  -- una riga per persona e prelievo: se ci fossero doppioni ci si ferma e si conta, non si cancella
  if not exists (select 1 from pg_constraint where conname = 'blood_tests_user_date_key') then
    if exists (select 1 from public.blood_tests group by user_id, test_date having count(*) > 1) then
      raise exception 'blood_tests: ci sono % coppie (persona, data) con più righe: da unire a mano prima del vincolo',
        (select count(*) from (select 1 from public.blood_tests group by user_id, test_date having count(*) > 1) d);
    end if;
    alter table public.blood_tests add constraint blood_tests_user_date_key unique (user_id, test_date);
  end if;
end $$;

comment on column public.blood_tests.esami is 'Body 160: tutte le righe del referto, [{nome, chiave, valore, unita, rif_min, rif_max}]; nome e unità come stampati, chiave dal vocabolario shared/esami.js se riconosciuto.';
comment on column public.blood_tests.donazione is 'Body 160: analisi di una donazione di sangue; il conto delle donazioni è il numero di righe segnate.';
comment on column public.blood_tests.fonte is 'Body 160: lettura (dal referto) · mano (foglio) · check (passi s9/s10 del check fisico).';
comment on column public.blood_tests.prompt_version is 'Body 160: versione del prompt e del vocabolario con cui il referto è stato letto.';

-- Il travaso dei valori scritti a mano nelle Impostazioni (profiles.esami_sangue: {chiave: valore,
-- chiave_label: etichetta, chiave_data: 'YYYY-MM-DD'}) in righe di blood_tests, una per data. Le chiavi del
-- vecchio elenco (ESAMI_DEFAULTS) diventano le chiavi del vocabolario e, dove c'è, la colonna. Un valore
-- SENZA data non si può datare: resta in profiles e si conta nell'avviso. Idempotente: le date con una riga
-- già presente si saltano. profiles.esami_sangue non si tocca.
do $$
declare
  r record;
  g record;
  v_righe int := 0;
  v_senza_data int := 0;
  v_saltate int := 0;
begin
  for r in select id, esami_sangue from public.profiles where esami_sangue is not null and jsonb_typeof(esami_sangue) = 'object' loop
    -- i valori con la loro data, raggruppati per data
    for g in
      with valori as (
        select e.key as chiave, e.value as valore,
               (r.esami_sangue ->> (e.key || '_data')) as data_testo,
               coalesce(r.esami_sangue ->> (e.key || '_label'), e.key) as etichetta
        from jsonb_each(r.esami_sangue) e
        where e.key not like '%\_label' escape '\' and e.key not like '%\_data' escape '\'
          and jsonb_typeof(e.value) = 'number'
      )
      select data_testo::date as giorno,
             jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
               'nome', regexp_replace(etichetta, '\s*\(.*\)\s*$', ''),
               'chiave', case chiave when 'colesterolo_tot' then 'colesterolo_tot' when 'hs_crp' then 'hs_crp' else chiave end,
               'valore', valore,
               'unita', coalesce((regexp_match(etichetta, '\(([^)]+)\)'))[1], '')
             )) ) as esami,
             max(case when chiave = 'ferritina'       then (valore)::text::numeric end) as ferritin,
             max(case when chiave = 'glicemia'        then (valore)::text::numeric end) as glucose,
             max(case when chiave = 'colesterolo_tot' then (valore)::text::numeric end) as cholesterol_tot,
             max(case when chiave = 'hdl'             then (valore)::text::numeric end) as hdl,
             max(case when chiave = 'trigliceridi'    then (valore)::text::numeric end) as triglycerides,
             max(case when chiave = 'vitamina_d'      then (valore)::text::numeric end) as vitamin_d,
             max(case when chiave = 'vitamina_b12'    then (valore)::text::numeric end) as vitamin_b12,
             max(case when chiave = 'tsh'             then (valore)::text::numeric end) as tsh
      from valori
      where data_testo ~ '^\d{4}-\d{2}-\d{2}$'
      group by data_testo::date
    loop
      if exists (select 1 from public.blood_tests b where b.user_id = r.id and b.test_date = g.giorno) then
        v_saltate := v_saltate + 1;
      else
        insert into public.blood_tests (user_id, test_date, esami, fonte, ferritin, glucose, cholesterol_tot, hdl, triglycerides, vitamin_d, vitamin_b12, tsh)
        values (r.id, g.giorno, g.esami, 'mano', g.ferritin, g.glucose, g.cholesterol_tot, g.hdl, g.triglycerides, g.vitamin_d, g.vitamin_b12, g.tsh);
        v_righe := v_righe + 1;
      end if;
    end loop;
    select v_senza_data + count(*) into v_senza_data
    from jsonb_each(r.esami_sangue) e
    where e.key not like '%\_label' escape '\' and e.key not like '%\_data' escape '\'
      and jsonb_typeof(e.value) = 'number'
      and coalesce(r.esami_sangue ->> (e.key || '_data'), '') !~ '^\d{4}-\d{2}-\d{2}$';
  end loop;
  raise notice 'Body 160 · travaso da profiles.esami_sangue: % righe scritte, % date saltate (già presenti), % valori senza data rimasti in profiles', v_righe, v_saltate, v_senza_data;
end $$;
