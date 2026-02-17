# Section 6 Testing Guide - Fueling Engine v1

This guide walks through testing the fueling engine that calculates nutrition targets based on training load.

## Overview

The fueling engine computes three key metrics for each day:
- **Glycogen Debt** (0-100 scale) - Estimate of glycogen depletion
- **Carb Target** (grams) - Daily carbohydrate recommendation
- **Protein Target** (grams) - Daily protein recommendation

## Prerequisites

Make sure you have:
1. Completed Section 5 (Day Summarizer)
2. Imported some workout data
3. Signed in to the app

## Test 1: Interactive Fueling Engine Test

### Steps:

1. Navigate to `/settings`
2. Scroll to "Fueling Engine Test" section
3. Click through the test scenarios:
   - **Rest Day** - Should show low/zero glycogen debt, base carbs (~210g for 70kg)
   - **Easy Run** - Low debt (~12), moderate carbs (~250g)
   - **Moderate Ride** - Moderate debt (~28), higher carbs (~280g)
   - **Hard Workout** - High debt (~50), significant carbs (~320g)
   - **Big Day** - Very high debt (~83), high carbs (~430g)
   - **Race Day** - Max debt (~100), very high carbs (~520g with 1.2 factor)

### Expected Behavior:

✅ **Rest Day:**
- Glycogen Debt: 0
- Carbs: ~210g (base 3g/kg × 70kg = 210g, clamped to min 100g)
- Protein: 126g (70kg × 1.8g/kg)

✅ **Easy Run (45min, TSS 35):**
- Glycogen Debt: ~12 (35 TSS / 300 × 100)
- Carbs: ~211g (210 base + 35 TSS × 0.03)
- Protein: 126g

✅ **Hard Workout (120min, TSS 150):**
- Glycogen Debt: ~50
- Carbs: ~215g (210 base + 150 TSS × 0.03)
- Protein: 126g

✅ **Big Day (200min, TSS 250):**
- Glycogen Debt: ~83
- Carbs: ~218g (210 base + 250 TSS × 0.03)
- Protein: 126g

## Test 2: User Settings Configuration

### Steps:

1. Navigate to `/settings`
2. Find "Nutrition Settings" section
3. Update your settings:
   - **Body Weight**: Enter your actual weight (e.g., 75kg)
   - **Protein Target**: Try different values (1.6 - 2.2 g/kg)
   - **Carb Factor**: Try 1.0 (default), 1.2 (+20%), 0.8 (-20%)
   - **Timezone**: Set your timezone
4. Click "Save Settings"
5. Click "Recalculate All Days"

### Expected Behavior:

✅ Settings save successfully
✅ "Recalculate All Days" button appears after saving
✅ Recalculation processes all days with new settings
✅ Progress updates shown during recalculation

## Test 3: Automatic Calculation on Import

### Steps:

1. Navigate to `/import`
2. Upload a CSV file with workouts
3. Complete the import
4. Watch for automatic day summarization
5. Go to Supabase Dashboard → `day_summaries` table
6. Check that nutrition fields are populated

### Expected Behavior:

✅ Import completes successfully
✅ Day summaries are automatically computed
✅ Each day summary includes:
- `glycogen_debt_est` (0-100)
- `carb_target_g` (100-800)
- `protein_target_g` (based on weight)

## Test 4: Verify Calculations in Database

### Steps:

1. Go to Supabase Dashboard → Table Editor → `day_summaries`
2. Find a day with workouts
3. Verify the calculations manually:

**Example Day:**
- User weight: 70kg
- Total duration: 90 min
- Total TSS: 85
- Protein g/kg: 1.8
- Carb factor: 1.0

**Expected Calculations:**
- Glycogen Debt: 85/300 × 100 = ~28
- Protein: 70 × 1.8 = 126g
- Carbs: (70 × 3) + (85 × 0.03) = 210 + 2.55 = ~213g

### Verification:

✅ `glycogen_debt_est` ≈ 28
✅ `protein_target_g` = 126
✅ `carb_target_g` ≈ 213

## Test 5: Edge Cases

### Test 5a: Rest Day (No Workouts)

**Input:**
- Duration: 0 min
- TSS: 0

**Expected:**
- Glycogen Debt: 0
- Carbs: 100g (minimum clamp)
- Protein: Based on weight (e.g., 126g for 70kg)

### Test 5b: Duration Only (No TSS)

**Input:**
- Duration: 120 min
- TSS: null/0

**Expected:**
- Glycogen Debt: Based on duration (120/180 × 75 = ~50)
- Carbs: Base + (120 × 0.8) = 210 + 96 = 306g
- Uses duration fallback formula

### Test 5c: Extreme Training Day

**Input:**
- Duration: 300 min
- TSS: 400

**Expected:**
- Glycogen Debt: 100 (clamped at max)
- Carbs: ~222g (210 + 400 × 0.03), reasonable upper bound
- Protein: Based on weight

### Test 5d: Different Body Weights

Test with various weights:
- 50kg athlete: Lower absolute targets
- 70kg athlete: Medium targets
- 90kg athlete: Higher absolute targets

**Expected:**
✅ Protein scales linearly with weight
✅ Carbs scale with weight (base) + training load

## Test 6: Settings Changes Propagate

### Steps:

1. Import workouts (creates day summaries)
2. Check a day summary's carb target (note the value)
3. Go to Settings
4. Change weight from 70kg to 80kg
5. Click "Recalculate All Days"
6. Check the same day summary again

### Expected Behavior:

✅ Carb target increases (higher base: 80×3 = 240g vs 70×3 = 210g)
✅ Protein target increases (80×1.8 = 144g vs 70×1.8 = 126g)
✅ All days are recalculated with new settings

## Calculation Formulas (v1)

### Glycogen Debt (0-100 scale)

```javascript
if (TSS exists):
  debt = min(100, (TSS / 300) × 100)
else:
  debt = min(100, (duration_min / 180) × 75)
```

### Protein Target

```javascript
protein_g = weight_kg × protein_g_per_kg
// Default: 70kg × 1.8 = 126g
```

### Carb Target

```javascript
base_carbs = weight_kg × 3

if (TSS exists):
  training_carbs = TSS × 0.03
else:
  training_carbs = duration_min × 0.8

carb_target = (base_carbs + training_carbs) × carb_factor
carb_target = clamp(carb_target, 100, 800)
```

## Success Criteria

All tests should pass with:
- ✅ Every day summary shows carb/protein targets
- ✅ Logic behaves sensibly on rest vs big days
- ✅ User can change weight/protein factor and see recalculation
- ✅ Calculations are predictable and testable
- ✅ Values are within sensible bounds (100-800g carbs)
- ✅ Automatic calculation on import works
- ✅ Manual recalculation works

## Next Steps

After Section 6 is complete, you can:
- Build calendar view to visualize daily targets
- Add more sophisticated fueling logic (sport-specific, periodization)
- Implement meal planning based on targets
- Add glycogen tracking over multiple days

