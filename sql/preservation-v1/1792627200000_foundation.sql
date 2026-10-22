-- Up Migration
-- Preservation-v1: install the current dark model without rewriting legacy data.
-- Run only through the explicitly adopted preservation lineage; no source activation.
CREATE TABLE public.evidence_sources (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_key text NOT NULL,
    area text NOT NULL CHECK (btrim(area) <> ''),
    evidence_type text NOT NULL CHECK (evidence_type IN ('E1','E2','E3','E4','E5','E6','E7','signal')),
    publisher text,
    endpoint text,
    licence text,
    reuse_terms text,
    approval_state text NOT NULL DEFAULT 'pending' CHECK (approval_state IN ('pending','approved','rejected')),
    approved_by text,
    approved_at timestamptz,
    freshness_limit interval NOT NULL CHECK (freshness_limit > interval '0'),
    inventory_doc_path text,
    UNIQUE (source_key, area),
    CHECK (btrim(source_key) <> ''),
    CHECK (approval_state <> 'approved' OR (
        nullif(btrim(approved_by), '') IS NOT NULL AND approved_at IS NOT NULL AND
        nullif(btrim(publisher), '') IS NOT NULL AND nullif(btrim(endpoint), '') IS NOT NULL AND
        nullif(btrim(inventory_doc_path), '') IS NOT NULL
    ))
);
ALTER TABLE public.evidence_sources OWNER TO "find-free-parking-db_owner";

CREATE TABLE public.source_syncs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id uuid NOT NULL REFERENCES public.evidence_sources(id),
    started_at timestamptz NOT NULL DEFAULT now(),
    finished_at timestamptz,
    status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','succeeded','failed')),
    format_check_passed boolean,
    records_added integer NOT NULL DEFAULT 0 CHECK (records_added >= 0),
    records_updated integer NOT NULL DEFAULT 0 CHECK (records_updated >= 0),
    records_removed integer NOT NULL DEFAULT 0 CHECK (records_removed >= 0),
    source_edited_at timestamptz,
    error text,
    CHECK (finished_at IS NULL OR finished_at >= started_at),
    CHECK ((status = 'running' AND finished_at IS NULL) OR (status <> 'running' AND finished_at IS NOT NULL)),
    CHECK (status <> 'succeeded' OR format_check_passed IS TRUE)
);
ALTER TABLE public.source_syncs OWNER TO "find-free-parking-db_owner";
CREATE INDEX source_syncs_source_started_idx ON public.source_syncs(source_id, started_at DESC);

ALTER TABLE public.parking_meters
    ADD COLUMN source_id uuid REFERENCES public.evidence_sources(id),
    ADD COLUMN source_record_id text,
    ADD COLUMN fetched_at timestamptz,
    ADD COLUMN source_edited_at timestamptz;
ALTER TABLE public.street_segments
    ADD COLUMN source_id uuid REFERENCES public.evidence_sources(id),
    ADD COLUMN source_record_id text,
    ADD COLUMN fetched_at timestamptz,
    ADD COLUMN source_edited_at timestamptz;
ALTER TABLE public.parking_zones
    ADD COLUMN source_id uuid REFERENCES public.evidence_sources(id),
    ADD COLUMN source_record_id text,
    ADD COLUMN fetched_at timestamptz,
    ADD COLUMN source_edited_at timestamptz;

-- Legacy imports can leave both provenance identities unknown. A half identity
-- is invalid; nullable UNIQUE retains ON CONFLICT inference without backfilling.
ALTER TABLE public.parking_meters
    ADD CONSTRAINT parking_meters_source_identity UNIQUE (source_id, source_record_id),
    ADD CONSTRAINT parking_meters_source_record_nonempty CHECK (btrim(source_record_id) <> ''),
    ADD CONSTRAINT parking_meters_source_identity_pair CHECK ((source_id IS NULL) = (source_record_id IS NULL));
ALTER TABLE public.street_segments
    ADD CONSTRAINT street_segments_source_identity UNIQUE (source_id, source_record_id),
    ADD CONSTRAINT street_segments_source_record_nonempty CHECK (btrim(source_record_id) <> ''),
    ADD CONSTRAINT street_segments_source_identity_pair CHECK ((source_id IS NULL) = (source_record_id IS NULL));
