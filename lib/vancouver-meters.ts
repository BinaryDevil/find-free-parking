import type { ParkingRule, RuleSource } from './parking-rules.ts';
import { isDeepStrictEqual } from 'node:util';
import type { Point } from 'geojson';

const fields = ['meter_id', 'service_status', 'vehicle_type', 'rate_9am_6pm', 'rate_6pm_10pm',
  'flat_rate', 'time_limit_9am_6pm', 'time_limit_6pm_10pm', 'time_limit_weekend_9am_6pm',
  'time_limit_weekend_6pm_10pm', 'time_limit_override', 'prohibition_override', 'am_rush_hours',
  'pm_rush_hours', 'prohibition_1_days', 'prohibition_1_time', 'prohibition_1_zone',
  'prohibition_2_days', 'prohibition_2_time', 'prohibition_2_zone', 'geom'] as const;

type Raw = Record<string, unknown>;
const allDays = [0, 1, 2, 3, 4, 5, 6];

function limit(value: unknown): number | null | undefined {
  if (value === 'No Time Limit') return null;
  const match = typeof value === 'string' && /^(\d+) (Hr|Min)$/.exec(value);
  return match && Number(match[1]) > 0 ? Number(match[1]) * (match[2] === 'Hr' ? 60 : 1) : undefined;
}

function rate(value: unknown): number | undefined {
  return typeof value === 'string' && /^\$\d+(\.\d{2})?$/.test(value) && Number(value.slice(1)) > 0
    ? Number(value.slice(1)) : undefined;
}

function days(value: unknown): number[] | undefined {
  if (typeof value !== 'string') return undefined;
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  if (value === '7 Days a Week' || value === 'Mon-Sun') return allDays;
  const single = names.indexOf(value);
  if (single >= 0) return [single];
  const parts = value.split(/\s*(?:[-–]| to )\s*/);
  const start = names.indexOf(parts[0]);
  const end = names.indexOf(parts[1]);
  if (parts.length !== 2 || start < 0 || end < 0) return undefined;
  return Array.from({ length: (end - start + 7) % 7 + 1 }, (_, i) => (start + i) % 7);
}

function minute(value: string): number | undefined {
  if (value === 'Noon') return 720;
  if (value === 'Midnight') return 0;
  const match = /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i.exec(value);
  if (!match || +match[1] < 1 || +match[1] > 12 || +(match[2] ?? 0) > 59) return undefined;
  return (+match[1] % 12) * 60 + +(match[2] ?? 0) + (match[3].toUpperCase() === 'PM' ? 720 : 0);
}

function interval(value: unknown): { startMinute: number; endMinute: number } | undefined {
  if (value === 'Anytime') return { startMinute: 0, endMinute: 1440 };
  if (typeof value !== 'string') return undefined;
  const parts = value.split(/\s*(?:[-–]| to )\s*/);
  if (parts.length !== 2) return undefined;
  const startMinute = minute(parts[0]);
  const endMinute = minute(parts[1]);
  if (startMinute === undefined || endMinute === undefined || startMinute === endMinute) return undefined;
  return { startMinute, endMinute };
}
export interface VancouverMeterOptions {
  source: RuleSource;
  fetchedAt: string;
  sourceEditedAt: string | null;
  /** Human-reviewed semantics bound to an exact raw record, never feed-wide defaults. */
  reviewed?: Record<string, {
    rawRecord: unknown;
    evidence: string;
    rushDays?: number[];
    afterHours?: { days: number[]; timeLimitMinutes: number | null };
  }>;
}

