# Engine Credibility & Modeling Integrity (Phase 1)

## Status

Implemented in code and schema.

## Scope Delivered

### Feature 1.1: Remove Intake Freeze Logic
- Ledger always applies depletion.
- Missing intake no longer freezes debt/store.
- Missing intake now routes to explicit model states (`estimated` or `none`).

### Feature 1.2: Estimated Intake Fallback
- If intake is missing and target exists:
  - `estimated_intake_g = round(carb_target_g * 0.60)`
  - repletion is computed from estimated carbs
  - `intake_type = 'estimated'`
- If intake cannot be estimated:
  - repletion is `0`
  - `intake_type = 'none'`
- Logged intake uses `intake_type = 'logged'`.

### Feature 1.3: Soft Surplus Buffer
- Debt is now bounded to:
  - `DEBT_MIN = -150`
  - `DEBT_MAX = 900`
- Negative debt represents a topped-up glycogen buffer.

### Feature 1.4: Rolling Debt Trend Detection
- `debt_trend` is computed daily from a 3-day slope of `debt_end_g`.
- States:
  - `increasing`
  - `stable`
  - `decreasing`

## Engine Behavior (Per Day)

1. Compute `depletion_total_g` from workouts.
2. Compute targets from start-of-day store state:
   - `carb_target_g` uses store-aware model (base + training + paydown - surplus reduction).
   - `protein_target_g` uses weight-based model.
3. Resolve intake model:
   - `logged`: use day intake row
   - `estimated`: 60% of carb target
   - `none`: no estimate possible
4. Apply store equation:
   - `store_end = clamp(store_start - depletion + repletion, 0, supercomp_cap)`
5. Derive metrics:
   - fill %, deficit, surplus
   - bounded debt (`-150..900`)
6. Run second pass:
   - calculate `debt_trend` from 3-day slope
   - generate explainable insights text including intake source/trend context

## New/Updated Day Summary Fields

- `intake_type`: `logged | estimated | none`
- `intake_confidence`: `high | low`
- `estimated_intake_g`: estimated carb intake used by model when intake missing
- `debt_trend`: `increasing | stable | decreasing`
- `debt_start_g`, `debt_end_g`: now permit `-150..900`

## Explainability Improvements

- Insights now explicitly state when intake was estimated and how much was assumed.
- Insights include 3-day debt trend language.
- Day cards and day detail show model-state context for missing-intake days.

## Files Changed

- `src/lib/thresholds.js`
- `src/lib/ledger.js`
- `src/lib/ledgerModel.js` (new)
- `src/lib/insights.js`
- `src/components/DayCard.vue`
- `src/components/DayDetailCard.vue`
- `supabase/migrations/009_engine_integrity_phase1.sql` (new)
- `supabase/migrations/FIX_MISSING_COLUMNS.sql`
- `supabase/migrations/RUN_ALL_MIGRATIONS.sql`
- `test_engine_integrity_phase1.js` (new)

## Migration

Apply one of:

1. `supabase/migrations/009_engine_integrity_phase1.sql`
2. or `supabase/migrations/RUN_ALL_MIGRATIONS.sql` (includes this phase)
3. or `supabase/migrations/FIX_MISSING_COLUMNS.sql` for repair-style updates

Then run ledger recompute.

## Validation

Run:

```bash
node test_engine_integrity_phase1.js
```

This checks:
- missing-intake fallback behavior
- debt stacking across consecutive days
- soft debt bounds including negative buffer
- 3-day debt trend classification
- `none` state behavior when estimate is unavailable
