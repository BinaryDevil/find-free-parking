// ADR-0001 No Restriction Found rule 5: the miss-rate bound and the
// measurement gate, shared by the measurement tool (scripts/nrf-measure.ts),
// the map and the city page. Browser-safe.
import type { NrfMeasurement } from './no-restriction-found.ts';

export const CONFIDENCE = 0.95;
export const MIN_SAMPLE = 30;
// The owner's maximum acceptable bound (set 2026-10-28). A pre-registration may
// set a stricter one; no measurement whose bound is above this enables the label.
export const MAX_UPPER_BOUND = 0.1;

function lnChoose(n: number, k: number) {
  let total = 0;
  for (let i = 1; i <= k; i++) total += Math.log(n - k + i) - Math.log(i);
  return total;
}
export function binomialCdf(x: number, n: number, p: number) {
  if (p <= 0) return 1;
  if (p >= 1) return x >= n ? 1 : 0;
  let total = 0;
  for (let i = 0; i <= x; i++) total += Math.exp(lnChoose(n, i) + i * Math.log(p) + (n - i) * Math.log(1 - p));
  return Math.min(1, total);
}
// Exact one-sided upper bound: the p at which seeing x or fewer misses has probability 1 - confidence.
export function clopperPearsonUpper(x: number, n: number, confidence = CONFIDENCE) {
  if (!Number.isInteger(n) || n < 1 || !Number.isInteger(x) || x < 0 || x > n) throw new Error(`invalid count ${x}/${n}`);
  if (x === n) return 1;
  const alpha = 1 - confidence;
  let low = x / n, high = 1;
  for (let i = 0; i < 200; i++) {
    const mid = (low + high) / 2;
    if (binomialCdf(x, n, mid) > alpha) low = mid; else high = mid;
  }
  return high;
}

// "up to about 1 in N" must never understate the bound, so N rounds down
// (14.9% -> 1 in 6). The ADR's "1 in 7" example is illustrative.
export function oneIn(bound: number) {
  return Math.max(1, Math.floor(1 / bound));
}

// Only a passed measurement enables the label. A failed (including a hard
// block), unthresholded, too-small or over-the-maximum measurement keeps it dark.
export function validMeasurement(measurement: NrfMeasurement | null | undefined): measurement is NrfMeasurement {
  return !!measurement && measurement.verdict === 'pass' && Number.isInteger(measurement.sampled) && measurement.sampled >= MIN_SAMPLE &&
    Number.isInteger(measurement.misses) && measurement.misses >= 0 && measurement.misses <= measurement.sampled &&
    typeof measurement.checkedAgainst === 'string' && measurement.checkedAgainst.trim() !== '' &&
    // The bound is never below the observed rate, so this cheap check skips the search for large failing counts.
    measurement.misses / measurement.sampled <= MAX_UPPER_BOUND && clopperPearsonUpper(measurement.misses, measurement.sampled) <= MAX_UPPER_BOUND;
}