ALTER TABLE public.parking_zones
    ADD CONSTRAINT parking_zones_source_identity UNIQUE (source_id, source_record_id),
    ADD CONSTRAINT parking_zones_source_record_nonempty CHECK (btrim(source_record_id) <> ''),
    ADD CONSTRAINT parking_zones_source_identity_pair CHECK ((source_id IS NULL) = (source_record_id IS NULL));
REVOKE ALL ON public.evidence_sources, public.source_syncs FROM PUBLIC, app_rw, app_report_counts;
GRANT SELECT ON public.evidence_sources, public.source_syncs TO app_rw;
COMMENT ON COLUMN public.evidence_sources.licence IS 'Optional publisher metadata; public availability is the ADR-0002 criterion 6 gate.';
COMMENT ON COLUMN public.evidence_sources.approved_by IS 'Written author and independent reviewer approval references; inventory records all seven evidence criteria.';

-- Empty additive model: no legacy backfill, source approval, or Coverage.
CREATE TABLE public.places (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    kind text NOT NULL CHECK (kind IN ('curb','zone','meter','lot')),
    city text NOT NULL CHECK (btrim(city) <> ''),
    timezone text NOT NULL CHECK (btrim(timezone) <> ''),
    name text,
    geom public.geometry(Geometry,4326) NOT NULL,
    source_id uuid NOT NULL REFERENCES public.evidence_sources(id),
    source_record_id text NOT NULL CHECK (btrim(source_record_id) <> ''),
    fetched_at timestamptz NOT NULL,
    source_edited_at timestamptz,
    raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (source_id, source_record_id),
    CHECK (NOT public.ST_IsEmpty(geom)),
    CHECK ((kind = 'curb' AND public.GeometryType(geom) IN ('LINESTRING','MULTILINESTRING')) OR
           (kind = 'meter' AND public.GeometryType(geom) = 'POINT') OR
           (kind IN ('zone','lot') AND public.GeometryType(geom) IN ('POINT','POLYGON','MULTIPOLYGON')))
);
ALTER TABLE public.places OWNER TO "find-free-parking-db_owner";
CREATE INDEX places_geom_idx ON public.places USING gist (geom);

CREATE TABLE public.parking_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id uuid NOT NULL REFERENCES public.places(id),
    kind text NOT NULL CHECK (kind IN ('no_stopping','tow_away','no_parking','loading','temporary_no_parking','permit_only','paid','free')),
    days smallint[] CHECK (cardinality(days) > 0 AND days <@ ARRAY[0,1,2,3,4,5,6]::smallint[] AND array_position(days, NULL) IS NULL),
    start_minute smallint CHECK (start_minute >= 0 AND start_minute < 1440),
    end_minute smallint CHECK (end_minute >= 0 AND end_minute <= 1440),
    time_limit_minutes integer CHECK (time_limit_minutes > 0),
    rate numeric CHECK (rate > 0),
    vehicle_type text CHECK (vehicle_type IN ('car','motorcycle','commercial','ev')),
    permit_zone text,
    visitor_allowance_minutes integer CHECK (visitor_allowance_minutes > 0),
    priority integer NOT NULL DEFAULT 0,
    source_id uuid NOT NULL REFERENCES public.evidence_sources(id),
    source_record_id text NOT NULL CHECK (btrim(source_record_id) <> ''),
    fetched_at timestamptz NOT NULL,
    source_edited_at timestamptz,
    parsed boolean NOT NULL DEFAULT false,
    permission_complete boolean NOT NULL DEFAULT false,
    valid_from timestamptz,
    valid_until timestamptz,
    raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (place_id, source_id, source_record_id),
    CHECK (start_minute <> end_minute),
    CHECK (NOT parsed OR (days IS NOT NULL AND start_minute IS NOT NULL AND end_minute IS NOT NULL)),
    CHECK (NOT parsed OR kind <> 'paid' OR rate IS NOT NULL),
    CHECK (valid_from IS NULL OR valid_until IS NULL OR valid_from < valid_until),
    CHECK (visitor_allowance_minutes IS NULL OR kind = 'permit_only')
);
ALTER TABLE public.parking_rules OWNER TO "find-free-parking-db_owner";
CREATE INDEX parking_rules_place_idx ON public.parking_rules (place_id);
CREATE INDEX parking_rules_source_idx ON public.parking_rules (source_id);
REVOKE ALL ON public.places, public.parking_rules FROM PUBLIC, app_rw, app_report_counts;
GRANT SELECT ON public.places, public.parking_rules TO app_rw;
COMMENT ON COLUMN public.parking_rules.days IS '0=Sunday. Overnight ranges belong to the starting day; 0..1440 is all day.';
COMMENT ON COLUMN public.parking_rules.permission_complete IS 'E2 free requires prohibition and time-limit fields; E3 requires all signs parsed and assigned. Adapter evidence, not source approval or Coverage.';

