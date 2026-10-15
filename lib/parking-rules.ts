import { ruleClock } from './rule-clock.ts';

export type RuleKind = 'no_stopping' | 'tow_away' | 'no_parking' | 'loading' | 'temporary_no_parking' | 'permit_only' | 'paid' | 'free';
export type RuleClassification = 'VERIFIED_FREE' | 'PAID' | 'RESTRICTED' | 'UNKNOWN';

export interface RuleSource {
  id: string;
  name: string;
  evidenceType: string;
  approvalState: string;
  lastSyncAt: string | null;
  formatValid: boolean;
  freshnessMinutes: number;
}

export interface ParkingRule {
  id: string;
  kind: RuleKind;
  days: number[];
  startMinute: number;
  endMinute: number;
  timeLimitMinutes?: number | null;
  rate?: number | null;
  vehicleType?: string | null;
  permitZone?: string | null;
  visitorAllowanceMinutes?: number | null;
  priority: number;
  source: RuleSource;
  sourceRecordId: string;
  fetchedAt: string | null;
  sourceEditedAt?: string | null;
  parsed: boolean;
  permissionComplete?: boolean;
  validFrom?: string | null;
  validUntil?: string | null;
}

export interface ParkingContext {
  stayMinutes?: number;
  vehicleType?: string;
}

export interface RuleEvaluation {
  classification: RuleClassification;
  explanation: string;
  timeLimitMinutes: number | null;
  rate: number | null;
  nextChange: string | null;
  activeRules: string[];
  source: RuleSource | null;
  asOf: string | null;
  driverWarnings: unknown[];
}

const precedence: Record<RuleKind, number> = {
  no_stopping: 0, tow_away: 0, no_parking: 1, loading: 1,
  temporary_no_parking: 2, permit_only: 3, paid: 4, free: 5,
};

function isActive(rule: ParkingRule, ms: number, clock: ReturnType<typeof ruleClock>) {
  if (rule.validFrom && ms < Date.parse(rule.validFrom)) return false;
  if (rule.validUntil && ms >= Date.parse(rule.validUntil)) return false;
  const { day, minute } = clock.read(ms);
  if (rule.endMinute > rule.startMinute) {
    return rule.days.includes(day) && minute >= rule.startMinute && minute < rule.endMinute;
  }
  return (rule.days.includes(day) && minute >= rule.startMinute) ||
    (rule.days.includes((day + 6) % 7) && minute < rule.endMinute);
}

function validRule(rule: ParkingRule) {
  return rule.kind in precedence && rule.parsed && rule.sourceRecordId.trim() !== '' &&
    rule.days.length > 0 && rule.days.every(day => Number.isInteger(day) && day >= 0 && day <= 6) &&
    Number.isInteger(rule.startMinute) && rule.startMinute >= 0 && rule.startMinute < 1440 &&
    Number.isInteger(rule.endMinute) && rule.endMinute >= 0 && rule.endMinute <= 1440 &&
    rule.startMinute !== rule.endMinute && Number.isInteger(rule.priority) &&
    [rule.timeLimitMinutes, rule.visitorAllowanceMinutes].every(value => value == null || (Number.isInteger(value) && value > 0)) &&
    (rule.kind !== 'paid' || (typeof rule.rate === 'number' && Number.isFinite(rule.rate) && rule.rate > 0)) &&
    (!rule.validFrom || Number.isFinite(Date.parse(rule.validFrom))) &&
    (!rule.validUntil || Number.isFinite(Date.parse(rule.validUntil))) &&
    (!rule.validFrom || !rule.validUntil || Date.parse(rule.validFrom) < Date.parse(rule.validUntil));
}

function sourceExpiry(rule: ParkingRule) {
  const policyMinutes = rule.source.evidenceType === 'E5' ? 1440 : 10080;
  return Math.min(Date.parse(rule.source.lastSyncAt ?? ''), Date.parse(rule.fetchedAt ?? '')) +
    Math.min(policyMinutes, rule.source.freshnessMinutes) * 60000;
}

