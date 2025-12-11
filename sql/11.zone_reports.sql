-- Add ZONE to target_type enum and update trigger to handle parking_zones

ALTER TYPE public.target_type ADD VALUE IF NOT EXISTS 'ZONE';

-- Add report_counts column to parking_zones
ALTER TABLE public.parking_zones
ADD COLUMN IF NOT EXISTS report_counts jsonb DEFAULT '{}'::jsonb;

-- Update Trigger Function to handle ZONE
CREATE OR REPLACE FUNCTION update_parking_report_counts()
RETURNS TRIGGER AS $$
DECLARE
    counts jsonb;
BEGIN
    -- Calculate counts for the target from the last 90 days
    SELECT jsonb_object_agg(status, count)
    INTO counts
    FROM (
        SELECT reported_status as status, count(*) as count
        FROM reports
        WHERE target_id = NEW.target_id
          AND target_type = NEW.target_type
          AND created_at > now() - interval '90 days'
        GROUP BY reported_status
    ) sub;

    -- Handle null (no reports found)
    IF counts IS NULL THEN
        counts := '{}'::jsonb;
    END IF;

    -- Update the specific table based on target_type
    IF NEW.target_type = 'METER' THEN
        UPDATE public.parking_meters
        SET report_counts = counts
        WHERE id = NEW.target_id;
    ELSIF NEW.target_type = 'STREET' THEN
        UPDATE public.street_segments
        SET report_counts = counts
        WHERE id = NEW.target_id;
    ELSIF NEW.target_type = 'ZONE' THEN
        UPDATE public.parking_zones
        SET report_counts = counts
        WHERE id = NEW.target_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