/** Pure record adaptation; only fetchSnapshot establishes feed completeness. */
export function adaptVancouverMeters(rows: unknown, options: VancouverMeterOptions) {
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('Expected nonempty Vancouver meter records');
  if (options.source.evidenceType !== 'E2') throw new Error('Vancouver meters require E2 evidence');
  const seen = new Set<string>();
  const records = rows.map((value: unknown) => {
    if (!value || typeof value !== 'object') throw new Error('Invalid meter record');
    const raw = value as Raw;
    for (const field of fields) {
      if (!Object.hasOwn(raw, field)) throw new Error(`Vancouver meter format missing ${field}`);
      if (field !== 'geom' && raw[field] !== null && typeof raw[field] !== 'string') throw new Error(`Invalid ${field} type`);
    }
    if (typeof raw.meter_id !== 'string' || !raw.meter_id.trim()) throw new Error('Invalid meter_id');
    const feature = raw.geom as { type?: string; geometry?: Point } | null;
    const geom = feature?.geometry;
    if (feature?.type !== 'Feature' || geom?.type !== 'Point' || !Array.isArray(geom.coordinates) ||
      geom.coordinates.length !== 2 || !geom.coordinates.every(n => typeof n === 'number' && Number.isFinite(n)) ||
      Math.abs(geom.coordinates[0]) > 180 || Math.abs(geom.coordinates[1]) > 90) throw new Error('Invalid meter geom');
    const id = raw.meter_id;
    if (seen.has(id)) throw new Error(`Duplicate meter_id ${id}`);
    seen.add(id);
    const review = options.reviewed?.[id];
    const reviewed = review && review.evidence.trim() && isDeepStrictEqual(review.rawRecord, raw) ? review : undefined;
    const rules: ParkingRule[] = [];
    const add = (suffix: string, extra: Partial<ParkingRule>) => rules.push({
      id: `${id}:${suffix}`, kind: 'no_parking', days: allDays, startMinute: 0, endMinute: 1440,
      source: options.source, sourceRecordId: id, fetchedAt: options.fetchedAt,
      sourceEditedAt: options.sourceEditedAt, parsed: true, priority: 0, ...extra,
    });
    const unknown = () => { if (!rules.some(rule => !rule.parsed)) add('unknown', { parsed: false }); };
    if (raw.service_status !== 'In Service' || raw.flat_rate !== null ||
      raw.time_limit_override !== 'No' || raw.prohibition_override !== 'No') unknown();
    const vehicleType = raw.vehicle_type === 'Any Vehicle' ? null :
      raw.vehicle_type === 'Motorcycle' ? 'motorcycle' : undefined;
    if (vehicleType === undefined) unknown();
    for (const slot of [1, 2]) {
      const values = ['days', 'time', 'zone'].map(part => raw[`prohibition_${slot}_${part}`]);
      if (values.every(value => value === null)) continue;
      const scheduleDays = days(values[0]);
      const schedule = interval(values[1]);
      const kinds: Record<string, ParkingRule['kind']> = {
        'NO STOPPING': 'no_stopping', 'NO PARKING': 'no_parking',
        'LOADING ZONE': 'loading', 'CVLZ': 'loading', 'PASSENGER ZONE': 'loading',
        'TAXI ZONE': 'no_parking', 'PERMIT PARKING ONLY': 'permit_only',
        'TOUR BUS': 'no_parking', 'POLICE': 'no_parking', 'MILITARY': 'no_parking',
        'AUTHORIZED VEHICLES ONLY': 'no_parking',
      };
      const kind = typeof values[2] === 'string' ? kinds[values[2]] : undefined;
      if (!scheduleDays || !schedule || !kind) unknown();
      else add(`prohibition-${slot}`, { kind, days: scheduleDays, ...schedule });
    }
    // Rush ranges carry no day field. Until corroborated, do not invent weekdays.
    for (const field of ['am_rush_hours', 'pm_rush_hours']) {
      if (raw[field] === null) continue;
      const schedule = interval(raw[field]);
      if (!schedule || !reviewed?.rushDays?.length ||
        !reviewed.rushDays.every(day => Number.isInteger(day) && day >= 0 && day <= 6)) unknown();
      else add(field, { kind: 'tow_away', days: reviewed.rushDays, ...schedule });
    }
    for (const [band, startMinute, endMinute] of [['9am_6pm', 540, 1080], ['6pm_10pm', 1080, 1320]] as const) {
      for (const [prefix, days] of [['', [1, 2, 3, 4, 5]], ['weekend_', [0, 6]]] as const) {
        const timeLimitMinutes = limit(raw[`time_limit_${prefix}${band}`]);
        const amount = rate(raw[`rate_${band}`]);
        if (timeLimitMinutes === undefined || amount === undefined) unknown();
        else add(`${prefix}${band}`, { kind: 'paid', days: [...days], startMinute, endMinute,
          rate: amount, timeLimitMinutes, vehicleType });
      }
    }
    // Null prohibition slots alone do not grant parking permission. A review must
    // establish precise curb assignment, complete applicable rules and explicit
    // positive after-hours permission in the same official feed's semantics.
    if (reviewed?.afterHours && !rules.some(rule => !rule.parsed)) {
      add('after-hours', { kind: 'free', days: reviewed.afterHours.days,
        startMinute: 1320, endMinute: 540, timeLimitMinutes: reviewed.afterHours.timeLimitMinutes,
        vehicleType, permissionComplete: true });
    }
    return { sourceRecordId: id, geom, raw, rules, semanticEvidence: reviewed?.evidence ?? null,
      served: raw.service_status !== 'Removed' };
  });
  return { records };
}

