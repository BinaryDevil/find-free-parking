-- Drop parking_spots table and related objects
-- This table is deprecated; use parking_meters for on-street paid parking points.

DROP TRIGGER IF EXISTS set_timestamp_parking_spots ON public.parking_spots;
DROP TABLE IF EXISTS public.parking_spots CASCADE;
DROP TYPE IF EXISTS public.parking_spot_type;
