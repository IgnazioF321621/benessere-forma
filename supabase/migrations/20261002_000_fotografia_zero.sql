-- ═══════════════════════════════════════════════════════════
-- Zona Tracker — fotografia zero dello schema (2026-10-02)
-- ═══════════════════════════════════════════════════════════
-- Generata da tools/schema_fotografia.py leggendo i cataloghi di Postgres del progetto qxiyeiahpoiliwpqslpr.
-- NON è stata scritta a mano e NON va eseguita sul database vero: descrive ciò che c'è già.
-- Serve a ricostruire il database da zero e a vedere cosa cambia: da qui in avanti
-- ogni modifica di struttura è un file datato in questa cartella.
-- Comprende anche le tre tabelle dei file di settembre (weekly_pictures, body_check_ai, coach_proposals).
--
-- 30 tabelle · 353 colonne · 99 vincoli · 25 indici · 93 regole di accesso · 2 funzioni · 1 trigger · 3 bucket
--
-- Fuori da questa fotografia: gli schemi gestiti da Supabase (auth, storage, realtime…),
-- di cui si riportano solo i bucket e le regole su storage.objects.
-- ═══════════════════════════════════════════════════════════

-- Estensioni attive: pg_stat_statements (extensions), pgcrypto (extensions), plpgsql (pg_catalog), supabase_vault (vault), uuid-ossp (extensions)

create sequence if not exists public.nutrilite_catalog_id_seq as bigint start 1 increment 1;

-- ───────────────────────────────────────────────────────────
-- FUNZIONI
-- ───────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- ───────────────────────────────────────────────────────────
-- TABELLE
-- ───────────────────────────────────────────────────────────

-- ai_memory · 0 righe il 2026-10-02 · accesso per riga: attivo · 5 regole
create table public."ai_memory" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "category" text not null,
  "content" text not null,
  "confidence" numeric(3,2) default 0.50 not null,
  "evidence_count" integer default 1 not null,
  "last_observed" date default CURRENT_DATE not null,
  "active" boolean default true not null,
  "created_at" timestamp with time zone default now() not null,
  constraint "ai_memory_pkey" PRIMARY KEY (id),
  constraint "ai_memory_category_check" CHECK ((category = ANY (ARRAY['preference'::text, 'avoidance'::text, 'context'::text, 'pattern'::text]))),
  constraint "ai_memory_confidence_range" CHECK (((confidence >= 0.00) AND (confidence <= 1.00)))
);
CREATE INDEX ai_memory_user_active_idx ON public.ai_memory USING btree (user_id, active, confidence DESC);
alter table public."ai_memory" enable row level security;

-- biblioteca_gif · 1601 righe il 2026-10-02 · accesso per riga: attivo · 1 regole
create table public."biblioteca_gif" (
  "id" uuid default gen_random_uuid() not null,
  "slug" text not null,
  "nome_italiano" text not null,
  "nome_originale" text,
  "categoria" text not null,
  "gruppo_muscolare" text,
  "storage_path" text,
  "storage_url" text,
  "created_at" timestamp with time zone default now(),
  constraint "biblioteca_gif_pkey" PRIMARY KEY (id),
  constraint "biblioteca_gif_slug_key" UNIQUE (slug)
);
alter table public."biblioteca_gif" enable row level security;

-- blood_tests · 0 righe il 2026-10-02 · accesso per riga: attivo · 4 regole
create table public."blood_tests" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "test_date" date not null,
  "hemoglobin" numeric(5,2),
  "ferritin" numeric(6,1),
  "glucose" numeric(5,1),
  "cholesterol_tot" numeric(5,1),
  "hdl" numeric(5,1),
  "triglycerides" numeric(5,1),
  "creatinine" numeric(4,2),
  "alt" numeric(5,1),
  "vitamin_d" numeric(5,1),
  "vitamin_b12" numeric(6,1),
  "tsh" numeric(5,2),
  "notes" text,
  "created_at" timestamp with time zone default now() not null,
  constraint "blood_tests_pkey" PRIMARY KEY (id)
);
CREATE INDEX idx_blood_tests_user_date ON public.blood_tests USING btree (user_id, test_date DESC);
alter table public."blood_tests" enable row level security;

-- body_check_ai · 4 righe il 2026-10-02 · accesso per riga: attivo · 1 regole
create table public."body_check_ai" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "check_id" uuid not null,
  "previous_check_id" uuid,
  "model" text not null,
  "result" jsonb not null,
  "confidence" text not null,
  "created_at" timestamp with time zone default now() not null,
  constraint "body_check_ai_pkey" PRIMARY KEY (id),
  constraint "body_check_ai_check_key" UNIQUE (check_id),
  constraint "body_check_ai_confidence_check" CHECK ((confidence = ANY (ARRAY['bassa'::text, 'media'::text, 'alta'::text])))
);
CREATE INDEX body_check_ai_user_idx ON public.body_check_ai USING btree (user_id);
alter table public."body_check_ai" enable row level security;

-- body_check_photos · 20 righe il 2026-10-02 · accesso per riga: attivo · 4 regole
create table public."body_check_photos" (
  "id" uuid default gen_random_uuid() not null,
  "check_id" uuid not null,
  "user_id" uuid not null,
  "pose" text not null,
  "storage_path" text not null,
  "created_at" timestamp with time zone default now() not null,
  constraint "body_check_photos_pkey" PRIMARY KEY (id),
  constraint "body_check_photos_check_id_pose_key" UNIQUE (check_id, pose)
);
CREATE INDEX idx_body_check_photos_check ON public.body_check_photos USING btree (check_id);
alter table public."body_check_photos" enable row level security;

