import type { RuleEvaluation } from '../../lib/parking-rules.ts';
import type { Band, NrfMeasurement, NrfVariant } from '../../lib/no-restriction-found.ts';

// Presentation of the ADR-0001 No Restriction Found amendment (#136). The
// label is never free parking; it shows only with its passed measurement.

export const NRF = 'NO_RESTRICTION_FOUND';
type Translate = (key: string, values?: Record<string, string | number>) => string;
export type PopupLine = { role: 'title' | 'text' | 'heading' | 'item' | 'note'; text: string };

const variantKeys: Record<NrfVariant, string> = {
  no_limit: 'noRestrictionFound.noLimit', limit_fits: 'noRestrictionFound.limitFits',
  no_payment_source: 'noRestrictionFound.noPaymentSource', limit_no_payment_source: 'noRestrictionFound.limitNoPaymentSource',
};

export function validMeasurement(measurement: NrfMeasurement | undefined): measurement is NrfMeasurement {
  return !!measurement && Number.isInteger(measurement.sampled) && measurement.sampled >= 30 &&
    Number.isInteger(measurement.misses) && measurement.misses >= 0 && measurement.misses <= measurement.sampled &&
    typeof measurement.checkedAgainst === 'string' && measurement.checkedAgainst.trim() !== '';
}

// Map class for a server evaluation. "Unmeasured is never an enabled state"
// (rule 5), so a label without a passed check or measurement shows Unknown.
export function displayClassification(evaluation: RuleEvaluation) {
  if (evaluation.classification === 'VERIFIED_FREE') return 'FREE';
  if (evaluation.classification !== NRF) return evaluation.classification;
  const check = evaluation.noRestrictionFound;
  return check?.classification === NRF && check.notVerified === true && check.variant in variantKeys &&
    validMeasurement(evaluation.noRestrictionFoundMeasurement) ? NRF : 'UNKNOWN';
}

// Exact one-sided 95% Clopper-Pearson upper bound on the miss rate.
export function missUpperBound(sampled: number, misses: number, confidence = 0.95) {
  if (misses >= sampled) return 1;
  const alpha = 1 - confidence;
  const cdf = (p: number) => {
    let logTerm = sampled * Math.log1p(-p);
    let sum = Math.exp(logTerm);
    for (let i = 0; i < misses; i++) {
      logTerm += Math.log((sampled - i) / (i + 1)) + Math.log(p) - Math.log1p(-p);
      sum += Math.exp(logTerm);
    }
    return sum;
  };
  let low = 0, high = 1;
  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2;
    if (cdf(mid) > alpha) low = mid; else high = mid;
  }
  return high;
}

const clock = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
function bandText(band: Band, locale: string) {
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' });
  // 2026-01-04 is a Sunday; band days are 0 (Sunday) to 6.
  const days = band.days.map(day => weekday.format(new Date(Date.UTC(2026, 0, 4 + day)))).join(', ');
  return `${days} ${clock(band.startMinute)}–${clock(band.endMinute)}`;
}

export function noRestrictionFoundPopupLines(evaluation: RuleEvaluation, t: Translate, locale: string): PopupLine[] {
  const check = evaluation.noRestrictionFound;
  const measurement = evaluation.noRestrictionFoundMeasurement;
  if (displayClassification(evaluation) !== NRF || check?.classification !== NRF || !validMeasurement(measurement)) return [];
  const list = new Intl.ListFormat(locale, { type: 'conjunction' });
  const limit = check.limits.map(entry => t('noRestrictionFound.limitValue',
    { minutes: entry.minutes, hours: entry.bands.map(band => bandText(band, locale)).join('; ') })).join('; ');
  const lines: PopupLine[] = [
    { role: 'title', text: t('noRestrictionFound.legend') },
    { role: 'text', text: t(variantKeys[check.variant], { limit }) },
  ];
  if (check.stayAssumed) lines.push({ role: 'note', text: t('noRestrictionFound.stayAssumed', { minutes: check.stayMinutes }) });
  lines.push({ role: 'heading', text: t('noRestrictionFound.sourcesChecked') });
  for (const source of check.sourcesChecked) {
    const date = new Date(source.asOf ?? '');
    lines.push({ role: 'item', text: t('noRestrictionFound.sourceAsOf', { name: source.name,
      date: Number.isFinite(date.getTime()) ? date.toLocaleDateString(locale) : t('unknown') }) });
  }
  if (check.missingCategories.length) {
    lines.push({ role: 'text', text: t('noRestrictionFound.missingCategories',
      { categories: list.format(check.missingCategories.map(category => t(`noRestrictionFound.categories.${category}`))) }) });
  }
  lines.push({ role: 'text', text: t('noRestrictionFound.measurement', {
    sampled: measurement.sampled, signal: measurement.checkedAgainst, misses: measurement.misses,
    oneIn: Math.max(1, Math.round(1 / missUpperBound(measurement.sampled, measurement.misses))),
  }) });
  return lines;
}
