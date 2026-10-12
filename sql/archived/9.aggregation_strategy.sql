-- 1. Add report_counts column to target tables
ALTER TABLE public.parking_meters
ADD COLUMN IF NOT EXISTS report_counts jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.street_segments
ADD COLUMN IF NOT EXISTS report_counts jsonb DEFAULT '{}'::jsonb;

-- 2. Create Trigger Function
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

    -- Handle null (no reports found, though unlikely inside an insert trigger)
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
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create Trigger on reports table
DROP TRIGGER IF EXISTS trg_update_report_counts ON public.reports;

CREATE TRIGGER trg_update_report_counts
AFTER INSERT ON public.reports
FOR EACH ROW
EXECUTE FUNCTION update_parking_report_counts();
