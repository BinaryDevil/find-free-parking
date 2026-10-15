import type { ParkingContext } from './parking-rules.ts';

export interface ParkingSelection {
  instant: Date;
  context: ParkingContext;
  // Only the legacy interim payment display uses the viewer's timezone.
  legacyTimeZone: string;
}

export function parseParkingSelection(params: URLSearchParams, now = new Date()): ParkingSelection {
  const raw = params.get('at');
  // Require an absolute ISO instant, never a timezone-less wall clock.
  if (raw && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.test(raw)) throw new Error('Invalid selected instant');
  const instant = raw ? new Date(raw) : now;
  if (!Number.isFinite(instant.getTime())) throw new Error('Invalid selected instant');
  const stay = params.get('stayMinutes');
  const stayMinutes = stay === null ? 0 : Number(stay);
  if (!Number.isInteger(stayMinutes) || stayMinutes < 0 || stayMinutes > 10080 || stay?.trim() === '') throw new Error('Invalid stay duration');
  const vehicleType = params.get('vehicleType') ?? 'car';
  if (!['car','motorcycle','commercial','ev'].includes(vehicleType)) throw new Error('Invalid vehicle type');
  const legacyTimeZone = params.get('legacyTimeZone') ?? 'America/Vancouver';
  try { new Intl.DateTimeFormat('en-US', { timeZone: legacyTimeZone }); } catch { throw new Error('Invalid timezone'); }
  return { instant, context: { stayMinutes, vehicleType }, legacyTimeZone };
}
