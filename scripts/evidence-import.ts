import type { Pool } from "pg";
import type { Geometry } from "geojson";
import { createHash } from "node:crypto";

type PlaceTable = "parking_meters" | "street_segments" | "parking_zones";
export interface PlaceRecord {
  sourceRecordId: string;
  geom: Geometry;
  sourceEditedAt?: string | null;
  rawData?: unknown;
  schedules?: unknown;
  payStationId?: string | null;
  meterHead?: string | null;
  blockId?: string | null;
  streetUse?: string | null;
  city?: string;
  name?: string | null;
  type?: string;
  timeLimitMinutes?: number | null;
  source?: string;
  metadata?: unknown;
}

interface PlaceImport {
  sourceId: string;
  table: PlaceTable;
  records: PlaceRecord[];
  sourceEditedAt?: string | null;
  signalOnly?: boolean;
}

/** Historical parsers contain unreviewed defaults. They may only import context
 * from an approved signal source, never establish authoritative rule evidence. */
export async function importLegacyBatch(
  pool: Pool,
  dataset: string,
  table: "parking_meters" | "street_segments",
  values: unknown[],
  sourceRecordIds: string[],
) {
  if (values.length !== sourceRecordIds.length * 5) throw new Error("Invalid mapped batch");
  const records = sourceRecordIds.map((sourceRecordId, index) => {
    const [id, label, geometry, rawData, schedules] = values.slice(index * 5, index * 5 + 5);
    return {
      sourceRecordId,
      geom: JSON.parse(String(geometry)),
      rawData: JSON.parse(String(rawData)),
      schedules: JSON.parse(String(schedules)),
      ...(table === "parking_meters"
        ? { payStationId: String(id), meterHead: label == null ? null : String(label) }
        : { blockId: String(id), streetUse: label == null ? null : String(label) }),
    };
  });
  return importLegacyPlaces(pool, dataset, table, records);
}

export async function importLegacyPlaces(pool: Pool, dataset: string, table: PlaceTable, records: PlaceRecord[]) {
  const sourceId = process.env[`IMPORT_SOURCE_${dataset}`];
  if (!sourceId) throw new Error(`Select a reviewed signal source with IMPORT_SOURCE_${dataset}`);
  return importPlaces(pool, { sourceId, table, records, signalOnly: true });
}

export function sourceRecordId(value: unknown): string {
  if ((typeof value !== "string" && typeof value !== "number") || !String(value).trim()) {
    throw new Error("Missing stable publisher source record ID; import stopped");
  }
  return String(value);
}

// Vancouver's historic street export has no unique row ID: hblock repeats.
// ADR-0002 permits stable geometry identity. Geometry edits create a new identity
// (future reconciliation belongs to #15); mutable rates/schedules are excluded.
export function geometryRecordId(recordKey: unknown, geometry: Geometry): string {
  const key = sourceRecordId(recordKey);
  const identity = geometry.type === "GeometryCollection" ? geometry.geometries : geometry.coordinates;
  return `${key}:geometry:${createHash("sha256").update(JSON.stringify([geometry.type, identity])).digest("hex")}`;
}

// These are SQL identifiers owned by this module, never caller-supplied SQL.
const columns = {
  parking_meters: ["pay_station_id", "meter_head", "raw_data", "schedules"],
  street_segments: ["block_id", "street_use", "raw_data", "schedules"],
  parking_zones: ["city", "name", "type", "time_limit_minutes", "source", "metadata"],
} as const;

/** Import one validated batch from a human-approved source, preserving place IDs
 * and report counts on conflict. Scheduling, parsing and removal are #15 work. */
