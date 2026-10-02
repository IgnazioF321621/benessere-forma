-- ═══════════════════════════════════════════════════════════
-- app_errors e daily_log: solo i permessi dichiarati (Fondamenta 050 e 060)
-- 2 ottobre 2026 — eseguita il 2 ottobre con l'ok di Ignazio.
-- ═══════════════════════════════════════════════════════════
-- Le due tabelle sono nate il 2 ottobre, quando Supabase dava ancora da solo tutti i
-- permessi a tutti i ruoli, compreso chi non è entrato (anon). Le loro migrazioni
-- dichiarano permessi più stretti: questo file porta il database a coincidere.
-- Per chi usa l'app non cambia niente: le regole di accesso fermavano già chi non è entrato.
-- Dopo: python3 tools/prova_accessi.py deve dare «tutto OK». Idempotente.
-- ═══════════════════════════════════════════════════════════

revoke all on public.app_errors from anon, authenticated;
grant select, insert on public.app_errors to authenticated;
grant all on public.app_errors to service_role;

revoke all on public.daily_log from anon, authenticated;
grant select, insert, update, delete on public.daily_log to authenticated;
grant all on public.daily_log to service_role;
