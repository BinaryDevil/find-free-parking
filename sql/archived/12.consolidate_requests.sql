-- Drop the redundant table
DROP TABLE IF EXISTS coverage_requests;

-- Add state column to existing table if not exists
ALTER TABLE city_requests ADD COLUMN IF NOT EXISTS state text;

-- Ensure idempotency for indices if we want to confirm them
-- (Indices usually exist from 6.city_coverage.sql)
