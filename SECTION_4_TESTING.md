# Section 4 Testing Guide - Import Pipeline

This guide walks through testing the complete import pipeline including normalization, storage, and deduplication.

## Prerequisites

### 1. Apply Database Migrations

Run these migrations in your Supabase SQL Editor:

```sql
-- Migration 002: Add column mapping to user_settings
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS column_mapping JSONB DEFAULT '{}'::jsonb;

-- Migration 003: Add dedupe constraint to workouts
CREATE UNIQUE INDEX IF NOT EXISTS idx_workouts_dedupe 
ON workouts (user_id, start_date, sport, duration_min, COALESCE(name, ''));
```

### 2. Ensure You're Signed In

Navigate to `/settings` and sign in with magic link authentication.

## Test 1: Basic Import Flow

### Steps:

1. Navigate to `/import`
2. Click "Choose CSV File"
3. Select `test-data/sample-trainingpeaks.csv`
4. Verify auto-detection mapped all columns correctly
5. Click "Proceed to Import"
6. Watch the progress bar
7. Verify import results show:
   - Total: 15 rows
   - Imported: 15 workouts
   - Duplicates: 0
   - Failed: 0

### Expected Outcome:
✅ All 15 workouts imported successfully with no errors

## Test 2: Deduplication

### Steps:

1. Stay on the import page (or navigate back to `/import`)
2. Click "Import Another File"
3. Upload the **same** `sample-trainingpeaks.csv` file again
4. Click "Proceed to Import"
5. Verify import results show:
   - Total: 15 rows
   - Imported: 0 workouts (or very few)
   - Duplicates: 15 (or most of them)
   - Failed: 0

### Expected Outcome:
✅ Duplicate workouts are detected and not re-imported

**How it works:** The dedupe constraint uses `(user_id, start_date, sport, duration_min, name)` to identify duplicates.

## Test 3: Data Transformation

### Verify in Supabase:

1. Go to Supabase Dashboard → Table Editor → `workouts`
2. Check a few imported workouts
3. Verify:
   - `start_date` is in ISO format (YYYY-MM-DDTHH:MM:SS.sssZ)
   - `duration_min` is an integer (e.g., 45, 90, 135)
   - `sport` is normalized (e.g., "run", "bike", "swim")
   - `distance_km` is a decimal (e.g., 8.50, 42.00)
   - `tss`, `avg_hr`, `avg_power`, `calories` are integers
   - `if_score` is a decimal (e.g., 0.72, 0.85)
   - `raw_json` contains the original CSV row

### Expected Outcome:
✅ All data types are correctly parsed and stored

## Test 4: Error Handling

### Create a test CSV with errors:

Create a file `test-data/invalid.csv`:

```csv
Workout Date,Workout Type,Workout Name,Duration,Distance,TSS,IF,Avg HR,Avg Power,Calories
INVALID_DATE,Run,Test Run,00:45:00,8.5,65,0.72,145,0,450
2024-02-01,Bike,Test Bike,INVALID_DURATION,42.0,95,0.85,155,220,720
,Run,Missing Date,00:30:00,5.0,45,0.65,140,0,320
```

### Steps:

1. Navigate to `/import`
2. Upload `test-data/invalid.csv`
3. Click "Proceed to Import"
4. Check import results

### Expected Outcome:
✅ Import completes but shows:
- Failed: 3 rows
- Errors section lists specific issues:
  - Row 1: Invalid date
  - Row 2: Invalid duration
  - Row 3: Missing date

## Test 5: Column Mapping Persistence

### Steps:

1. Navigate to `/import`
2. Upload `sample-trainingpeaks.csv`
3. Change the "Distance" mapping to a different column (or unmap it)
4. Click "Proceed to Import"
5. Refresh the page or navigate away and back
6. Upload the same CSV again
7. Verify your custom mapping is remembered

### Expected Outcome:
✅ Column mapping preferences are saved and restored

**How it works:** Mapping is stored in `user_settings.column_mapping` as JSONB.

## Test 6: Batch Processing

The import processor handles large files by:
- Processing in batches of 50 workouts
- Showing progress updates
- Continuing even if some batches fail

### To test with larger files:

1. Create a CSV with 100+ rows (duplicate the sample data)
2. Import and watch the progress bar update
3. Verify all batches are processed

## Test 7: Import History

### Steps:

1. Go to Supabase Dashboard → Table Editor → `imports`
2. Find your import records
3. Verify each import has:
   - `source`: "trainingpeaks"
   - `filename`: Your CSV filename
   - `status`: "completed"
   - `row_count`: Number of rows in CSV
   - `errors_json`: Array of any errors (empty if none)

### Expected Outcome:
✅ Import metadata is tracked for audit purposes

## Test 8: Validation Warnings

### Steps:

1. Create a CSV without TSS or Calories columns
2. Upload it
3. Verify you see yellow warning messages
4. Verify you can still proceed with import

### Expected Outcome:
✅ Warnings are shown but don't block import

## Test 9: Validation Errors

### Steps:

1. Upload a CSV
2. Unmap the "Date" field (required)
3. Verify red error message appears
4. Verify "Proceed to Import" button is disabled

### Expected Outcome:
✅ Missing required fields block import

## Troubleshooting

### Import fails with "Failed to create import record"
- Check you're signed in
- Verify RLS policies are enabled on `imports` table

### All workouts show as duplicates on first import
- Check the dedupe index was created correctly
- Verify `start_date`, `sport`, `duration_min` are being parsed correctly

### Progress bar doesn't update
- Check browser console for errors
- Verify `onProgress` callback is being called

### Workouts not visible after import
- Check RLS policies on `workouts` table
- Verify `user_id` matches your authenticated user

## Success Criteria

All tests should pass with:
- ✅ Import inserts workouts successfully
- ✅ Re-importing same file does not create duplicates
- ✅ Errors are shown clearly with row-level details
- ✅ Data is correctly normalized and typed
- ✅ Column mapping is persisted
- ✅ Progress is shown during import
- ✅ Import history is tracked

## Next Steps

After Section 4 is complete, you'll be ready to:
- Build the calendar view to visualize workouts
- Implement day summaries calculation
- Add nutrition recommendations based on training load

