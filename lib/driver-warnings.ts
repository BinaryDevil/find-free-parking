// Only fixed table identifiers are accepted; request values stay in SQL parameters.
export function driverWarningsSql(target: 'METER' | 'STREET' | 'ZONE' | 'PLACE') {
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
