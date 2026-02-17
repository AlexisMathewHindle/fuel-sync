# Section 7 Testing Guide - Alignment Score v1

This guide walks through testing the alignment score system that compares actual intake vs nutrition targets.

## Overview

The alignment score system allows users to:
- Log daily carb and protein intake (simple grams input)
- Compare actual vs target nutrition
- See alignment scores (0-100%) for carbs, protein, and overall

**Scoring Formula:**
- **Carb Score** = min(100, actual_carbs / target_carbs × 100)
- **Protein Score** = min(100, actual_protein / target_protein × 100)
- **Overall Score** = (carb_score × 0.6) + (protein_score × 0.4)

## Prerequisites

### 1. Apply Database Migration

Run this migration in your Supabase SQL Editor:

```sql
-- Copy and paste the contents of supabase/migrations/004_add_day_intake.sql
```

This creates the `day_intake` table with:
- `user_id`, `date`, `carbs_g`, `protein_g`, `notes`
- Unique constraint on `(user_id, date)`
- RLS policies for data isolation

### 2. Have Some Training Data

Make sure you have:
- Imported workouts (Section 4)
- Computed day summaries with nutrition targets (Section 5 & 6)

## Test 1: Alignment Score Calculator Test

### Steps:

1. Navigate to `/settings`
2. Scroll to "Alignment Score Test" section
3. Click through the test scenarios:
   - **Perfect Match** - 100% of both targets → Overall: 100%
   - **Good Day** - 90% of targets → Overall: 90%
   - **Carbs Low** - Hit protein, missed carbs → Overall: 76% (60% × 60 + 40% × 100)
   - **Protein Low** - Hit carbs, missed protein → Overall: 84% (60% × 100 + 40% × 60)
   - **Both Low** - 50% of both → Overall: 50%
   - **Over Target** - 120% (capped at 100) → Overall: 100%

### Expected Behavior:

✅ **Perfect Match (300g carbs, 150g protein):**
- Carb Score: 100%
- Protein Score: 100%
- Overall: 100%

✅ **Carbs Low (180g carbs, 150g protein):**
- Carb Score: 60% (180/300)
- Protein Score: 100% (150/150)
- Overall: 76% (60 × 0.6 + 100 × 0.4 = 36 + 40 = 76)

✅ **Over Target (360g carbs, 180g protein):**
- Carb Score: 100% (capped, even though 120%)
- Protein Score: 100% (capped, even though 120%)
- Overall: 100%

## Test 2: Log Intake for Today

### Steps:

1. Navigate to `/settings`
2. Scroll to "Log Today's Intake" section
3. Select today's date
4. Enter your actual intake:
   - Carbs: e.g., 280g
   - Protein: e.g., 140g
   - Notes: e.g., "Had extra carbs post-workout"
5. Click "Save Intake"
6. Observe the alignment score preview

### Expected Behavior:

✅ Form shows targets from day_summaries (if available)
✅ Save button is disabled until you enter at least carbs or protein
✅ After saving, see success message
✅ Alignment score preview shows calculated scores
✅ Can edit and re-save (upserts existing record)
✅ Can clear intake

## Test 3: Verify in Database

### Steps:

1. Go to Supabase Dashboard → Table Editor → `day_intake`
2. Find your intake record
3. Verify fields:
   - `user_id` matches your user
   - `date` is correct
   - `carbs_g` and `protein_g` match what you entered
   - `notes` is saved
   - `created_at` and `updated_at` are set

### Expected Behavior:

✅ Record exists with correct data
✅ Unique constraint prevents duplicates (one record per user per date)
✅ RLS prevents seeing other users' data

## Test 4: Day Detail View

### Steps:

1. Create a simple test page to use DayDetailCard component
2. Or integrate it into Calendar view (future section)
3. Pass in:
   - `date`: A date string (YYYY-MM-DD)
   - `daySummary`: Day summary with targets
   - `dayIntake`: Day intake with actual values

### Expected Behavior:

✅ Shows formatted date (e.g., "Monday, February 16, 2026")
✅ Shows training summary (duration, TSS, calories, glycogen debt)
✅ Shows sport mix
✅ Shows nutrition targets vs actual
✅ Shows alignment scores with color coding
✅ Shows progress bars for carbs and protein
✅ Shows overall alignment badge
✅ Displays notes if present

