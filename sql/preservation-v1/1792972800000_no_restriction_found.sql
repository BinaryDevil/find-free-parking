-- Up Migration
-- Preservation-v1, ADR-0001 No Restriction Found amendment (#135). Additive and dark:
-- no row is inserted and no register is approved or measured here.
CREATE TABLE public.evidence_source_roles (
    source_id uuid NOT NULL REFERENCES public.evidence_sources(id),
    role text NOT NULL CHECK (role IN ('parking_layer','temporary_restrictions')),
    place_type text NOT NULL CHECK (place_type IN ('street','lot')),
    approval_state text NOT NULL DEFAULT 'pending' CHECK (approval_state IN ('pending','approved','rejected')),
    approved_by text[] NOT NULL DEFAULT '{}',
    approval_refs text[] NOT NULL DEFAULT '{}',
    approved_at timestamptz,
    inventory_doc_path text,
    PRIMARY KEY (source_id, role, place_type),
    CHECK (approval_state <> 'approved' OR (
        cardinality(approved_by) >= 2 AND cardinality(approval_refs) >= 2 AND approved_at IS NOT NULL AND
        nullif(btrim(inventory_doc_path), '') IS NOT NULL
    ))
);
ALTER TABLE public.evidence_source_roles OWNER TO "find-free-parking-db_owner";

CREATE TABLE public.restriction_registers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    area_id uuid NOT NULL REFERENCES public.coverage_areas(id),
    version integer NOT NULL CHECK (version > 0),
    approval_state text NOT NULL DEFAULT 'pending' CHECK (approval_state IN ('pending','approved','rejected')),
    approved_by text[] NOT NULL DEFAULT '{}',
    approval_refs text[] NOT NULL DEFAULT '{}',
    approved_at timestamptz,
    inventory_doc_path text,
    measurement_ref text,
    measured_at timestamptz,
    UNIQUE (area_id, version),
    CHECK (approval_state <> 'approved' OR (
        cardinality(approved_by) >= 2 AND cardinality(approval_refs) >= 2 AND approved_at IS NOT NULL AND
        nullif(btrim(inventory_doc_path), '') IS NOT NULL
    )),
    -- Rule 5: a measurement is recorded only against an approved register.
    CHECK ((measurement_ref IS NULL) = (measured_at IS NULL)),
    CHECK (measurement_ref IS NULL OR (approval_state = 'approved' AND nullif(btrim(measurement_ref), '') IS NOT NULL))
);
ALTER TABLE public.restriction_registers OWNER TO "find-free-parking-db_owner";

CREATE TABLE public.restriction_register_sources (
    register_id uuid NOT NULL REFERENCES public.restriction_registers(id),
    category text NOT NULL CHECK (category IN (
        'no_stopping','tow_away','no_parking','peak_hour','loading','bus_transit','disabled_only','permit',
        'eligibility','vehicle_class','school_zone','street_cleaning','events_closures','temporary','payment','time_limit'
    )),
    place_type text NOT NULL CHECK (place_type IN ('street','lot')),
    source_id uuid NOT NULL REFERENCES public.evidence_sources(id),
    PRIMARY KEY (register_id, category, place_type, source_id)
);
ALTER TABLE public.restriction_register_sources OWNER TO "find-free-parking-db_owner";
CREATE INDEX restriction_register_sources_source_idx ON public.restriction_register_sources(source_id);

REVOKE ALL ON public.evidence_source_roles, public.restriction_registers, public.restriction_register_sources FROM PUBLIC, app_rw, app_report_counts;
GRANT SELECT ON public.evidence_source_roles, public.restriction_registers, public.restriction_register_sources TO app_rw;
