-- Read-only assertions: connect as the actual app_rw login, stop on error.
BEGIN READ ONLY;
DO $$
DECLARE
  obj regclass;
  col text;
  role_record record;
BEGIN
  IF current_user <> 'app_rw' OR session_user <> 'app_rw' THEN
    RAISE EXCEPTION 'Connect as app_rw directly, not SET ROLE';
  END IF;
  SELECT * INTO role_record FROM pg_roles WHERE rolname = current_user;
  IF role_record.rolsuper OR role_record.rolcreatedb OR role_record.rolcreaterole
     OR role_record.rolreplication OR role_record.rolbypassrls THEN
    RAISE EXCEPTION 'Elevated app role';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_auth_members WHERE member = role_record.oid)
     OR EXISTS (SELECT 1 FROM pg_class WHERE relowner = role_record.oid)
     OR EXISTS (SELECT 1 FROM pg_proc WHERE proowner = role_record.oid)
     OR EXISTS (SELECT 1 FROM pg_namespace WHERE nspowner = role_record.oid)
     OR EXISTS (SELECT 1 FROM pg_database WHERE datdba = role_record.oid) THEN
    RAISE EXCEPTION 'App role has membership or object ownership';
  END IF;
  IF has_database_privilege(current_database(), 'CREATE')
     OR has_database_privilege(current_database(), 'TEMP')
     OR EXISTS (SELECT 1 FROM pg_namespace WHERE has_schema_privilege(oid, 'CREATE')) THEN
    RAISE EXCEPTION 'App role can create objects';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema'
      AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
      AND (has_table_privilege(c.oid, 'UPDATE,DELETE,TRUNCATE,TRIGGER,REFERENCES')
        OR has_any_column_privilege(c.oid, 'UPDATE,REFERENCES'))
  ) THEN
    RAISE EXCEPTION 'App role has unexpected mutation permissions';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema'
      AND p.prosecdef AND has_function_privilege(p.oid, 'EXECUTE')
  ) THEN
    RAISE EXCEPTION 'App role can execute a user security-definer function: review ACLs';
  END IF;
  FOREACH obj IN ARRAY ARRAY['public.parking_meters'::regclass,
    'public.street_segments'::regclass, 'public.parking_zones'::regclass,
    'public.covered_cities'::regclass] LOOP
    IF NOT has_table_privilege(obj, 'SELECT') THEN
      RAISE EXCEPTION 'Missing map/coverage SELECT';
    END IF;
  END LOOP;
  FOREACH col IN ARRAY ARRAY['id', 'target_id', 'target_type', 'user_ip', 'created_at'] LOOP
    IF NOT has_column_privilege('public.reports', col, 'SELECT') THEN
      RAISE EXCEPTION 'Missing report SELECT column';
    END IF;
  END LOOP;
  FOREACH col IN ARRAY ARRAY['target_id', 'target_type', 'reported_status', 'reason', 'user_ip', 'user_location'] LOOP
    IF NOT has_column_privilege('public.reports', col, 'INSERT') THEN
      RAISE EXCEPTION 'Missing report INSERT column';
    END IF;
  END LOOP;
  FOREACH col IN ARRAY ARRAY['city_name', 'state', 'country', 'location', 'user_ip'] LOOP
    IF NOT has_column_privilege('public.city_requests', col, 'INSERT') THEN
      RAISE EXCEPTION 'Missing city-request INSERT column';
    END IF;
  END LOOP;
  IF EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'public.reports'::regclass AND attnum > 0 AND NOT attisdropped
      AND attname NOT IN ('id', 'target_id', 'target_type', 'user_ip', 'created_at')
      AND has_column_privilege(attrelid, attnum, 'SELECT')
  ) THEN
    RAISE EXCEPTION 'Unexpected private report column SELECT';
  END IF;
  IF has_table_privilege('public.reports', 'SELECT')
     OR has_any_column_privilege('public.city_requests', 'SELECT') THEN
    RAISE EXCEPTION 'Unexpected private submission SELECT';
  END IF;
  RAISE NOTICE 'app_rw permission assertions passed';
END;
$$;
ROLLBACK;
