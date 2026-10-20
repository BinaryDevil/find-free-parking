import type { Geometry } from 'geojson';
import type { ParkingRule, PlaceKind } from '../lib/parking-rules.ts';
import type { Pool } from 'pg';
import { createHash } from 'node:crypto';

/** A full publisher snapshot, never a page, delta, or viewport query. Adapters
 * must validate upstream metadata/fields, finish pagination and strip private
 * fields before returning. Ambiguous rules remain parsed:false with public raw data. */
export interface SourceSnapshot {
  complete: true;
  sourceEditedAt: string | null;
  places: SyncPlace[];
}
export interface SyncPlace {
  sourceRecordId: string;
  kind: PlaceKind;
  city: string;
  timezone: string;
  name?: string | null;
  geom: Geometry;
  sourceEditedAt?: string | null;
  rawData: unknown;
  rules: SyncRule[];
}
export type SyncRule = Omit<ParkingRule, 'id' | 'source' | 'fetchedAt' | 'days' | 'startMinute' | 'endMinute'> & {
  days?: number[] | null;
  startMinute?: number | null;
  endMinute?: number | null;
  rawData: unknown;
};
export interface SourceAdapter {
  /** Exact approved layer/dataset endpoint used by every retrieval request. */
  endpoint: string;
  sourceKey: string;
  area: string;
  evidenceType: 'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'E6';
  fetchSnapshot(signal: AbortSignal): Promise<SourceSnapshot>;
}

const kinds = ['no_stopping','tow_away','no_parking','loading','temporary_no_parking','permit_only','paid','free'];
const text = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';
const timestamp = (v: unknown) => {
  if (v == null) return true;
  if (typeof v !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(v) || !Number.isFinite(Date.parse(v))) return false;
  const [year, month, day] = v.slice(0, 10).split('-').map(Number);
  return month >= 1 && month <= 12 && day >= 1 && day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
};
const integer = (v: unknown, min: number, max: number) => Number.isInteger(v) && Number(v) >= min && Number(v) <= max;
const positive = (v: unknown) => v == null || (typeof v === 'number' && Number.isFinite(v) && v > 0);
const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const jsonValue = (v: unknown): boolean => v === null || typeof v === 'string' || typeof v === 'boolean' ||
  (typeof v === 'number' && Number.isFinite(v)) || (Array.isArray(v) && v.every(jsonValue)) ||
  (object(v) && Object.getPrototypeOf(v) === Object.prototype && Object.values(v).every(jsonValue));

function geometryValid(geom: unknown, kind: unknown): boolean {
  if (!object(geom)) return false;
  const point = (p: unknown) => Array.isArray(p) && p.length === 2 &&
    p.every(n => typeof n === 'number' && Number.isFinite(n)) && Math.abs(p[0]) <= 180 && Math.abs(p[1]) <= 90;
  const line = (p: unknown) => Array.isArray(p) && p.length >= 2 && p.every(point);
  const ring = (p: unknown) => Array.isArray(p) && p.length >= 4 && p.every(point) && JSON.stringify(p[0]) === JSON.stringify(p.at(-1));
  const polygon = (p: unknown) => Array.isArray(p) && p.length > 0 && p.every(ring);
  const c = geom.coordinates;
  if (kind === 'curb') return geom.type === 'LineString' ? line(c) : geom.type === 'MultiLineString' && Array.isArray(c) && c.length > 0 && c.every(line);
  if (kind === 'meter') return geom.type === 'Point' && point(c);
  if (!['zone','lot'].includes(String(kind))) return false;
  return geom.type === 'Point' ? point(c) : geom.type === 'Polygon' ? polygon(c) :
    geom.type === 'MultiPolygon' && Array.isArray(c) && c.length > 0 && c.every(polygon);
}

/** Runtime validation also protects callers loading adapters written in JS.
 * No missing schedules, rates, identifiers or completeness claims are guessed. */