-- body_checks · 6 righe il 2026-10-02 · accesso per riga: attivo · 4 regole
create table public."body_checks" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "check_type" text default 'initial'::text not null,
  "status" text default 'in_progress'::text not null,
  "notes" text,
  "created_at" timestamp with time zone default now() not null,
  "completed_at" timestamp with time zone,
  constraint "body_checks_pkey" PRIMARY KEY (id)
);
CREATE INDEX idx_body_checks_user ON public.body_checks USING btree (user_id, created_at DESC);
alter table public."body_checks" enable row level security;

-- body_logs · 5 righe il 2026-10-02 · accesso per riga: attivo · 2 regole
create table public."body_logs" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "date" date not null,
  "weight_kg" numeric(5,2),
  "waist_cm" numeric(5,1),
  "bf_pct" numeric(4,1),
  "notes" text,
  "created_at" timestamp with time zone default now(),
  "muscle_kg" numeric(5,2),
  "visceral_fat" numeric(4,1),
  "hip_cm" numeric(5,1),
  "chest_cm" numeric(5,1),
  "bicep_cm" numeric(4,1),
  "body_age" integer,
  constraint "body_logs_pkey" PRIMARY KEY (id)
);
alter table public."body_logs" enable row level security;

-- body_measurements · 5 righe il 2026-10-02 · accesso per riga: attivo · 4 regole
create table public."body_measurements" (
  "id" uuid default gen_random_uuid() not null,
  "check_id" uuid not null,
  "user_id" uuid not null,
  "weight_kg" numeric(5,2),
  "height_cm" numeric(5,1),
  "waist_cm" numeric(5,1),
  "chest_cm" numeric(5,1),
  "hips_cm" numeric(5,1),
  "shoulders_cm" numeric(5,1),
  "neck_cm" numeric(5,1),
  "biceps_cm" numeric(5,1),
  "wrist_cm" numeric(5,1),
  "thigh_cm" numeric(5,1),
  "calf_cm" numeric(5,1),
  "body_fat_pct" numeric(4,1),
  "muscle_mass_kg" numeric(5,2),
  "visceral_fat" numeric(3,0),
  "metabolic_age" integer,
  "body_water_pct" numeric(4,1),
  "unit_system" text default 'metric'::text not null,
  "created_at" timestamp with time zone default now() not null,
  constraint "body_measurements_pkey" PRIMARY KEY (id),
  constraint "body_measurements_check_id_key" UNIQUE (check_id)
);
CREATE INDEX idx_body_measurements_user ON public.body_measurements USING btree (user_id, created_at DESC);
alter table public."body_measurements" enable row level security;

-- coach_proposals · 25 righe il 2026-10-02 · accesso per riga: attivo · 3 regole
create table public."coach_proposals" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "week_start" date not null,
  "kind" text not null,
  "title" text not null,
  "reason" text not null,
  "evidence" jsonb default '{}'::jsonb not null,
  "change" jsonb,
  "status" text default 'pending'::text not null,
  "decided_at" timestamp with time zone,
  "applied_at" timestamp with time zone,
  "created_at" timestamp with time zone default now() not null,
  constraint "coach_proposals_pkey" PRIMARY KEY (id),
  constraint "coach_proposals_user_week_kind_key" UNIQUE (user_id, week_start, kind),
  constraint "coach_proposals_kind_check" CHECK ((kind = ANY (ARRAY['kcal'::text, 'protein'::text, 'training_volume'::text, 'deload'::text, 'check'::text, 'weigh_in'::text, 'logging'::text, 'blood_test'::text, 'keep'::text]))),
  constraint "coach_proposals_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text, 'expired'::text]))),
  constraint "coach_proposals_week_start_lunedi" CHECK ((EXTRACT(isodow FROM week_start) = (1)::numeric))
);
CREATE INDEX coach_proposals_user_idx ON public.coach_proposals USING btree (user_id, week_start DESC);
alter table public."coach_proposals" enable row level security;

-- esercizi_catalog · 725 righe il 2026-10-02 · accesso per riga: attivo · 1 regole
create table public."esercizi_catalog" (
  "codice" text not null,
  "nome" text not null,
  "pattern" text,
  "attrezzo" text,
  "luogo" text,
  "muscoli" text,
  "livello" text,
  "zone_rischio" text,
  "adattamento" text,
  "alternativa" text,
  "setup" text,
  "esecuzione" text,
  "errori" text,
  "nota_sicurezza" text,
  "updated_at" timestamp with time zone default now(),
  "uso" text,
  "surrogato_attrezzo" text,
  "nota_surrogato" text,
  "gruppo_target" text,
  "esecuzione_surrogato" text,
  "errori_surrogato" text,
  "gif_slug" text,
  "nome_en" text,
  constraint "esercizi_catalog_pkey" PRIMARY KEY (codice)
);
alter table public."esercizi_catalog" enable row level security;

-- exercise_media · 57 righe il 2026-10-02 · accesso per riga: attivo · 3 regole
create table public."exercise_media" (
  "exercise_name_it" text not null,
  "exercisedb_id" text,
  "cached_url" text,
  "status" text default 'pending'::text not null,
  "is_surrogate" boolean default false,
  "surrogate_note" text,
  "source" text default 'exercisedb'::text,
  "last_updated" timestamp with time zone default now(),
  constraint "exercise_media_pkey" PRIMARY KEY (exercise_name_it),
  constraint "status_valid" CHECK ((status = ANY (ARRAY['pending'::text, 'cached'::text, 'missing'::text, 'manual'::text])))
);
alter table public."exercise_media" enable row level security;

