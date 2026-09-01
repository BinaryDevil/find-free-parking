-- Store source-specific parking evidence as importers become more precise.
-- This migration is additive and does not change existing classifications.
-- Example value:
-- {"version":1,"source":"CITY_OPEN_DATA","observed_at":"2026-09-01",
--  "rules":[{"kind":"permit_only","confidence":0.95}]}

ALTER TABLE public.parking_meters
  ADD COLUMN IF NOT EXISTS parking_evidence jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.street_segments
  ADD COLUMN IF NOT EXISTS parking_evidence jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.parking_zones
  ADD COLUMN IF NOT EXISTS parking_evidence jsonb NOT NULL DEFAULT '{}'::jsonb;
