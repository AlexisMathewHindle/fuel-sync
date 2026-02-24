-- ============================================================================
-- RUN ALL MIGRATIONS AT ONCE
-- ============================================================================
-- This file combines all migrations in the correct order.
-- Copy and paste this ENTIRE file into Supabase SQL Editor and run it.
-- It's safe to run multiple times (uses IF NOT EXISTS).
-- ============================================================================

-- MIGRATION 001: Initial Schema
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Workouts table
CREATE TABLE IF NOT EXISTS workouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date TIMESTAMPTZ NOT NULL,
  duration_min INTEGER,
  tss NUMERIC,
  if_value NUMERIC,
  calories INTEGER,
  avg_hr INTEGER,
  workout_type TEXT,
  title TEXT,
  description TEXT,
  external_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Day summaries table
CREATE TABLE IF NOT EXISTS day_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_duration_min INTEGER DEFAULT 0,
  total_tss NUMERIC DEFAULT 0,
  total_calories INTEGER DEFAULT 0,
  workout_count INTEGER DEFAULT 0,
  carb_target_g INTEGER,
  protein_target_g INTEGER,
  is_rest_day BOOLEAN DEFAULT FALSE,
  is_hard_day BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- User settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  weight_kg NUMERIC DEFAULT 70,
  protein_g_per_kg NUMERIC DEFAULT 1.8,
  carb_factor NUMERIC DEFAULT 1.0,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Imports table
CREATE TABLE IF NOT EXISTS imports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  total_rows INTEGER,
  processed_rows INTEGER DEFAULT 0,
  failed_rows INTEGER DEFAULT 0,
  error_details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts(user_id, start_date);
CREATE INDEX IF NOT EXISTS idx_day_summaries_user_date ON day_summaries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_imports_user ON imports(user_id);

-- RLS Policies
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE imports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own workouts" ON workouts;
DROP POLICY IF EXISTS "Users can insert own workouts" ON workouts;
DROP POLICY IF EXISTS "Users can update own workouts" ON workouts;
DROP POLICY IF EXISTS "Users can delete own workouts" ON workouts;

DROP POLICY IF EXISTS "Users can view own summaries" ON day_summaries;
DROP POLICY IF EXISTS "Users can insert own summaries" ON day_summaries;
DROP POLICY IF EXISTS "Users can update own summaries" ON day_summaries;
DROP POLICY IF EXISTS "Users can delete own summaries" ON day_summaries;

DROP POLICY IF EXISTS "Users can view own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;

DROP POLICY IF EXISTS "Users can view own imports" ON imports;
DROP POLICY IF EXISTS "Users can insert own imports" ON imports;
DROP POLICY IF EXISTS "Users can update own imports" ON imports;

-- Create policies
CREATE POLICY "Users can view own workouts" ON workouts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own workouts" ON workouts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own workouts" ON workouts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own workouts" ON workouts FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own summaries" ON day_summaries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own summaries" ON day_summaries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own summaries" ON day_summaries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own summaries" ON day_summaries FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own settings" ON user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON user_settings FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own imports" ON imports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own imports" ON imports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own imports" ON imports FOR UPDATE USING (auth.uid() = user_id);

-- MIGRATION 002: Add Column Mapping
-- ============================================================================

ALTER TABLE imports
ADD COLUMN IF NOT EXISTS column_mapping JSONB;

-- MIGRATION 003: Add Workout Deduplication
-- ============================================================================

ALTER TABLE workouts
ADD COLUMN IF NOT EXISTS import_id UUID REFERENCES imports(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_workouts_import ON workouts(import_id);

-- Add unique constraint for deduplication (external_id already exists in workouts table)
-- Only add constraint if both columns exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workouts' AND column_name = 'external_id'
  ) THEN
    ALTER TABLE workouts DROP CONSTRAINT IF EXISTS workouts_user_external_unique;
    ALTER TABLE workouts ADD CONSTRAINT workouts_user_external_unique UNIQUE (user_id, external_id);
  END IF;
END $$;