-- fasting_days · 3 righe il 2026-10-02 · accesso per riga: attivo · 1 regole
create table public."fasting_days" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "date" date not null,
  constraint "fasting_days_pkey" PRIMARY KEY (id),
  constraint "fasting_days_user_id_date_key" UNIQUE (user_id, date)
);
alter table public."fasting_days" enable row level security;

-- meal_items · 2609 righe il 2026-10-02 · accesso per riga: attivo · 4 regole
create table public."meal_items" (
  "id" uuid default gen_random_uuid() not null,
  "meal_id" uuid not null,
  "user_id" uuid not null,
  "name" text not null,
  "quantity" numeric(7,1) default 0 not null,
  "unit" text default 'g'::text not null,
  "kcal" numeric(6,1) default 0 not null,
  "protein" numeric(5,1) default 0 not null,
  "carbs" numeric(5,1) default 0 not null,
  "fat" numeric(5,1) default 0 not null,
  "source" text default 'manual'::text not null,
  "sort_order" integer default 0 not null,
  "created_at" timestamp with time zone default now() not null,
  constraint "meal_items_pkey" PRIMARY KEY (id),
  constraint "meal_items_source_check" CHECK ((source = ANY (ARRAY['manual'::text, 'ai_split'::text, 'photo'::text, 'preset'::text]))),
  constraint "meal_items_unit_check" CHECK ((unit = ANY (ARRAY['g'::text, 'ml'::text, 'pz'::text])))
);
CREATE INDEX idx_meal_items_meal_id ON public.meal_items USING btree (meal_id);
CREATE INDEX idx_meal_items_user_id ON public.meal_items USING btree (user_id);
alter table public."meal_items" enable row level security;

-- meals · 928 righe il 2026-10-02 · accesso per riga: attivo · 2 regole
create table public."meals" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "date" date not null,
  "time" text,
  "slot" text,
  "description" text not null,
  "kcal" numeric(6,1),
  "protein" numeric(5,1),
  "carbs" numeric(5,1),
  "fat" numeric(5,1),
  "notes" text,
  "created_at" timestamp with time zone default now(),
  constraint "meals_pkey" PRIMARY KEY (id)
);
CREATE INDEX meals_user_date ON public.meals USING btree (user_id, date);
alter table public."meals" enable row level security;

-- nutrilite_catalog · 66 righe il 2026-10-02 · accesso per riga: attivo · 2 regole
create table public."nutrilite_catalog" (
  "id" bigint generated always as identity not null,
  "codice" text not null,
  "linea" text,
  "nome" text not null,
  "categoria" text,
  "confezione" text,
  "dose_die" integer,
  "dosi_conf" integer,
  "durata_giorni" integer,
  "vp_conf" numeric,
  "vp_dose" numeric,
  "prezzo_partner" numeric,
  "costo_dose_partner" numeric,
  "costo_mensile_partner" numeric,
  "created_at" timestamp with time zone default now(),
  "kcal" numeric,
  "carbo" numeric,
  "proteine" numeric,
  "grassi" numeric,
  "dose_unit" text,
  "dose_multiplier" numeric default '1'::numeric,
  constraint "nutrilite_catalog_pkey" PRIMARY KEY (id),
  constraint "nutrilite_catalog_codice_key" UNIQUE (codice)
);
alter table public."nutrilite_catalog" enable row level security;

-- profiles · 4 righe il 2026-10-02 · accesso per riga: attivo · 2 regole
create table public."profiles" (
  "id" uuid not null,
  "first_name" text,
  "last_name" text,
  "age" integer,
  "sex" text,
  "height_cm" numeric(5,1),
  "weight_kg" numeric(5,1),
  "goal_weight_kg" numeric(5,1),
  "activity_level" text default 'moderate'::text,
  "target_kcal" integer,
  "target_protein" integer,
  "target_carbs" integer,
  "target_fat" integer,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  "cognome" text,
  "data_nascita" date,
  "obiettivo" text,
  "dieta" text,
  "intolleranze" text[],
  "note_salute" text,
  "tipo_allenamento" text,
  "giorni_allenamento" integer,
  "giorno_recupero" text,
  "durata_sessione" integer,
  "piano_ai" jsonb,
  "esami_sangue" jsonb,
  "train_start_date" date,
  "m2_skipped" boolean default false,
  "plan_generation_day" text default 'sun'::text not null,
  "plan_generation_time" text default '20:00'::text not null,
  "weight_tracking_mode" text default 'flexible'::text not null,
  "attrezzatura" text[],
  "usa_training" boolean default true,
  "volume_sessione" text default 'completo'::text,
  constraint "profiles_pkey" PRIMARY KEY (id),
  constraint "profiles_plan_day_check" CHECK ((plan_generation_day = ANY (ARRAY['fri'::text, 'sat'::text, 'sun'::text, 'custom'::text]))),
  constraint "profiles_sex_check" CHECK ((sex = ANY (ARRAY['M'::text, 'F'::text]))),
  constraint "profiles_weight_mode_check" CHECK ((weight_tracking_mode = ANY (ARRAY['daily'::text, 'every3'::text, 'weekly'::text, 'flexible'::text])))
);
alter table public."profiles" enable row level security;

-- schede_utente · 102 righe il 2026-10-02 · accesso per riga: attivo · 5 regole
create table public."schede_utente" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "blocco_n" integer default 1 not null,
  "scheda" jsonb not null,
  "attiva" boolean default true not null,
  "created_at" timestamp with time zone default now() not null,
  constraint "schede_utente_pkey" PRIMARY KEY (id)
);
CREATE INDEX idx_schede_utente_user ON public.schede_utente USING btree (user_id, created_at DESC);
CREATE UNIQUE INDEX uq_schede_utente_una_attiva ON public.schede_utente USING btree (user_id) WHERE (attiva = true);
alter table public."schede_utente" enable row level security;

