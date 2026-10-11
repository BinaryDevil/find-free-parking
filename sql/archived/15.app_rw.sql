-- Prepared for #5. Human approval required; run once, as migration/owner,
-- on the DIRECT connection after docs/DB_ROLES.md preflight and backup.
-- No password is stored here. Existing role names cause an atomic failure.
BEGIN;

CREATE ROLE app_rw LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
  NOINHERIT NOREPLICATION NOBYPASSRLS;
CREATE ROLE app_report_counts NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
  NOINHERIT NOREPLICATION NOBYPASSRLS;

-- PUBLIC privileges are inherited even by NOINHERIT roles. These revocations
-- affect other roles too: inventory their needs and regrant explicitly first.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
DO $$
BEGIN
  EXECUTE format('REVOKE CREATE, TEMPORARY ON DATABASE %I FROM PUBLIC', current_database());
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO app_rw', current_database());
END;
$$;
GRANT USAGE ON SCHEMA public TO app_rw, app_report_counts;
ALTER ROLE app_rw SET search_path = public, pg_catalog;

-- Current map endpoints and coverage server action.
GRANT SELECT ON public.parking_meters, public.street_segments,
  public.parking_zones, public.covered_cities TO app_rw;
-- Duplicate check + RETURNING id; exclude report text/location/email fields.
GRANT SELECT (id, target_id, target_type, user_ip, created_at)
  ON public.reports TO app_rw;
GRANT INSERT (target_id, target_type, reported_status, reason, user_ip, user_location)
  ON public.reports TO app_rw;
GRANT INSERT (city_name, state, country, location, user_ip)
  ON public.city_requests TO app_rw;
-- Tracked defaults are UUIDs, so no sequence privileges are needed.

-- Existing report trigger runs as invoker; do not grant UPDATE to app_rw.
-- This non-login role owns only the narrow trigger function, not the tables.
GRANT SELECT (target_id, target_type, reported_status, created_at)
  ON public.reports TO app_report_counts;
GRANT SELECT (id), UPDATE (report_counts)
  ON public.parking_meters, public.street_segments, public.parking_zones
  TO app_report_counts;

CREATE OR REPLACE FUNCTION public.update_parking_report_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  counts jsonb;
BEGIN
  IF TG_TABLE_SCHEMA <> 'public' OR TG_TABLE_NAME <> 'reports'
     OR TG_OP <> 'INSERT' OR TG_WHEN <> 'AFTER' OR TG_LEVEL <> 'ROW' THEN
    RAISE EXCEPTION 'Only the public.reports AFTER INSERT row trigger is supported';
  END IF;

  SELECT coalesce(jsonb_object_agg(status, count), '{}'::jsonb)
  INTO counts
  FROM (
    SELECT reported_status AS status, count(*) AS count
    FROM public.reports
    WHERE target_id = NEW.target_id AND target_type = NEW.target_type
      AND created_at > now() - interval '90 days'
    GROUP BY reported_status
  ) sub;

  IF NEW.target_type = 'METER' THEN
    UPDATE public.parking_meters SET report_counts = counts WHERE id = NEW.target_id;
  ELSIF NEW.target_type = 'STREET' THEN
    UPDATE public.street_segments SET report_counts = counts WHERE id = NEW.target_id;
  ELSIF NEW.target_type = 'ZONE' THEN
    UPDATE public.parking_zones SET report_counts = counts WHERE id = NEW.target_id;
  END IF;
  RETURN NEW;
END;
$$;

-- PostgreSQL requires the new function owner to have schema CREATE during
-- ownership transfer. Remove that privilege and membership before committing.
GRANT CREATE ON SCHEMA public TO app_report_counts;
DO $$
BEGIN
  EXECUTE format('GRANT app_report_counts TO %I', current_user);
END;
$$;
ALTER FUNCTION public.update_parking_report_counts() OWNER TO app_report_counts;
REVOKE CREATE ON SCHEMA public FROM app_report_counts;
REVOKE ALL ON FUNCTION public.update_parking_report_counts() FROM PUBLIC, app_rw;
DO $$
BEGIN
  EXECUTE format('REVOKE app_report_counts FROM %I', current_user);
END;
$$;

-- Abort rather than silently deploy without the expected count trigger.
DO $$
BEGIN
  IF has_database_privilege('app_rw', current_database(), 'CREATE')
     OR has_database_privilege('app_rw', current_database(), 'TEMP')
     OR EXISTS (SELECT 1 FROM pg_namespace WHERE has_schema_privilege('app_rw', oid, 'CREATE'))
     OR NOT has_schema_privilege('app_rw', 'public', 'USAGE')
     OR has_schema_privilege('app_report_counts', 'public', 'CREATE') THEN
    RAISE EXCEPTION 'ACL changes did not establish restricted roles; check schema/database ownership';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.reports'::regclass
      AND tgfoid = 'public.update_parking_report_counts()'::regprocedure
      AND tgtype = 5 AND tgenabled = 'O' AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'Expected enabled AFTER INSERT row trigger on public.reports';
  END IF;
END;
$$;
COMMIT;
