-- Migration 009: Engine Credibility & Modeling Integrity (Phase 1)
-- Adds transparent model-state fields and enforces soft debt buffer bounds.

ALTER TABLE day_summaries
ADD COLUMN IF NOT EXISTS intake_type TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS intake_confidence TEXT DEFAULT 'low',
ADD COLUMN IF NOT EXISTS estimated_intake_g NUMERIC,
ADD COLUMN IF NOT EXISTS debt_trend TEXT DEFAULT 'stable';

-- Intake source/state constraints
ALTER TABLE day_summaries
DROP CONSTRAINT IF EXISTS day_summaries_intake_type_check,
ADD CONSTRAINT day_summaries_intake_type_check
  CHECK (intake_type IN ('logged', 'estimated', 'none', NULL));

ALTER TABLE day_summaries
DROP CONSTRAINT IF EXISTS day_summaries_intake_confidence_check,
ADD CONSTRAINT day_summaries_intake_confidence_check
  CHECK (intake_confidence IN ('high', 'low', NULL));

-- 3-day debt trend state
ALTER TABLE day_summaries
DROP CONSTRAINT IF EXISTS day_summaries_debt_trend_check,
ADD CONSTRAINT day_summaries_debt_trend_check
  CHECK (debt_trend IN ('increasing', 'stable', 'decreasing', NULL));

-- Debt soft buffer range: allow slight negative debt to represent top-up buffer.
ALTER TABLE day_summaries
DROP CONSTRAINT IF EXISTS day_summaries_debt_start_range_check,
ADD CONSTRAINT day_summaries_debt_start_range_check
  CHECK (debt_start_g IS NULL OR (debt_start_g >= -150 AND debt_start_g <= 900));

ALTER TABLE day_summaries
DROP CONSTRAINT IF EXISTS day_summaries_debt_end_range_check,
ADD CONSTRAINT day_summaries_debt_end_range_check
  CHECK (debt_end_g IS NULL OR (debt_end_g >= -150 AND debt_end_g <= 900));

COMMENT ON COLUMN day_summaries.intake_type IS 'Intake source used in ledger: logged, estimated (60% of carb target), or none.';
COMMENT ON COLUMN day_summaries.intake_confidence IS 'Confidence in repletion estimate: high for logged, low for estimated/none.';
COMMENT ON COLUMN day_summaries.estimated_intake_g IS 'Estimated carb intake used when intake is not logged.';
COMMENT ON COLUMN day_summaries.debt_trend IS '3-day debt slope classification: increasing, stable, decreasing.';