-- supplement_package_items · 32 righe il 2026-10-02 · accesso per riga: attivo · 5 regole
-- Join table: quali integratori sono in quale pacchetto. UNIQUE su (package_id, supplement_id).
create table public."supplement_package_items" (
  "id" uuid default gen_random_uuid() not null,
  "package_id" uuid not null,
  "supplement_id" uuid not null,
  "user_id" uuid not null,
  "sort_order" integer default 0 not null,
  "created_at" timestamp with time zone default now() not null,
  constraint "supplement_package_items_pkey" PRIMARY KEY (id),
  constraint "supplement_package_items_package_id_supplement_id_key" UNIQUE (package_id, supplement_id)
);
CREATE INDEX idx_supplement_package_items_package ON public.supplement_package_items USING btree (package_id);
CREATE INDEX idx_supplement_package_items_supplement ON public.supplement_package_items USING btree (supplement_id);
CREATE INDEX idx_supplement_package_items_user ON public.supplement_package_items USING btree (user_id);
alter table public."supplement_package_items" enable row level security;

-- supplement_packages · 11 righe il 2026-10-02 · accesso per riga: attivo · 5 regole
-- Pacchetti orari di integratori dell'utente. Es. "Mattina" alle 08:45.
create table public."supplement_packages" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "name" text not null,
  "emoji" text default '📦'::text not null,
  "time" text not null,
  "sort_order" integer default 0 not null,
  "created_at" timestamp with time zone default now() not null,
  constraint "supplement_packages_pkey" PRIMARY KEY (id)
);
CREATE INDEX idx_supplement_packages_user ON public.supplement_packages USING btree (user_id);
CREATE INDEX idx_supplement_packages_user_sort ON public.supplement_packages USING btree (user_id, sort_order);
alter table public."supplement_packages" enable row level security;

-- supplements · 42 righe il 2026-10-02 · accesso per riga: attivo · 1 regole
create table public."supplements" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "sort_order" integer default 0,
  "name" text not null,
  "slot" text,
  "grp" text,
  "active" boolean default true,
  "kcal" integer default 0,
  "protein" numeric(6,1) default 0,
  "carbs" numeric(6,1) default 0,
  "fat" numeric(6,1) default 0,
  "price" numeric(8,2) default 0,
  "doses" integer default 30,
  "note" text,
  "created_at" timestamp with time zone default now(),
  "codice" text,
  "quantity" numeric default 1,
  constraint "supplements_pkey" PRIMARY KEY (id)
);
alter table public."supplements" enable row level security;

-- supplements_log · 2359 righe il 2026-10-02 · accesso per riga: attivo · 2 regole
create table public."supplements_log" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "date" date not null,
  "slot" text not null,
  "supplement_name" text not null,
  "taken" boolean default false,
  "created_at" timestamp with time zone default now(),
  "is_extra" boolean default false not null,
  "supplement_codice" text,
  "dose" numeric,
  "dose_unit" text,
  "kcal" numeric default 0,
  "carbo" numeric default 0,
  "proteine" numeric default 0,
  "grassi" numeric default 0,
  "costo" numeric default 0,
  constraint "supplements_log_pkey" PRIMARY KEY (id),
  constraint "supplements_log_user_date_name_key" UNIQUE (user_id, date, supplement_name),
  constraint "supplements_log_user_id_date_slot_supplement_name_key" UNIQUE (user_id, date, slot, supplement_name)
);
CREATE INDEX idx_supplements_log_date_extra ON public.supplements_log USING btree (user_id, date, is_extra);
CREATE INDEX idx_supplements_log_extra ON public.supplements_log USING btree (user_id, is_extra) WHERE (is_extra = true);
alter table public."supplements_log" enable row level security;

-- training_logs · 1761 righe il 2026-10-02 · accesso per riga: attivo · 1 regole
create table public."training_logs" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "date" date not null,
  "session_id" text not null,
  "exercise_name" text not null,
  "set_number" integer not null,
  "reps" integer,
  "resistance" text,
  "rir_actual" integer,
  "notes" text,
  "created_at" timestamp with time zone default now(),
  "band_color" text,
  constraint "training_logs_pkey" PRIMARY KEY (id)
);
alter table public."training_logs" enable row level security;

-- training_notes · 24 righe il 2026-10-02 · accesso per riga: attivo · 4 regole
create table public."training_notes" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "exercise_name" text not null,
  "date" date not null,
  "note" text not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  constraint "training_notes_pkey" PRIMARY KEY (id),
  constraint "training_notes_unique_per_day" UNIQUE (user_id, exercise_name, date)
);
CREATE INDEX idx_training_notes_user_ex_date ON public.training_notes USING btree (user_id, exercise_name, date DESC);
alter table public."training_notes" enable row level security;

-- weekly_pictures · 24 righe il 2026-10-02 · accesso per riga: attivo · 4 regole
create table public."weekly_pictures" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "week_start" date not null,
  "picture" jsonb not null,
  "computed_at" timestamp with time zone default now() not null,
  constraint "weekly_pictures_pkey" PRIMARY KEY (id),
  constraint "weekly_pictures_user_week_key" UNIQUE (user_id, week_start),
  constraint "weekly_pictures_week_start_lunedi" CHECK ((EXTRACT(isodow FROM week_start) = (1)::numeric))
);
alter table public."weekly_pictures" enable row level security;

