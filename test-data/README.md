# Test Data

This directory contains sample CSV files for testing the import functionality.

## Sample Files

### sample-trainingpeaks.csv

A sample TrainingPeaks Workout Summary CSV with 15 workouts across different sports:
- Running workouts (easy runs, tempo, intervals, long runs)
- Cycling workouts (tempo, recovery, hill repeats, endurance)
- Swimming workouts (endurance, speed work)
- Strength training
- Rest days

**Columns included:**
- Workout Date
- Workout Type (Sport)
- Workout Name
- Duration (HH:MM:SS format)
- Distance (km)
- TSS (Training Stress Score)
- IF (Intensity Factor)
- Avg HR (Average Heart Rate)
- Avg Power (Watts)
- Calories

## Testing the Import Flow

### Step 1: Apply Database Migration

Before testing, make sure you've applied the column mapping migration:

```sql
-- Run in Supabase SQL Editor
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS column_mapping JSONB DEFAULT '{}'::jsonb;
```

Or copy the contents of `supabase/migrations/002_add_column_mapping.sql` and run it.

### Step 2: Test CSV Upload

1. Navigate to `/import` in the app
2. Click "Choose CSV File"
3. Select `test-data/sample-trainingpeaks.csv`
4. Verify the file is parsed successfully

### Step 3: Verify Auto-Detection

The app should automatically detect and map columns:
- ✓ "Workout Date" → Date
- ✓ "Workout Type" → Sport
- ✓ "Workout Name" → Workout Name
- ✓ "Duration" → Duration
- ✓ "Distance" → Distance
- ✓ "TSS" → TSS
- ✓ "IF" → IF
- ✓ "Avg HR" → Average Heart Rate
- ✓ "Avg Power" → Average Power
- ✓ "Calories" → Calories

### Step 4: Check Validation

You should see:
- ✅ Green success message: "All required columns detected. Ready to import!"
- No validation errors (Date and Duration are mapped)
- No warnings (TSS and Calories are mapped)

### Step 5: Review Preview Table

- Preview should show first 20 rows (all 15 in this sample)
- Mapped columns should be highlighted in blue
- Column headers should show the mapped field name

### Step 6: Test Column Mapping Persistence

1. Change one of the column mappings (e.g., unmap "Distance")
2. Click "Proceed to Import"
3. Upload a different file or refresh the page
4. Upload the same CSV again
5. Verify your custom mapping is remembered

### Step 7: Test Validation Errors

1. Upload the CSV
2. Unmap the "Date" field (required)
3. Verify you see a red error message
4. Verify the "Proceed to Import" button is disabled

### Step 8: Test Validation Warnings

1. Upload the CSV
2. Unmap the "TSS" field (optional but recommended)
3. Verify you see a yellow warning message
4. Verify the "Proceed to Import" button is still enabled

## Creating Your Own Test CSV

To test with your own TrainingPeaks data:

1. Log in to TrainingPeaks
2. Go to your workout calendar
3. Select a date range
4. Export as CSV (Workout Summary format)
5. Upload to the app

## Expected Column Formats

The auto-detection works best with these column name patterns:

| Field | Detected Patterns |
|-------|------------------|
| Date | "date", "workout date", "day", "start date" |
| Sport | "sport", "activity", "type", "workout type" |
| Name | "name", "title", "workout name", "description" |
| Duration | "duration", "time", "elapsed time", "moving time" |
| Distance | "distance", "dist", "total distance" |
| TSS | "tss", "training stress score", "stress" |
| IF | "if", "intensity factor", "intensity" |
| Avg HR | "avg hr", "average hr", "heart rate" |
| Avg Power | "avg power", "average power", "power", "watts" |
| Calories | "calories", "cal", "kcal", "energy" |

The matching is case-insensitive and flexible.

