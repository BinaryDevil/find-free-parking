-- #18: permit the missing status field for dated, aggregated Driver Warnings.
-- Human approval is required before execution in either environment.
-- Run as the operator/owner, first on the isolated dev branch.
-- sql/archived/15.app_rw.sql already grants target_id, target_type and created_at.
-- No additional access to reporter IP, location, email, reason or comments.
BEGIN;
GRANT SELECT (reported_status)
ON TABLE public.reports TO app_rw;
COMMIT;

-- Rollback (operator only):
-- REVOKE SELECT (reported_status)
-- ON TABLE public.reports FROM app_rw;
