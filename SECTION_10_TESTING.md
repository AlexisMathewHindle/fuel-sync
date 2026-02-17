# Section 10 Testing Guide - Polish & Error States

This guide walks through testing the polish features added in Section 10: import history, empty states, error display, and loading states.

## Prerequisites

- Completed Sections 1-9
- Have some imported workouts (or be ready to test empty states)
- Signed in to the app

---

## Test 1: Import History

### Steps:

1. **Navigate to Import Page**
   - Go to `/import`
   - Scroll to the bottom of the page

2. **View Import History**
   - You should see an "Import History" section
   - If you have previous imports, they should be listed with:
     - ✅ Filename
     - ✅ Status badge (completed, processing, failed, pending)
     - ✅ Upload timestamp
     - ✅ Row count
     - ✅ Source (e.g., "trainingpeaks")

3. **Check Empty State**
   - If no imports exist yet:
     - Should show "No imports yet" message
     - Should show "Import Workouts" button
     - Click button → should navigate to import form

4. **Test Error Display**
   - If you have a failed import with errors:
     - Should show error count (e.g., "5 error(s)")
     - Click the error toggle (▶) to expand
     - Should show first 5 errors with row numbers
     - If more than 5 errors, should show "... and X more errors"

### Expected Results:

✅ Import history displays correctly  
✅ Status badges are color-coded (green=completed, red=failed, blue=processing)  
✅ Timestamps are formatted nicely  
✅ Errors are expandable and show details  
✅ Empty state shows helpful prompt  

---

## Test 2: Enhanced Import Error Display

### Steps:

1. **Import a CSV with Errors**
   - Upload a CSV with some invalid rows (e.g., missing dates, invalid formats)
   - Complete the import

2. **View Error Details**
   - After import completes, scroll to "Import Results"
   - Should see a red error section if any rows failed
   - Should show: "⚠️ X row(s) failed to import"

3. **Check Error List**
   - Should show first 5 errors by default
   - Each error should show:
     - Row number
     - Specific error messages (as bullet points)
   - If more than 5 errors:
     - Should show "Show All" button
     - Click "Show All" → should expand to show all errors
     - Click "Show Less" → should collapse back to 5

4. **Check Help Text**
   - Should see "Common issues" help text at bottom
   - Suggests checking CSV and re-importing

### Expected Results:

✅ Failed row count is prominently displayed  
✅ Individual errors show row numbers and specific issues  
✅ "Show All" / "Show Less" toggle works correctly  
✅ Error display is clear and actionable  
✅ Help text provides guidance  

---

## Test 3: Empty States

### Steps:

1. **Clear All Data** (if you have existing workouts)
   - Go to `/settings`
   - Scroll to "Danger Zone"
   - Click "Clear Everything"
   - Confirm deletion

2. **View Calendar Empty State**
   - Go to `/calendar`
   - Should see empty state with:
     - 📊 Icon
     - "No workouts yet" heading
     - Helpful description text
     - "Import Your First Workout" button
     - Additional guidance text

3. **Test Empty State Action**
   - Click "Import Your First Workout" button
   - Should navigate to `/import`

### Expected Results:

✅ Empty state is visually appealing (dashed border, centered content)  
✅ Message is clear and helpful  
✅ Call-to-action button is prominent  
✅ Navigation works correctly  

---

## Test 4: Loading States

### Steps:

1. **Test Calendar Loading**
   - Sign out (if signed in)
   - Sign in again
   - Navigate to `/calendar`
   - Should briefly see "Loading your training data..." message

2. **Test Day Detail Loading**
   - Click on any day card
   - Should briefly see "Loading day details..." message

3. **Test Import History Loading**
   - Go to `/import`
   - Scroll to Import History
   - Refresh the page
   - Should briefly see "Loading import history..." message

4. **Test Settings Save Loading**
   - Go to `/settings`
   - Change weight value
   - Click "Save Settings"
   - Button should show "Saving..." while processing
   - Should show spinner icon during recalculation

5. **Test Intake Logger Loading**
   - On any day detail page
   - Enter carbs and protein values
   - Click "Save Intake"
   - Button should show "Saving..." while processing

### Expected Results:

✅ All async operations show loading indicators  
✅ Loading messages are clear and contextual  
✅ Buttons show "Saving..." or "Loading..." states  
✅ Spinners appear during long operations  
✅ Loading states don't flash too quickly (smooth UX)  

---

## Test 5: Error Handling

### Steps:

1. **Test Network Error**
   - Open browser DevTools → Network tab
   - Set throttling to "Offline"
   - Try to load `/calendar`
   - Should show error message (not crash)
   - Set back to "Online"

2. **Test Invalid Data**
   - Try to import a CSV with completely invalid data
   - Should show errors in import results
   - App should not crash

3. **Test Missing Data**
   - Navigate to a day that doesn't exist (e.g., `/calendar/2099-12-31`)
   - Should handle gracefully (show empty state or error)

4. **Test Validation Errors**
   - Go to `/settings`
   - Enter invalid weight (e.g., 500 kg)
   - Try to save
   - Should show validation error
   - Should not allow save

### Expected Results:

✅ Network errors show user-friendly messages  
✅ Invalid data errors are displayed clearly  
✅ App never crashes or shows blank screen  
✅ Validation prevents invalid data submission  
✅ Error messages are actionable  

---

## Acceptance Criteria Checklist

- ✅ **Import history exists** - Shows past imports with status, row counts, timestamps
- ✅ **Empty states are helpful** - Clear prompts to import workouts when no data exists
- ✅ **Import errors are visible** - Failed rows count and sample errors are displayed
- ✅ **Loading states are present** - All async operations show loading indicators
- ✅ **Failures don't break the app** - Errors are visible and understandable, app remains functional

---

## Summary

Section 10 adds the final polish to make FuelSync feel solid and production-ready:

1. **Import History** - Track all imports with status and error details
2. **Empty States** - Guide users when no data exists
3. **Enhanced Error Display** - Show detailed, actionable error information
4. **Loading States** - Provide feedback during all async operations
5. **Error Handling** - Gracefully handle failures without breaking the app

The app should now feel professional, debuggable, and user-friendly!

