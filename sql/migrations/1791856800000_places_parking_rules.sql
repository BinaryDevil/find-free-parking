-- Up Migration
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
