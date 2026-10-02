-- ═══════════════════════════════════════════════════════════
-- Chiudere la scrittura dei cataloghi comuni (Fondamenta 040)
-- 2 ottobre 2026 — ⚠️ NON ANCORA ESEGUITA: modifica regole esistenti, aspetta l'ok di Ignazio.
-- ═══════════════════════════════════════════════════════════
-- Trovato da tools/prova_accessi.py il 2 ottobre: con la sola chiave pubblica (quella
-- scritta nella pagina), anche senza entrare, chiunque può
--   · nutrilite_catalog: modificare, cancellare e inserire (66 righe)
--   · exercise_media:    modificare e inserire (57 righe)
-- perché tre regole nate «per il servizio» valgono in realtà per tutti (`to public`, `true`).
--
-- Il servizio non ne ha bisogno: il Worker scrive exercise_media con la chiave di
-- servizio, che ignora le regole di accesso; nutrilite_catalog l'app lo legge soltanto
-- (zona-tracker.html: loadCatalog e il quadro). Le due regole di sola lettura restano.
--
-- Dopo l'esecuzione: python3 tools/prova_accessi.py deve dare «tutto OK»,
-- poi python3 tools/schema_fotografia.py per aggiornare la fotografia.
-- Idempotente. Per tornare indietro: le tre regole sono in 20261002_000_fotografia_zero.sql.
-- ═══════════════════════════════════════════════════════════

drop policy if exists "Catalogo inseribile da service" on public.nutrilite_catalog;
drop policy if exists "exercise_media service insert" on public.exercise_media;
drop policy if exists "exercise_media service update" on public.exercise_media;