export function validateSnapshot(value: unknown): SourceSnapshot {
  const invalid = () => { throw new Error('Invalid adapter snapshot'); };
  if (!object(value) || value.complete !== true || !Object.hasOwn(value, 'sourceEditedAt') || !timestamp(value.sourceEditedAt) || !Array.isArray(value.places)) return invalid();
  const places = new Set<string>();
  const rules = new Set<string>();
  for (const p of value.places) {
    if (!object(p) || !text(p.sourceRecordId) || places.has(p.sourceRecordId) || !text(p.city) || !text(p.timezone) ||
      !geometryValid(p.geom, p.kind) || !timestamp(p.sourceEditedAt) || !Object.hasOwn(p, 'rawData') || p.rawData == null ||
      (p.name != null && typeof p.name !== 'string') || !Array.isArray(p.rules)) return invalid();
    try { new Intl.DateTimeFormat('en', { timeZone: p.timezone }); } catch { return invalid(); }
    places.add(p.sourceRecordId);
    for (const r of p.rules) {
      if (!object(r) || !text(r.sourceRecordId) || rules.has(r.sourceRecordId) || !kinds.includes(String(r.kind)) ||
        typeof r.parsed !== 'boolean' || typeof r.permissionComplete !== 'boolean' || !integer(r.priority, -2147483648, 2147483647) ||
        !Object.hasOwn(r, 'rawData') || r.rawData == null || !timestamp(r.sourceEditedAt) || !timestamp(r.validFrom) || !timestamp(r.validUntil) ||
        (r.validFrom != null && r.validUntil != null && Date.parse(String(r.validFrom)) >= Date.parse(String(r.validUntil))) ||
        ![r.timeLimitMinutes,r.visitorAllowanceMinutes].every(v => v == null || integer(v, 1, 2147483647)) || !positive(r.rate) ||
        (r.vehicleType != null && !['car','motorcycle','commercial','ev'].includes(String(r.vehicleType))) ||
        (r.permitZone != null && !text(r.permitZone)) || (r.visitorAllowanceMinutes != null && r.kind !== 'permit_only')) return invalid();
      if ((r.days != null && (!Array.isArray(r.days) || !r.days.length || !r.days.every(d => integer(d, 0, 6)))) ||
        (r.startMinute != null && !integer(r.startMinute, 0, 1439)) || (r.endMinute != null && !integer(r.endMinute, 0, 1440)) ||
        (r.startMinute != null && r.startMinute === r.endMinute) ||
        (r.parsed && (!Array.isArray(r.days) || r.startMinute == null || r.endMinute == null || (r.kind === 'paid' && r.rate == null)))) return invalid();
      rules.add(r.sourceRecordId);
    }
  }
  // Reject cycles/BigInts/undefined raw payloads rather than silently losing evidence.
  try {
    JSON.stringify(value);
    if (!value.places.every(p => jsonValue(p.rawData) && p.rules.every((r: SyncRule) => jsonValue(r.rawData)))) return invalid();
  } catch { return invalid(); }
  return value as unknown as SourceSnapshot;
}

export interface SyncSource {
  id: string;
  source_key: string;
  area: string;
  evidence_type: string;
}
export interface DriftReport {
  added: string[];
  changed: string[];
  removed: string[];
  unchanged: number;
  rules: { added: number; updated: number; removed: number };
}
export interface SyncResult {
  sourceId: string;
  syncId?: string;
  status: 'succeeded' | 'failed' | 'skipped';
  drift?: DriftReport;
}

