import { isScheduleActive } from './schedule.ts';

export type ParkingClassification = 'FREE' | 'PAID' | 'UNKNOWN';

export interface LegacyParkingData {
  schedules?: unknown;
  street_use?: string;
  meter_infos?: unknown;
  report_counts?: unknown;
  type?: string;
  source?: string | null;
  verified?: boolean;
  metadata?: unknown;
}

// Legacy rows cannot prove complete, current permission to park for free.
// PAID only means payment is listed, not that parking is permitted or rates are current.
// The city-timezone evidence evaluator belongs to #11.
export function classifyParking(
  kind: 'METER' | 'STREET' | 'ZONE',
  data: LegacyParkingData,
  time: Date,
): ParkingClassification {
  if (kind === 'METER' && Array.isArray(data.schedules)) {
    const paidRules = data.schedules.filter((rule) =>
      rule && typeof rule === 'object' &&
      Array.isArray(rule.days) && rule.days.length > 0 &&
      rule.days.every((day: unknown) => typeof day === 'string' &&
        ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].includes(day)) &&
      typeof rule.start === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(rule.start) &&
      typeof rule.end === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(rule.end) &&
      rule.start !== rule.end &&
      (typeof rule.rate === 'number' || typeof rule.rate === 'string') &&
      Number.isFinite(Number(rule.rate)) && Number(rule.rate) > 0
    );
    if (isScheduleActive(paidRules, time)) return 'PAID';
  }
  return 'UNKNOWN';
}

// Unknown context remains visible in both views without being counted as free or paid.
export function isVisibleInParkingView(classification: ParkingClassification, view: 'FREE' | 'PAID') {
  return classification === 'UNKNOWN' || classification === view;
}
