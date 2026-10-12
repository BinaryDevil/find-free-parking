-- Up Migration
-- Production schema captured read-only with pg_dump 17.11 on 2026-10-10.
-- Fresh databases only. Existing production/dev must mark this baseline applied.
-- Neon cloud_admin default ACLs are provider-managed, outside this migration.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_rw') THEN
    CREATE ROLE app_rw LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
    ALTER ROLE app_rw SET search_path = public, pg_catalog;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_report_counts') THEN
    CREATE ROLE app_report_counts NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
END;
$$;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.11 (7d7ea2a)
-- Dumped by pg_dump version 17.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: find-free-parking-db_owner
--

CREATE SCHEMA extensions;


ALTER SCHEMA extensions OWNER TO "find-free-parking-db_owner";

--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA public;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner:
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner:
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: postgis; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;


--
-- Name: EXTENSION postgis; Type: COMMENT; Schema: -; Owner:
--

COMMENT ON EXTENSION postgis IS 'PostGIS geometry and geography spatial types and functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner:
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: parking_zone_type; Type: TYPE; Schema: public; Owner: find-free-parking-db_owner
--

CREATE TYPE public.parking_zone_type AS ENUM (
    'FREE_UNLIMITED',
    'FREE_LIMITED',
    'EV_FREE',
    'PAID',
    'PERMIT_ONLY',
    'MIXED'
);


ALTER TYPE public.parking_zone_type OWNER TO "find-free-parking-db_owner";

--
-- Name: report_status; Type: TYPE; Schema: public; Owner: find-free-parking-db_owner
--

CREATE TYPE public.report_status AS ENUM (
    'OPEN',
    'RESOLVED',
    'DISMISSED'
);


ALTER TYPE public.report_status OWNER TO "find-free-parking-db_owner";

--
-- Name: target_type; Type: TYPE; Schema: public; Owner: find-free-parking-db_owner
--

CREATE TYPE public.target_type AS ENUM (
    'ZONE',
    'SPOT',
    'METER',
    'STREET'
);


ALTER TYPE public.target_type OWNER TO "find-free-parking-db_owner";

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: find-free-parking-db_owner
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION public.set_updated_at() OWNER TO "find-free-parking-db_owner";

--
-- Name: update_parking_report_counts(); Type: FUNCTION; Schema: public; Owner: app_report_counts
--

CREATE FUNCTION public.update_parking_report_counts() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'pg_temp'
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


REVOKE ALL ON FUNCTION public.update_parking_report_counts() FROM PUBLIC;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: city_requests; Type: TABLE; Schema: public; Owner: find-free-parking-db_owner
--

CREATE TABLE public.city_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    city_name text,
    country text,
    location public.geometry(Point,4326),
    user_ip text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    state text
);


ALTER TABLE public.city_requests OWNER TO "find-free-parking-db_owner";

--
-- Name: covered_cities; Type: TABLE; Schema: public; Owner: find-free-parking-db_owner
--

CREATE TABLE public.covered_cities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    city_name text NOT NULL,
    country text NOT NULL,
    bounds public.geometry(Polygon,4326) NOT NULL,
    center public.geometry(Point,4326),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.covered_cities OWNER TO "find-free-parking-db_owner";

--
-- Name: parking_meters; Type: TABLE; Schema: public; Owner: find-free-parking-db_owner
--

CREATE TABLE public.parking_meters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pay_station_id text,
    meter_head text,
    geom public.geometry(Point,4326) NOT NULL,
    raw_data jsonb,
    updated_at timestamp with time zone DEFAULT now(),
    report_counts jsonb DEFAULT '{}'::jsonb,
    schedules jsonb DEFAULT '[]'::jsonb,
    parking_evidence jsonb DEFAULT '{}'::jsonb NOT NULL
);


ALTER TABLE public.parking_meters OWNER TO "find-free-parking-db_owner";

--
-- Name: parking_zones; Type: TABLE; Schema: public; Owner: find-free-parking-db_owner
--

CREATE TABLE public.parking_zones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    city text NOT NULL,
    name text,
    type public.parking_zone_type NOT NULL,
    geom public.geometry(Polygon,4326) NOT NULL,
    time_limit_minutes integer,
    free_start_time time without time zone,
    free_end_time time without time zone,
    days_applicable smallint[] DEFAULT '{0,1,2,3,4,5,6}'::smallint[],
    notes text,
    source text DEFAULT 'MANUAL'::text,
    verified boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb,
    report_counts jsonb DEFAULT '{}'::jsonb,
    parking_evidence jsonb DEFAULT '{}'::jsonb NOT NULL
);


