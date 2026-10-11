-- Add metadata column to parking_spots and parking_zones
ALTER TABLE public.parking_spots ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE public.parking_zones ADD COLUMN IF NOT EXISTS metadata JSONB;
