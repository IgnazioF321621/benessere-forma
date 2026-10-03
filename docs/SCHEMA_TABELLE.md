# Tabelle e colonne — lo schema vero

*Generato da `tools/schema_fotografia.py` il 2026-10-03 leggendo il database. **Non si modifica a mano**: si rigenera.*

32 tabelle, 374 colonne. Le regole d'uso (cosa significa un campo, cosa non fare) restano in [`SCHEMA.md`](SCHEMA.md); la struttura completa, con regole di accesso e bucket, in [`supabase/migrations/`](../supabase/migrations/).

| Tabella | Righe | Regole di accesso | Chiave | Una riga sola per |
|---|---:|---:|---|---|
| [`ai_memory`](#ai_memory) — **non usata dal codice** | 0 | 5 | id | — |
| [`app_errors`](#app_errors) | 0 | 2 | id | — |
| [`biblioteca_gif`](#biblioteca_gif) | 1601 | 1 | id | slug |
| [`blood_tests`](#blood_tests) | 0 | 4 | id | — |
| [`body_check_ai`](#body_check_ai) | 4 | 1 | id | check_id |
| [`body_check_photos`](#body_check_photos) | 20 | 4 | id | check_id, pose |
| [`body_checks`](#body_checks) | 6 | 4 | id | — |
| [`body_logs`](#body_logs) | 6 | 2 | id | user_id, date |
| [`body_measurements`](#body_measurements) | 5 | 4 | id | check_id |
| [`coach_proposals`](#coach_proposals) | 26 | 3 | id | user_id, week_start, kind |
| [`daily_log`](#daily_log) | 0 | 4 | id | user_id, date |
| [`esercizi_catalog`](#esercizi_catalog) | 725 | 1 | codice | — |
| [`exercise_media`](#exercise_media) | 57 | 1 | exercise_name_it | — |
| [`fasting_days`](#fasting_days) | 3 | 1 | id | user_id, date |
| [`meal_items`](#meal_items) | 2615 | 4 | id | — |
| [`meals`](#meals) | 930 | 2 | id | — |
| [`nutrilite_catalog`](#nutrilite_catalog) | 66 | 1 | id | codice |
| [`profiles`](#profiles) | 4 | 2 | id | — |
| [`schede_utente`](#schede_utente) | 102 | 5 | id | — |
| [`supplement_package_items`](#supplement_package_items) | 32 | 5 | id | package_id, supplement_id |
| [`supplement_packages`](#supplement_packages) | 11 | 5 | id | — |
| [`supplements`](#supplements) | 42 | 1 | id | — |
| [`supplements_log`](#supplements_log) | 2361 | 2 | id | user_id, date, supplement_name · user_id, date, slot, supplement_name |
| [`training_logs`](#training_logs) | 1797 | 1 | id | user_id, date, session_id, exercise_name, set_number |
| [`training_notes`](#training_notes) | 24 | 4 | id | user_id, exercise_name, date |
| [`weekly_pictures`](#weekly_pictures) | 24 | 4 | id | user_id, week_start |
| [`weekly_plan_acceptance`](#weekly_plan_acceptance) — **non usata dal codice** | 0 | 5 | id | plan_meal_id |
| [`weekly_plan_meals`](#weekly_plan_meals) | 546 | 5 | id | — |
| [`weekly_plans`](#weekly_plans) | 40 | 5 | id | user_id, week_start |
| [`weight_logs`](#weight_logs) | 20 | 5 | id | user_id, date |
| [`workout_sets`](#workout_sets) | 1796 | 1 | id | — |
| [`workouts`](#workouts) | 116 | 2 | id | user_id, date, session_type |

### `ai_memory`

⚠️ **Tabella morta**: esiste nel database ma il codice non la nomina mai.

| Colonna | Tipo | Obbligatoria | Predefinito |
|---|---|---|---|
| `id` | uuid | sì | `gen_random_uuid()` |
| `user_id` | uuid | sì |  |
| `category` | text | sì |  |
| `content` | text | sì |  |
| `confidence` | numeric(3,2) | sì | `0.50` |
| `evidence_count` | integer | sì | `1` |
| `last_observed` | date | sì | `CURRENT_DATE` |
| `active` | boolean | sì | `true` |
| `created_at` | timestamp with time zone | sì | `now()` |

Vincoli:
- `ai_memory_category_check` — `CHECK ((category = ANY (ARRAY['preference'::text, 'avoidance'::text, 'context'::text, 'pattern'::text])))`
- `ai_memory_confidence_range` — `CHECK (((confidence >= 0.00) AND (confidence <= 1.00)))`
- `ai_memory_user_id_fkey` — `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`

### `app_errors`

| Colonna | Tipo | Obbligatoria | Predefinito |
|---|---|---|---|
| `id` | uuid | sì | `gen_random_uuid()` |
| `created_at` | timestamp with time zone | sì | `now()` |
| `user_id` | uuid | sì |  |
| `app_version` | text |  |  |
| `kind` | text | sì |  |
| `operation` | text |  |  |
| `message` | text | sì |  |
| `detail` | jsonb | sì | `'{}'::jsonb` |

Vincoli:
- `app_errors_detail_len` — `CHECK ((pg_column_size(detail) <= 8192))`
- `app_errors_kind_check` — `CHECK ((kind = ANY (ARRAY['db'::text, 'js'::text, 'promise'::text])))`
- `app_errors_message_len` — `CHECK ((char_length(message) <= 600))`
- `app_errors_operation_len` — `CHECK (((operation IS NULL) OR (char_length(operation) <= 200)))`
- `app_errors_user_id_fkey` — `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`

### `biblioteca_gif`

| Colonna | Tipo | Obbligatoria | Predefinito |
|---|---|---|---|
| `id` | uuid | sì | `gen_random_uuid()` |
| `slug` | text | sì |  |
| `nome_italiano` | text | sì |  |
| `nome_originale` | text |  |  |
| `categoria` | text | sì |  |
| `gruppo_muscolare` | text |  |  |
| `storage_path` | text |  |  |
| `storage_url` | text |  |  |
| `created_at` | timestamp with time zone |  | `now()` |

### `blood_tests`

| Colonna | Tipo | Obbligatoria | Predefinito |
|---|---|---|---|
| `id` | uuid | sì | `gen_random_uuid()` |
| `user_id` | uuid | sì |  |
| `test_date` | date | sì |  |
| `hemoglobin` | numeric(5,2) |  |  |
| `ferritin` | numeric(6,1) |  |  |
| `glucose` | numeric(5,1) |  |  |
| `cholesterol_tot` | numeric(5,1) |  |  |
| `hdl` | numeric(5,1) |  |  |
| `triglycerides` | numeric(5,1) |  |  |
| `creatinine` | numeric(4,2) |  |  |
| `alt` | numeric(5,1) |  |  |
| `vitamin_d` | numeric(5,1) |  |  |
| `vitamin_b12` | numeric(6,1) |  |  |
| `tsh` | numeric(5,2) |  |  |
| `notes` | text |  |  |
| `created_at` | timestamp with time zone | sì | `now()` |

Vincoli:
- `blood_tests_user_id_fkey` — `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`

### `body_check_ai`

| Colonna | Tipo | Obbligatoria | Predefinito |
|---|---|---|---|
| `id` | uuid | sì | `gen_random_uuid()` |
| `user_id` | uuid | sì |  |
| `check_id` | uuid | sì |  |
| `previous_check_id` | uuid |  |  |
| `model` | text | sì |  |
| `result` | jsonb | sì |  |
| `confidence` | text | sì |  |
| `created_at` | timestamp with time zone | sì | `now()` |

Vincoli:
- `body_check_ai_confidence_check` — `CHECK ((confidence = ANY (ARRAY['bassa'::text, 'media'::text, 'alta'::text])))`
- `body_check_ai_check_id_fkey` — `FOREIGN KEY (check_id) REFERENCES body_checks(id) ON DELETE CASCADE`
- `body_check_ai_previous_check_id_fkey` — `FOREIGN KEY (previous_check_id) REFERENCES body_checks(id) ON DELETE SET NULL`
- `body_check_ai_user_id_fkey` — `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`

### `body_check_photos`

| Colonna | Tipo | Obbligatoria | Predefinito |
|---|---|---|---|
| `id` | uuid | sì | `gen_random_uuid()` |
| `check_id` | uuid | sì |  |
| `user_id` | uuid | sì |  |
| `pose` | text | sì |  |
| `storage_path` | text | sì |  |
| `created_at` | timestamp with time zone | sì | `now()` |

Vincoli:
- `body_check_photos_check_id_fkey` — `FOREIGN KEY (check_id) REFERENCES body_checks(id) ON DELETE CASCADE`
- `body_check_photos_user_id_fkey` — `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`

### `body_checks`

| Colonna | Tipo | Obbligatoria | Predefinito |
|---|---|---|---|
| `id` | uuid | sì | `gen_random_uuid()` |
| `user_id` | uuid | sì |  |
| `check_type` | text | sì | `'initial'::text` |
| `status` | text | sì | `'in_progress'::text` |
| `notes` | text |  |  |
| `created_at` | timestamp with time zone | sì | `now()` |
| `completed_at` | timestamp with time zone |  |  |

Vincoli:
- `body_checks_user_id_fkey` — `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`

### `body_logs`

| Colonna | Tipo | Obbligatoria | Predefinito |
|---|---|---|---|
| `id` | uuid | sì | `gen_random_uuid()` |
| `user_id` | uuid | sì |  |
| `date` | date | sì |  |
| `weight_kg` | numeric(5,2) |  |  |
| `waist_cm` | numeric(5,1) |  |  |
| `bf_pct` | numeric(4,1) |  |  |
| `notes` | text |  |  |
| `created_at` | timestamp with time zone |  | `now()` |
| `muscle_kg` | numeric(5,2) |  |  |
| `visceral_fat` | numeric(4,1) |  |  |
| `hip_cm` | numeric(5,1) |  |  |
| `chest_cm` | numeric(5,1) |  |  |
| `bicep_cm` | numeric(4,1) |  |  |
| `body_age` | integer |  |  |

Vincoli:
- `body_logs_user_id_fkey` — `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`

### `body_measurements`

| Colonna | Tipo | Obbligatoria | Predefinito |
|---|---|---|---|
| `id` | uuid | sì | `gen_random_uuid()` |
| `check_id` | uuid | sì |  |
| `user_id` | uuid | sì |  |
| `weight_kg` | numeric(5,2) |  |  |
| `height_cm` | numeric(5,1) |  |  |
| `waist_cm` | numeric(5,1) |  |  |
| `chest_cm` | numeric(5,1) |  |  |
| `hips_cm` | numeric(5,1) |  |  |
| `shoulders_cm` | numeric(5,1) |  |  |
| `neck_cm` | numeric(5,1) |  |  |
| `biceps_cm` | numeric(5,1) |  |  |
| `wrist_cm` | numeric(5,1) |  |  |
| `thigh_cm` | numeric(5,1) |  |  |
| `calf_cm` | numeric(5,1) |  |  |
| `body_fat_pct` | numeric(4,1) |  |  |
| `muscle_mass_kg` | numeric(5,2) |  |  |
| `visceral_fat` | numeric(3,0) |  |  |
| `metabolic_age` | integer |  |  |
| `body_water_pct` | numeric(4,1) |  |  |
| `unit_system` | text | sì | `'metric'::text` |
| `created_at` | timestamp with time zone | sì | `now()` |

Vincoli:
- `body_measurements_check_id_fkey` — `FOREIGN KEY (check_id) REFERENCES body_checks(id) ON DELETE CASCADE`
- `body_measurements_user_id_fkey` — `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`

### `coach_proposals`

| Colonna | Tipo | Obbligatoria | Predefinito |
|---|---|---|---|
| `id` | uuid | sì | `gen_random_uuid()` |
| `user_id` | uuid | sì |  |
| `week_start` | date | sì |  |
| `kind` | text | sì |  |
| `title` | text | sì |  |
| `reason` | text | sì |  |
| `evidence` | jsonb | sì | `'{}'::jsonb` |
| `change` | jsonb |  |  |
| `status` | text | sì | `'pending'::text` |
| `decided_at` | timestamp with time zone |  |  |
| `applied_at` | timestamp with time zone |  |  |
| `created_at` | timestamp with time zone | sì | `now()` |

Vincoli:
- `coach_proposals_kind_check` — `CHECK ((kind = ANY (ARRAY['kcal'::text, 'protein'::text, 'training_volume'::text, 'deload'::text, 'check'::text, 'weigh_in'::text, 'logging'::text, 'blood_test'::text, 'keep'::text])))`
- `coach_proposals_status_check` — `CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text, 'expired'::text])))`
- `coach_proposals_week_start_lunedi` — `CHECK ((EXTRACT(isodow FROM week_start) = (1)::numeric))`
- `coach_proposals_user_id_fkey` — `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`

### `daily_log`

| Colonna | Tipo | Obbligatoria | Predefinito |
|---|---|---|---|
| `id` | uuid | sì | `gen_random_uuid()` |
| `user_id` | uuid | sì |  |
| `date` | date | sì |  |
| `sleep_hours` | numeric(3,1) |  |  |
| `energy` | smallint |  |  |
| `stress` | smallint |  |  |
| `day_type` | text |  |  |
| `note` | text |  |  |
| `created_at` | timestamp with time zone | sì | `now()` |
| `updated_at` | timestamp with time zone | sì | `now()` |

Vincoli:
- `daily_log_day_type_check` — `CHECK (((day_type IS NULL) OR (day_type = ANY (ARRAY['training'::text, 'rest'::text, 'deload'::text, 'injury'::text, 'fasting'::text]))))`
- `daily_log_energy_check` — `CHECK (((energy IS NULL) OR ((energy >= 1) AND (energy <= 5))))`
- `daily_log_note_len` — `CHECK (((note IS NULL) OR (char_length(note) <= 1000)))`
- `daily_log_sleep_check` — `CHECK (((sleep_hours IS NULL) OR ((sleep_hours >= (0)::numeric) AND (sleep_hours <= (24)::numeric))))`
- `daily_log_stress_check` — `CHECK (((stress IS NULL) OR ((stress >= 1) AND (stress <= 5))))`
- `daily_log_user_id_fkey` — `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`

### `esercizi_catalog`

| Colonna | Tipo | Obbligatoria | Predefinito |
|---|---|---|---|
| `codice` | text | sì |  |
| `nome` | text | sì |  |
| `pattern` | text |  |  |
| `attrezzo` | text |  |  |
| `luogo` | text |  |  |
| `muscoli` | text |  |  |
| `livello` | text |  |  |
| `zone_rischio` | text |  |  |
| `adattamento` | text |  |  |
| `alternativa` | text |  |  |
| `setup` | text |  |  |
| `esecuzione` | text |  |  |
| `errori` | text |  |  |
| `nota_sicurezza` | text |  |  |
| `updated_at` | timestamp with time zone |  | `now()` |
| `uso` | text |  |  |
| `surrogato_attrezzo` | text |  |  |
| `nota_surrogato` | text |  |  |
| `gruppo_target` | text |  |  |
| `esecuzione_surrogato` | text |  |  |
| `errori_surrogato` | text |  |  |
| `gif_slug` | text |  |  |
| `nome_en` | text |  |  |

### `exercise_media`

| Colonna | Tipo | Obbligatoria | Predefinito |
|---|---|---|---|
| `exercise_name_it` | text | sì |  |
| `exercisedb_id` | text |  |  |
| `cached_url` | text |  |  |
| `status` | text | sì | `'pending'::text` |
| `is_surrogate` | boolean |  | `false` |
| `surrogate_note` | text |  |  |
| `source` | text |  | `'exercisedb'::text` |
| `last_updated` | timestamp with time zone |  | `now()` |

Vincoli:
- `status_valid` — `CHECK ((status = ANY (ARRAY['pending'::text, 'cached'::text, 'missing'::text, 'manual'::text])))`

### `fasting_days`

| Colonna | Tipo | Obbligatoria | Predefinito |
|---|---|---|---|
| `id` | uuid | sì | `gen_random_uuid()` |
| `user_id` | uuid | sì |  |
| `date` | date | sì |  |

Vincoli:
- `fasting_days_user_id_fkey` — `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`

### `meal_items`

| Colonna | Tipo | Obbligatoria | Predefinito |
|---|---|---|---|
| `id` | uuid | sì | `gen_random_uuid()` |
| `meal_id` | uuid | sì |  |
| `user_id` | uuid | sì |  |
| `name` | text | sì |  |
| `quantity` | numeric(7,1) | sì | `0` |
| `unit` | text | sì | `'g'::text` |
| `kcal` | numeric(6,1) | sì | `0` |
| `protein` | numeric(5,1) | sì | `0` |
| `carbs` | numeric(5,1) | sì | `0` |
| `fat` | numeric(5,1) | sì | `0` |
| `source` | text | sì | `'manual'::text` |
| `sort_order` | integer | sì | `0` |
| `created_at` | timestamp with time zone | sì | `now()` |

Vincoli:
- `meal_items_source_check` — `CHECK ((source = ANY (ARRAY['manual'::text, 'ai_split'::text, 'photo'::text, 'preset'::text])))`
- `meal_items_unit_check` — `CHECK ((unit = ANY (ARRAY['g'::text, 'ml'::text, 'pz'::text])))`
- `meal_items_meal_id_fkey` — `FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE`
- `meal_items_user_id_fkey` — `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`

### `meals`

| Colonna | Tipo | Obbligatoria | Predefinito |
|---|---|---|---|
| `id` | uuid | sì | `gen_random_uuid()` |
| `user_id` | uuid | sì |  |
| `date` | date | sì |  |
| `time` | text |  |  |
| `slot` | text |  |  |
| `description` | text | sì |  |
| `kcal` | numeric(6,1) |  |  |
| `protein` | numeric(5,1) |  |  |
| `carbs` | numeric(5,1) |  |  |
| `fat` | numeric(5,1) |  |  |
| `notes` | text |  |  |
| `created_at` | timestamp with time zone |  | `now()` |

Vincoli:
- `meals_user_id_fkey` — `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`

### `nutrilite_catalog`

| Colonna | Tipo | Obbligatoria | Predefinito |
|---|---|---|---|
| `id` | bigint | sì |  |
| `codice` | text | sì |  |
| `linea` | text |  |  |
| `nome` | text | sì |  |
| `categoria` | text |  |  |
| `confezione` | text |  |  |
| `dose_die` | integer |  |  |
| `dosi_conf` | integer |  |  |
| `durata_giorni` | integer |  |  |
| `vp_conf` | numeric |  |  |
| `vp_dose` | numeric |  |  |
| `prezzo_partner` | numeric |  |  |
| `costo_dose_partner` | numeric |  |  |
| `costo_mensile_partner` | numeric |  |  |
| `created_at` | timestamp with time zone |  | `now()` |
| `kcal` | numeric |  |  |
| `carbo` | numeric |  |  |
| `proteine` | numeric |  |  |
| `grassi` | numeric |  |  |
| `dose_unit` | text |  |  |
| `dose_multiplier` | numeric |  | `'1'::numeric` |

### `profiles`

| Colonna | Tipo | Obbligatoria | Predefinito |
|---|---|---|---|
| `id` | uuid | sì |  |
| `first_name` | text |  |  |
| `last_name` | text |  |  |
| `age` | integer |  |  |
| `sex` | text |  |  |
| `height_cm` | numeric(5,1) |  |  |
| `weight_kg` | numeric(5,1) |  |  |
| `goal_weight_kg` | numeric(5,1) |  |  |
| `activity_level` | text |  | `'moderate'::text` |
| `target_kcal` | integer |  |  |
| `target_protein` | integer |  |  |
| `target_carbs` | integer |  |  |
| `target_fat` | integer |  |  |
| `created_at` | timestamp with time zone |  | `now()` |
| `updated_at` | timestamp with time zone |  | `now()` |
| `cognome` | text |  |  |
| `data_nascita` | date |  |  |
| `obiettivo` | text |  |  |
| `dieta` | text |  |  |
| `intolleranze` | text[] |  |  |
| `note_salute` | text |  |  |
| `tipo_allenamento` | text |  |  |
| `giorni_allenamento` | integer |  |  |
| `giorno_recupero` | text |  |  |
| `durata_sessione` | integer |  |  |
| `piano_ai` | jsonb |  |  |
| `esami_sangue` | jsonb |  |  |
| `train_start_date` | date |  |  |
| `m2_skipped` | boolean |  | `false` |
| `plan_generation_day` | text | sì | `'sun'::text` |
| `plan_generation_time` | text | sì | `'20:00'::text` |
| `weight_tracking_mode` | text | sì | `'flexible'::text` |
| `attrezzatura` | text[] |  |  |
| `usa_training` | boolean |  | `true` |
| `volume_sessione` | text |  | `'completo'::text` |

Vincoli:
- `profiles_plan_day_check` — `CHECK ((plan_generation_day = ANY (ARRAY['fri'::text, 'sat'::text, 'sun'::text, 'custom'::text])))`
- `profiles_sex_check` — `CHECK ((sex = ANY (ARRAY['M'::text, 'F'::text])))`
- `profiles_weight_mode_check` — `CHECK ((weight_tracking_mode = ANY (ARRAY['daily'::text, 'every3'::text, 'weekly'::text, 'flexible'::text])))`
- `profiles_id_fkey` — `FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE`

### `schede_utente`

| Colonna | Tipo | Obbligatoria | Predefinito |
|---|---|---|---|
| `id` | uuid | sì | `gen_random_uuid()` |
| `user_id` | uuid | sì |  |
| `blocco_n` | integer | sì | `1` |
| `scheda` | jsonb | sì |  |
| `attiva` | boolean | sì | `true` |
| `created_at` | timestamp with time zone | sì | `now()` |

Vincoli:
- `schede_utente_user_id_fkey` — `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`

### `supplement_package_items`

| Colonna | Tipo | Obbligatoria | Predefinito |
|---|---|---|---|
| `id` | uuid | sì | `gen_random_uuid()` |
| `package_id` | uuid | sì |  |
| `supplement_id` | uuid | sì |  |
| `user_id` | uuid | sì |  |
| `sort_order` | integer | sì | `0` |
| `created_at` | timestamp with time zone | sì | `now()` |

Vincoli:
- `supplement_package_items_package_id_fkey` — `FOREIGN KEY (package_id) REFERENCES supplement_packages(id) ON DELETE CASCADE`
- `supplement_package_items_supplement_id_fkey` — `FOREIGN KEY (supplement_id) REFERENCES supplements(id) ON DELETE CASCADE`
- `supplement_package_items_user_id_fkey` — `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`

### `supplement_packages`

| Colonna | Tipo | Obbligatoria | Predefinito |
|---|---|---|---|
| `id` | uuid | sì | `gen_random_uuid()` |
| `user_id` | uuid | sì |  |
| `name` | text | sì |  |
| `emoji` | text | sì | `'📦'::text` |
| `time` | text | sì |  |
| `sort_order` | integer | sì | `0` |
| `created_at` | timestamp with time zone | sì | `now()` |

Vincoli:
- `supplement_packages_user_id_fkey` — `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`

### `supplements`

| Colonna | Tipo | Obbligatoria | Predefinito |
|---|---|---|---|
| `id` | uuid | sì | `gen_random_uuid()` |
| `user_id` | uuid | sì |  |
| `sort_order` | integer |  | `0` |
| `name` | text | sì |  |
| `slot` | text |  |  |
| `grp` | text |  |  |
| `active` | boolean |  | `true` |
| `kcal` | integer |  | `0` |
| `protein` | numeric(6,1) |  | `0` |
| `carbs` | numeric(6,1) |  | `0` |
| `fat` | numeric(6,1) |  | `0` |
| `price` | numeric(8,2) |  | `0` |
| `doses` | integer |  | `30` |
| `note` | text |  |  |
| `created_at` | timestamp with time zone |  | `now()` |
| `codice` | text |  |  |
| `quantity` | numeric |  | `1` |

Vincoli:
- `supplements_user_id_fkey` — `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`

### `supplements_log`

| Colonna | Tipo | Obbligatoria | Predefinito |
|---|---|---|---|
| `id` | uuid | sì | `gen_random_uuid()` |
| `user_id` | uuid | sì |  |
| `date` | date | sì |  |
| `slot` | text | sì |  |
| `supplement_name` | text | sì |  |
| `taken` | boolean |  | `false` |
| `created_at` | timestamp with time zone |  | `now()` |
| `is_extra` | boolean | sì | `false` |
| `supplement_codice` | text |  |  |
| `dose` | numeric |  |  |
| `dose_unit` | text |  |  |
| `kcal` | numeric |  | `0` |
| `carbo` | numeric |  | `0` |
| `proteine` | numeric |  | `0` |
| `grassi` | numeric |  | `0` |
| `costo` | numeric |  | `0` |
| `supplement_id` | uuid |  |  |

Vincoli:
- `supplements_log_user_id_fkey` — `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`

### `training_logs`

| Colonna | Tipo | Obbligatoria | Predefinito |
|---|---|---|---|
| `id` | uuid | sì | `gen_random_uuid()` |
| `user_id` | uuid | sì |  |
| `date` | date | sì |  |
| `session_id` | text | sì |  |
| `exercise_name` | text | sì |  |
| `set_number` | integer | sì |  |
| `reps` | integer |  |  |
| `resistance` | text |  |  |
| `rir_actual` | integer |  |  |
| `notes` | text |  |  |
| `created_at` | timestamp with time zone |  | `now()` |
| `band_color` | text |  |  |
| `exercise_code` | text |  |  |

Vincoli:
- `training_logs_user_id_fkey` — `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`

### `training_notes`

| Colonna | Tipo | Obbligatoria | Predefinito |
|---|---|---|---|
| `id` | uuid | sì | `gen_random_uuid()` |
| `user_id` | uuid | sì |  |
| `exercise_name` | text | sì |  |
| `date` | date | sì |  |
| `note` | text | sì |  |
| `created_at` | timestamp with time zone | sì | `now()` |
| `updated_at` | timestamp with time zone | sì | `now()` |
| `exercise_code` | text |  |  |

Vincoli:
- `training_notes_user_id_fkey` — `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`

### `weekly_pictures`

| Colonna | Tipo | Obbligatoria | Predefinito |
|---|---|---|---|
| `id` | uuid | sì | `gen_random_uuid()` |
| `user_id` | uuid | sì |  |
| `week_start` | date | sì |  |
| `picture` | jsonb | sì |  |
| `computed_at` | timestamp with time zone | sì | `now()` |

Vincoli:
- `weekly_pictures_week_start_lunedi` — `CHECK ((EXTRACT(isodow FROM week_start) = (1)::numeric))`
- `weekly_pictures_user_id_fkey` — `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`

### `weekly_plan_acceptance`

⚠️ **Tabella morta**: esiste nel database ma il codice non la nomina mai.

| Colonna | Tipo | Obbligatoria | Predefinito |
|---|---|---|---|
| `id` | uuid | sì | `gen_random_uuid()` |
| `plan_meal_id` | uuid | sì |  |
| `user_id` | uuid | sì |  |
| `status` | text | sì |  |
| `actual_meal_id` | uuid |  |  |
| `notes` | text |  |  |
| `created_at` | timestamp with time zone | sì | `now()` |

Vincoli:
- `weekly_plan_acceptance_status_check` — `CHECK ((status = ANY (ARRAY['accepted'::text, 'substituted'::text, 'skipped'::text, 'off_plan'::text])))`
- `weekly_plan_acceptance_actual_meal_id_fkey` — `FOREIGN KEY (actual_meal_id) REFERENCES meals(id) ON DELETE SET NULL`
- `weekly_plan_acceptance_plan_meal_id_fkey` — `FOREIGN KEY (plan_meal_id) REFERENCES weekly_plan_meals(id) ON DELETE CASCADE`
- `weekly_plan_acceptance_user_id_fkey` — `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`

### `weekly_plan_meals`

| Colonna | Tipo | Obbligatoria | Predefinito |
|---|---|---|---|
| `id` | uuid | sì | `gen_random_uuid()` |
| `plan_id` | uuid | sì |  |
| `user_id` | uuid | sì |  |
| `day_of_week` | integer | sì |  |
| `slot` | text | sì |  |
| `description` | text | sì |  |
| `kcal` | integer |  |  |
| `protein` | integer |  |  |
| `carbs` | integer |  |  |
| `fat` | integer |  |  |
| `ai_explanation` | text |  |  |
| `sort_order` | integer | sì | `0` |
| `created_at` | timestamp with time zone | sì | `now()` |
| `ingredients` | jsonb |  |  |
| `meal_time` | text |  |  |

Vincoli:
- `weekly_plan_meals_day_check` — `CHECK (((day_of_week >= 1) AND (day_of_week <= 7)))`
- `weekly_plan_meals_slot_check` — `CHECK ((slot = ANY (ARRAY['colazione'::text, 'spuntino'::text, 'pranzo'::text, 'merenda'::text, 'cena'::text])))`
- `weekly_plan_meals_plan_id_fkey` — `FOREIGN KEY (plan_id) REFERENCES weekly_plans(id) ON DELETE CASCADE`
- `weekly_plan_meals_user_id_fkey` — `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`

### `weekly_plans`

| Colonna | Tipo | Obbligatoria | Predefinito |
|---|---|---|---|
| `id` | uuid | sì | `gen_random_uuid()` |
| `user_id` | uuid | sì |  |
| `week_start` | date | sì |  |
| `target_kcal` | integer |  |  |
| `target_protein` | integer |  |  |
| `target_carbs` | integer |  |  |
| `target_fat` | integer |  |  |
| `ai_reasoning` | text |  |  |
| `status` | text | sì | `'draft'::text` |
| `created_at` | timestamp with time zone | sì | `now()` |

Vincoli:
- `weekly_plans_status_check` — `CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'archived'::text])))`
- `weekly_plans_user_id_fkey` — `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`

### `weight_logs`

| Colonna | Tipo | Obbligatoria | Predefinito |
|---|---|---|---|
| `id` | uuid | sì | `gen_random_uuid()` |
| `user_id` | uuid | sì |  |
| `date` | date | sì |  |
| `weight_kg` | numeric(5,2) | sì |  |
| `created_at` | timestamp with time zone | sì | `now()` |

Vincoli:
- `weight_logs_user_id_fkey` — `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`

### `workout_sets`

| Colonna | Tipo | Obbligatoria | Predefinito |
|---|---|---|---|
| `id` | uuid | sì | `gen_random_uuid()` |
| `user_id` | uuid | sì |  |
| `workout_id` | uuid |  |  |
| `date` | date | sì |  |
| `session_type` | text | sì |  |
| `exercise_name` | text | sì |  |
| `set_number` | integer | sì |  |
| `reps` | integer |  |  |
| `resistance` | integer |  |  |
| `unit` | text |  | `'kg'::text` |
| `rir_actual` | integer |  |  |
| `notes` | text |  |  |
| `created_at` | timestamp with time zone |  | `now()` |
| `band_color` | text |  |  |

Vincoli:
- `workout_sets_user_id_fkey` — `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`
- `workout_sets_workout_id_fkey` — `FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE`

### `workouts`

| Colonna | Tipo | Obbligatoria | Predefinito |
|---|---|---|---|
| `id` | uuid | sì | `gen_random_uuid()` |
| `user_id` | uuid | sì |  |
| `date` | date | sì |  |
| `session_type` | text | sì |  |
| `completed` | boolean |  | `false` |
| `duration_min` | integer |  |  |
| `notes` | text |  |  |
| `created_at` | timestamp with time zone |  | `now()` |
| `note` | text |  |  |

Vincoli:
- `workouts_user_id_fkey` — `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`