ALTER TABLE public.parking_zones OWNER TO "find-free-parking-db_owner";

--
-- Name: reports; Type: TABLE; Schema: public; Owner: find-free-parking-db_owner
--

CREATE TABLE public.reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reporter_email text,
    reporter_note text,
    target_type public.target_type NOT NULL,
    target_id uuid NOT NULL,
    reason text,
    status public.report_status DEFAULT 'OPEN'::public.report_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone,
    resolution_notes text,
    user_ip inet,
    user_location public.geometry(Point,4326),
    reported_status text
);


ALTER TABLE public.reports OWNER TO "find-free-parking-db_owner";

--
-- Name: street_segments; Type: TABLE; Schema: public; Owner: find-free-parking-db_owner
--

CREATE TABLE public.street_segments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    block_id text,
    street_use text,
    geom public.geometry(LineString,4326) NOT NULL,
    raw_data jsonb,
    updated_at timestamp with time zone DEFAULT now(),
    report_counts jsonb DEFAULT '{}'::jsonb,
    schedules jsonb DEFAULT '[]'::jsonb,
    parking_evidence jsonb DEFAULT '{}'::jsonb NOT NULL
);


ALTER TABLE public.street_segments OWNER TO "find-free-parking-db_owner";

--
-- Name: city_requests city_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: find-free-parking-db_owner
--

ALTER TABLE ONLY public.city_requests
    ADD CONSTRAINT city_requests_pkey PRIMARY KEY (id);


--
-- Name: covered_cities covered_cities_pkey; Type: CONSTRAINT; Schema: public; Owner: find-free-parking-db_owner
--

ALTER TABLE ONLY public.covered_cities
    ADD CONSTRAINT covered_cities_pkey PRIMARY KEY (id);


--
-- Name: parking_meters parking_meters_pkey; Type: CONSTRAINT; Schema: public; Owner: find-free-parking-db_owner
--

ALTER TABLE ONLY public.parking_meters
    ADD CONSTRAINT parking_meters_pkey PRIMARY KEY (id);


--
-- Name: parking_zones parking_zones_pkey; Type: CONSTRAINT; Schema: public; Owner: find-free-parking-db_owner
--

