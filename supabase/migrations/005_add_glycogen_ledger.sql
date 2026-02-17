-- Migration 005: Add Glycogen Ledger fields
-- This migration adds fields for tracking glycogen depletion, debt, and insights

-- ============================================================================
-- WORKOUTS TABLE - Add depletion tracking fields
-- ============================================================================

ALTER TABLE workouts
ADD COLUMN IF NOT EXISTS depletion_g NUMERIC,
ADD COLUMN IF NOT EXISTS depletion_method TEXT,
ADD COLUMN IF NOT EXISTS intensity_bucket TEXT,
ADD COLUMN IF NOT EXISTS intensity_source TEXT;

-- Add check constraints for valid values
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

-- ============================================================================
-- DAY_SUMMARIES TABLE - Add ledger and insights fields
-- ============================================================================

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

-- Add check constraints
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

-- ============================================================================
-- USER_SETTINGS TABLE - Add hr_max for intensity calculations
-- ============================================================================

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS hr_max INTEGER DEFAULT 180;

ALTER TABLE user_settings
DROP CONSTRAINT IF EXISTS user_settings_hr_max_check,
ADD CONSTRAINT user_settings_hr_max_check 
  CHECK (hr_max >= 120 AND hr_max <= 220);

-- ============================================================================
-- INDEXES for performance
-- ============================================================================

-- Index for workout depletion queries
CREATE INDEX IF NOT EXISTS idx_workouts_depletion 
  ON workouts(user_id, start_date, depletion_g);

-- Index for day summaries debt queries
CREATE INDEX IF NOT EXISTS idx_day_summaries_debt 
  ON day_summaries(user_id, date, debt_end_g);

-- Index for risk flag filtering
CREATE INDEX IF NOT EXISTS idx_day_summaries_risk 
  ON day_summaries(user_id, risk_flag);

-- ============================================================================
-- COMMENTS for documentation
-- ============================================================================

COMMENT ON COLUMN workouts.depletion_g IS 'Estimated glycogen depletion in grams for this workout';
COMMENT ON COLUMN workouts.depletion_method IS 'Method used to calculate depletion: tss_only or tss_clamped_by_cal';
COMMENT ON COLUMN workouts.intensity_bucket IS 'Intensity classification: easy, moderate, or hard';
COMMENT ON COLUMN workouts.intensity_source IS 'Source of intensity data: if (Intensity Factor), hr (Heart Rate), or unknown';

COMMENT ON COLUMN day_summaries.debt_start_g IS 'Glycogen debt at start of day (carried from previous day)';
COMMENT ON COLUMN day_summaries.debt_end_g IS 'Glycogen debt at end of day (after depletion and repletion)';
COMMENT ON COLUMN day_summaries.depletion_total_g IS 'Total glycogen depleted from all workouts this day';
COMMENT ON COLUMN day_summaries.repletion_g IS 'Glycogen replenished from carb intake (carbs * efficiency)';
COMMENT ON COLUMN day_summaries.readiness_score IS 'Readiness score 0-100 based on glycogen debt';
COMMENT ON COLUMN day_summaries.risk_flag IS 'Risk level: green, yellow, orange, or red';
COMMENT ON COLUMN day_summaries.carbs_logged_g IS 'Cached carbs from day_intake for fast reads';
COMMENT ON COLUMN day_summaries.protein_logged_g IS 'Cached protein from day_intake for fast reads';
COMMENT ON COLUMN day_summaries.alignment_score IS 'How well intake matched targets (0-100)';
COMMENT ON COLUMN day_summaries.insight_headline IS 'Short, punchy summary of the day';
COMMENT ON COLUMN day_summaries.insight_action IS 'Specific action to take today';
COMMENT ON COLUMN day_summaries.insight_why IS 'Explanation of why this matters';

COMMENT ON COLUMN user_settings.hr_max IS 'Maximum heart rate for intensity calculations (default 180)';

