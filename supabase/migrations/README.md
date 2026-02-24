# Database Migrations

This directory contains SQL migration files for the FuelSync database schema.

## Applying Migrations

### Option 1: Supabase Dashboard (Recommended for initial setup)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `001_initial_schema.sql`
4. Paste into the SQL editor
5. Click **Run** to execute

### Option 2: Supabase CLI

If you have the Supabase CLI installed:

```bash
supabase db push
```

### Option 3: Manual via psql

If you have direct database access:

```bash
psql -h db.guxivbyjvzsgxmlfbhpm.supabase.co -U postgres -d postgres -f supabase/migrations/001_initial_schema.sql
```

## Migration Files

### 001_initial_schema.sql

Creates the core database schema:

### 002_add_column_mapping.sql

Adds column mapping storage to user_settings:
- `column_mapping` (JSONB) - Stores user's CSV column mapping preferences

### 003_add_workout_dedupe.sql

Adds deduplication constraint to workouts:
- Unique index on `(user_id, start_date, sport, duration_min, name)`
- Prevents duplicate workouts from being imported

### 004_add_day_intake.sql

Adds day_intake table for tracking daily nutrition intake:
- `day_intake` table with carbs_g, protein_g, notes
- Unique constraint on `(user_id, date)` - one intake record per day
- RLS policies for data isolation
- Automatic timestamp triggers

### 005_add_glycogen_ledger.sql

Adds depletion/debt/insight fields for glycogen ledger v1.

### 006_add_baseline_calibration.sql

Adds baseline calibration fields to `user_settings`:
- `starting_debt_g`
- `baseline_prompt_dismissed`
- `baseline_set_at`

### 007_add_has_intake.sql

Adds `has_intake` to `day_summaries` for intake presence tracking.

### 008_add_glycogen_store.sql

Adds glycogen store model fields:
- `glycogen_store_start_g`, `glycogen_store_end_g`
- `glycogen_capacity_g`, `glycogen_surplus_g`, `glycogen_deficit_g`
- `fill_pct`
- `glycogen_capacity_override_g` in `user_settings`

### 009_engine_integrity_phase1.sql

Adds Phase 1 model integrity fields:
- `intake_type`, `intake_confidence`, `estimated_intake_g`
- `debt_trend`
- Debt range constraints for soft surplus buffer (`-150..900`)

**Tables:**
- `imports` - Tracks data imports from training platforms
- `workouts` - Stores normalized workout data
- `day_summaries` - Daily aggregations and nutrition targets
- `user_settings` - User preferences and profile data

**Indexes:**
- Performance indexes on user_id and date columns
- Composite indexes for common query patterns

**Security:**
- Row Level Security (RLS) enabled on all tables
- Policies ensure users can only access their own data
- Automatic timestamp updates via triggers

## Schema Overview

```
imports
├── id (UUID, PK)
├── user_id (UUID, FK → auth.users)
├── source (TEXT)
├── filename (TEXT)
├── uploaded_at (TIMESTAMPTZ)
├── status (TEXT)
├── row_count (INTEGER)
└── errors_json (JSONB)

workouts
├── id (UUID, PK)
├── user_id (UUID, FK → auth.users)
├── import_id (UUID, FK → imports)
├── start_date (TIMESTAMPTZ)
├── sport (TEXT)
├── name (TEXT)
├── duration_min (INTEGER)
├── distance_km (DECIMAL)
├── tss (INTEGER)
├── if_score (DECIMAL)
├── avg_hr (INTEGER)
├── avg_power (INTEGER)
├── calories (INTEGER)
└── raw_json (JSONB)

day_summaries
├── id (UUID, PK)
├── user_id (UUID, FK → auth.users)
├── date (DATE, UNIQUE per user)
├── total_duration_min (INTEGER)
├── total_tss (INTEGER)
├── total_calories (INTEGER)
├── sport_mix_json (JSONB)
├── glycogen_debt_est (INTEGER)
├── carb_target_g (INTEGER)
├── protein_target_g (INTEGER)
└── notes (TEXT)

user_settings
├── user_id (UUID, PK, FK → auth.users)
├── weight_kg (DECIMAL)
├── protein_g_per_kg (DECIMAL)
├── carb_factor (DECIMAL)
└── timezone (TEXT)
```

## Testing the Schema

After applying the migration, you can test with:

```sql
-- Insert test user settings (replace with your user_id from auth.users)
INSERT INTO user_settings (user_id, weight_kg)
VALUES ('your-user-id-here', 70.0);

-- Insert a test workout
INSERT INTO workouts (user_id, start_date, sport, name, duration_min, tss, calories)
VALUES ('your-user-id-here', NOW(), 'run', 'Morning Run', 45, 65, 450);

-- Query your workouts
SELECT * FROM workouts WHERE user_id = 'your-user-id-here';
```

## Rollback

To rollback this migration:

```sql
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
DROP TRIGGER IF EXISTS update_day_summaries_updated_at ON day_summaries;
DROP TRIGGER IF EXISTS update_workouts_updated_at ON workouts;
DROP TRIGGER IF EXISTS update_imports_updated_at ON imports;
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP TABLE IF EXISTS user_settings CASCADE;
DROP TABLE IF EXISTS day_summaries CASCADE;
DROP TABLE IF EXISTS workouts CASCADE;
DROP TABLE IF EXISTS imports CASCADE;
```
