-- CANTIERE 37 — Sincronizzazione profiles.target_* con calcAdaptedTargets
-- Data: 4 ottobre 2026
-- Obiettivo: Ricalcolamento una tantum dei macro target usando la formula di ST.TARGET
-- 
-- Formula (zona-tracker.html L1697-1709, calcAdaptedTargets):
-- protein = ROUND(kcal * prot_pct / 100 / 4)
-- carbs   = ROUND(kcal * carbo_pct / 100 / 4)
-- fat     = ROUND(kcal * fat_pct / 100 / 9)

UPDATE profiles SET
  target_protein = ROUND(target_kcal * prot_pct / 100 / 4),
  target_carbs   = ROUND(target_kcal * carbo_pct / 100 / 4),
  target_fat     = ROUND(target_kcal * fat_pct / 100 / 9),
  updated_at     = NOW()
WHERE 
  target_kcal > 0
  AND prot_pct > 0;

-- Verifica: controllare che Ginevra e Isabella abbiano valori coerenti
-- SELECT id, target_kcal, prot_pct, target_protein FROM profiles 
-- WHERE id IN ('<user_id_ginevra>', '<user_id_isabella>');
