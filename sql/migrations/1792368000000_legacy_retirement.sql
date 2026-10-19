-- Up Migration
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
