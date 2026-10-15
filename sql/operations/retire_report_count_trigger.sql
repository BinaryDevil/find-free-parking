-- Manual stage after all active/rollback classification readers ignore counts.
-- Not part of db:migrate. See docs/DRIVER_WARNINGS.md; approval is separate.
BEGIN;
DO $$ BEGIN
  IF current_setting('parking.retire_report_counts', true) IS DISTINCT FROM 'approved' THEN
    RAISE EXCEPTION 'Confirm target, snapshot and reader retirement before setting parking.retire_report_counts=approved';
  END IF;
  IF to_regclass('public.driver_warnings') IS NULL THEN
    RAISE EXCEPTION 'Install and verify the warning reader migration first';
  END IF;
END $$;
DROP TRIGGER trg_update_report_counts ON public.reports;
DROP FUNCTION public.update_parking_report_counts() RESTRICT;
REVOKE UPDATE (report_counts) ON public.parking_meters, public.street_segments, public.parking_zones FROM app_report_counts;
COMMIT;
