-- Add column_mapping field to user_settings table
-- This stores the user's CSV column mapping preferences for future imports

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS column_mapping JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN user_settings.column_mapping IS 'Stores user CSV column mapping preferences for TrainingPeaks imports';