-- weekly_plan_acceptance · 0 righe il 2026-10-02 · accesso per riga: attivo · 5 regole
create table public."weekly_plan_acceptance" (
  "id" uuid default gen_random_uuid() not null,
  "plan_meal_id" uuid not null,
  "user_id" uuid not null,
  "status" text not null,
  "actual_meal_id" uuid,
  "notes" text,
  "created_at" timestamp with time zone default now() not null,
  constraint "weekly_plan_acceptance_pkey" PRIMARY KEY (id),
  constraint "weekly_plan_acceptance_meal_unique" UNIQUE (plan_meal_id),
  constraint "weekly_plan_acceptance_status_check" CHECK ((status = ANY (ARRAY['accepted'::text, 'substituted'::text, 'skipped'::text, 'off_plan'::text])))
);
CREATE INDEX weekly_plan_acceptance_user_created_idx ON public.weekly_plan_acceptance USING btree (user_id, created_at DESC);
alter table public."weekly_plan_acceptance" enable row level security;

-- weekly_plan_meals · 546 righe il 2026-10-02 · accesso per riga: attivo · 5 regole
create table public."weekly_plan_meals" (
  "id" uuid default gen_random_uuid() not null,
  "plan_id" uuid not null,
  "user_id" uuid not null,
  "day_of_week" integer not null,
  "slot" text not null,
  "description" text not null,
  "kcal" integer,
  "protein" integer,
  "carbs" integer,
  "fat" integer,
  "ai_explanation" text,
  "sort_order" integer default 0 not null,
  "created_at" timestamp with time zone default now() not null,
  "ingredients" jsonb,
  "meal_time" text,
  constraint "weekly_plan_meals_pkey" PRIMARY KEY (id),
  constraint "weekly_plan_meals_day_check" CHECK (((day_of_week >= 1) AND (day_of_week <= 7))),
  constraint "weekly_plan_meals_slot_check" CHECK ((slot = ANY (ARRAY['colazione'::text, 'spuntino'::text, 'pranzo'::text, 'merenda'::text, 'cena'::text])))
);
CREATE INDEX weekly_plan_meals_plan_day_idx ON public.weekly_plan_meals USING btree (plan_id, day_of_week, sort_order);
CREATE INDEX weekly_plan_meals_user_idx ON public.weekly_plan_meals USING btree (user_id);
alter table public."weekly_plan_meals" enable row level security;

-- weekly_plans · 40 righe il 2026-10-02 · accesso per riga: attivo · 5 regole
create table public."weekly_plans" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "week_start" date not null,
  "target_kcal" integer,
  "target_protein" integer,
  "target_carbs" integer,
  "target_fat" integer,
  "ai_reasoning" text,
  "status" text default 'draft'::text not null,
  "created_at" timestamp with time zone default now() not null,
  constraint "weekly_plans_pkey" PRIMARY KEY (id),
  constraint "weekly_plans_user_week_unique" UNIQUE (user_id, week_start),
  constraint "weekly_plans_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'archived'::text])))
);
CREATE INDEX weekly_plans_user_week_idx ON public.weekly_plans USING btree (user_id, week_start DESC);
alter table public."weekly_plans" enable row level security;

-- weight_logs · 20 righe il 2026-10-02 · accesso per riga: attivo · 5 regole
create table public."weight_logs" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "date" date not null,
  "weight_kg" numeric(5,2) not null,
  "created_at" timestamp with time zone default now() not null,
  constraint "weight_logs_pkey" PRIMARY KEY (id),
  constraint "weight_logs_user_date_unique" UNIQUE (user_id, date)
);
CREATE INDEX weight_logs_user_date_idx ON public.weight_logs USING btree (user_id, date DESC);
alter table public."weight_logs" enable row level security;

-- workout_sets · 1757 righe il 2026-10-02 · accesso per riga: attivo · 1 regole
create table public."workout_sets" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "workout_id" uuid,
  "date" date not null,
  "session_type" text not null,
  "exercise_name" text not null,
  "set_number" integer not null,
  "reps" integer,
  "resistance" integer,
  "unit" text default 'kg'::text,
  "rir_actual" integer,
  "notes" text,
  "created_at" timestamp with time zone default now(),
  "band_color" text,
  constraint "workout_sets_pkey" PRIMARY KEY (id)
);
alter table public."workout_sets" enable row level security;

-- workouts · 114 righe il 2026-10-02 · accesso per riga: attivo · 2 regole
create table public."workouts" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "date" date not null,
  "session_type" text not null,
  "completed" boolean default false,
  "duration_min" integer,
  "notes" text,
  "created_at" timestamp with time zone default now(),
  "note" text,
  constraint "workouts_pkey" PRIMARY KEY (id)
);
alter table public."workouts" enable row level security;

-- ───────────────────────────────────────────────────────────
-- COLLEGAMENTI FRA TABELLE (chiavi esterne)
-- ───────────────────────────────────────────────────────────

