import type { ParkingQuery } from './classified-places.ts';

// City-page line (#136, ADR-0001 amendment rule 6): shown only when the
// area's latest register version is approved by two distinct agents and has a
// passed measurement (rules 3 and 5). A later unmeasured version turns it off.
export async function noRestrictionFoundEnabled(query: ParkingQuery, areaId: string) {
  const ready = await query("SELECT to_regclass('public.restriction_registers') IS NOT NULL AS ready", []);
  if (!ready.rows[0]?.ready) return false;
  const { rows } = await query(`
    SELECT approval_state, approved_by, approval_refs, measurement_ref FROM public.restriction_registers
    WHERE area_id = $1 ORDER BY version DESC LIMIT 1
  `, [areaId]);
  const register = rows[0];
  const twoDistinct = (values: unknown) => Array.isArray(values) &&
    new Set(values.map(value => String(value).trim()).filter(Boolean)).size >= 2;
  return !!register && register.approval_state === 'approved' && twoDistinct(register.approved_by) &&
    twoDistinct(register.approval_refs) && String(register.measurement_ref ?? '').trim() !== '';
}