-- Page definitions only: no city/source activation or legacy polygon backfill.
CREATE TABLE public.coverage_areas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL CHECK (btrim(name) <> ''),
    slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    timezone text NOT NULL,
    geom public.geometry(Geometry,4326) NOT NULL CHECK (public.ST_IsValid(geom) AND NOT public.ST_IsEmpty(geom)),
    level text NOT NULL DEFAULT 'none' CHECK (level IN ('full','partial','none')),
    declared_subset text,
    subset_geom public.geometry(Geometry,4326),
    meters_in_rules boolean NOT NULL DEFAULT false,
    complete_signs boolean NOT NULL DEFAULT false,
    computed_at timestamptz,
    CHECK (level = 'none' OR public.GeometryType(geom) IN ('POLYGON','MULTIPOLYGON')),
    CHECK (subset_geom IS NULL OR (public.ST_IsValid(subset_geom) AND NOT public.ST_IsEmpty(subset_geom) AND public.ST_Covers(geom, subset_geom))),
    CHECK (level <> 'partial' OR (nullif(btrim(declared_subset),'') IS NOT NULL AND subset_geom IS NOT NULL))
);
ALTER TABLE public.coverage_areas OWNER TO "find-free-parking-db_owner";
CREATE INDEX coverage_areas_geom_idx ON public.coverage_areas USING gist (geom);
CREATE INDEX coverage_areas_subset_idx ON public.coverage_areas USING gist (subset_geom);

CREATE FUNCTION public.validate_coverage_timezone() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = NEW.timezone AND name LIKE '%/%') THEN
        RAISE EXCEPTION 'Coverage requires an IANA timezone';
    END IF;
    RETURN NEW;
END;
$$;
ALTER FUNCTION public.validate_coverage_timezone() OWNER TO "find-free-parking-db_owner";
CREATE TRIGGER coverage_timezone BEFORE INSERT OR UPDATE ON public.coverage_areas
FOR EACH ROW EXECUTE FUNCTION public.validate_coverage_timezone();

CREATE TABLE public.coverage_area_sources (
    area_id uuid NOT NULL REFERENCES public.coverage_areas(id),
    source_id uuid NOT NULL REFERENCES public.evidence_sources(id),
    covers_entire_area boolean NOT NULL DEFAULT false,
    PRIMARY KEY (area_id, source_id)
);
ALTER TABLE public.coverage_area_sources OWNER TO "find-free-parking-db_owner";
REVOKE ALL ON public.coverage_areas, public.coverage_area_sources FROM PUBLIC, app_rw, app_report_counts;
GRANT SELECT ON public.coverage_areas, public.coverage_area_sources TO app_rw;
COMMENT ON COLUMN public.coverage_areas.level IS 'Reviewed maximum promise. Runtime recomputes from every linked source and latest sync; never serve this value directly.';
COMMENT ON COLUMN public.coverage_areas.computed_at IS 'Optional last operator computation time. Runtime responses carry their own computation instant and recheck freshness.';
COMMENT ON COLUMN public.coverage_areas.subset_geom IS 'Exact declared subset, including every permitted place footprint. City boundaries cannot stand in for a partial subset.';
COMMENT ON TABLE public.coverage_area_sources IS 'Every linked source is required. Linking does not approve a source; evidence_sources approval still requires independent two-agent review.';

