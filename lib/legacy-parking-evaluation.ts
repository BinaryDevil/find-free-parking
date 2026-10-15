import { classifyParking, type LegacyParkingData } from './parking-classification.ts';
import type { ParkingSelection } from './parking-selection.ts';
import type { RuleEvaluation } from './parking-rules.ts';

export function legacyParkingEvaluation(kind: 'METER' | 'STREET' | 'ZONE', data: LegacyParkingData & { driver_warnings?: unknown }, selection: ParkingSelection) {
  const classification = classifyParking(kind, data, selection.instant, selection.legacyTimeZone) === 'PAID' ? 'PAID' : 'UNKNOWN';
  const evaluation: RuleEvaluation = {
    classification, explanation: classification === 'PAID' ? 'legacy_payment_listed' : 'no_verified_rule',
    timeLimitMinutes: null, rate: null, nextChange: null, activeRules: [], source: null, asOf: null,
    driverWarnings: Array.isArray(data.driver_warnings) ? data.driver_warnings : [],
  };
  return { classification, evaluation };
}