alter table public."ai_memory" add constraint "ai_memory_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."blood_tests" add constraint "blood_tests_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."body_check_ai" add constraint "body_check_ai_check_id_fkey" FOREIGN KEY (check_id) REFERENCES body_checks(id) ON DELETE CASCADE;
alter table public."body_check_ai" add constraint "body_check_ai_previous_check_id_fkey" FOREIGN KEY (previous_check_id) REFERENCES body_checks(id) ON DELETE SET NULL;
alter table public."body_check_ai" add constraint "body_check_ai_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."body_check_photos" add constraint "body_check_photos_check_id_fkey" FOREIGN KEY (check_id) REFERENCES body_checks(id) ON DELETE CASCADE;
alter table public."body_check_photos" add constraint "body_check_photos_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."body_checks" add constraint "body_checks_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."body_logs" add constraint "body_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."body_measurements" add constraint "body_measurements_check_id_fkey" FOREIGN KEY (check_id) REFERENCES body_checks(id) ON DELETE CASCADE;
alter table public."body_measurements" add constraint "body_measurements_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."coach_proposals" add constraint "coach_proposals_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."fasting_days" add constraint "fasting_days_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."meal_items" add constraint "meal_items_meal_id_fkey" FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE;
alter table public."meal_items" add constraint "meal_items_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."meals" add constraint "meals_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."schede_utente" add constraint "schede_utente_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."supplement_package_items" add constraint "supplement_package_items_package_id_fkey" FOREIGN KEY (package_id) REFERENCES supplement_packages(id) ON DELETE CASCADE;
alter table public."supplement_package_items" add constraint "supplement_package_items_supplement_id_fkey" FOREIGN KEY (supplement_id) REFERENCES supplements(id) ON DELETE CASCADE;
alter table public."supplement_package_items" add constraint "supplement_package_items_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."supplement_packages" add constraint "supplement_packages_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."supplements" add constraint "supplements_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."supplements_log" add constraint "supplements_log_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."training_logs" add constraint "training_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."training_notes" add constraint "training_notes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."weekly_pictures" add constraint "weekly_pictures_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."weekly_plan_acceptance" add constraint "weekly_plan_acceptance_actual_meal_id_fkey" FOREIGN KEY (actual_meal_id) REFERENCES meals(id) ON DELETE SET NULL;
alter table public."weekly_plan_acceptance" add constraint "weekly_plan_acceptance_plan_meal_id_fkey" FOREIGN KEY (plan_meal_id) REFERENCES weekly_plan_meals(id) ON DELETE CASCADE;
alter table public."weekly_plan_acceptance" add constraint "weekly_plan_acceptance_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."weekly_plan_meals" add constraint "weekly_plan_meals_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES weekly_plans(id) ON DELETE CASCADE;
alter table public."weekly_plan_meals" add constraint "weekly_plan_meals_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."weekly_plans" add constraint "weekly_plans_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."weight_logs" add constraint "weight_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."workout_sets" add constraint "workout_sets_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."workout_sets" add constraint "workout_sets_workout_id_fkey" FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE;
alter table public."workouts" add constraint "workouts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ───────────────────────────────────────────────────────────
-- REGOLE DI ACCESSO (chi può leggere e scrivere cosa)
-- ───────────────────────────────────────────────────────────

-- ai_memory
create policy "admin_read_all_ai_memory" on public."ai_memory"
  for select to public
  using (((auth.jwt() ->> 'email'::text) = 'ignazio.f@me.com'::text));
create policy "own_ai_memory_delete" on public."ai_memory"
  for delete to public
  using ((auth.uid() = user_id));
create policy "own_ai_memory_insert" on public."ai_memory"
  for insert to public
  with check ((auth.uid() = user_id));
create policy "own_ai_memory_select" on public."ai_memory"
  for select to public
  using ((auth.uid() = user_id));
create policy "own_ai_memory_update" on public."ai_memory"
  for update to public
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));
-- biblioteca_gif
create policy "read_authenticated" on public."biblioteca_gif"
  for select to authenticated
  using (true);
-- blood_tests
create policy "blood_tests_delete_own" on public."blood_tests"
  for delete to public
  using ((auth.uid() = user_id));
create policy "blood_tests_insert_own" on public."blood_tests"
  for insert to public
  with check ((auth.uid() = user_id));
create policy "blood_tests_select_own" on public."blood_tests"
  for select to public
  using ((auth.uid() = user_id));
create policy "blood_tests_update_own" on public."blood_tests"
  for update to public
  using ((auth.uid() = user_id));
-- body_check_ai
create policy "body_check_ai_select_own" on public."body_check_ai"
  for select to public
  using ((auth.uid() = user_id));
-- body_check_photos
create policy "body_check_photos_delete_own" on public."body_check_photos"
  for delete to public
  using ((auth.uid() = user_id));
create policy "body_check_photos_insert_own" on public."body_check_photos"
  for insert to public
  with check ((auth.uid() = user_id));
create policy "body_check_photos_select_own" on public."body_check_photos"
  for select to public
  using ((auth.uid() = user_id));
create policy "body_check_photos_update_own" on public."body_check_photos"
  for update to public
  using ((auth.uid() = user_id));
-- body_checks
create policy "body_checks_delete_own" on public."body_checks"
  for delete to public
  using ((auth.uid() = user_id));
create policy "body_checks_insert_own" on public."body_checks"
  for insert to public
  with check ((auth.uid() = user_id));
create policy "body_checks_select_own" on public."body_checks"
  for select to public
  using ((auth.uid() = user_id));
create policy "body_checks_update_own" on public."body_checks"
  for update to public
  using ((auth.uid() = user_id));
-- body_logs
create policy "admin_read_all_body_logs" on public."body_logs"
  for select to authenticated
  using (((auth.jwt() ->> 'email'::text) = 'ignazio.f@me.com'::text));
create policy "own_data" on public."body_logs"
  for all to public
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));
-- body_measurements
create policy "body_measurements_delete_own" on public."body_measurements"
  for delete to public
  using ((auth.uid() = user_id));
create policy "body_measurements_insert_own" on public."body_measurements"
  for insert to public
  with check ((auth.uid() = user_id));
create policy "body_measurements_select_own" on public."body_measurements"
  for select to public
  using ((auth.uid() = user_id));
create policy "body_measurements_update_own" on public."body_measurements"
  for update to public
  using ((auth.uid() = user_id));
-- coach_proposals
create policy "coach_proposals_insert_own" on public."coach_proposals"
  for insert to public
  with check (((auth.uid() = user_id) AND (status = 'pending'::text) AND (decided_at IS NULL) AND (applied_at IS NULL)));
create policy "coach_proposals_select_own" on public."coach_proposals"
  for select to public
  using ((auth.uid() = user_id));
