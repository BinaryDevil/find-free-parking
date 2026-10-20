import type { ParkingQuery } from './classified-places.ts';

// Readiness is checked per request: a later additive rollout becomes visible
// without caching absence. Permission and query errors still fail normally.
export async function driverWarningsReady(query: ParkingQuery) {
  const { rows } = await query("SELECT to_regclass('public.driver_warnings') IS NOT NULL AS ready", []);
  return rows[0]?.ready === true;
}

// Only fixed table identifiers are accepted; request values stay in SQL parameters.
export function driverWarningsSql(target: 'METER' | 'STREET' | 'ZONE' | 'PLACE', ready = true) {
  // No aggregate evidence is available before rollout. Never read private
  // reports or treat legacy undated counts as a substitute.
  if (!ready) return "'[]'::jsonb AS driver_warnings";
  const table = { METER: 'parking_meters', STREET: 's', ZONE: 'parking_zones', PLACE: 'p' }[target];
  // Rule-backed places use the same report target kinds as their map controls.
  const targetType = target === 'PLACE'
    ? "CASE WHEN p.kind = 'curb' THEN 'STREET' WHEN p.kind = 'meter' THEN 'METER' ELSE 'ZONE' END::public.target_type"
    : `'${target}'::public.target_type`;
  return `(
    SELECT COALESCE(jsonb_agg(jsonb_build_object('status', w.status, 'count', w.count, 'latest_at', w.latest_at)
      ORDER BY w.latest_at DESC, w.status), '[]'::jsonb)
    FROM (
      SELECT status, count, latest_at FROM public.driver_warnings
      WHERE target_id = ${table}.id AND target_type = ${targetType}
    ) w
  ) AS driver_warnings`;
}