## Test 5: Score Color Coding

Verify that scores are color-coded correctly:

| Score Range | Color | Description |
|-------------|-------|-------------|
| 90-100% | Green | Excellent |
| 75-89% | Yellow | Good |
| 50-74% | Orange | Fair |
| 0-49% | Red | Needs improvement |

### Test Cases:

- **95% score** → Green badge/text
- **80% score** → Yellow badge/text
- **65% score** → Orange badge/text
- **40% score** → Red badge/text

## Test 6: Edge Cases

### Test 6a: No Targets (Rest Day)

**Scenario:** Day with no workouts, no day_summary

**Expected:**
- Can still log intake
- Scores show 0% (no targets to compare against)
- Or hide scores if no targets available

### Test 6b: Partial Intake

**Scenario:** Log only carbs, not protein

**Expected:**
- Carb score calculated normally
- Protein score = 0%
- Overall score weighted accordingly

### Test 6c: Zero Intake

**Scenario:** Enter 0g for both

**Expected:**
- Both scores = 0%
- Overall score = 0%

### Test 6d: Very High Intake

**Scenario:** Enter 500g carbs (target 300g)

**Expected:**
- Carb score = 100% (capped)
- Progress bar shows 166% but score capped at 100%

## Test 7: Multiple Days

### Steps:

1. Log intake for multiple days
2. Change the date in IntakeLogger
3. Enter different values for each day
4. Verify each day's intake is saved separately

### Expected Behavior:

✅ Can log intake for any date
✅ Each date has independent intake record
✅ Changing date loads that date's existing intake (if any)
✅ Unique constraint prevents duplicate records per date

## Test 8: Update Existing Intake

### Steps:

1. Log intake for a day (e.g., 250g carbs, 120g protein)
2. Save it
3. Change the values (e.g., 280g carbs, 140g protein)
4. Save again

### Expected Behavior:

✅ Record is updated (not duplicated)
✅ `updated_at` timestamp changes
✅ New values replace old values
✅ Success message confirms save

## Test 9: Clear Intake

### Steps:

1. Log intake for a day
2. Save it
3. Click "Clear" button
4. Confirm the dialog

### Expected Behavior:

✅ Confirmation dialog appears
✅ Record is deleted from database
✅ Form resets to empty
✅ Success message confirms clear
✅ "Clear" button disappears (no existing intake)

## Calculation Examples

### Example 1: Good Alignment

**Targets:** 300g carbs, 150g protein  
**Actual:** 285g carbs, 145g protein

**Scores:**
- Carb: 285/300 × 100 = 95%
- Protein: 145/150 × 100 = 97%
- Overall: (95 × 0.6) + (97 × 0.4) = 57 + 38.8 = **96%** ✅ Excellent

### Example 2: Carbs Low

**Targets:** 300g carbs, 150g protein  
**Actual:** 200g carbs, 150g protein

**Scores:**
- Carb: 200/300 × 100 = 67%
- Protein: 150/150 × 100 = 100%
- Overall: (67 × 0.6) + (100 × 0.4) = 40.2 + 40 = **80%** ⚠️ Good

### Example 3: Both Low

**Targets:** 300g carbs, 150g protein  
**Actual:** 180g carbs, 90g protein

**Scores:**
- Carb: 180/300 × 100 = 60%
- Protein: 90/150 × 100 = 60%
- Overall: (60 × 0.6) + (60 × 0.4) = 36 + 24 = **60%** 🟠 Fair

## Success Criteria

All tests should pass with:
- ✅ Can input carbs/protein for a day
- ✅ Scores calculate correctly (60% carbs, 40% protein weighting)
- ✅ Scores are capped at 100% (going over target is fine)
- ✅ Color coding works (green/yellow/orange/red)
- ✅ Can update existing intake (upsert)
- ✅ Can clear intake (delete)
- ✅ Day detail shows target vs actual with visual progress bars
- ✅ Unique constraint prevents duplicates per day
- ✅ RLS isolates user data

## Next Steps

After Section 7 is complete, you can:
- Build calendar view with score badges on each day
- Add weekly/monthly alignment trends
- Implement meal suggestions based on remaining targets
- Add more detailed intake tracking (meal timing, macros breakdown)

