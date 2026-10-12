-- Up Migration
-- Additive provenance only. Legacy identities preserve every stored duplicate;
-- they are not original publisher IDs. Unknown timestamps remain NULL.
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
        nullif(btrim(licence), '') IS NOT NULL AND nullif(btrim(reuse_terms), '') IS NOT NULL AND
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

-- Use only stored city metadata. A polygon, ID prefix or geometry is not
-- provenance; missing city metadata is retained under an explicit unknown area.
INSERT INTO public.evidence_sources (source_key, area, evidence_type, approval_state, freshness_limit)
SELECT 'legacy-import-2025-12', area, 'signal', 'rejected', interval '7 days'
FROM (
    SELECT coalesce(nullif(btrim(raw_data->>'city'), ''), 'Unknown legacy area') AS area FROM public.parking_meters
    UNION
    SELECT coalesce(nullif(btrim(raw_data->>'city'), ''), 'Unknown legacy area') FROM public.street_segments
    UNION
    SELECT coalesce(nullif(btrim(city), ''), 'Unknown legacy area') FROM public.parking_zones
) areas;

UPDATE public.parking_meters p SET source_id = s.id, source_record_id = 'legacy:parking_meters:' || p.id
FROM public.evidence_sources s
WHERE s.source_key = 'legacy-import-2025-12' AND s.area = coalesce(nullif(btrim(p.raw_data->>'city'), ''), 'Unknown legacy area');
UPDATE public.street_segments p SET source_id = s.id, source_record_id = 'legacy:street_segments:' || p.id
FROM public.evidence_sources s
WHERE s.source_key = 'legacy-import-2025-12' AND s.area = coalesce(nullif(btrim(p.raw_data->>'city'), ''), 'Unknown legacy area');
-- Preserve historical updated_at, including the existing trigger's exact state.
DO $$
DECLARE trigger_state "char";
BEGIN
    SELECT tgenabled INTO STRICT trigger_state FROM pg_trigger
    WHERE tgrelid = 'public.parking_zones'::regclass AND tgname = 'set_timestamp_parking_zones';
    ALTER TABLE public.parking_zones DISABLE TRIGGER set_timestamp_parking_zones;
    UPDATE public.parking_zones p SET source_id = s.id, source_record_id = 'legacy:parking_zones:' || p.id
    FROM public.evidence_sources s
    WHERE s.source_key = 'legacy-import-2025-12' AND s.area = coalesce(nullif(btrim(p.city), ''), 'Unknown legacy area');
    IF trigger_state = 'O' THEN ALTER TABLE public.parking_zones ENABLE TRIGGER set_timestamp_parking_zones;
    ELSIF trigger_state = 'A' THEN ALTER TABLE public.parking_zones ENABLE ALWAYS TRIGGER set_timestamp_parking_zones;
    ELSIF trigger_state = 'R' THEN ALTER TABLE public.parking_zones ENABLE REPLICA TRIGGER set_timestamp_parking_zones;
    END IF;
END;
$$;

ALTER TABLE public.parking_meters
    ALTER COLUMN source_id SET NOT NULL, ALTER COLUMN source_record_id SET NOT NULL,
    ADD CONSTRAINT parking_meters_source_identity UNIQUE (source_id, source_record_id),
    ADD CONSTRAINT parking_meters_source_record_nonempty CHECK (btrim(source_record_id) <> '');
ALTER TABLE public.street_segments
    ALTER COLUMN source_id SET NOT NULL, ALTER COLUMN source_record_id SET NOT NULL,
    ADD CONSTRAINT street_segments_source_identity UNIQUE (source_id, source_record_id),
    ADD CONSTRAINT street_segments_source_record_nonempty CHECK (btrim(source_record_id) <> '');
ALTER TABLE public.parking_zones
    ALTER COLUMN source_id SET NOT NULL, ALTER COLUMN source_record_id SET NOT NULL,
    ADD CONSTRAINT parking_zones_source_identity UNIQUE (source_id, source_record_id),
    ADD CONSTRAINT parking_zones_source_record_nonempty CHECK (btrim(source_record_id) <> '');

-- Runtime needs read access only. No application role may approve or import.
REVOKE ALL ON public.evidence_sources, public.source_syncs FROM PUBLIC, app_rw, app_report_counts;
GRANT SELECT ON public.evidence_sources, public.source_syncs TO app_rw;
COMMENT ON COLUMN public.parking_meters.fetched_at IS 'Unknown for historical imports; never inferred from updated_at.';
COMMENT ON COLUMN public.street_segments.fetched_at IS 'Unknown for historical imports; never inferred from updated_at.';
COMMENT ON COLUMN public.parking_zones.fetched_at IS 'Unknown for historical imports; never inferred from updated_at.';
