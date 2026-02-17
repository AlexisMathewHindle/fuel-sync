# Section 9 Testing Guide - Settings + Recalculation

This guide walks through testing the personal settings and automatic recalculation features.

## Overview

The settings system allows users to:
- Set body weight (kg)
- Set protein target (g/kg body weight)
- Set carb factor (multiplier for carb targets)
- Set timezone
- Automatically recalculate all day summaries when settings change
- Manually trigger recalculation if needed

## Prerequisites

1. **Be signed in** to the app
2. **Have imported workouts** (Section 4)
3. **Have day summaries** computed (Section 5)

## Test 1: View Current Settings

### Steps:

1. Navigate to `/settings`
2. Scroll to "Nutrition Settings" section
3. Observe the current values

### Expected Behavior:

✅ Form shows default values if no settings saved:
- Weight: 70 kg
- Protein: 1.8 g/kg
- Carb Factor: 1.0
- Timezone: UTC

✅ Form shows saved values if settings exist
✅ All fields are editable
✅ Help text explains each field

## Test 2: Save Settings (Manual Recalculation)

### Steps:

1. Navigate to `/settings`
2. **Uncheck** "Automatically recalculate all days when saving settings"
3. Change weight to 75 kg
4. Change protein to 2.0 g/kg
5. Click "Save Settings"
6. Wait for success message

### Expected Behavior:

✅ Success message: "✓ Settings saved successfully!"
✅ "Recalculate All Days" button appears
✅ Settings persist (refresh page to verify)
✅ Success message disappears after 3 seconds

## Test 3: Manual Recalculation

### Steps:

1. After saving settings (with auto-recalculate OFF)
2. Click "Recalculate All Days" button
3. Watch the progress messages

### Expected Behavior:

✅ Button shows "Recalculating..."
✅ Progress message shows status
✅ Success message: "✓ Recalculated X days with new settings!"
✅ Message shows spinning loader during recalculation
✅ Success message disappears after 5 seconds

## Test 4: Verify Targets Updated

### Steps:

1. After recalculation completes
2. Navigate to `/calendar`
3. Click on a day with training
4. Check the nutrition targets

### Expected Calculation:

**Example with new settings:**
- Weight: 75 kg
- Protein: 2.0 g/kg
- Carb Factor: 1.0
- Training: 60 min run, TSS 80

**Expected Targets:**
- Protein: 75 × 2.0 = **150g**
- Carbs: (3 × 75) + (80 × 0.03) = 225 + 2.4 = **227g** (rounded)

✅ Targets match new settings
✅ All days recalculated with new values

## Test 5: Auto-Recalculation (Recommended)

### Steps:

1. Navigate to `/settings`
2. **Check** "Automatically recalculate all days when saving settings"
3. Change weight to 80 kg
4. Click "Save Settings"
5. Wait for completion

### Expected Behavior:

✅ Message: "✓ Settings saved! Recalculating targets..."
✅ Progress messages show recalculation status
✅ Final message: "✓ Settings saved and X days recalculated!"
✅ No manual "Recalculate All Days" button needed
✅ Calendar immediately shows updated targets

## Test 6: Validation

### Test 6a: Invalid Weight

**Steps:**
1. Enter weight: 25 kg (below minimum)
2. Try to save

**Expected:**
✅ Save button is disabled
✅ Error message: "Please ensure all values are within valid ranges"

### Test 6b: Invalid Protein

**Steps:**
1. Enter protein: 0.5 g/kg (below minimum)
2. Try to save

**Expected:**
✅ Save button is disabled
✅ Error message shown

### Test 6c: Invalid Carb Factor

**Steps:**
1. Enter carb factor: 2.5 (above maximum)
2. Try to save

**Expected:**
✅ Save button is disabled
✅ Error message shown

### Valid Ranges:

- **Weight:** 30-200 kg
- **Protein:** 1.0-3.0 g/kg
- **Carb Factor:** 0.5-2.0

