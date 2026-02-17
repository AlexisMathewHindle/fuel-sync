-- Migration 004: Add day_intake table for tracking daily nutrition intake
-- This table stores user-reported carb and protein intake per day

-- Create day_intake table
CREATE TABLE IF NOT EXISTS day_intake (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  carbs_g INTEGER,
  protein_g INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one intake record per user per day
  CONSTRAINT day_intake_user_date_unique UNIQUE (user_id, date)
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_day_intake_user_date 
ON day_intake (user_id, date DESC);

-- Enable Row Level Security
ALTER TABLE day_intake ENABLE ROW LEVEL SECURITY;

-- RLS Policies for day_intake
-- Users can only see their own intake records
CREATE POLICY "Users can view own intake records"
ON day_intake
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own intake records
CREATE POLICY "Users can insert own intake records"
ON day_intake
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own intake records
CREATE POLICY "Users can update own intake records"
ON day_intake
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own intake records
CREATE POLICY "Users can delete own intake records"
ON day_intake
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_day_intake_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER day_intake_updated_at
BEFORE UPDATE ON day_intake
FOR EACH ROW
EXECUTE FUNCTION update_day_intake_updated_at();

-- Add comment for documentation
COMMENT ON TABLE day_intake IS 'Stores user-reported daily nutrition intake (carbs and protein)';
COMMENT ON COLUMN day_intake.carbs_g IS 'Total carbohydrates consumed in grams';
COMMENT ON COLUMN day_intake.protein_g IS 'Total protein consumed in grams';
COMMENT ON COLUMN day_intake.notes IS 'Optional notes about meals or intake';

