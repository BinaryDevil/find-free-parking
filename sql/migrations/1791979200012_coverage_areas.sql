-- Up Migration
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
COMMENT ON TABLE public.coverage_area_sources IS 'Every linked source is required. Linking does not approve a source; evidence_sources approval remains the human gate.';

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
