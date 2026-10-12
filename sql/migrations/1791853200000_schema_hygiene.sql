-- Up Migration
-- Requires a separately approved target and restore point; never run at deploy.
-- Invalid historical addresses are discarded, never copied into logs/history.
LOCK TABLE public.city_requests, public.reports IN ACCESS EXCLUSIVE MODE;

CREATE FUNCTION pg_temp.valid_client_ip(value text) RETURNS inet
LANGUAGE plpgsql AS $$
DECLARE candidate text := btrim(split_part(value, ',', 1), E' \t\n\r');
BEGIN
  IF candidate IS NULL OR candidate = '' OR candidate ~ '[/%]' THEN RETURN NULL; END IF;
  IF candidate !~ ':' AND candidate !~ '^(0|[1-9][0-9]{0,2})(\.(0|[1-9][0-9]{0,2})){3}$' THEN
    RETURN NULL;
  END IF;
  IF NOT pg_catalog.pg_input_is_valid(candidate, 'inet') THEN RETURN NULL; END IF;
  RETURN candidate::inet;
END;
$$;
ALTER TABLE public.city_requests ALTER COLUMN user_ip TYPE inet
  USING pg_temp.valid_client_ip(user_ip);
DROP FUNCTION pg_temp.valid_client_ip(text);

-- Do not delete or reinterpret historical SPOT reports. Stop for human review.
DO $$ BEGIN
  IF EXISTS (SELECT FROM public.reports WHERE target_type::text = 'SPOT') THEN
    RAISE EXCEPTION 'Historical SPOT reports require a separately reviewed preservation plan';
  END IF;
END $$;
ALTER TYPE public.target_type RENAME TO target_type_old;
CREATE TYPE public.target_type AS ENUM ('ZONE', 'METER', 'STREET');
ALTER TYPE public.target_type OWNER TO "find-free-parking-db_owner";
ALTER TABLE public.reports ALTER COLUMN target_type TYPE public.target_type
  USING target_type::text::public.target_type;
DROP TYPE public.target_type_old RESTRICT;

-- PostgreSQL 17 baseline defaults resolve to pg_catalog.gen_random_uuid().
-- RESTRICT is the live dependency check: any dependent default/function/view
-- stops and rolls back this whole migration. Never use CASCADE or erase defaults.
DROP EXTENSION IF EXISTS "uuid-ossp" RESTRICT;
DROP EXTENSION IF EXISTS pgcrypto RESTRICT;

-- This role has no login and no table access. Operators grant membership only
-- to the separately provisioned retention login, never app_rw.
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'pii_retention_executor') THEN
    CREATE ROLE pii_retention_executor NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
END $$;

CREATE FUNCTION public.clear_expired_pii()
RETURNS TABLE (reports_cleared bigint, requests_cleared bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  UPDATE public.reports
    SET user_ip = CASE WHEN created_at <= now() - interval '90 days' THEN NULL ELSE user_ip END,
        user_location = CASE WHEN created_at <= now() - interval '90 days' THEN NULL ELSE user_location END,
        reporter_email = CASE WHEN status = 'RESOLVED' THEN NULL ELSE reporter_email END
    WHERE (created_at <= now() - interval '90 days' AND (user_ip IS NOT NULL OR user_location IS NOT NULL))
       OR (status = 'RESOLVED' AND reporter_email IS NOT NULL);
  GET DIAGNOSTICS reports_cleared = ROW_COUNT;
  UPDATE public.city_requests SET user_ip = NULL, location = NULL
    WHERE created_at <= now() - interval '90 days' AND (user_ip IS NOT NULL OR location IS NOT NULL);
  GET DIAGNOSTICS requests_cleared = ROW_COUNT;
  RETURN NEXT;
END;
$$;
ALTER FUNCTION public.clear_expired_pii() OWNER TO "find-free-parking-db_owner";
REVOKE ALL ON FUNCTION public.clear_expired_pii() FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO pii_retention_executor;
GRANT EXECUTE ON FUNCTION public.clear_expired_pii() TO pii_retention_executor;