export const VANCOUVER_METERS_ENDPOINT = 'https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/parking-meters';
type Request = (url: string, init: { signal: AbortSignal }) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

/** Structurally matches #15 SourceAdapter. No database writes or source approval.
 * The runner owns atomic replacement, missing-record retirement and history. */
export function createVancouverMeterAdapter(options: VancouverMeterOptions, request: Request = fetch) {
  return {
    sourceKey: 'vancouver-parking-meters', area: 'Vancouver', evidenceType: 'E2' as const,
    async fetchSnapshot(signal: AbortSignal) {
      const get = async (url: string) => {
        const response = await request(url, { signal });
        if (!response.ok) throw new Error('Vancouver meter retrieval failed');
        return response.json();
      };
      const metadata = async () => {
        const value = await get(VANCOUVER_METERS_ENDPOINT) as { metas?: { default?: { modified?: unknown; records_count?: unknown } } };
        const meta = value?.metas?.default;
        if (typeof meta?.modified !== 'string' || !Number.isFinite(Date.parse(meta.modified)) ||
          !Number.isInteger(meta.records_count) || Number(meta.records_count) <= 0 || Number(meta.records_count) > 10000) {
          throw new Error('Invalid Vancouver meter metadata');
        }
        return { editedAt: meta.modified, count: Number(meta.records_count) };
      };
      const before = await metadata();
      const rows: unknown[] = [];
      while (rows.length < before.count) {
        const page = await get(`${VANCOUVER_METERS_ENDPOINT}/records?order_by=meter_id&limit=100&offset=${rows.length}`) as { total_count?: unknown; results?: unknown };
        if (page?.total_count !== before.count || !Array.isArray(page.results) || !page.results.length ||
          page.results.length > 100 || rows.length + page.results.length > before.count) throw new Error('Incomplete Vancouver meter feed');
        rows.push(...page.results);
      }
      const after = await metadata();
      if (!isDeepStrictEqual(before, after)) throw new Error('Vancouver meter feed changed during retrieval');
      const { records } = adaptVancouverMeters(rows, { ...options, sourceEditedAt: before.editedAt });
      return {
        complete: true as const, sourceEditedAt: before.editedAt,
        places: records.filter(record => record.served).map(record => ({
          sourceRecordId: record.sourceRecordId, kind: 'meter' as const, city: 'Vancouver',
          timezone: 'America/Vancouver', geom: record.geom, rawData: record.raw, sourceEditedAt: before.editedAt,
          rules: record.rules.map(rule => ({ ...rule, sourceRecordId: rule.id,
            permissionComplete: rule.permissionComplete === true,
            rawData: { record: record.raw, semanticEvidence: record.semanticEvidence } })),
        })),
      };
    },
  };
}
