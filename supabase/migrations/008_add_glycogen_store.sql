-- Migration 008: Add Glycogen Store Model columns to day_summaries
-- Replaces debt-only tracking with full store simulation
-- Supports surplus (buffer above baseline) and deficit (below baseline)
--
-- The store model tracks actual glycogen level instead of just debt:
--   store_end = clamp(store_start - depletion + repletion, 0, supercomp_cap)
--   deficit = max(0, capacity - store_end)
--   surplus = max(0, store_end - capacity)
--   fill_pct = (store_end / capacity) * 100

-- Add glycogen store columns to day_summaries
ALTER TABLE day_summaries
ADD COLUMN IF NOT EXISTS glycogen_store_start_g NUMERIC,
ADD COLUMN IF NOT EXISTS glycogen_store_end_g NUMERIC,
ADD COLUMN IF NOT EXISTS glycogen_capacity_g NUMERIC,
ADD COLUMN IF NOT EXISTS glycogen_surplus_g NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS glycogen_deficit_g NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS fill_pct NUMERIC;

-- Add comments for documentation
COMMENT ON COLUMN day_summaries.glycogen_store_start_g IS 'Glycogen store at start of day (carried from previous day end)';
COMMENT ON COLUMN day_summaries.glycogen_store_end_g IS 'Glycogen store at end of day (after depletion and repletion)';
COMMENT ON COLUMN day_summaries.glycogen_capacity_g IS 'Baseline glycogen capacity for this day (weight_kg × 7, or user override)';
COMMENT ON COLUMN day_summaries.glycogen_surplus_g IS 'Surplus above baseline capacity (0 if at/below baseline). Supercompensation buffer.';
COMMENT ON COLUMN day_summaries.glycogen_deficit_g IS 'Deficit below baseline capacity (0 if at/above baseline). Equivalent to old debt concept.';
COMMENT ON COLUMN day_summaries.fill_pct IS 'Fill percentage: (store_end / capacity) × 100. Can exceed 100% during supercompensation.';

-- Add optional glycogen capacity override to user_settings
-- When set, overrides the weight-based capacity calculation (weight_kg × 7)
-- Useful for athletes who know their lean mass or have done depletion testing
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS glycogen_capacity_override_g INTEGER;

COMMENT ON COLUMN user_settings.glycogen_capacity_override_g IS 'Optional override for glycogen capacity in grams. NULL = use weight-based default (weight_kg × 7).';

