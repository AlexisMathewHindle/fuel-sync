-- Add dedupe constraint to workouts table
-- Prevents duplicate workouts from being imported

-- Create a unique index on the dedupe key
-- This allows NULL values in name field while still preventing duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_workouts_dedupe 
ON workouts (user_id, start_date, sport, duration_min, COALESCE(name, ''));

COMMENT ON INDEX idx_workouts_dedupe IS 'Prevents duplicate workout imports based on user, date, sport, duration, and name';

