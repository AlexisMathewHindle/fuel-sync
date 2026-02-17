# Glycogen Ledger Implementation Progress

## ✅ Completed (Parts A-C)

### Part A: Database Schema ✅
**File:** `supabase/migrations/005_add_glycogen_ledger.sql`

Added fields to:
- **workouts table:**
  - `depletion_g` - Estimated glycogen depletion in grams
  - `depletion_method` - 'tss_only' | 'tss_clamped_by_cal'
  - `intensity_bucket` - 'easy' | 'moderate' | 'hard'
  - `intensity_source` - 'if' | 'hr' | 'unknown'

- **day_summaries table:**
  - `debt_start_g`, `debt_end_g` - Glycogen debt tracking
  - `depletion_total_g`, `repletion_g` - Daily depletion and repletion
  - `readiness_score` (0-100), `risk_flag` (green/yellow/orange/red)
  - `carbs_logged_g`, `protein_logged_g` - Cached intake values
  - `alignment_score` (0-100)
  - `insight_headline`, `insight_action`, `insight_why` - Coach-like text

- **user_settings table:**
  - `hr_max` - Maximum heart rate for intensity calculations (default 180)

### Part B: Thresholds & Formulas ✅
**File:** `src/lib/thresholds.js`

Implemented all default thresholds exactly as specified:
- Debt thresholds (green: 0-150, yellow: 150-350, orange: 350-600, red: 600-900)
- Repletion efficiency (70%, cap 500g/day)
- Depletion calculation (TSS * 1.2, clamped by calories if available)
- Intensity buckets (IF-based and HR fallback)
- Hard day definition (TSS ≥90 OR IF≥0.88 + duration≥45min OR depletion≥350g)
- Carb target (ledger-aware with base + training + paydown)
- Protein target (weight * 1.8, clamped 1.6-2.2)
- Alignment score (60% carbs, 40% protein)
- Readiness score (piecewise linear from debt)
- What-if scenario (+200g carbs)

### Part C: Ledger Recompute Service ✅
**File:** `src/lib/ledger.js`

Deterministic day-by-day calculation:
- Fetches workouts and intakes for 60-day backing range
- Processes workouts to calculate depletion and intensity
- Updates workout records with depletion data
- Iterates days in ASC order:
  - Carries debt forward from previous day
  - Calculates depletion, repletion, targets, scores
  - Generates insights with context (back-to-back, hard days)
- Upserts all day_summaries
- Progress callback support

### Supporting Modules ✅
**File:** `src/lib/depletion.js`
- Workout depletion calculation (TSS-based with calorie clamp)
- Intensity bucket determination (IF preferred, HR fallback)
- Day-level aggregation functions

**File:** `src/lib/insights.js`
- Coach-like text generation (headline/action/why)
- Context-aware messaging (debt level, back-to-back, paydown)
- Specific, actionable guidance

### Part D (Partial): UI Components ✅
**File:** `src/components/InsightsPanel.vue`
- 5-card insights panel with all metrics
- Current debt with trend
- Debt exposure (compromised/high-risk days, streaks)
- Training load (duration, TSS, hard days)
- Fueling consistency (hit target days, alignment, deficit)
- Tomorrow readiness (current + what-if)

---

## ✅ All Core Features Complete!

### Part D: Calendar Screen Upgrades ✅
**Status:** COMPLETE

**Completed:**
1. ✅ Time window filter in CalendarView (7d/14d/30d/42d)
   - URL query parameter (?days=30)
   - localStorage persistence
   - Always fetches 60 days, filter controls display only
2. ✅ InsightsPanel integrated at top of CalendarView
3. ✅ DayCard component redesigned for Debt/Action/Why layout
   - Shows glycogen debt with delta from yesterday
   - Displays insight_headline, insight_action, insight_why
   - Risk badge based on debt level
   - Fallback to old layout if insights not yet generated

### Part E: Insights Text ✅
Already implemented in `src/lib/insights.js`

### Part F: Ledger Recompute Integration ✅
**Status:** COMPLETE

**Completed:**
1. ✅ Import flow triggers ledger recompute
   - After CSV import completes
   - After day summarization
   - Shows progress during recompute
2. ✅ Intake logging triggers ledger recompute
   - After saving intake
   - After clearing intake
   - Updates debt and insights immediately
3. ✅ Settings changes trigger ledger recompute
   - When auto-recalculate is enabled
   - Recomputes both summaries and ledger
   - Shows progress feedback

