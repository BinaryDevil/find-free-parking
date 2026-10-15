-- Up Migration
-- Additive reader stage. Legacy report-count writers/columns remain for old code.
CREATE VIEW public.driver_warnings AS
SELECT target_type, target_id, reported_status AS status,
       count(*)::integer AS count, max(created_at) AS latest_at
FROM public.reports
WHERE created_at > now() - interval '90 days'
  AND reported_status IN ('FREE', 'PAID', 'NO_PARKING')
GROUP BY target_type, target_id, reported_status;
ALTER VIEW public.driver_warnings OWNER TO "find-free-parking-db_owner";
REVOKE ALL ON public.driver_warnings FROM PUBLIC, app_rw, app_report_counts;
GRANT SELECT ON public.driver_warnings TO app_rw;
COMMENT ON VIEW public.driver_warnings IS 'Advisory 90-day Driver Report counts and latest date; never Parking Rule evidence. No private fields.';
