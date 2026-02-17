-- Migration 007: Add has_intake flag to day_summaries
-- Allows UI to distinguish "no intake logged" from "logged zero intake"
-- Used by Ledger Option B: freeze debt on no-data days

ALTER TABLE day_summaries
ADD COLUMN IF NOT EXISTS has_intake BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN day_summaries.has_intake IS 'True when a day_intake row existed at ledger compute time. False means debt was frozen for this day.';