-- Preserve existing page URLs as explicitly uncovered page anchors. These points
-- are not city boundaries; activating a promise requires reviewed polygon/subset
-- geometry and separately approved evidence. No source links are inserted.
INSERT INTO public.coverage_areas(name,slug,timezone,geom)
SELECT name,slug,timezone,public.ST_SetSRID(public.ST_MakePoint(lng,lat),4326)
FROM (VALUES
('Vancouver', 'vancouver', 'America/Vancouver', -123.1207, 49.2827),
('Seattle', 'seattle', 'America/Los_Angeles', -122.3321, 47.6062),
('Richmond', 'richmond', 'America/Vancouver', -123.1368, 49.1666),
('Burnaby', 'burnaby', 'America/Vancouver', -122.9805, 49.2488),
('Surrey', 'surrey', 'America/Vancouver', -122.849, 49.1913),
('New Westminster', 'new-westminster', 'America/Vancouver', -122.9109, 49.2057),
('Coquitlam', 'coquitlam', 'America/Vancouver', -122.7932, 49.2838),
('North Vancouver', 'north-vancouver', 'America/Vancouver', -123.0724, 49.3197),
('West Vancouver', 'west-vancouver', 'America/Vancouver', -123.1594, 49.3283),
('Delta', 'delta', 'America/Vancouver', -123.0456, 49.0911),
('Langley', 'langley', 'America/Vancouver', -122.6587, 49.1042),
('White Rock', 'white-rock', 'America/Vancouver', -122.8023, 49.0253),
('Port Coquitlam', 'port-coquitlam', 'America/Vancouver', -122.7785, 49.2625),
('Redmond', 'redmond', 'America/Los_Angeles', -122.1215, 47.674),
('Kirkland', 'kirkland', 'America/Los_Angeles', -122.2059, 47.6769),
('Bellevue', 'bellevue', 'America/Los_Angeles', -122.2015, 47.6101),
('Maple Ridge', 'maple-ridge', 'America/Vancouver', -122.6, 49.2167),
('Council Bluffs', 'council-bluffs', 'America/Chicago', -95.8608, 41.2619),
('Ashburn', 'ashburn', 'America/New_York', -77.4875, 39.0437),
('Boardman', 'boardman', 'America/Los_Angeles', -119.7006, 45.8399),
('New York', 'new-york', 'America/New_York', -74.006, 40.7143),
('Aspen', 'aspen', 'America/Denver', -106.8175, 39.1911),
('Warsaw', 'warsaw', 'Europe/Warsaw', 21.0175, 52.237),
('Amsterdam', 'amsterdam', 'Europe/Amsterdam', 4.8971, 52.378)
) AS pages(name,slug,timezone,lng,lat);

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

-- Forward-only sync history and tombstones; no source approval or data removal.
ALTER TABLE public.places ADD COLUMN removed_at timestamptz, ADD COLUMN content_hash text;
ALTER TABLE public.parking_rules ADD COLUMN removed_at timestamptz;
-- Source adapters give every rule a stable publisher-derived identity.
-- Stop on historical identity conflicts; never repair/delete data implicitly.
CREATE UNIQUE INDEX parking_rules_source_identity ON public.parking_rules(source_id, source_record_id);
ALTER TABLE public.source_syncs ADD COLUMN drift_report jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.source_syncs ADD COLUMN alert_reported_at timestamptz;
COMMENT ON COLUMN public.places.removed_at IS 'Tombstone from a complete successful source snapshot; retained for audit and reappearance.';
COMMENT ON COLUMN public.parking_rules.removed_at IS 'Tombstone; excluded from evaluation without deleting history.';
COMMENT ON COLUMN public.source_syncs.drift_report IS 'Publisher place IDs added/changed/removed, unchanged count, and rule counts; failed runs contain no applied drift.';

