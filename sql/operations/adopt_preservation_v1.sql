-- Explicit metadata adoption only, after snapshot and baseline comparison.
CREATE SCHEMA IF NOT EXISTS migration_meta;
CREATE TABLE migration_meta.lineage_adoption (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  lineage text NOT NULL CHECK (lineage = 'preservation-v1'),
  manifest jsonb NOT NULL,
  manifest_hash text NOT NULL CHECK (manifest_hash ~ '^[a-f0-9]{64}$'),
  baseline_hash text NOT NULL CHECK (baseline_hash ~ '^[a-f0-9]{64}$'),
  history_hash text NOT NULL CHECK (history_hash ~ '^[a-f0-9]{64}$'),
  reference jsonb NOT NULL,
  snapshot_reference text NOT NULL CHECK (length(snapshot_reference) > 0),
  adopted_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
REVOKE ALL ON migration_meta.lineage_adoption FROM PUBLIC, app_rw;