### Part G: Deliverables ✅
**All Complete:**
- ✅ Supabase migration SQL
- ✅ thresholds.js
- ✅ depletion.js
- ✅ insights.js
- ✅ ledger.js
- ✅ InsightsPanel.vue
- ✅ Time window filter in CalendarView
- ✅ Updated DayCard component
- ✅ Integration of ledger recompute into import/intake/settings flows

**Remaining:**
- ⏳ Unit tests (optional - can be added later)
- ⏳ Apply database migration in Supabase
- ⏳ End-to-end testing with real data

---

## 📋 Next Steps for User

### Step 1: Apply Database Migration ⚠️ REQUIRED
**You must run this in Supabase SQL Editor before using the app:**

1. Go to your Supabase project → SQL Editor
2. Copy the entire contents of `supabase/migrations/005_add_glycogen_ledger.sql`
3. Paste and run the migration
4. Verify all new columns were added successfully

**Why this is required:** The app now expects new database columns (debt_start_g, debt_end_g, insight_headline, etc.) that don't exist yet. The app will fail without this migration.

### Step 2: Test the New Features 🧪

**Import Test:**
1. Go to `/import`
2. Upload a CSV with 30-40 days of workouts
3. Watch the progress: Import → Summarize → **Compute Ledger** (new!)
4. Go to `/calendar` and verify:
   - InsightsPanel appears at top with 5 cards
   - Time window filter buttons work (7d/14d/30d/42d)
   - Day cards show Debt/Action/Why tiles (if ledger ran successfully)

**Intake Test:**
1. Click on a day card
2. Log some carbs and protein
3. Watch for "Intake saved! Updating ledger..." message
4. Return to calendar and verify debt updated

**Settings Test:**
1. Go to `/settings`
2. Change your weight or protein factor
3. Save with auto-recalculate enabled
4. Watch for "Recomputing glycogen ledger..." message
5. Return to calendar and verify targets updated

### Step 3: Validate Insights Quality 📝

Check that insights feel coach-like:
- ✅ Headlines reference context ("Debt climbed after back-to-back load")
- ✅ Actions are specific ("Priority: add ~150g carbs by evening")
- ✅ Why explains consequences ("If you keep intensity high without topping up, quality and recovery can stall")
- ❌ NOT robotic ("You consumed 85% of target")

### Step 4: Optional - Add Unit Tests
If you want to add tests later, focus on:
- `src/lib/insights.js` - Test headline/action/why generation
- `src/lib/thresholds.js` - Test score calculations
- `src/lib/depletion.js` - Test depletion estimation

---

## 🎯 Key Design Decisions

1. **60-day backing range:** Always recompute 60 days regardless of UI filter, so "today's debt" has full context
2. **Deterministic:** Same inputs always produce same outputs - can recompute anytime
3. **Sequential processing:** Days must be processed in order since debt carries forward
4. **Two-pass insights:** First pass calculates metrics, second pass generates text with context
5. **Cached intake:** Store carbs/protein in day_summaries for fast reads (no join needed)

---

## 📊 Data Flow

```
CSV Import
  ↓
Workouts stored
  ↓
recomputeLedger(userId, 60 days)
  ↓
For each workout:
  - Calculate depletion_g
  - Determine intensity_bucket
  - Update workout record
  ↓
For each day (sequential):
  - debt_start = yesterday.debt_end
  - depletion_total = sum(workout.depletion_g)
  - repletion = carbs_logged * 0.70
  - debt_end = clamp(debt_start + depletion - repletion, 0, 900)
  - Calculate targets (carb, protein)
  - Calculate scores (alignment, readiness)
  - Determine risk_flag
  ↓
Second pass:
  - Generate insights (headline/action/why)
  - Consider context (back-to-back, hard days)
  ↓
Upsert day_summaries
  ↓
UI displays:
  - InsightsPanel (aggregated metrics)
  - DayCards (individual day insights)
```

---

## 🧪 Testing Checklist

- [ ] Migration applied successfully
- [ ] Workouts have depletion_g and intensity_bucket after import
- [ ] Day summaries have debt tracking fields
- [ ] Debt accumulates correctly across back-to-back days
- [ ] Debt decreases when carbs logged sufficiently
- [ ] Insights text feels coach-like (not robotic)
- [ ] Time window filter works (7d/14d/30d/42d)
- [ ] InsightsPanel shows correct aggregated metrics
- [ ] DayCards show Debt/Action/Why
- [ ] Editing intake triggers recompute
- [ ] Settings change triggers recompute

---

## 💡 Implementation Notes

- All numeric values are rounded before storage
- Debt is clamped to [0, 900] range
- Repletion is capped at 500g/day
- Intensity prefers IF over HR when both available
- Insights consider yesterday and tomorrow for context
- What-if scenario uses same repletion efficiency (70%)

