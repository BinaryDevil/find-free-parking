import type { ParkingQuery } from './classified-places.ts';
import type { NrfMeasurement, RestrictionCategory } from './no-restriction-found.ts';
import { validMeasurement } from './nrf-bound.ts';

// What the city page shows with its No Restriction Found line (rules 3, 5, 6):
// the passed measurement (miss count, bound, what was checked) and the
// categories no source records in the area.
export interface NrfCitySummary { measurement: NrfMeasurement; missingCategories: RestrictionCategory[] }

// Rules 3 and 5: the area's latest register version is approved by two
// distinct agents and has a measurement reference. A later unmeasured version
// turns it off.
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

// The city page shows its line only with a summary whose measurement passed
// (a measurement_ref alone does not say the run passed) and an enabled
// register. Without both it stays dark.
export async function cityNoRestrictionFound(query: ParkingQuery, areaId: string, summary: NrfCitySummary | null) {
  if (!summary || !validMeasurement(summary.measurement)) return null;
  return await noRestrictionFoundEnabled(query, areaId) ? summary : null;
}