function canonical(value: unknown): string {
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (object(value)) return `{${Object.keys(value).filter(k => value[k] !== undefined).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}

/** Serializes an entire source fetch/import with a session advisory lock. A
 * committed running row invalidates prior rules even if this process is killed.
 * Snapshot, tombstones, counts and successful sync commit atomically. */
export async function syncSource(pool: Pool, source: SyncSource, adapter?: SourceAdapter): Promise<SyncResult> {
  const client = await pool.connect();
  let locked = false;
  let transaction = false;
  let syncId: string | undefined;
  let formatValid = false;
  try {
    locked = (await client.query('SELECT pg_try_advisory_lock(hashtextextended($1, 15)) AS locked', [source.id])).rows[0].locked;
    if (!locked) return { sourceId: source.id, status: 'skipped' };
    const approved = await client.query('SELECT * FROM public.evidence_sources WHERE id=$1', [source.id]);
    const current = approved.rows[0];
    if (current?.approval_state !== 'approved') return { sourceId: source.id, status: 'skipped' };
    // Holding the advisory lock proves earlier running rows have no live runner.
    await client.query(`UPDATE public.source_syncs SET status='failed',finished_at=clock_timestamp(),format_check_passed=false,
      error='Source sync interrupted; inspect privately',drift_report='{"applied":false}'::jsonb WHERE source_id=$1 AND status='running'`, [source.id]);
    syncId = (await client.query("INSERT INTO public.source_syncs(source_id,started_at) VALUES ($1,clock_timestamp()) RETURNING id", [source.id])).rows[0].id;
    if (!adapter || adapter.sourceKey !== current.source_key || adapter.area !== current.area || adapter.evidenceType !== current.evidence_type ||
      !text(adapter.endpoint) || adapter.endpoint !== current.endpoint) throw new Error('Missing or mismatched adapter');
    const signal = AbortSignal.timeout(90 * 1000);
    const snapshot = validateSnapshot(await Promise.race([
      adapter.fetchSnapshot(signal),
      new Promise<never>((_, reject) => signal.addEventListener('abort', () => reject(new Error('Adapter timeout')), { once: true })),
    ]));
    formatValid = true;
    await client.query('UPDATE public.source_syncs SET source_edited_at=$2 WHERE id=$1', [syncId,snapshot.sourceEditedAt]);
    await client.query('BEGIN'); transaction = true;
    const recheck = (await client.query('SELECT * FROM public.evidence_sources WHERE id=$1 FOR UPDATE', [source.id])).rows[0];
    if (canonical(recheck) !== canonical(current)) throw new Error('Source changed while fetching');
    const previous = (await client.query('SELECT source_record_id, content_hash FROM public.places WHERE source_id=$1 AND removed_at IS NULL', [source.id])).rows;
    const before = new Map<string, string | null>(previous.map(p => [p.source_record_id, p.content_hash]));
    const drift: DriftReport = { added: [], changed: [], removed: [], unchanged: 0, rules: { added: 0, updated: 0, removed: 0 } };
    const placeRecords: string[] = [];
    const ruleRecords: string[] = [];
    const fetchedAt = new Date();
    for (const p of snapshot.places) {
      const contentHash = createHash('sha256').update(canonical({ ...p, rules: [...p.rules].sort((a,b) => a.sourceRecordId.localeCompare(b.sourceRecordId)) })).digest('hex');
      if (!before.has(p.sourceRecordId)) drift.added.push(p.sourceRecordId);
      else if (before.get(p.sourceRecordId) !== contentHash) drift.changed.push(p.sourceRecordId);
      else drift.unchanged++;
      placeRecords.push(p.sourceRecordId);
      const placeId = (await client.query(`INSERT INTO public.places(kind,city,timezone,name,geom,source_id,source_record_id,fetched_at,source_edited_at,raw_data,content_hash)
        VALUES ($1,$2,$3,$4,ST_SetSRID(ST_GeomFromGeoJSON($5),4326),$6,$7,$8,$9,$10::jsonb,$11)
        ON CONFLICT (source_id,source_record_id) DO UPDATE SET kind=EXCLUDED.kind,city=EXCLUDED.city,timezone=EXCLUDED.timezone,
          name=EXCLUDED.name,geom=EXCLUDED.geom,fetched_at=EXCLUDED.fetched_at,source_edited_at=EXCLUDED.source_edited_at,
          raw_data=EXCLUDED.raw_data,content_hash=EXCLUDED.content_hash,removed_at=NULL RETURNING id`,
      [p.kind,p.city,p.timezone,p.name ?? null,JSON.stringify(p.geom),source.id,p.sourceRecordId,fetchedAt,p.sourceEditedAt ?? snapshot.sourceEditedAt,JSON.stringify(p.rawData),contentHash])).rows[0].id;
      if (!(await client.query('SELECT ST_IsValid(geom) AS valid FROM public.places WHERE id=$1', [placeId])).rows[0].valid) throw new Error('Invalid source geometry');
      for (const r of p.rules) {
        ruleRecords.push(r.sourceRecordId);
        const result = await client.query(`INSERT INTO public.parking_rules(place_id,kind,days,start_minute,end_minute,time_limit_minutes,rate,vehicle_type,
          permit_zone,visitor_allowance_minutes,priority,source_id,source_record_id,fetched_at,source_edited_at,parsed,permission_complete,valid_from,valid_until,raw_data)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20::jsonb)
          ON CONFLICT (source_id,source_record_id) DO UPDATE SET place_id=EXCLUDED.place_id,kind=EXCLUDED.kind,days=EXCLUDED.days,
            start_minute=EXCLUDED.start_minute,end_minute=EXCLUDED.end_minute,time_limit_minutes=EXCLUDED.time_limit_minutes,rate=EXCLUDED.rate,
            vehicle_type=EXCLUDED.vehicle_type,permit_zone=EXCLUDED.permit_zone,visitor_allowance_minutes=EXCLUDED.visitor_allowance_minutes,
            priority=EXCLUDED.priority,fetched_at=EXCLUDED.fetched_at,source_edited_at=EXCLUDED.source_edited_at,parsed=EXCLUDED.parsed,
            permission_complete=EXCLUDED.permission_complete,valid_from=EXCLUDED.valid_from,valid_until=EXCLUDED.valid_until,
            raw_data=EXCLUDED.raw_data,removed_at=NULL RETURNING (xmax=0) AS added`,
        [placeId,r.kind,r.days ?? null,r.startMinute ?? null,r.endMinute ?? null,r.timeLimitMinutes ?? null,r.rate ?? null,r.vehicleType ?? null,
          r.permitZone ?? null,r.visitorAllowanceMinutes ?? null,r.priority,source.id,r.sourceRecordId,fetchedAt,
          r.sourceEditedAt ?? p.sourceEditedAt ?? snapshot.sourceEditedAt,r.parsed,r.permissionComplete,r.validFrom ?? null,r.validUntil ?? null,JSON.stringify(r.rawData)]);
        if (result.rows[0].added) drift.rules.added++; else drift.rules.updated++;
      }
    }
    const removed = await client.query(`UPDATE public.places SET removed_at=clock_timestamp() WHERE source_id=$1 AND removed_at IS NULL
      AND NOT (source_record_id=ANY($2::text[])) RETURNING source_record_id`, [source.id,placeRecords]);
    drift.removed = removed.rows.map(p => p.source_record_id).sort();
    drift.rules.removed = (await client.query(`UPDATE public.parking_rules SET removed_at=clock_timestamp() WHERE source_id=$1 AND removed_at IS NULL
      AND NOT (source_record_id=ANY($2::text[]))`, [source.id,ruleRecords])).rowCount ?? 0;
    drift.added.sort(); drift.changed.sort();
    await client.query(`UPDATE public.source_syncs SET status='succeeded',format_check_passed=true,finished_at=clock_timestamp(),
      records_added=$2,records_updated=$3,records_removed=$4,source_edited_at=$5,drift_report=$6::jsonb WHERE id=$1`,
    [syncId,drift.added.length,drift.changed.length,drift.removed.length,snapshot.sourceEditedAt,JSON.stringify(drift)]);
    await client.query('COMMIT'); transaction = false;
    return { sourceId: source.id, syncId, status: 'succeeded', drift };
  } catch {
    if (transaction) await client.query('ROLLBACK');
    if (!syncId) throw new Error('Source sync unavailable; inspect privately');
    await client.query(`UPDATE public.source_syncs SET status='failed',finished_at=clock_timestamp(),format_check_passed=$2,
      error='Source sync failed; inspect privately',drift_report='{"applied":false}'::jsonb WHERE id=$1`, [syncId,formatValid]);
    return { sourceId: source.id, syncId, status: 'failed' };
  } finally {
    try { if (locked) await client.query('SELECT pg_advisory_unlock(hashtextextended($1, 15))', [source.id]); }
    finally { client.release(); }
  }
}
