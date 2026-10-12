-- Migration: 5.global_schema.sql
-- Purpose: Genericize parking rates/schedules for global compatibility

-- 1. Alter parking_meters
ALTER TABLE public.parking_meters
  DROP COLUMN IF EXISTS r_mf_9a_6p,
  DROP COLUMN IF EXISTS r_mf_6p_10,
  DROP COLUMN IF EXISTS r_sa_9a_6p,
  DROP COLUMN IF EXISTS r_sa_6p_10,
  DROP COLUMN IF EXISTS r_su_9a_6p,
  DROP COLUMN IF EXISTS r_su_6p_10,
  DROP COLUMN IF EXISTS t_mf_9a_6p,
  DROP COLUMN IF EXISTS t_mf_6p_10,
  DROP COLUMN IF EXISTS t_sa_9a_6p,
  DROP COLUMN IF EXISTS t_sa_6p_10,
  DROP COLUMN IF EXISTS t_su_9a_6p,
  DROP COLUMN IF EXISTS t_su_6p_10,
  DROP COLUMN IF EXISTS time_in_effect,
  DROP COLUMN IF EXISTS credit_card;

ALTER TABLE public.parking_meters
  ADD COLUMN IF NOT EXISTS schedules jsonb DEFAULT '[]'::jsonb;

-- 2. Alter street_segments
-- Street segments didn't have specific rate columns physically, they were in raw_data or meter_infos JSON.
-- But we should formalize 'meter_infos' into 'schedules' if possible, or leave it effectively detailed in raw_data.
-- The API constructs 'meter_infos' dynamically.
-- Let's add 'schedules' to street_segments too for direct caching if needed.
ALTER TABLE public.street_segments
  ADD COLUMN IF NOT EXISTS schedules jsonb DEFAULT '[]'::jsonb;

-- 3. Cleanup Indexes if any dependent on dropped columns (none explicit in 4.parking_tables.sql)
