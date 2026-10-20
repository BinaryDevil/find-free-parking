import { createHash } from 'node:crypto';
import type { Polygon, MultiPolygon } from 'geojson';
import type { SourceAdapter, SyncPlace } from '../source-sync.ts';

export const VANCOUVER_PERMIT_ENDPOINT = 'https://services3.arcgis.com/qrcTTRTwUoS8N47o/arcgis/rest/services/ResidentialParkingPermitZones/FeatureServer/0';
const fields = ['MAPID','TYPE','NAME','DESCRIPTION','URL'];
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Permit format: expected object');
  return value as Record<string, unknown>;
}
function validateLayer(value: unknown): string {
  const layer = object(value);
  if (layer.error || layer.geometryType !== 'esriGeometryPolygon' || !Array.isArray(layer.fields)) throw new Error('Permit format: expected polygon layer');
  const types = new Map(layer.fields.map(value => { const field = object(value); return [field.name,field.type]; }));
  for (const name of ['OBJECTID', ...fields]) if (types.get(name) !== (name === 'OBJECTID' ? 'esriFieldTypeOID' : 'esriFieldTypeString')) throw new Error(`Permit format: changed field ${name}`);
  const edited = object(layer.editingInfo).lastEditDate;
  if (typeof edited !== 'number' || !Number.isFinite(edited) || edited <= 0) throw new Error('Permit format: missing edit date');
  return new Date(edited).toISOString();
}
function geometry(value: unknown): Polygon | MultiPolygon {
  const geom = object(value);
  if (!['Polygon','MultiPolygon'].includes(String(geom.type)) || !Array.isArray(geom.coordinates)) throw new Error('Permit format: expected WGS84 polygon');
  const polygons = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  if (!polygons.length || polygons.some(polygon => !Array.isArray(polygon) || !polygon.length || polygon.some(ring => !Array.isArray(ring) || ring.length < 4 || ring.some(point => !Array.isArray(point) || point.length !== 2 || typeof point[0] !== 'number' || typeof point[1] !== 'number' || !Number.isFinite(point[0]) || !Number.isFinite(point[1]) || Math.abs(point[0]) > 180 || Math.abs(point[1]) > 90) || JSON.stringify(ring[0]) !== JSON.stringify(ring.at(-1))))) throw new Error('Permit format: invalid WGS84 ring');
  return geom as unknown as Polygon | MultiPolygon;
}

/** Eligibility polygons are not signed curb rules. Preserve E4 candidates with
 * unknown schedules; source approval alone cannot make them parsed. */
export function adaptVancouverPermitZones(layer: unknown, response: unknown): { sourceEditedAt: string; places: SyncPlace[] } {
  const sourceEditedAt = validateLayer(layer);
  const collection = object(response);
  if (collection.error || collection.exceededTransferLimit || collection.type !== 'FeatureCollection' || !Array.isArray(collection.features)) throw new Error('Permit format: incomplete collection');
  const ids = new Set<string>();
  const places = collection.features.map(value => {
    const feature = object(value);
    if (feature.type !== 'Feature') throw new Error('Permit format: expected feature');
    const p = object(feature.properties);
    if (!Number.isSafeInteger(p.OBJECTID) || Number(p.OBJECTID) <= 0) throw new Error('Permit format: invalid object ID');
    for (const field of fields) if (!Object.hasOwn(p,field) || (p[field] !== null && typeof p[field] !== 'string')) throw new Error(`Permit format: changed value ${field}`);
    if (typeof p.MAPID !== 'string' || !p.MAPID.trim() || typeof p.NAME !== 'string' || !p.NAME.trim() || !['RPO','RPP','VRPP'].includes(String(p.TYPE))) throw new Error('Permit format: unknown zone identity or type');
    const geom = geometry(feature.geometry);
    // MAPID repeats across polygon parts; export OBJECTIDs may be renumbered.
    const id = `${p.MAPID}:${createHash('sha256').update(JSON.stringify(geom)).digest('hex')}`;
    if (ids.has(id)) throw new Error('Permit format: duplicate zone part');
    ids.add(id);
    const rawData = Object.fromEntries(fields.map(field => [field,p[field]]));
    return {
      sourceRecordId:id, kind:'zone' as const, city:'Vancouver', timezone:'America/Vancouver', name:`${p.MAPID} · ${p.NAME}`,
      geom, sourceEditedAt, rawData,
      rules:[{sourceRecordId:`${id}:permit`,kind:'permit_only' as const,permitZone:p.MAPID,priority:0,parsed:false,permissionComplete:false,
        days:null,startMinute:null,endMinute:null,sourceEditedAt,
        rawData:{...rawData,reason:'unresolved_signed_curb_schedule_vehicle_and_visitor_conditions'}}],
    };
  });
  return {sourceEditedAt,places};
}

export async function fetchVancouverPermitZones(signal: AbortSignal, request: typeof fetch = fetch) {
  const read = async (suffix: string, params: Record<string,string>) => {
    const url = new URL(`${VANCOUVER_PERMIT_ENDPOINT}${suffix}`);
    url.search = new URLSearchParams(params).toString();
    const response = await request(url,{signal});
    if (!response.ok) throw new Error('Permit retrieval failed');
    const data = object(await response.json());
    if (data.error || data.exceededTransferLimit) throw new Error('Permit format: incomplete response');
    return data;
  };
  const layer = await read('',{f:'json'});
  const edited = validateLayer(layer);
  const ids = await read('/query',{where:'1=1',returnIdsOnly:'true',f:'json'});
  if (!Array.isArray(ids.objectIds) || ids.objectIds.some(id => !Number.isSafeInteger(id) || id <= 0) || new Set(ids.objectIds).size !== ids.objectIds.length) throw new Error('Permit format: invalid ID list');
  const features: unknown[] = [];
  for (let offset=0; offset<ids.objectIds.length; offset+=200) {
    const pageIds: number[] = ids.objectIds.slice(offset,offset+200);
    const page = await read('/query',{objectIds:pageIds.join(','),outFields:['OBJECTID',...fields].join(','),outSR:'4326',f:'geojson'});
    adaptVancouverPermitZones(layer,page);
    const rows = page.features as unknown[];
    const received = rows.map(row => object(object(row).properties).OBJECTID);
    if (received.length !== pageIds.length || new Set(received).size !== pageIds.length || received.some(id => !pageIds.includes(Number(id)))) throw new Error('Permit format: incomplete ID page');
    features.push(...rows);
  }
  if (validateLayer(await read('',{f:'json'})) !== edited) throw new Error('Permit format: source changed during retrieval');
  return {complete:true as const,...adaptVancouverPermitZones(layer,{type:'FeatureCollection',features})};
}

// Deliberately unregistered: no real source approval or Coverage is established.
export const vancouverPermitAdapter: SourceAdapter = {
  sourceKey:'vancouver-permit-zones',area:'Vancouver',evidenceType:'E4',
  fetchSnapshot:signal => fetchVancouverPermitZones(signal),
};
