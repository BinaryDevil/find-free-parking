// Only fixed table identifiers are accepted; request values stay in SQL parameters.
export function driverWarningsSql(target: 'METER' | 'STREET' | 'ZONE') {
  const table = { METER: 'parking_meters', STREET: 's', ZONE: 'parking_zones' }[target];
  return `(
    SELECT COALESCE(jsonb_agg(w ORDER BY w.latest_at DESC), '[]'::jsonb)
    FROM (
      SELECT r.reported_status AS status, count(*)::int AS count, max(r.created_at) AS latest_at
      FROM reports r
      WHERE r.target_id = ${table}.id AND r.target_type = '${target}'
        AND r.created_at > now() - interval '90 days'
        AND r.reported_status IN ('FREE', 'PAID', 'NO_PARKING')
      GROUP BY r.reported_status
    ) w
  ) AS driver_warnings`;
}
