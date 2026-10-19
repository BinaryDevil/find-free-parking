import type { ParkingQuery } from './classified-places.ts';

// Retained rows stay available to old deployments. Only readers that understand
// the additive archive manifest apply the serving switch; staleness never undoes it.
export async function legacyServingSql(query: ParkingQuery, table: string, alias = table): Promise<string> {
  if (!['parking_meters', 'street_segments', 'parking_zones'].includes(table) || !/^[a-z_]+$/.test(alias)) {
    throw new Error('Invalid legacy reader');
  }
  const { rows } = await query(`SELECT
    to_regclass('public.legacy_retirement_members') IS NOT NULL AND
      to_regclass('public.legacy_retirements') IS NOT NULL AS ready,
    (to_regclass('public.legacy_retirement_members') IS NULL) <>
      (to_regclass('public.legacy_retirements') IS NULL) AS partial`, []);
  if (rows[0]?.partial) throw new Error('Incomplete archive schema');
  if (!rows[0]?.ready) return '';
  return ` AND NOT EXISTS (
    SELECT 1 FROM public.legacy_retirement_members m
    JOIN public.legacy_retirements r ON r.id = m.retirement_id
    WHERE m.place_table = '${table}' AND m.place_id = ${alias}.id
      AND r.reversed_at IS NULL
  )`;
}