export function evaluateParkingRules(input: {
  rules: ParkingRule[];
  instant: Date;
  now: Date;
  timeZone: string;
  context: ParkingContext;
  driverWarnings?: unknown[];
}): RuleEvaluation {
  const unknown = (explanation: string): RuleEvaluation => ({
    classification: 'UNKNOWN', explanation, timeLimitMinutes: null, rate: null,
    nextChange: null, activeRules: [], source: null, asOf: null, driverWarnings: input.driverWarnings ?? [],
  });
  const start = input.instant.getTime();
  const now = input.now.getTime();
  const stay = input.context.stayMinutes ?? 0;
  if (!Number.isFinite(start) || !Number.isFinite(now) || !Number.isInteger(stay) || stay < 0 || stay > 10080) return unknown('invalid_context');
  let clock: ReturnType<typeof ruleClock>;
  try { clock = ruleClock(input.timeZone); } catch { return unknown('invalid_timezone'); }
  if (input.rules.some(rule => !validRule(rule))) return unknown('unparsed_rule');
  if (input.rules.some(rule => (rule.kind === 'free' && ['E4','E5'].includes(rule.source.evidenceType)) ||
    (rule.source.evidenceType === 'E5' && rule.kind !== 'temporary_no_parking'))) return unknown('unsupported_evidence');
  if (input.rules.some(rule => rule.kind === 'free' && ['E2','E3'].includes(rule.source.evidenceType) && rule.permissionComplete !== true)) return unknown('incomplete_permission');
  if (input.rules.some(rule => rule.source.approvalState !== 'approved' ||
    !['E1','E2','E3','E4','E5','E6'].includes(rule.source.evidenceType) || !rule.source.formatValid ||
    !Number.isFinite(sourceExpiry(rule)) || rule.source.freshnessMinutes <= 0 ||
    Date.parse(rule.source.lastSyncAt ?? '') > now || Date.parse(rule.fetchedAt ?? '') > now || sourceExpiry(rule) <= now)) return unknown('unverified_source');

  const at = (ms: number): RuleEvaluation => {
    if (input.rules.some(rule => sourceExpiry(rule) <= ms)) return unknown('stale_source');
    const active = input.rules.filter(rule => isActive(rule, ms, clock))
      .sort((a, b) => precedence[a.kind] - precedence[b.kind] || b.priority - a.priority || a.id.localeCompare(b.id));
    const winner = active[0];
    if (!winner) return unknown('no_rule');
    // Equal-precedence conflicting permission/rates cannot be resolved by ID.
    const peers = active.filter(rule => precedence[rule.kind] === precedence[winner.kind] && rule.priority === winner.priority);
    if (peers.some(rule => rule.rate !== winner.rate || rule.vehicleType !== winner.vehicleType || rule.visitorAllowanceMinutes !== winner.visitorAllowanceMinutes)) return unknown('conflicting_rules');
    const limits = active.flatMap(rule => [rule.timeLimitMinutes, rule.kind === 'permit_only' ? rule.visitorAllowanceMinutes : null]).filter((value): value is number => value != null);
    const limit = limits.length ? Math.min(...limits) : null;
    let classification: RuleClassification = winner.kind === 'free' ? 'VERIFIED_FREE' : winner.kind === 'paid' ? 'PAID' : 'RESTRICTED';
    let explanation: string = winner.kind;
    if (winner.kind === 'permit_only' && winner.visitorAllowanceMinutes != null) {
      const payment = active.find(rule => rule.kind === 'paid');
      classification = payment ? 'PAID' : 'VERIFIED_FREE';
      if (payment) explanation = 'paid';
    }
    if (active.some(rule => rule.vehicleType && rule.vehicleType !== (input.context.vehicleType ?? 'car'))) {
      classification = 'RESTRICTED'; explanation = 'vehicle_condition';
    } else if (limit != null && stay > limit) {
      classification = 'RESTRICTED'; explanation = 'stay_exceeds_limit';
    }
    return {
      classification, explanation, timeLimitMinutes: limit,
      rate: classification === 'PAID' ? active.find(rule => rule.kind === 'paid')?.rate ?? null : null,
      nextChange: null, activeRules: active.map(rule => rule.id), source: winner.source,
      asOf: winner.fetchedAt, driverWarnings: input.driverWarnings ?? [],
    };
  };
  const end = start + Math.max(8 * 1440, stay) * 60000;
  const boundaries = clock.boundaries(start, end, [...new Set([0, ...input.rules.flatMap(rule => [rule.startMinute, rule.endMinute])])]);
  for (const rule of input.rules) {
    for (const boundary of [rule.validFrom ? Date.parse(rule.validFrom) : NaN, rule.validUntil ? Date.parse(rule.validUntil) : NaN, sourceExpiry(rule)]) {
      if (boundary > start && boundary <= end) boundaries.push(boundary);
    }
  }
  boundaries.sort((a, b) => a - b);
  const result = at(start);
  const signature = (value: RuleEvaluation) => JSON.stringify([value.classification, value.explanation, value.timeLimitMinutes, value.rate, value.activeRules]);
  const next = boundaries.find(ms => signature(at(ms)) !== signature(result));
  result.nextChange = next == null ? null : new Date(next).toISOString();
  if (result.classification === 'VERIFIED_FREE') {
    const unsafe = boundaries.find(ms => ms < start + stay * 60000 && at(ms).classification !== 'VERIFIED_FREE');
    if (unsafe != null) {
      result.classification = at(unsafe).classification === 'UNKNOWN' ? 'UNKNOWN' : 'RESTRICTED';
      result.explanation = 'stay_crosses_change';
    }
  }
  return result;
}
