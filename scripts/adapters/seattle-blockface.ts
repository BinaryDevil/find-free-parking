import type { LineString, MultiLineString } from 'geojson';
import type { RuleKind } from '../../lib/parking-rules.ts';

export const SEATTLE_BLOCKFACE_ENDPOINT = 'https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/Blockface/FeatureServer/1';

/** Candidate rules use the #11 column vocabulary. Unresolved source semantics
 * deliberately remain unparsed; this is not an approval or Coverage decision. */
export interface BlockfaceRule {
  sourceRecordId: string;
  kind: RuleKind;
  days: number[] | null;
  startMinute: number | null;
  endMinute: number | null;
  rate: number | null;
  timeLimitMinutes: number | null;
  permitZone: string | null;
  priority: number;
  parsed: false;
  permissionComplete: false;
  sourceEditedAt: string;
  rawData: { reason: string; [key: string]: unknown };
}

export interface BlockfacePlace {
  sourceRecordId: string;
  kind: 'curb';
  city: 'Seattle';
  timezone: 'America/Los_Angeles';
  name: string;
  geom: LineString | MultiLineString;
  sourceEditedAt: string;
  rawData: Record<string, unknown>;
  rules: BlockfaceRule[];
}

const groups = { WKD: [1,2,3,4,5], SAT: [6], SUN: [0] };
const stringFields = ['UNITDESC','SIDE','CSM','PARKING_CATEGORY','PEAK_HOUR','RPZ_ZONE','RPZ_AREA','PAIDAREA','SUBAREA','OVERRIDEYN','OVERRIDECOMMENT', ...Object.keys(groups).flatMap(day => [`START_TIME_${day}`, `END_TIME_${day}`])];
const integerFields = ['OBJECTID','ELMNTKEY','SEGKEY','DISTANCE','END_DISTANCE','BLOCKFACE_LENGTH','WIDTH', ...Object.keys(groups).flatMap(day => [1,2,3].flatMap(band => [`${day}_START${band}`, `${day}_END${band}`]))];
const numberFields = ['PARKING_TIME_LIMIT','PAID_SPACES','RPZ_SPACES','TL_SPACES','UNRESTRICTED','NOPARK','NOSTOP','BUS','LOAD_','ZONE','CARPOOL_SPACES', ...Object.keys(groups).flatMap(day => [1,2,3].map(band => `${day}_RATE${band}`))];

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Blockface format: expected object');
  return value as Record<string, unknown>;
}

export function validateBlockfaceLayer(value: unknown): string {
  const layer = object(value);
  if (layer.error || layer.geometryType !== 'esriGeometryPolyline' || !Array.isArray(layer.fields)) throw new Error('Blockface format: expected polyline layer fields');
  const fields = new Map(layer.fields.map(value => { const field = object(value); return [field.name, field.type]; }));
  const definitions: [string[], string[]][] = [[stringFields, ['esriFieldTypeString']], [integerFields.filter(name => name !== 'OBJECTID'), ['esriFieldTypeInteger']], [['OBJECTID'], ['esriFieldTypeOID']], [numberFields, ['esriFieldTypeDouble']]];
  for (const [names, types] of definitions) {
    for (const name of names) if (!types.includes(String(fields.get(name)))) throw new Error(`Blockface format: missing or changed field ${name}`);
  }
  const edited = object(layer.editingInfo).lastEditDate;
  if (typeof edited !== 'number' || !Number.isFinite(edited) || edited <= 0) throw new Error('Blockface format: missing edit date');
  return new Date(edited).toISOString();
}

function geometry(value: unknown): LineString | MultiLineString {
  const geom = object(value);
  if (!['LineString','MultiLineString'].includes(String(geom.type)) || !Array.isArray(geom.coordinates)) throw new Error('Blockface format: expected WGS84 line geometry');
  const lines = geom.type === 'LineString' ? [geom.coordinates] : geom.coordinates;
  if (!lines.length || lines.some(line => !Array.isArray(line) || line.length < 2 || line.some(point => !Array.isArray(point) || point.length !== 2 || typeof point[0] !== 'number' || typeof point[1] !== 'number' || !Number.isFinite(point[0]) || !Number.isFinite(point[1]) || Math.abs(point[0]) > 180 || Math.abs(point[1]) > 90))) throw new Error('Blockface format: invalid WGS84 coordinates');
  return geom as unknown as LineString | MultiLineString;
}

