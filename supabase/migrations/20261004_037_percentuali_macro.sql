-- Cantiere 37 — percentuali dei macro in profiles (Opzione A: ST.TARGET autoritario)
-- Eseguita il 4 ottobre 2026 dal SQL Editor (insieme al ricalcolo una tantum in
-- tools/fix-targets/0001_sync_target_macros.sql). Questo file registra solo la
-- modifica di struttura; è idempotente.
--
-- Le scrive applyProfile (zona-tracker.html) insieme a target_protein/carbs/fat,
-- in background, ogni volta che ricalcola ST.TARGET dall'obiettivo.

alter table public.profiles add column if not exists prot_pct  numeric(5,1);
alter table public.profiles add column if not exists carbo_pct numeric(5,1);
alter table public.profiles add column if not exists fat_pct   numeric(5,1);
