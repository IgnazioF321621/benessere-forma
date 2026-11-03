-- Body 160: fotografia da leggere prima e dopo 20261102_160_analisi_del_sangue.sql. Sola lettura.
-- Prima: colonne 0, vincoli 0, righe N, profili con esami scritti a mano P (il 2 novembre 2026: N = 0, P = 0).
-- Dopo: colonne 4, vincoli 3, righe N + le date travasate, profili con esami a mano ancora P (profiles non si tocca),
-- 0 righe con fonte 'lettura' (nessuno ha ancora caricato un referto).
select
  (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'blood_tests' and column_name in ('esami', 'donazione', 'fonte', 'prompt_version')) as colonne,
  (select count(*) from pg_constraint where conname in ('blood_tests_fonte_chk', 'blood_tests_esami_chk', 'blood_tests_user_date_key')) as vincoli,
  (select count(*) from public.blood_tests) as righe,
  (select count(*) from public.profiles where esami_sangue is not null) as profili_con_esami_a_mano;

-- Solo DOPO (prima le colonne non ci sono e la riga non compila):
-- select fonte, count(*) filter (where donazione) as donazioni, count(*) as righe, min(test_date), max(test_date)
-- from public.blood_tests group by fonte order by fonte;