## Test 7: Settings Persistence

### Steps:

1. Save settings with specific values
2. Navigate away from settings page
3. Close browser tab
4. Reopen app and navigate to `/settings`

### Expected Behavior:

✅ Settings are loaded from database
✅ Form shows previously saved values
✅ Settings persist across sessions

## Test 8: Impact on Calendar

### Steps:

1. Before changing settings, note a day's targets
2. Change weight from 70kg to 80kg
3. Save with auto-recalculate enabled
4. Go back to the same day in calendar

### Expected Changes:

**Before (70kg, protein 1.8):**
- Protein target: 126g

**After (80kg, protein 1.8):**
- Protein target: 144g

✅ Protein target increases proportionally
✅ Carb target also adjusts (base carbs = 3g/kg)
✅ All 40 days updated

## Test 9: Carb Factor Impact

### Steps:

1. Set carb factor to 1.0 (default)
2. Note carb targets for a training day
3. Change carb factor to 1.2 (+20%)
4. Save and recalculate
5. Check same day's carb target

### Expected Behavior:

**Example:**
- Training: TSS 100
- Base carbs (70kg): 210g
- Training carbs: 100 × 0.03 = 3g
- **Factor 1.0:** 210 + 3 = 213g
- **Factor 1.2:** (210 + 3) × 1.2 = 256g

✅ Carb targets increase by 20%
✅ Protein targets unchanged

## Test 10: Multiple Updates

### Steps:

1. Save settings with weight 70kg
2. Immediately change to 75kg and save
3. Immediately change to 80kg and save

### Expected Behavior:

✅ Each save triggers recalculation
✅ Final targets reflect latest settings (80kg)
✅ No conflicts or race conditions
✅ Database shows latest values

## Test 11: Error Handling

### Test 11a: Network Error

**Steps:**
1. Disconnect internet
2. Try to save settings

**Expected:**
✅ Error message shown
✅ Settings not saved
✅ Form remains editable

### Test 11b: Database Error

**Steps:**
1. (Simulate by temporarily breaking Supabase connection)
2. Try to save

**Expected:**
✅ Error message with details
✅ User can retry

## Calculation Examples

### Example 1: Light Training Day

**Settings:**
- Weight: 70kg
- Protein: 1.8 g/kg
- Carb Factor: 1.0

**Training:**
- 30 min easy run
- TSS: 40

**Targets:**
- Protein: 70 × 1.8 = **126g**
- Carbs: (3 × 70) + (40 × 0.03) = 210 + 1.2 = **211g**

### Example 2: Hard Training Day

**Settings:**
- Weight: 75kg
- Protein: 2.0 g/kg
- Carb Factor: 1.2

**Training:**
- 90 min hard ride
- TSS: 150

**Targets:**
- Protein: 75 × 2.0 = **150g**
- Carbs: [(3 × 75) + (150 × 0.03)] × 1.2 = [225 + 4.5] × 1.2 = **275g**

### Example 3: Rest Day

**Settings:**
- Weight: 70kg
- Protein: 1.8 g/kg
- Carb Factor: 1.0

**Training:**
- None (rest day)

**Targets:**
- Protein: 70 × 1.8 = **126g**
- Carbs: (3 × 70) + 0 = **210g** (base only)

## Success Criteria

All tests should pass with:
- ✅ Settings save correctly to database
- ✅ Settings persist across sessions
- ✅ Auto-recalculation updates all days
- ✅ Manual recalculation available as fallback
- ✅ Validation prevents invalid values
- ✅ Clear feedback during save/recalculation
- ✅ Targets update correctly based on new settings
- ✅ Calendar reflects updated targets immediately

## Next Steps

After Section 9 is complete, you have a fully functional nutrition tracking system! Future enhancements could include:
- Weekly/monthly trend analysis
- Goal setting and progress tracking
- Meal planning based on targets
- Integration with food databases
- Photo logging
- Barcode scanning

