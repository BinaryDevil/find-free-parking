import type { Feature, Geometry } from 'geojson';
import { evaluateParkingRules, type ParkingRule, type PlaceKind } from './parking-rules.ts';
import type { ParkingSelection } from './parking-selection.ts';
import { driverWarningsSql } from './driver-warnings.ts';

export type ParkingQuery = (sql: string, params: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;

// IDs come exclusively from the server's approved Coverage resolver. An empty
// gate does not query new tables, keeping pre-migration deployments compatible.
export async function classifiedPlaces(query: ParkingQuery, placeIds: string[], bounds: number[], selection: ParkingSelection, now: Date): Promise<Feature[]> {
  if (!placeIds.length) return [];
  const { rows } = await query(`
    SELECT p.id, p.kind, p.city, p.name, p.timezone, ST_AsGeoJSON(p.geom)::json AS geometry,
      ${driverWarningsSql('PLACE')},
      COALESCE(jsonb_agg(jsonb_build_object(
        'id', r.id, 'kind', r.kind, 'days', r.days, 'startMinute', r.start_minute, 'endMinute', r.end_minute,
        'timeLimitMinutes', r.time_limit_minutes, 'rate', r.rate, 'vehicleType', r.vehicle_type,
        'permitZone', r.permit_zone, 'visitorAllowanceMinutes', r.visitor_allowance_minutes, 'priority', r.priority,
        'sourceRecordId', r.source_record_id, 'fetchedAt', r.fetched_at, 'sourceEditedAt', r.source_edited_at,
        'parsed', r.parsed, 'permissionComplete', r.permission_complete, 'validFrom', r.valid_from, 'validUntil', r.valid_until,
        'source', jsonb_build_object('id', e.id, 'name', e.publisher, 'evidenceType', e.evidence_type,
          'approvalState', e.approval_state, 'freshnessMinutes', extract(epoch from e.freshness_limit)/60,
          'lastSyncAt', sync.finished_at, 'formatValid', COALESCE(sync.status = 'succeeded' AND sync.format_check_passed, false))
      ) ORDER BY r.id) FILTER (WHERE r.id IS NOT NULL), '[]'::jsonb) AS rules
    FROM public.places p
    LEFT JOIN public.parking_rules r ON r.place_id = p.id
    LEFT JOIN public.evidence_sources e ON e.id = r.source_id
    LEFT JOIN LATERAL (
      SELECT finished_at, status, format_check_passed FROM public.source_syncs
      WHERE source_id = e.id ORDER BY started_at DESC, id DESC LIMIT 1
    ) sync ON true
    WHERE p.id = ANY($5::uuid[]) AND ST_Intersects(p.geom, ST_MakeEnvelope($1,$2,$3,$4,4326))
    GROUP BY p.id LIMIT 1000
  `, [...bounds, placeIds]);
  return rows.map(row => ({
    type: 'Feature', geometry: row.geometry as Geometry,
    properties: { id: row.id, kind: row.kind, city: row.city, name: row.name,
      evaluation: evaluateParkingRules({ rules: row.rules as ParkingRule[], instant: selection.instant, now,
        timeZone: String(row.timezone), placeKind: row.kind as PlaceKind, context: selection.context,
        driverWarnings: row.driver_warnings as unknown[] }),
    },
  }));
}
