-- ═══════════════════════════════════════════════════════════
-- CLEANUP C.4.2 — Mappatura slot demo → legacy per pasti test
-- ═══════════════════════════════════════════════════════════
-- Contesto: durante test Step C.4 (20 mag 2026 pomeriggio) sono stati scritti su
-- tabella `meals` alcuni pasti accettati dai 5 demo dell'overlay Dettaglio Giorno
-- Tab Piano v4. Quelli con slot 'spuntino' o 'merenda' risultavano invisibili in
-- timeline tab Oggi perché il render filtra solo per slot legacy
-- ('colazione','snack_mattina','pranzo','snack_pomeriggio','cena').
--
-- Step C.4.2 risolve il bug a monte (mappatura in acceptPianoV4DemoMeal).
-- Questo script ripulisce i pasti test esistenti scritti prima del fix.
--
-- Filtro `date >= '2026-05-20'` per safety: tocca solo record creati durante il
-- test C.4. Se in futuro esistessero altri record legacy con slot esotici, non
-- vengono toccati.
-- ═══════════════════════════════════════════════════════════
-- Eseguire in: Supabase Dashboard → SQL Editor → New query
-- Progetto: qxiyeiahpoiliwpqslpr
-- ═══════════════════════════════════════════════════════════

-- ─── 1) PREVIEW: vedere cosa si modifica PRIMA di eseguire l'UPDATE ───
SELECT id, user_id, date, time, slot, description, kcal
FROM meals
WHERE slot IN ('spuntino', 'merenda')
  AND date >= '2026-05-20'
ORDER BY date DESC, time;

-- ─── 2) UPDATE definitivo (eseguire SOLO dopo aver verificato la preview) ───
UPDATE meals
SET slot = CASE
  WHEN slot = 'spuntino' THEN 'snack_mattina'
  WHEN slot = 'merenda'  THEN 'snack_pomeriggio'
  ELSE slot
END
WHERE slot IN ('spuntino', 'merenda')
  AND date >= '2026-05-20';

-- ─── 3) Verifica post-update: nessuna riga con slot demo residuo ───
SELECT COUNT(*) AS residui
FROM meals
WHERE slot IN ('spuntino', 'merenda');
-- atteso: residui = 0
