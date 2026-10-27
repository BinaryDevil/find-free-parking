import type { Feature } from 'geojson';
import type { RuleEvaluation } from '../../lib/parking-rules.ts';
import { displayClassification, NRF } from './no-restriction-found.ts';

export function parkingSelectionParams(instant: Date) {
  return new URLSearchParams({ at: instant.toISOString(), legacyTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
}

// Presentation only: consume the server's decision; never inspect schedules,
// source approvals, rates or Driver Warnings to decide parking permission.
// No Restriction Found places show only in the Free view, unless hidden by
// the toggle, and are counted apart from Verified Free.
export function classifiedMapFeatures(features: Feature[], view: 'FREE' | 'PAID', showNoRestrictionFound = true) {
  const all = features.map(feature => {
    const evaluation = feature.properties?.evaluation as RuleEvaluation;
    const classification = displayClassification(evaluation);
    return { ...feature, properties: { ...feature.properties, classification,
      evaluation: JSON.stringify(evaluation), timeLimitMinutes: evaluation.timeLimitMinutes,
      rate: evaluation.rate, driver_warnings: JSON.stringify(evaluation.driverWarnings),
    } };
  }).filter(feature => feature.properties.classification === view || ['UNKNOWN','RESTRICTED'].includes(feature.properties.classification) ||
    (view === 'FREE' && feature.properties.classification === NRF));
  const noRestrictionFoundAvailable = all.filter(feature => feature.properties.classification === NRF).length;
  const rendered = showNoRestrictionFound ? all : all.filter(feature => feature.properties.classification !== NRF);
  const points = rendered.filter(feature => feature.geometry.type === 'Point');
  const lines = rendered.filter(feature => ['LineString','MultiLineString'].includes(feature.geometry.type));
  const polygons = rendered.filter(feature => ['Polygon','MultiPolygon'].includes(feature.geometry.type));
  const count = (items: typeof rendered) => items.filter(feature => feature.properties.classification === view).length;
  return { points, lines, polygons, pointCount: count(points), lineCount: count(lines), polygonCount: count(polygons),
    unknownCount: rendered.filter(feature => feature.properties.classification === 'UNKNOWN').length,
    noRestrictionFoundCount: rendered.filter(feature => feature.properties.classification === NRF).length,
    noRestrictionFoundAvailable };
}

export interface FeatureCounts { meters: number; streets: number; zones: number; noRestrictionFound: number; unknown: number }

// Summary bar order: the view's own places first, then No Restriction Found
// (ranked below Verified Free), then Unknown.
export function summarySegments(counts: FeatureCounts) {
  const main = ([['spots', counts.meters], ['blocks', counts.streets], ['lots', counts.zones]] as const)
    .filter(([, count]) => count > 0).map(([key, count]) => ({ key, count }));
  return {
    main,
    extra: ([['noRestrictionFound.count', counts.noRestrictionFound], ['unknownCount', counts.unknown]] as const)
      .filter(([, count]) => count > 0).map(([key, count]) => ({ key, count })),
  };
}
