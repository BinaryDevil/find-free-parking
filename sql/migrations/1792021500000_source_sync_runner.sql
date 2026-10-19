-- Up Migration
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