create policy "coach_proposals_update_own" on public."coach_proposals"
  for update to public
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));
-- esercizi_catalog
create policy "esercizi_catalog_select" on public."esercizi_catalog"
  for select to public
  using (true);
-- exercise_media
create policy "exercise_media public read" on public."exercise_media"
  for select to public
  using (true);
create policy "exercise_media service insert" on public."exercise_media"
  for insert to public
  with check (true);
create policy "exercise_media service update" on public."exercise_media"
  for update to public
  using (true);
-- fasting_days
create policy "Users see own fasting" on public."fasting_days"
  for all to public
  using ((auth.uid() = user_id));
-- meal_items
create policy "Users can delete own meal items" on public."meal_items"
  for delete to public
  using ((auth.uid() = user_id));
create policy "Users can insert own meal items" on public."meal_items"
  for insert to public
  with check ((auth.uid() = user_id));
create policy "Users can update own meal items" on public."meal_items"
  for update to public
  using ((auth.uid() = user_id));
create policy "Users can view own meal items" on public."meal_items"
  for select to public
  using ((auth.uid() = user_id));
-- meals
create policy "Utente vede solo i propri pasti" on public."meals"
  for all to public
  using ((auth.uid() = user_id));
create policy "admin_read_all_meals" on public."meals"
  for select to authenticated
  using (((auth.jwt() ->> 'email'::text) = 'ignazio.f@me.com'::text));
-- nutrilite_catalog
create policy "Catalogo inseribile da service" on public."nutrilite_catalog"
  for all to public
  using (true)
  with check (true);
create policy "Catalogo leggibile da tutti" on public."nutrilite_catalog"
  for select to public
  using (true);
-- profiles
create policy "Users manage own profile" on public."profiles"
  for all to public
  using ((auth.uid() = id));
create policy "admin_read_all_profiles" on public."profiles"
  for select to authenticated
  using (((auth.jwt() ->> 'email'::text) = 'ignazio.f@me.com'::text));
-- schede_utente
create policy "admin_read_all_schede" on public."schede_utente"
  for select to public
  using (((auth.jwt() ->> 'email'::text) = 'ignazio.f@me.com'::text));
create policy "own_delete_schede" on public."schede_utente"
  for delete to public
  using ((auth.uid() = user_id));
create policy "own_insert_schede" on public."schede_utente"
  for insert to public
  with check ((auth.uid() = user_id));
create policy "own_select_schede" on public."schede_utente"
  for select to public
  using ((auth.uid() = user_id));
create policy "own_update_schede" on public."schede_utente"
  for update to public
  using ((auth.uid() = user_id));
-- supplement_package_items
create policy "admin_read_all_package_items" on public."supplement_package_items"
  for select to authenticated
  using (((auth.jwt() ->> 'email'::text) = 'ignazio.f@me.com'::text));
create policy "own_delete" on public."supplement_package_items"
  for delete to authenticated
  using ((auth.uid() = user_id));
create policy "own_insert" on public."supplement_package_items"
  for insert to authenticated
  with check ((auth.uid() = user_id));
create policy "own_select" on public."supplement_package_items"
  for select to authenticated
  using ((auth.uid() = user_id));
create policy "own_update" on public."supplement_package_items"
  for update to authenticated
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));
-- supplement_packages
create policy "admin_read_all_packages" on public."supplement_packages"
  for select to authenticated
  using (((auth.jwt() ->> 'email'::text) = 'ignazio.f@me.com'::text));
create policy "own_delete" on public."supplement_packages"
  for delete to authenticated
  using ((auth.uid() = user_id));
create policy "own_insert" on public."supplement_packages"
  for insert to authenticated
  with check ((auth.uid() = user_id));
create policy "own_select" on public."supplement_packages"
  for select to authenticated
  using ((auth.uid() = user_id));
create policy "own_update" on public."supplement_packages"
  for update to authenticated
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));
-- supplements
create policy "Users manage own supplements" on public."supplements"
  for all to public
  using ((auth.uid() = user_id));
-- supplements_log
create policy "Users see own supplements" on public."supplements_log"
  for all to public
  using ((auth.uid() = user_id));
create policy "admin_read_all_supplements_log" on public."supplements_log"
  for select to authenticated
  using (((auth.jwt() ->> 'email'::text) = 'ignazio.f@me.com'::text));
-- training_logs
create policy "own_data" on public."training_logs"
  for all to public
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));
-- training_notes
create policy "own_delete_training_notes" on public."training_notes"
  for delete to authenticated
  using ((auth.uid() = user_id));
create policy "own_insert_training_notes" on public."training_notes"
  for insert to authenticated
  with check ((auth.uid() = user_id));
create policy "own_select_training_notes" on public."training_notes"
  for select to authenticated
  using ((auth.uid() = user_id));
create policy "own_update_training_notes" on public."training_notes"
  for update to authenticated
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));
-- weekly_pictures
create policy "weekly_pictures_delete_own" on public."weekly_pictures"
  for delete to public
  using ((auth.uid() = user_id));
create policy "weekly_pictures_insert_own" on public."weekly_pictures"
  for insert to public
  with check ((auth.uid() = user_id));
create policy "weekly_pictures_select_own" on public."weekly_pictures"
  for select to public
  using ((auth.uid() = user_id));
create policy "weekly_pictures_update_own" on public."weekly_pictures"
  for update to public
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));
-- weekly_plan_acceptance
create policy "admin_read_all_weekly_plan_acceptance" on public."weekly_plan_acceptance"
  for select to public
  using (((auth.jwt() ->> 'email'::text) = 'ignazio.f@me.com'::text));