-- MIGRATION 004: Add Day Intake Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS day_intake (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  carbs_g NUMERIC,
  protein_g NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_day_intake_user_date ON day_intake(user_id, date);

ALTER TABLE day_intake ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own intake" ON day_intake;
DROP POLICY IF EXISTS "Users can insert own intake" ON day_intake;
DROP POLICY IF EXISTS "Users can update own intake" ON day_intake;
DROP POLICY IF EXISTS "Users can delete own intake" ON day_intake;

CREATE POLICY "Users can view own intake" ON day_intake FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own intake" ON day_intake FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own intake" ON day_intake FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own intake" ON day_intake FOR DELETE USING (auth.uid() = user_id);

-- MIGRATION 005: Add Glycogen Ledger
-- ============================================================================

-- Add depletion tracking to workouts
ALTER TABLE workouts
ADD COLUMN IF NOT EXISTS depletion_g NUMERIC,
ADD COLUMN IF NOT EXISTS depletion_method TEXT,
ADD COLUMN IF NOT EXISTS intensity_bucket TEXT,
ADD COLUMN IF NOT EXISTS intensity_source TEXT;

ALTER TABLE workouts
DROP CONSTRAINT IF EXISTS workouts_depletion_method_check,
ADD CONSTRAINT workouts_depletion_method_check
  CHECK (depletion_method IN ('tss_only', 'tss_clamped_by_cal', NULL));

ALTER TABLE workouts
DROP CONSTRAINT IF EXISTS workouts_intensity_bucket_check,
ADD CONSTRAINT workouts_intensity_bucket_check
  CHECK (intensity_bucket IN ('easy', 'moderate', 'hard', NULL));

ALTER TABLE workouts
DROP CONSTRAINT IF EXISTS workouts_intensity_source_check,
ADD CONSTRAINT workouts_intensity_source_check
  CHECK (intensity_source IN ('if', 'hr', 'unknown', NULL));

-- Add ledger and insights to day_summaries
ALTER TABLE day_summaries
ADD COLUMN IF NOT EXISTS debt_start_g NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS debt_end_g NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS depletion_total_g NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS repletion_g NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS readiness_score INTEGER,
ADD COLUMN IF NOT EXISTS risk_flag TEXT,
ADD COLUMN IF NOT EXISTS carbs_logged_g NUMERIC,
ADD COLUMN IF NOT EXISTS protein_logged_g NUMERIC,
ADD COLUMN IF NOT EXISTS alignment_score INTEGER,
ADD COLUMN IF NOT EXISTS insight_headline TEXT,
ADD COLUMN IF NOT EXISTS insight_action TEXT,
ADD COLUMN IF NOT EXISTS insight_why TEXT;

ALTER TABLE day_summaries
DROP CONSTRAINT IF EXISTS day_summaries_risk_flag_check,
ADD CONSTRAINT day_summaries_risk_flag_check
  CHECK (risk_flag IN ('green', 'yellow', 'orange', 'red', NULL));

ALTER TABLE day_summaries
DROP CONSTRAINT IF EXISTS day_summaries_readiness_score_check,
ADD CONSTRAINT day_summaries_readiness_score_check
  CHECK (readiness_score >= 0 AND readiness_score <= 100);

ALTER TABLE day_summaries
DROP CONSTRAINT IF EXISTS day_summaries_alignment_score_check,
ADD CONSTRAINT day_summaries_alignment_score_check
  CHECK (alignment_score >= 0 AND alignment_score <= 100);

-- Add hr_max to user_settings
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS hr_max INTEGER DEFAULT 180;

ALTER TABLE user_settings
DROP CONSTRAINT IF EXISTS user_settings_hr_max_check,
ADD CONSTRAINT user_settings_hr_max_check
  CHECK (hr_max >= 120 AND hr_max <= 220);

-- MIGRATION 006: Baseline Calibration columns
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS starting_debt_g NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS baseline_prompt_dismissed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS baseline_set_at TIMESTAMPTZ;

-- MIGRATION 007: Intake presence marker
ALTER TABLE day_summaries
ADD COLUMN IF NOT EXISTS has_intake BOOLEAN DEFAULT FALSE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_workouts_depletion ON workouts(user_id, depletion_g) WHERE depletion_g IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_day_summaries_debt ON day_summaries(user_id, debt_end_g) WHERE debt_end_g > 0;
CREATE INDEX IF NOT EXISTS idx_day_summaries_risk ON day_summaries(user_id, risk_flag) WHERE risk_flag IS NOT NULL;

-- ============================================================================
-- MIGRATION 008: Add Glycogen Store Model
-- ============================================================================

ALTER TABLE day_summaries
ADD COLUMN IF NOT EXISTS glycogen_store_start_g NUMERIC,
ADD COLUMN IF NOT EXISTS glycogen_store_end_g NUMERIC,
ADD COLUMN IF NOT EXISTS glycogen_capacity_g NUMERIC,
ADD COLUMN IF NOT EXISTS glycogen_surplus_g NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS glycogen_deficit_g NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS fill_pct NUMERIC;

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS glycogen_capacity_override_g INTEGER;

-- ============================================================================
-- MIGRATION 009: Engine Integrity (Phase 1)
-- ============================================================================

ALTER TABLE day_summaries
ADD COLUMN IF NOT EXISTS intake_type TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS intake_confidence TEXT DEFAULT 'low',
ADD COLUMN IF NOT EXISTS estimated_intake_g NUMERIC,
ADD COLUMN IF NOT EXISTS debt_trend TEXT DEFAULT 'stable';

ALTER TABLE day_summaries
DROP CONSTRAINT IF EXISTS day_summaries_intake_type_check,
ADD CONSTRAINT day_summaries_intake_type_check
  CHECK (intake_type IN ('logged', 'estimated', 'none', NULL));

ALTER TABLE day_summaries
DROP CONSTRAINT IF EXISTS day_summaries_intake_confidence_check,
ADD CONSTRAINT day_summaries_intake_confidence_check
  CHECK (intake_confidence IN ('high', 'low', NULL));

ALTER TABLE day_summaries
DROP CONSTRAINT IF EXISTS day_summaries_debt_trend_check,
ADD CONSTRAINT day_summaries_debt_trend_check
  CHECK (debt_trend IN ('increasing', 'stable', 'decreasing', NULL));

ALTER TABLE day_summaries
DROP CONSTRAINT IF EXISTS day_summaries_debt_start_range_check,
ADD CONSTRAINT day_summaries_debt_start_range_check
  CHECK (debt_start_g IS NULL OR (debt_start_g >= -150 AND debt_start_g <= 900));

ALTER TABLE day_summaries
DROP CONSTRAINT IF EXISTS day_summaries_debt_end_range_check,
ADD CONSTRAINT day_summaries_debt_end_range_check
  CHECK (debt_end_g IS NULL OR (debt_end_g >= -150 AND debt_end_g <= 900));

-- ============================================================================
-- ALL MIGRATIONS COMPLETE!
-- ============================================================================
-- You should see "Success. No rows returned" if everything worked.
-- Now refresh your FuelSync app and go to /settings to run the ledger recompute.
-- ============================================================================
