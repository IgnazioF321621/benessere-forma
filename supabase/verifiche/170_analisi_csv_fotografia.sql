-- Body 170: fotografia prima e dopo la migrazione 20261103_170_analisi_csv.sql (sola lettura)
-- 1. il vincolo sulla fonte, com'è scritto
select conname, pg_get_constraintdef(oid) as definizione
from pg_constraint where conrelid = 'public.blood_tests'::regclass and conname = 'blood_tests_fonte_chk';
-- 2. quante righe per fonte (dopo l'importazione compaiono le 'csv')
select coalesce(fonte, '(nulla)') as fonte, count(*) as righe, min(test_date) as dal, max(test_date) as al
from public.blood_tests group by fonte order by fonte;
-- 3. quante righe in tutto e quante donazioni
select count(*) as righe, count(*) filter (where donazione) as donazioni from public.blood_tests;
