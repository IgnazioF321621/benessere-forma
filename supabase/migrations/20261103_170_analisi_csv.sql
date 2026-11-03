-- ═══════════════════════════════════════════════════════════════════════════
-- Body 170 (3 novembre 2026): lo storico delle analisi importato da un file CSV
-- ═══════════════════════════════════════════════════════════════════════════
-- Ignazio vuole caricare tutto lo storico delle donazioni (37 prelievi dal 2013) da un file CSV: una riga per
-- prelievo, scritta con upsert su (user_id, test_date) e ignoreDuplicates, così le date già presenti non si
-- toccano mai. La riga importata ha fonte = 'csv', e il vincolo blood_tests_fonte_chk (20261102_160) lo deve
-- ammettere: qui si rifà con il valore in più. Nessun'altra colonna cambia, nessuna riga si tocca.
-- Idempotente: si può lanciare due volte. Prima e dopo: supabase/verifiche/170_analisi_csv_fotografia.sql
begin;

alter table public.blood_tests drop constraint if exists blood_tests_fonte_chk;
alter table public.blood_tests add constraint blood_tests_fonte_chk
  check (fonte is null or fonte in ('lettura', 'mano', 'check', 'csv'));

comment on column public.blood_tests.fonte is 'Body 160: lettura (dal referto) · mano (foglio) · check (passi s9/s10 del check fisico) · csv (Body 170: importata dal file dello storico).';

commit;