export async function importPlaces(pool: Pool, input: PlaceImport) {
  if (!Object.hasOwn(columns, input.table)) throw new Error("Unsupported place table");
  const records = new Map<string, PlaceRecord>();
  for (const record of input.records) {
    if (typeof record.sourceRecordId !== "string" || !record.sourceRecordId.trim()) {
      throw new Error("A stable source record ID is required");
    }
    const previous = records.get(record.sourceRecordId);
    if (previous && JSON.stringify(previous) !== JSON.stringify(record)) throw new Error("Conflicting source record ID in batch");
    records.set(record.sourceRecordId, record);
  }
  const client = await pool.connect();
  let syncId: string | undefined;
  let inTransaction = false;
  try {
    const source = await client.query("SELECT approval_state, evidence_type FROM public.evidence_sources WHERE id = $1", [input.sourceId]);
    if (source.rows[0]?.approval_state !== "approved") throw new Error("Import requires a human-approved Evidence Source");
    if (input.signalOnly && source.rows[0].evidence_type !== "signal") throw new Error("Historical parsers may import signal context only");
    const sync = await client.query(
      "INSERT INTO public.source_syncs (source_id, source_edited_at) VALUES ($1, $2) RETURNING id",
      [input.sourceId, input.sourceEditedAt ?? null],
    );
    syncId = sync.rows[0].id;
    await client.query("BEGIN");
    inTransaction = true;
    // Serialize imports for this source and retain approval through commit.
    const locked = await client.query("SELECT approval_state, evidence_type FROM public.evidence_sources WHERE id = $1 FOR UPDATE", [input.sourceId]);
    if (locked.rows[0]?.approval_state !== "approved") throw new Error("Source approval changed");
    if (input.signalOnly && locked.rows[0].evidence_type !== "signal") throw new Error("Source type changed");
    let added = 0;
    let updated = 0;
    const placeIds: string[] = [];
    const fetchedAt = new Date();
    for (const record of records.values()) {
      const data = input.table === "parking_meters"
        ? [record.payStationId ?? null, record.meterHead ?? null, record.rawData ?? null, record.schedules ?? []]
        : input.table === "street_segments"
          ? [record.blockId ?? null, record.streetUse ?? null, record.rawData ?? null, record.schedules ?? []]
          : [record.city, record.name ?? null, record.type, record.timeLimitMinutes ?? null, record.source ?? "MANUAL", record.metadata ?? null];
      const fields = columns[input.table];
      const parameters = fields.map((field, index) => `$${index + 6}${["raw_data", "schedules", "metadata"].includes(field) ? "::jsonb" : ""}`);
      const values = data.map((value, index) => ["raw_data", "schedules", "metadata"].includes(fields[index]) ? JSON.stringify(value) : value);
      const geometrySql = "ST_SetSRID(ST_GeomFromGeoJSON($5), 4326)";
      const result = await client.query(
        `INSERT INTO public.${input.table} (source_id, source_record_id, fetched_at, source_edited_at, geom, ${fields.join(", ")})
         VALUES ($1, $2, $3, $4, ${input.table === "parking_meters" ? `ST_Centroid(${geometrySql})` : geometrySql}, ${parameters.join(", ")})
         ON CONFLICT (source_id, source_record_id) DO UPDATE SET
           fetched_at = EXCLUDED.fetched_at, source_edited_at = EXCLUDED.source_edited_at,
           geom = EXCLUDED.geom, updated_at = now(), ${fields.map(field => `${field} = EXCLUDED.${field}`).join(", ")}
         RETURNING id, (xmax = 0) AS added`,
        [input.sourceId, record.sourceRecordId, fetchedAt, record.sourceEditedAt ?? input.sourceEditedAt ?? null, JSON.stringify(record.geom), ...values],
      );
      placeIds.push(result.rows[0].id);
      if (result.rows[0].added) added++; else updated++;
    }
    await client.query(
      "UPDATE public.source_syncs SET finished_at = clock_timestamp(), status = 'succeeded', format_check_passed = true, records_added = $2, records_updated = $3 WHERE id = $1",
      [syncId, added, updated],
    );
    await client.query("COMMIT");
    inTransaction = false;
    return { syncId, added, updated, removed: 0, placeIds };
  } catch (error) {
    if (inTransaction) await client.query("ROLLBACK");
    if (syncId) {
      // Driver errors can include SQL, coordinates and credentials. Store only
      // a generic diagnostic; investigate detailed errors in a private session.
      await client.query("UPDATE public.source_syncs SET finished_at = clock_timestamp(), status = 'failed', format_check_passed = false, error = 'Import failed; inspect privately' WHERE id = $1", [syncId]);
    }
    const message = error instanceof Error && ["Import requires a human-approved Evidence Source", "Historical parsers may import signal context only"].includes(error.message)
      ? error.message : "Import failed; inspect privately";
    throw new Error(message);
  } finally {
    client.release();
  }
}
