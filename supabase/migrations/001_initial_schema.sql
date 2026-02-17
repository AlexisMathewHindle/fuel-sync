-- FuelSync Initial Schema Migration
-- Section 2: Database tables for workouts, imports, and computed summaries

-- ============================================================================
-- IMPORTS TABLE
-- Stores metadata about CSV/data uploads from training platforms
-- ============================================================================
CREATE TABLE IF NOT EXISTS imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'trainingpeaks', -- 'trainingpeaks', 'strava', etc.
  filename TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  row_count INTEGER DEFAULT 0,
  errors_json JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- WORKOUTS TABLE
-- Normalized workout data from imports
-- ============================================================================
CREATE TABLE IF NOT EXISTS workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  import_id UUID REFERENCES imports(id) ON DELETE SET NULL,
  start_date TIMESTAMPTZ NOT NULL,
  sport TEXT NOT NULL, -- 'run', 'bike', 'swim', 'strength', etc.
  name TEXT,
  duration_min INTEGER, -- Duration in minutes
  distance_km DECIMAL(10, 2), -- Distance in kilometers
  tss INTEGER, -- Training Stress Score
  if_score DECIMAL(5, 2), -- Intensity Factor
  avg_hr INTEGER, -- Average heart rate
  avg_power INTEGER, -- Average power in watts
  calories INTEGER, -- Estimated calories burned
  raw_json JSONB DEFAULT '{}'::jsonb, -- Store original data for reference
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- DAY_SUMMARIES TABLE
-- Computed daily aggregations and nutrition targets
-- ============================================================================
CREATE TABLE IF NOT EXISTS day_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_duration_min INTEGER DEFAULT 0,
  total_tss INTEGER DEFAULT 0,
  total_calories INTEGER DEFAULT 0,
  sport_mix_json JSONB DEFAULT '{}'::jsonb, -- e.g., {"run": 60, "bike": 120}
  glycogen_debt_est INTEGER DEFAULT 0, -- Estimated glycogen depletion in grams
  carb_target_g INTEGER DEFAULT 0, -- Recommended carbs in grams
  protein_target_g INTEGER DEFAULT 0, -- Recommended protein in grams
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date) -- One summary per user per day
);

-- ============================================================================
-- USER_SETTINGS TABLE
-- User preferences and profile data for calculations
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  weight_kg DECIMAL(5, 2) DEFAULT 70.0, -- User weight in kg
  protein_g_per_kg DECIMAL(3, 1) DEFAULT 1.6, -- Protein target multiplier
  carb_factor DECIMAL(3, 1) DEFAULT 1.0, -- Carb calculation adjustment factor
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- Performance optimization for common queries
-- ============================================================================

-- Imports indexes
CREATE INDEX IF NOT EXISTS idx_imports_user_id ON imports(user_id);
CREATE INDEX IF NOT EXISTS idx_imports_uploaded_at ON imports(uploaded_at DESC);

-- Workouts indexes
CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_start_date ON workouts(start_date DESC);
CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts(user_id, start_date DESC);
CREATE INDEX IF NOT EXISTS idx_workouts_import_id ON workouts(import_id);

-- Day summaries indexes
CREATE INDEX IF NOT EXISTS idx_day_summaries_user_id ON day_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_day_summaries_date ON day_summaries(date DESC);
CREATE INDEX IF NOT EXISTS idx_day_summaries_user_date ON day_summaries(user_id, date DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Ensure users can only access their own data
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- IMPORTS policies
CREATE POLICY "Users can view their own imports"
  ON imports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own imports"
  ON imports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own imports"
  ON imports FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own imports"
  ON imports FOR DELETE
  USING (auth.uid() = user_id);

-- WORKOUTS policies
CREATE POLICY "Users can view their own workouts"
  ON workouts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workouts"
  ON workouts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workouts"
  ON workouts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workouts"
  ON workouts FOR DELETE
  USING (auth.uid() = user_id);

-- DAY_SUMMARIES policies
CREATE POLICY "Users can view their own day summaries"
  ON day_summaries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own day summaries"
  ON day_summaries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own day summaries"
  ON day_summaries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own day summaries"
  ON day_summaries FOR DELETE
  USING (auth.uid() = user_id);

-- USER_SETTINGS policies
CREATE POLICY "Users can view their own settings"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings"
  ON user_settings FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS
-- Helper functions for automatic timestamp updates
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER update_imports_updated_at
  BEFORE UPDATE ON imports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workouts_updated_at
  BEFORE UPDATE ON workouts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_day_summaries_updated_at
  BEFORE UPDATE ON day_summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

