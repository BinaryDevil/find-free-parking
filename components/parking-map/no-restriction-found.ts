import type { RuleEvaluation } from '../../lib/parking-rules.ts';
import type { Band, NrfMeasurement, NrfVariant, RestrictionCategory } from '../../lib/no-restriction-found.ts';
import { clopperPearsonUpper, oneIn, validMeasurement } from '../../lib/nrf-bound.ts';

// Presentation of the ADR-0001 No Restriction Found amendment (#136). The
// label is never free parking; it shows only with its passed measurement.

export const NRF = 'NO_RESTRICTION_FOUND';
type Translate = (key: string, values?: Record<string, string | number>) => string;
export type PopupLine = { role: 'title' | 'text' | 'heading' | 'item' | 'note'; text: string };

const variantKeys: Record<NrfVariant, string> = {
  no_limit: 'noRestrictionFound.noLimit', limit_fits: 'noRestrictionFound.limitFits',
  no_payment_source: 'noRestrictionFound.noPaymentSource', limit_no_payment_source: 'noRestrictionFound.limitNoPaymentSource',
};

// Map class for a server evaluation. "Unmeasured is never an enabled state"
// (rule 5), so a label without a passed check or measurement shows Unknown.
export function displayClassification(evaluation: RuleEvaluation) {
  if (evaluation.classification === 'VERIFIED_FREE') return 'FREE';
  if (evaluation.classification !== NRF) return evaluation.classification;
  const check = evaluation.noRestrictionFound;
  return check?.classification === NRF && check.notVerified === true && check.variant in variantKeys &&
    validMeasurement(evaluation.noRestrictionFoundMeasurement) ? NRF : 'UNKNOWN';
}

// Rule 5 sentence, shared by the popup and the city page. N rounds down so
// the miss rate is never understated (lib/nrf-bound.ts, as in #143's tool).
export function measurementText(measurement: NrfMeasurement, t: Translate) {
  return t('noRestrictionFound.measurement', { sampled: measurement.sampled, signal: measurement.checkedAgainst,
    misses: measurement.misses, oneIn: oneIn(clopperPearsonUpper(measurement.misses, measurement.sampled)) });
}

// Rule 3: categories that no source records here.
export function missingCategoriesText(categories: RestrictionCategory[], t: Translate, locale: string) {
  if (!categories.length) return null;
  const list = new Intl.ListFormat(locale, { type: 'conjunction' });
  return t('noRestrictionFound.missingCategories',
    { categories: list.format(categories.map(category => t(`noRestrictionFound.categories.${category}`))) });
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
  const limit = check.limits.map(entry => t('noRestrictionFound.limitValue',
    { minutes: entry.minutes, hours: entry.bands.map(band => bandText(band, locale)).join('; ') })).join('; ');
  const lines: PopupLine[] = [
    { role: 'title', text: t('noRestrictionFound.legend') },
    { role: 'text', text: t(variantKeys[check.variant], { limit }) },
  ];
  if (check.stayAssumed) lines.push({ role: 'note', text: t('noRestrictionFound.stayAssumed', { minutes: check.stayMinutes }) });
  // The miss rate comes before the long lists so it is visible on a phone.
  lines.push({ role: 'text', text: measurementText(measurement, t) });
  lines.push({ role: 'heading', text: t('noRestrictionFound.sourcesChecked') });
  for (const source of check.sourcesChecked) {
    const date = new Date(source.asOf ?? '');
    lines.push({ role: 'item', text: t('noRestrictionFound.sourceAsOf', { name: source.name,
      date: Number.isFinite(date.getTime()) ? date.toLocaleDateString(locale) : t('unknown') }) });
  }
  const missing = missingCategoriesText(check.missingCategories, t, locale);
  if (missing) lines.push({ role: 'text', text: missing });
  return lines;
}