ALTER TABLE ONLY public.parking_zones
    ADD CONSTRAINT parking_zones_pkey PRIMARY KEY (id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: find-free-parking-db_owner
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: street_segments street_segments_pkey; Type: CONSTRAINT; Schema: public; Owner: find-free-parking-db_owner
--

ALTER TABLE ONLY public.street_segments
    ADD CONSTRAINT street_segments_pkey PRIMARY KEY (id);


--
-- Name: idx_city_requests_location; Type: INDEX; Schema: public; Owner: find-free-parking-db_owner
--

CREATE INDEX idx_city_requests_location ON public.city_requests USING gist (location);


--
-- Name: idx_covered_cities_active; Type: INDEX; Schema: public; Owner: find-free-parking-db_owner
--

CREATE INDEX idx_covered_cities_active ON public.covered_cities USING btree (is_active);


--
-- Name: idx_covered_cities_bounds; Type: INDEX; Schema: public; Owner: find-free-parking-db_owner
--

CREATE INDEX idx_covered_cities_bounds ON public.covered_cities USING gist (bounds);


--
-- Name: idx_parking_meters_geog; Type: INDEX; Schema: public; Owner: find-free-parking-db_owner
--

CREATE INDEX idx_parking_meters_geog ON public.parking_meters USING gist (((geom)::public.geography));


--
-- Name: idx_parking_meters_geom; Type: INDEX; Schema: public; Owner: find-free-parking-db_owner
--

CREATE INDEX idx_parking_meters_geom ON public.parking_meters USING gist (geom);


--
-- Name: idx_parking_zones_city; Type: INDEX; Schema: public; Owner: find-free-parking-db_owner
--

CREATE INDEX idx_parking_zones_city ON public.parking_zones USING btree (city);


--
-- Name: idx_parking_zones_geom; Type: INDEX; Schema: public; Owner: find-free-parking-db_owner
--

CREATE INDEX idx_parking_zones_geom ON public.parking_zones USING gist (geom);


--
-- Name: idx_parking_zones_type; Type: INDEX; Schema: public; Owner: find-free-parking-db_owner
--

CREATE INDEX idx_parking_zones_type ON public.parking_zones USING btree (type);


--
-- Name: idx_reports_status; Type: INDEX; Schema: public; Owner: find-free-parking-db_owner
--

CREATE INDEX idx_reports_status ON public.reports USING btree (status);


--
-- Name: idx_reports_target; Type: INDEX; Schema: public; Owner: find-free-parking-db_owner
--

CREATE INDEX idx_reports_target ON public.reports USING btree (target_type, target_id);


--
-- Name: idx_street_segments_geog; Type: INDEX; Schema: public; Owner: find-free-parking-db_owner
--

CREATE INDEX idx_street_segments_geog ON public.street_segments USING gist (((geom)::public.geography));


--
-- Name: idx_street_segments_geom; Type: INDEX; Schema: public; Owner: find-free-parking-db_owner
--

CREATE INDEX idx_street_segments_geom ON public.street_segments USING gist (geom);


--
-- Name: covered_cities set_timestamp_covered_cities; Type: TRIGGER; Schema: public; Owner: find-free-parking-db_owner
--

CREATE TRIGGER set_timestamp_covered_cities BEFORE UPDATE ON public.covered_cities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: parking_zones set_timestamp_parking_zones; Type: TRIGGER; Schema: public; Owner: find-free-parking-db_owner
--

CREATE TRIGGER set_timestamp_parking_zones BEFORE UPDATE ON public.parking_zones FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: reports trg_update_report_counts; Type: TRIGGER; Schema: public; Owner: find-free-parking-db_owner
--

CREATE TRIGGER trg_update_report_counts AFTER INSERT ON public.reports FOR EACH ROW EXECUTE FUNCTION public.update_parking_report_counts();

-- Transfer the definer function without retaining membership/schema CREATE.
DO $$
DECLARE
  had_set boolean := pg_has_role(current_user, 'app_report_counts', 'SET');
  had_create boolean := has_schema_privilege('app_report_counts', 'public', 'CREATE');
BEGIN
  IF NOT had_create THEN GRANT CREATE ON SCHEMA public TO app_report_counts; END IF;
  IF NOT had_set THEN
    IF EXISTS (SELECT FROM pg_auth_members WHERE roleid = 'app_report_counts'::regrole
      AND member = current_user::regrole AND grantor = current_user::regrole) THEN
      RAISE EXCEPTION 'Review existing self-granted membership before baseline replay';
    END IF;
    EXECUTE format('GRANT app_report_counts TO %I WITH SET TRUE GRANTED BY %I', current_user, current_user);
  END IF;
  ALTER FUNCTION public.update_parking_report_counts() OWNER TO app_report_counts;
  IF NOT had_create THEN REVOKE CREATE ON SCHEMA public FROM app_report_counts; END IF;
  IF NOT had_set THEN EXECUTE format('REVOKE app_report_counts FROM %I GRANTED BY %I', current_user, current_user); END IF;
END;
$$;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO app_rw;
GRANT USAGE ON SCHEMA public TO app_report_counts;


--
-- Name: FUNCTION update_parking_report_counts(); Type: ACL; Schema: public; Owner: app_report_counts
--




--
-- Name: COLUMN city_requests.city_name; Type: ACL; Schema: public; Owner: find-free-parking-db_owner
--

GRANT INSERT(city_name) ON TABLE public.city_requests TO app_rw;


--
-- Name: COLUMN city_requests.country; Type: ACL; Schema: public; Owner: find-free-parking-db_owner
--

GRANT INSERT(country) ON TABLE public.city_requests TO app_rw;


--
-- Name: COLUMN city_requests.location; Type: ACL; Schema: public; Owner: find-free-parking-db_owner
--

GRANT INSERT(location) ON TABLE public.city_requests TO app_rw;


--
-- Name: COLUMN city_requests.user_ip; Type: ACL; Schema: public; Owner: find-free-parking-db_owner
--

GRANT INSERT(user_ip) ON TABLE public.city_requests TO app_rw;


--
-- Name: COLUMN city_requests.state; Type: ACL; Schema: public; Owner: find-free-parking-db_owner
--

GRANT INSERT(state) ON TABLE public.city_requests TO app_rw;


--
-- Name: TABLE covered_cities; Type: ACL; Schema: public; Owner: find-free-parking-db_owner
--

GRANT SELECT ON TABLE public.covered_cities TO app_rw;


--
-- Name: TABLE parking_meters; Type: ACL; Schema: public; Owner: find-free-parking-db_owner
--

GRANT SELECT ON TABLE public.parking_meters TO app_rw;


--
-- Name: COLUMN parking_meters.id; Type: ACL; Schema: public; Owner: find-free-parking-db_owner
--

GRANT SELECT(id) ON TABLE public.parking_meters TO app_report_counts;


--
-- Name: COLUMN parking_meters.report_counts; Type: ACL; Schema: public; Owner: find-free-parking-db_owner
--

GRANT UPDATE(report_counts) ON TABLE public.parking_meters TO app_report_counts;


--
-- Name: TABLE parking_zones; Type: ACL; Schema: public; Owner: find-free-parking-db_owner
--

GRANT SELECT ON TABLE public.parking_zones TO app_rw;


--
-- Name: COLUMN parking_zones.id; Type: ACL; Schema: public; Owner: find-free-parking-db_owner
--

GRANT SELECT(id) ON TABLE public.parking_zones TO app_report_counts;


--
-- Name: COLUMN parking_zones.report_counts; Type: ACL; Schema: public; Owner: find-free-parking-db_owner
--

GRANT UPDATE(report_counts) ON TABLE public.parking_zones TO app_report_counts;


--
-- Name: COLUMN reports.id; Type: ACL; Schema: public; Owner: find-free-parking-db_owner
--

GRANT SELECT(id) ON TABLE public.reports TO app_rw;


--
-- Name: COLUMN reports.target_type; Type: ACL; Schema: public; Owner: find-free-parking-db_owner
--

GRANT SELECT(target_type),INSERT(target_type) ON TABLE public.reports TO app_rw;
GRANT SELECT(target_type) ON TABLE public.reports TO app_report_counts;


--
-- Name: COLUMN reports.target_id; Type: ACL; Schema: public; Owner: find-free-parking-db_owner
--

GRANT SELECT(target_id),INSERT(target_id) ON TABLE public.reports TO app_rw;
GRANT SELECT(target_id) ON TABLE public.reports TO app_report_counts;


--
-- Name: COLUMN reports.reason; Type: ACL; Schema: public; Owner: find-free-parking-db_owner
--

GRANT INSERT(reason) ON TABLE public.reports TO app_rw;


--
-- Name: COLUMN reports.created_at; Type: ACL; Schema: public; Owner: find-free-parking-db_owner
--

GRANT SELECT(created_at) ON TABLE public.reports TO app_rw;
GRANT SELECT(created_at) ON TABLE public.reports TO app_report_counts;


--
-- Name: COLUMN reports.user_ip; Type: ACL; Schema: public; Owner: find-free-parking-db_owner
--

GRANT SELECT(user_ip),INSERT(user_ip) ON TABLE public.reports TO app_rw;


--
-- Name: COLUMN reports.user_location; Type: ACL; Schema: public; Owner: find-free-parking-db_owner
--

GRANT INSERT(user_location) ON TABLE public.reports TO app_rw;


--
-- Name: COLUMN reports.reported_status; Type: ACL; Schema: public; Owner: find-free-parking-db_owner
--

GRANT INSERT(reported_status) ON TABLE public.reports TO app_rw;
GRANT SELECT(reported_status) ON TABLE public.reports TO app_report_counts;


--
-- Name: TABLE street_segments; Type: ACL; Schema: public; Owner: find-free-parking-db_owner
--

GRANT SELECT ON TABLE public.street_segments TO app_rw;


--
-- Name: COLUMN street_segments.id; Type: ACL; Schema: public; Owner: find-free-parking-db_owner
--

GRANT SELECT(id) ON TABLE public.street_segments TO app_report_counts;


--
-- Name: COLUMN street_segments.report_counts; Type: ACL; Schema: public; Owner: find-free-parking-db_owner
--

GRANT UPDATE(report_counts) ON TABLE public.street_segments TO app_report_counts;
