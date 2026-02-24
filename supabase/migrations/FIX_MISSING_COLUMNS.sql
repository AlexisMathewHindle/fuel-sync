-- ============================================================================
-- FIX MISSING COLUMNS
-- ============================================================================
-- This adds any missing columns that should exist but don't
-- Safe to run multiple times
-- ============================================================================

-- Add missing columns to day_summaries
ALTER TABLE day_summaries
ADD COLUMN IF NOT EXISTS is_rest_day BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_hard_day BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS total_tss NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS has_intake BOOLEAN DEFAULT FALSE;

-- Update total_tss type if it exists as INTEGER
DO $$
BEGIN
  -- Check if total_tss is INTEGER and convert to NUMERIC
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'day_summaries' 
    AND column_name = 'total_tss' 
    AND data_type = 'integer'
  ) THEN
    ALTER TABLE day_summaries ALTER COLUMN total_tss TYPE NUMERIC;
  END IF;
END $$;

-- Add missing columns to workouts (if they don't exist)
ALTER TABLE workouts
ADD COLUMN IF NOT EXISTS depletion_g NUMERIC,
ADD COLUMN IF NOT EXISTS depletion_method TEXT,
ADD COLUMN IF NOT EXISTS intensity_bucket TEXT,
ADD COLUMN IF NOT EXISTS intensity_source TEXT;

-- Add constraints for workouts
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

-- Add ledger columns to day_summaries (if they don't exist)
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
ADD COLUMN IF NOT EXISTS insight_why TEXT,
ADD COLUMN IF NOT EXISTS intake_type TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS intake_confidence TEXT DEFAULT 'low',
ADD COLUMN IF NOT EXISTS estimated_intake_g NUMERIC,
ADD COLUMN IF NOT EXISTS debt_trend TEXT DEFAULT 'stable';

-- Add constraints for day_summaries
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

-- Add hr_max to user_settings (if it doesn't exist)
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS hr_max INTEGER DEFAULT 180;

ALTER TABLE user_settings
DROP CONSTRAINT IF EXISTS user_settings_hr_max_check,
ADD CONSTRAINT user_settings_hr_max_check 
  CHECK (hr_max >= 120 AND hr_max <= 220);

-- Add glycogen store model columns (if they don't exist)
ALTER TABLE day_summaries
ADD COLUMN IF NOT EXISTS glycogen_store_start_g NUMERIC,
ADD COLUMN IF NOT EXISTS glycogen_store_end_g NUMERIC,
ADD COLUMN IF NOT EXISTS glycogen_capacity_g NUMERIC,
ADD COLUMN IF NOT EXISTS glycogen_surplus_g NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS glycogen_deficit_g NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS fill_pct NUMERIC;

-- Add glycogen capacity override to user_settings
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS glycogen_capacity_override_g INTEGER;

-- Add baseline calibration columns to user_settings
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS starting_debt_g NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS baseline_prompt_dismissed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS baseline_set_at TIMESTAMPTZ;

-- ============================================================================
-- DONE!
-- ============================================================================
-- All missing columns should now be added.
-- Refresh your app and try the ledger recompute again.
-- ============================================================================
