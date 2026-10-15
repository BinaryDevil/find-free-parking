import type { Feature } from 'geojson';
import type { RuleEvaluation } from '../../lib/parking-rules.ts';

export function parkingSelectionParams(instant: Date) {
  return new URLSearchParams({ at: instant.toISOString(), legacyTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
}

// Presentation only: consume the server's decision; never inspect schedules,
// source approvals, rates or Driver Warnings to decide parking permission.
export function classifiedMapFeatures(features: Feature[], view: 'FREE' | 'PAID') {
  const rendered = features.map(feature => {
    const evaluation = feature.properties?.evaluation as RuleEvaluation;
    const classification = evaluation.classification === 'VERIFIED_FREE' ? 'FREE' : evaluation.classification;
    return { ...feature, properties: { ...feature.properties, classification,
      evaluation: JSON.stringify(evaluation), timeLimitMinutes: evaluation.timeLimitMinutes,
      rate: evaluation.rate, driver_warnings: JSON.stringify(evaluation.driverWarnings),
    } };
  }).filter(feature => feature.properties.classification === view || ['UNKNOWN','RESTRICTED'].includes(feature.properties.classification));
  const points = rendered.filter(feature => feature.geometry.type === 'Point');
  const lines = rendered.filter(feature => ['LineString','MultiLineString'].includes(feature.geometry.type));
  const polygons = rendered.filter(feature => ['Polygon','MultiPolygon'].includes(feature.geometry.type));
  const count = (items: typeof rendered) => items.filter(feature => feature.properties.classification === view).length;
  return { points, lines, polygons, pointCount: count(points), lineCount: count(lines), polygonCount: count(polygons),
    unknownCount: rendered.filter(feature => feature.properties.classification === 'UNKNOWN').length };
}