create policy "own_weekly_plan_acceptance_delete" on public."weekly_plan_acceptance"
  for delete to public
  using ((auth.uid() = user_id));
create policy "own_weekly_plan_acceptance_insert" on public."weekly_plan_acceptance"
  for insert to public
  with check ((auth.uid() = user_id));
create policy "own_weekly_plan_acceptance_select" on public."weekly_plan_acceptance"
  for select to public
  using ((auth.uid() = user_id));
create policy "own_weekly_plan_acceptance_update" on public."weekly_plan_acceptance"
  for update to public
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));
-- weekly_plan_meals
create policy "admin_read_all_weekly_plan_meals" on public."weekly_plan_meals"
  for select to public
  using (((auth.jwt() ->> 'email'::text) = 'ignazio.f@me.com'::text));
create policy "own_weekly_plan_meals_delete" on public."weekly_plan_meals"
  for delete to public
  using ((auth.uid() = user_id));
create policy "own_weekly_plan_meals_insert" on public."weekly_plan_meals"
  for insert to public
  with check ((auth.uid() = user_id));
create policy "own_weekly_plan_meals_select" on public."weekly_plan_meals"
  for select to public
  using ((auth.uid() = user_id));
create policy "own_weekly_plan_meals_update" on public."weekly_plan_meals"
  for update to public
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));
-- weekly_plans
create policy "admin_read_all_weekly_plans" on public."weekly_plans"
  for select to public
  using (((auth.jwt() ->> 'email'::text) = 'ignazio.f@me.com'::text));
create policy "own_weekly_plans_delete" on public."weekly_plans"
  for delete to public
  using ((auth.uid() = user_id));
create policy "own_weekly_plans_insert" on public."weekly_plans"
  for insert to public
  with check ((auth.uid() = user_id));
create policy "own_weekly_plans_select" on public."weekly_plans"
  for select to public
  using ((auth.uid() = user_id));
create policy "own_weekly_plans_update" on public."weekly_plans"
  for update to public
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));
-- weight_logs
create policy "admin_read_all_weight_logs" on public."weight_logs"
  for select to public
  using (((auth.jwt() ->> 'email'::text) = 'ignazio.f@me.com'::text));
create policy "own_weight_logs_delete" on public."weight_logs"
  for delete to public
  using ((auth.uid() = user_id));
create policy "own_weight_logs_insert" on public."weight_logs"
  for insert to public
  with check ((auth.uid() = user_id));
create policy "own_weight_logs_select" on public."weight_logs"
  for select to public
  using ((auth.uid() = user_id));
create policy "own_weight_logs_update" on public."weight_logs"
  for update to public
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));
-- workout_sets
create policy "user workout_sets" on public."workout_sets"
  for all to public
  using ((auth.uid() = user_id));
-- workouts
create policy "admin_read_all_workouts" on public."workouts"
  for select to authenticated
  using (((auth.jwt() ->> 'email'::text) = 'ignazio.f@me.com'::text));
create policy "user workouts" on public."workouts"
  for all to public
  using ((auth.uid() = user_id));

-- Permessi di tabella per i ruoli dell'app (anon = non entrato, authenticated = entrato).
-- Le regole di accesso qui sopra restringono ulteriormente, riga per riga.
grant delete, insert, references, select, trigger, truncate, update on public."ai_memory" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."ai_memory" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."biblioteca_gif" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."biblioteca_gif" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."blood_tests" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."blood_tests" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."body_check_ai" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."body_check_ai" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."body_check_photos" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."body_check_photos" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."body_checks" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."body_checks" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."body_logs" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."body_logs" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."body_measurements" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."body_measurements" to authenticated;
grant delete, insert, references, select, trigger, truncate on public."coach_proposals" to anon;
grant delete, insert, references, select, trigger, truncate on public."coach_proposals" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."esercizi_catalog" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."esercizi_catalog" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."exercise_media" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."exercise_media" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."fasting_days" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."fasting_days" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."meal_items" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."meal_items" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."meals" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."meals" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."nutrilite_catalog" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."nutrilite_catalog" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."profiles" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."profiles" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."schede_utente" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."schede_utente" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."supplement_package_items" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."supplement_package_items" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."supplement_packages" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."supplement_packages" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."supplements" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."supplements" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."supplements_log" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."supplements_log" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."training_logs" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."training_logs" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."training_notes" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."training_notes" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."weekly_pictures" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."weekly_pictures" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."weekly_plan_acceptance" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."weekly_plan_acceptance" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."weekly_plan_meals" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."weekly_plan_meals" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."weekly_plans" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."weekly_plans" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."weight_logs" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."weight_logs" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."workout_sets" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."workout_sets" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."workouts" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."workouts" to authenticated;

-- ───────────────────────────────────────────────────────────
-- TRIGGER
-- ───────────────────────────────────────────────────────────

CREATE TRIGGER trg_training_notes_updated_at BEFORE UPDATE ON public.training_notes FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ───────────────────────────────────────────────────────────
-- STORAGE: bucket e regole sugli oggetti
-- ───────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('biblioteca-gif', 'biblioteca-gif', true, null, null);
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('body-check-photos', 'body-check-photos', false, null, null);
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('exercise-media', 'exercise-media', true, null, null);

create policy "body_photos_delete_own" on storage."objects"
  for delete to public
  using (((bucket_id = 'body-check-photos'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
create policy "body_photos_select_own" on storage."objects"
  for select to public
  using (((bucket_id = 'body-check-photos'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
create policy "body_photos_update_own" on storage."objects"
  for update to public
  using (((bucket_id = 'body-check-photos'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
create policy "body_photos_upload_own" on storage."objects"
  for insert to public
  with check (((bucket_id = 'body-check-photos'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
