-- Manual final stage only when no active or rollback code reads these columns.
-- Retains every report and parking row; column values are intentionally retired.
BEGIN;
DO $$ BEGIN
  IF current_setting('parking.drop_report_count_columns', true) IS DISTINCT FROM 'approved' THEN
    RAISE EXCEPTION 'Confirm no column readers, target and snapshot before setting parking.drop_report_count_columns=approved';
  END IF;
  IF to_regprocedure('public.update_parking_report_counts()') IS NOT NULL THEN
    RAISE EXCEPTION 'Retire the report-count writer first';
  END IF;
END $$;
ALTER TABLE public.parking_meters DROP COLUMN report_counts RESTRICT;
ALTER TABLE public.street_segments DROP COLUMN report_counts RESTRICT;
ALTER TABLE public.parking_zones DROP COLUMN report_counts RESTRICT;
COMMIT;