export function adaptSeattleBlockface(layer: unknown, response: unknown): { sourceEditedAt: string; places: BlockfacePlace[] } {
  const sourceEditedAt = validateBlockfaceLayer(layer);
  const collection = object(response);
  if (collection.error || collection.exceededTransferLimit || collection.type !== 'FeatureCollection' || !Array.isArray(collection.features)) throw new Error('Blockface format: incomplete feature collection');
  const ids = new Set<string>();
  const places = collection.features.map(value => {
    const feature = object(value);
    if (feature.type !== 'Feature') throw new Error('Blockface format: expected feature');
    const p = object(feature.properties);
    for (const name of [...stringFields, ...integerFields, ...numberFields]) {
      if (!Object.hasOwn(p, name)) throw new Error(`Blockface format: missing field ${name}`);
      const value = p[name];
      if (value !== null && (stringFields.includes(name) ? typeof value !== 'string' : typeof value !== 'number' || !Number.isFinite(value) || (integerFields.includes(name) && !Number.isInteger(value)))) throw new Error(`Blockface format: changed value type ${name}`);
    }
    if (!Number.isSafeInteger(p.ELMNTKEY) || Number(p.ELMNTKEY) <= 0 || typeof p.UNITDESC !== 'string' || !p.UNITDESC.trim()) throw new Error('Blockface format: missing stable identity or location');
    const id = String(p.ELMNTKEY);
    if (ids.has(id)) throw new Error('Blockface format: duplicate ELMNTKEY');
    ids.add(id);
    const rules: BlockfaceRule[] = [];
    const limit = typeof p.PARKING_TIME_LIMIT === 'number' && Number.isInteger(p.PARKING_TIME_LIMIT) && p.PARKING_TIME_LIMIT > 0 ? p.PARKING_TIME_LIMIT : null;
    const add = (suffix: string, kind: RuleKind, rawData: BlockfaceRule['rawData'], schedule?: { days: number[]; startMinute: number; endMinute: number; rate: number }) => rules.push({
      sourceRecordId: `${id}:${suffix}`, kind, days: schedule?.days ?? null, startMinute: schedule?.startMinute ?? null, endMinute: schedule?.endMinute ?? null,
      rate: schedule?.rate ?? null, timeLimitMinutes: kind === 'paid' ? limit : null, permitZone: kind === 'permit_only' ? String(p.RPZ_ZONE ?? '').trim() || null : null,
      priority: 0, parsed: false, permissionComplete: false, sourceEditedAt, rawData,
    });
    // Every side is aggregate evidence with unresolved extent/sign completeness.
    // A durable unparsed guard also covers empty/zero payment and unknown categories.
    add('extent', 'no_parking', { reason: 'unresolved_curb_extent_and_signs', category: p.PARKING_CATEGORY, csm: p.CSM });
    for (const [day, days] of Object.entries(groups)) {
      for (const band of [1,2,3]) {
        const rate = p[`${day}_RATE${band}`];
        const start = p[`${day}_START${band}`];
        const end = p[`${day}_END${band}`];
        if ([rate,start,end].every(value => value === null)) continue;
        const valid = typeof rate === 'number' && rate > 0 && typeof start === 'number' && start >= 0 && start < 1440 && typeof end === 'number' && end >= 0 && end <= 1440 && start !== end;
        add(`paid:${day}:${band}`, 'paid', { reason: 'unresolved_payment_endpoint_and_extent', rate, start, end, publishedStart: p[`START_TIME_${day}`], publishedEnd: p[`END_TIME_${day}`] }, valid ? { days, startMinute:start, endMinute:end, rate } : undefined);
      }
    }
    if (typeof p.PEAK_HOUR === 'string' && p.PEAK_HOUR.trim()) add('peak', 'no_stopping', { reason: 'unresolved_peak_days_holidays_and_extent', text:p.PEAK_HOUR });
    for (const [field, kind] of [['NOPARK','no_parking'],['NOSTOP','no_stopping'],['LOAD_','loading'],['BUS','loading'],['ZONE','loading']] as const) {
      if (typeof p[field] === 'number' && p[field] > 0) add(field, kind, { reason:'aggregate_quantity_without_schedule_or_extent', count:p[field] });
    }
    if ((typeof p.RPZ_ZONE === 'string' && p.RPZ_ZONE.trim()) || Number(p.RPZ_SPACES) > 0 || p.PARKING_CATEGORY === 'Restricted Parking Zone') add('rpz', 'permit_only', { reason:'rpz_eligibility_not_enforcement', zone:p.RPZ_ZONE, area:p.RPZ_AREA, count:p.RPZ_SPACES });
    // Only retain reviewed public columns, even if the publisher adds fields.
    const rawData = Object.fromEntries([...stringFields, ...integerFields, ...numberFields].map(name => [name,p[name]]));
    return { sourceRecordId:id, kind:'curb' as const, city:'Seattle' as const, timezone:'America/Los_Angeles' as const, name:`${p.UNITDESC}, ${p.SIDE ?? ''}`, geom:geometry(feature.geometry), sourceEditedAt, rawData, rules };
  });
  return { sourceEditedAt, places };
}

