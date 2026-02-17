-- ============================================================================
-- DATABASE DIAGNOSTIC CHECK
-- ============================================================================
-- Run this in Supabase SQL Editor to see what tables and columns exist
-- ============================================================================

-- Check which tables exist
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('workouts', 'day_summaries', 'day_intake', 'user_settings', 'imports')
ORDER BY table_name;

-- Check columns in day_intake table (if it exists)
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'day_intake'
ORDER BY ordinal_position;

-- Check RLS policies on day_intake
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'day_intake';

-- Check if RLS is enabled on day_intake
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'day_intake';

