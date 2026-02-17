-- Migration 006: Add Baseline Calibration columns to user_settings
-- Supports "Ongoing Training Block" detection and starting debt override

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS starting_debt_g NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS baseline_prompt_dismissed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS baseline_set_at TIMESTAMPTZ;

-- Comment for clarity
COMMENT ON COLUMN user_settings.starting_debt_g IS 'Initial glycogen debt for ledger day-1. 0 = start fresh, 250 = training recently.';
COMMENT ON COLUMN user_settings.baseline_prompt_dismissed IS 'True if user clicked Keep Fresh or Dont Ask Again.';
COMMENT ON COLUMN user_settings.baseline_set_at IS 'Timestamp when baseline was last changed.';