/** Fetch a full ID-paged snapshot, not a viewport or silently truncated first
 * page. A nightly export changing during the read invalidates the whole run. */
export async function fetchSeattleBlockface(signal: AbortSignal, request: typeof fetch = fetch) {
  const read = async (suffix: string, params: Record<string, string>) => {
    const url = new URL(`${SEATTLE_BLOCKFACE_ENDPOINT}${suffix}`);
    url.search = new URLSearchParams(params).toString();
    const response = await request(url, { signal, redirect: 'error' });
    if (!response.ok) throw new Error('Blockface retrieval failed');
    const data = object(await response.json());
    if (data.error || data.exceededTransferLimit) throw new Error('Blockface format: incomplete service response');
    return data;
  };
  const layer = await read('', { f:'json' });
  const sourceEditedAt = validateBlockfaceLayer(layer);
  const ids = await read('/query', { where:'1=1', returnIdsOnly:'true', f:'json' });
  if (!Array.isArray(ids.objectIds) || ids.objectIds.some(id => !Number.isSafeInteger(id)) || new Set(ids.objectIds).size !== ids.objectIds.length) throw new Error('Blockface format: invalid object ID list');
  if (ids.objectIds.length === 0) {
    const count = await read('/query', { where:'1=1', returnCountOnly:'true', f:'json' });
    if (count.count !== 0) throw new Error('Blockface format: unconfirmed empty snapshot');
  }
  const features: unknown[] = [];
  for (let offset = 0; offset < ids.objectIds.length; offset += 200) {
    const pageIds: number[] = ids.objectIds.slice(offset, offset + 200);
    const page = await read('/query', { objectIds:pageIds.join(','), outFields:'*', outSR:'4326', f:'geojson' });
    // Validate every page before accepting it; IDs protect against dropped rows
    // and exports renumbering OBJECTID partway through retrieval.
    adaptSeattleBlockface(layer, page);
    const pageFeatures = page.features as unknown[];
    const received = pageFeatures.map(feature => object(object(feature).properties).OBJECTID);
    if (received.length !== pageIds.length || new Set(received).size !== pageIds.length || received.some(id => !pageIds.includes(Number(id)))) throw new Error('Blockface format: incomplete object ID page');
    features.push(...pageFeatures);
  }
  const finalLayer = await read('', { f:'json' });
  if (validateBlockfaceLayer(finalLayer) !== sourceEditedAt) throw new Error('Blockface format: source changed during retrieval');
  const snapshot = adaptSeattleBlockface(layer, { type:'FeatureCollection', features });
  return { complete:true as const, ...snapshot };
}

/** Structural SourceAdapter contract from #15; registration does not approve
 * the real source. The runner must independently enforce human approval. */
export const seattleBlockfaceAdapter = {
  endpoint: SEATTLE_BLOCKFACE_ENDPOINT,
  sourceKey:'seattle-blockface', area:'Seattle', evidenceType:'E1' as const,
  fetchSnapshot: (signal: AbortSignal) => fetchSeattleBlockface(signal),
};
