# 🚨 Database Migration Required

## The Problem

You're seeing these errors:
- **400 Bad Request** on `day_summaries` table
- **406 Not Acceptable** on `day_intake` table
- **Insights are blank** in the UI
- **Ledger recompute button is disabled**

**Root Cause:** Your database is missing required tables and columns. You need to run ALL migrations.

---

## ✅ EASIEST Solution: Run All Migrations at Once

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase project: https://supabase.com/dashboard/project/guxivbyjvzsgxmlfbhpm
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Copy the Combined Migration File

1. Open the file: **`supabase/migrations/RUN_ALL_MIGRATIONS.sql`** ⭐ USE THIS ONE
2. Copy the **ENTIRE** contents (all ~250 lines)

### Step 3: Run the Migration

1. Paste the SQL into the Supabase SQL Editor
2. Click **Run** (or press Cmd+Enter)
3. Wait for success message: **"Success. No rows returned"**
4. If you see any errors, copy them and share with me

### Step 4: Verify Migration Applied

The migration adds these columns to `day_summaries`:
- `debt_start_g`
- `debt_end_g`
- `depletion_total_g`
- `repletion_g`
- `readiness_score`
- `risk_flag`
- `carbs_logged_g`
- `protein_logged_g`
- `alignment_score`
- `insight_headline`
- `insight_action`
- `insight_why`

And these columns to `workouts`:
- `depletion_g`
- `depletion_method`
- `intensity_bucket`
- `intensity_source`

And this column to `user_settings`:
- `hr_max`

### Step 5: Refresh Your App

1. Go back to your FuelSync app
2. Refresh the page (Cmd+R or F5)
3. Go to `/settings`
4. The **Glycogen Ledger** section should now show:
   - ✅ Blue info box (migration applied)
   - ✅ Enabled "Recompute Ledger" button

### Step 6: Run Initial Ledger Computation

1. Click **"Recompute Ledger (60 days)"** button
2. Wait for progress bar to complete (10-30 seconds)
3. You should see: "✓ Successfully recomputed X days!"
4. Go to `/calendar`
5. You should now see:
   - **InsightsPanel** at top with 5 cards
   - **Day cards** with Debt/Action/Why tiles
   - **Risk badges** (green/yellow/orange/red)

---

## 🔍 Troubleshooting

### If you still see "Migration Required" warning after running SQL:

1. **Check for SQL errors** - Look at the Supabase SQL Editor output
2. **Verify columns exist** - Run this query in SQL Editor:
   ```sql
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'day_summaries' 
   AND column_name IN ('debt_end_g', 'insight_headline');
   ```
   Should return 2 rows.

3. **Hard refresh** - Press Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

### If ledger recompute fails:

1. **Check browser console** - Press F12 → Console tab
2. **Look for errors** - Red error messages will show what went wrong
3. **Verify you have data** - Make sure you have workouts imported

### If insights are still blank after recompute:

1. **Check that workouts have TSS or calories** - Insights need depletion data
2. **Verify intake is logged** - Repletion requires carb intake data
3. **Check day_summaries table** - Run this in SQL Editor:
   ```sql
   SELECT date, debt_end_g, insight_headline 
   FROM day_summaries 
   WHERE user_id = 'YOUR_USER_ID'
   ORDER BY date DESC 
   LIMIT 10;
   ```

---

## 📝 What the Migration Does

The migration is **safe** and **non-destructive**:
- ✅ Uses `ADD COLUMN IF NOT EXISTS` (won't fail if already exists)
- ✅ Uses `DROP CONSTRAINT IF EXISTS` (safe to re-run)
- ✅ Doesn't delete or modify existing data
- ✅ Only adds new columns with default values
- ✅ Adds indexes for performance

You can safely run it multiple times without breaking anything.

---

## 🆘 Still Having Issues?

If you're still stuck after following these steps:

1. **Share the exact error message** from browser console (F12)
2. **Share the SQL Editor output** after running migration
3. **Check if columns exist** using the verification query above