-- Retained-in-place archive: no historical place/report updates or deletion.
CREATE TABLE public.legacy_retirements (
    id uuid PRIMARY KEY,
    approval_ref text NOT NULL CHECK (btrim(approval_ref) <> ''),
    snapshot_ref text NOT NULL CHECK (btrim(snapshot_ref) <> ''),
    manifest_sha256 text NOT NULL CHECK (manifest_sha256 ~ '^[a-f0-9]{64}$'),
    coverage_ids uuid[] NOT NULL CHECK (cardinality(coverage_ids) > 0),
    retired_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    reversed_at timestamptz,
    reverse_approval_ref text,
    reverse_snapshot_ref text,
    CHECK (reversed_at IS NULL OR (reversed_at >= retired_at AND
        nullif(btrim(reverse_approval_ref), '') IS NOT NULL AND
        nullif(btrim(reverse_snapshot_ref), '') IS NOT NULL))
);
ALTER TABLE public.legacy_retirements OWNER TO "find-free-parking-db_owner";
CREATE TABLE public.legacy_retirement_members (
    retirement_id uuid NOT NULL REFERENCES public.legacy_retirements(id),
    place_table text NOT NULL CHECK (place_table IN ('parking_meters','street_segments','parking_zones')),
    place_id uuid NOT NULL,
    row_sha256 text NOT NULL CHECK (row_sha256 ~ '^[a-f0-9]{64}$'),
    PRIMARY KEY (retirement_id, place_table, place_id)
);
ALTER TABLE public.legacy_retirement_members OWNER TO "find-free-parking-db_owner";
CREATE INDEX legacy_retirement_members_lookup ON public.legacy_retirement_members(place_table,place_id);
REVOKE ALL ON public.legacy_retirements, public.legacy_retirement_members FROM PUBLIC, app_rw, app_report_counts;
GRANT SELECT ON public.legacy_retirements, public.legacy_retirement_members TO app_rw;
COMMENT ON TABLE public.legacy_retirements IS 'Operator archive manifests; only an explicit reverse re-enables serving. Source freshness does not revive historical context.';
COMMENT ON TABLE public.legacy_retirement_members IS 'Original rows retained in their original tables with UUIDs and report references unchanged. No expiry or deletion authorized.';


-- Validate existing capability roles instead of repairing their privileges.
-- This definition does not provision a scheduler/login or clear any private data.
DO $$
DECLARE executor_oid oid;
BEGIN
  SELECT oid INTO executor_oid FROM pg_roles WHERE rolname = 'pii_retention_executor';
  IF executor_oid IS NULL THEN
    CREATE ROLE pii_retention_executor NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  ELSE
    IF EXISTS (SELECT FROM pg_roles WHERE oid=executor_oid AND
      (rolcanlogin OR rolinherit OR rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls OR rolconfig IS NOT NULL))
      OR EXISTS (SELECT FROM pg_auth_members WHERE roleid=executor_oid OR member=executor_oid)
      OR EXISTS (SELECT FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname IN ('public','extensions') AND (c.relowner=executor_oid OR
          EXISTS (SELECT FROM aclexplode(c.relacl) a WHERE a.grantee=executor_oid) OR
          EXISTS (SELECT FROM pg_attribute col CROSS JOIN LATERAL aclexplode(col.attacl) a
            WHERE col.attrelid=c.oid AND a.grantee=executor_oid)))
      OR pg_catalog.has_table_privilege(executor_oid,'public.reports','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      OR pg_catalog.has_table_privilege(executor_oid,'public.city_requests','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      OR pg_catalog.has_any_column_privilege(executor_oid,'public.reports','SELECT,INSERT,UPDATE,REFERENCES')
      OR pg_catalog.has_any_column_privilege(executor_oid,'public.city_requests','SELECT,INSERT,UPDATE,REFERENCES')
    THEN
      RAISE EXCEPTION 'Existing retention role requires separately reviewed privilege reconciliation';
    END IF;
  END IF;
END;
$$;
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
REVOKE ALL ON FUNCTION public.clear_expired_pii() FROM PUBLIC, app_rw, app_report_counts;
GRANT USAGE ON SCHEMA public TO pii_retention_executor;
GRANT EXECUTE ON FUNCTION public.clear_expired_pii() TO pii_retention_executor;
