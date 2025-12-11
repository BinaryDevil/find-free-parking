-- Alter target_type enum to support Meter and Street
-- Note: ALTER TYPE cannot be run inside a transaction block in some versions, but here it is fine usually.
-- We use IF NOT EXISTS logic via a DO block ideally, or just rely on 'ADD VALUE IF NOT EXISTS' (Postgres 12+)

ALTER TYPE public.target_type ADD VALUE IF NOT EXISTS 'METER';
ALTER TYPE public.target_type ADD VALUE IF NOT EXISTS 'STREET';

-- Alter reports table
ALTER TABLE public.reports 
  ADD COLUMN IF NOT EXISTS user_ip inet,
  ADD COLUMN IF NOT EXISTS user_location geometry(Point, 4326),
  ADD COLUMN IF NOT EXISTS reported_status text; -- 'FREE', 'PAID', 'NO_PARKING'
