-- CANTIERE 37 — Sincronizzazione profiles.target_* con calcAdaptedTargets
-- Data: 4 ottobre 2026
-- Obiettivo: Ricalcolamento una tantum dei macro target usando la formula di ST.TARGET
-- 
-- Step 1: Aggiungere colonne per le percentuali se non esistono
-- Step 2: Popolare le percentuali basandosi su OBJ_ADAPT mapping
-- Step 3: Ricalcolare target_protein, target_carbs, target_fat

-- Step 1: Aggiungere colonne se non esistono
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name='profiles' AND column_name='prot_pct'
  ) THEN
    ALTER TABLE profiles ADD COLUMN prot_pct numeric(5,1) NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name='profiles' AND column_name='carbo_pct'
  ) THEN
    ALTER TABLE profiles ADD COLUMN carbo_pct numeric(5,1) NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name='profiles' AND column_name='fat_pct'
  ) THEN
    ALTER TABLE profiles ADD COLUMN fat_pct numeric(5,1) NULL;
  END IF;
END $$;

-- Step 2 & 3: Popolare percentuali e ricalcolare target macro
-- Mapping OBJ_ADAPT da zona-tracker.html:
-- dimagrimento:      [carbs=38, protein=32, fat=30]
-- ricomposizione:    [carbs=38, protein=34, fat=28]
-- ipertrofia:        [carbs=40, protein=35, fat=25]
-- forza_performance: [carbs=42, protein=33, fat=25]
-- longevita:         [carbs=40, protein=30, fat=30]
-- mantenimento:      [carbs=40, protein=30, fat=30] (default)

UPDATE profiles SET
  prot_pct = CASE obiettivo
    WHEN 'dimagrimento'      THEN 32
    WHEN 'ricomposizione'    THEN 34
    WHEN 'ipertrofia'        THEN 35
    WHEN 'forza_performance' THEN 33
    WHEN 'longevita'         THEN 30
    WHEN 'mantenimento'      THEN 30
    ELSE 30
  END,
  carbo_pct = CASE obiettivo
    WHEN 'dimagrimento'      THEN 38
    WHEN 'ricomposizione'    THEN 38
    WHEN 'ipertrofia'        THEN 40
    WHEN 'forza_performance' THEN 42
    WHEN 'longevita'         THEN 40
    WHEN 'mantenimento'      THEN 40
    ELSE 40
  END,
  fat_pct = CASE obiettivo
    WHEN 'dimagrimento'      THEN 30
    WHEN 'ricomposizione'    THEN 28
    WHEN 'ipertrofia'        THEN 25
    WHEN 'forza_performance' THEN 25
    WHEN 'longevita'         THEN 30
    WHEN 'mantenimento'      THEN 30
    ELSE 30
  END,
  target_protein = ROUND(target_kcal * (CASE obiettivo
    WHEN 'dimagrimento'      THEN 32
    WHEN 'ricomposizione'    THEN 34
    WHEN 'ipertrofia'        THEN 35
    WHEN 'forza_performance' THEN 33
    WHEN 'longevita'         THEN 30
    WHEN 'mantenimento'      THEN 30
    ELSE 30
  END) / 100 / 4),
  target_carbs = ROUND(target_kcal * (CASE obiettivo
    WHEN 'dimagrimento'      THEN 38
    WHEN 'ricomposizione'    THEN 38
    WHEN 'ipertrofia'        THEN 40
    WHEN 'forza_performance' THEN 42
    WHEN 'longevita'         THEN 40
    WHEN 'mantenimento'      THEN 40
    ELSE 40
  END) / 100 / 4),
  target_fat = ROUND(target_kcal * (CASE obiettivo
    WHEN 'dimagrimento'      THEN 30
    WHEN 'ricomposizione'    THEN 28
    WHEN 'ipertrofia'        THEN 25
    WHEN 'forza_performance' THEN 25
    WHEN 'longevita'         THEN 30
    WHEN 'mantenimento'      THEN 30
    ELSE 30
  END) / 100 / 9),
  updated_at = NOW()
WHERE 
  target_kcal > 0
  AND obiettivo IS NOT NULL;

-- Profili senza obiettivo: usa default mantenimento (40% carbs, 30% protein, 30% fat)
UPDATE profiles SET
  prot_pct = 30,
  carbo_pct = 40,
  fat_pct = 30,
  target_protein = ROUND(target_kcal * 30 / 100 / 4),
  target_carbs = ROUND(target_kcal * 40 / 100 / 4),
  target_fat = ROUND(target_kcal * 30 / 100 / 9),
  updated_at = NOW()
WHERE 
  target_kcal > 0
  AND (obiettivo IS NULL OR obiettivo = '');
