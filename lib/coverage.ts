import type { ParkingQuery } from './classified-places.ts';

export type CoverageLevel = 'full' | 'partial' | 'none';
export interface CoverageSource {
  id: string;
  evidenceType: string;
  approvalState: string;
  lastSyncAt: string | null;
  formatValid: boolean;
  freshnessMinutes: number;
  coversArea: boolean;
}
export interface CoverageArea {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  level: CoverageLevel;
  declaredSubset: string | null;
  hasSubset: boolean;
  metersInRules: boolean;
  completeSigns: boolean;
  sources: CoverageSource[];
  center?: [number, number];
}

// The stored level is a reviewed ceiling, never evidence. Recompute at every
// read so a failed sync, revoked approval or elapsed freshness closes the gate.
export function computeCoverage(area: CoverageArea, now: Date) {
  const current = area.sources.filter(source => {
    const age = now.getTime() - Date.parse(source.lastSyncAt ?? '');
    const policyMinutes = source.evidenceType === 'E5' ? 1440 : 10080;
    return /^E[1-7]$/.test(source.evidenceType) && source.approvalState === 'approved' &&
      source.formatValid && Number.isFinite(age) && age >= 0 &&
      age <= Math.min(source.freshnessMinutes, policyMinutes) * 60000;
  });
  let level: CoverageLevel = 'none';
  const types = new Set(current.map(source => source.evidenceType));
  // Every linked source is required for the declared promise. Incomplete
  // dependencies must not silently narrow a published subset.
  if (area.level !== 'none' && current.length > 0 && current.length === area.sources.length) {
    const full = current.every(source => source.coversArea) &&
      (types.has('E1') || (types.has('E3') && area.completeSigns && types.has('E7'))) &&
      (area.metersInRules || types.has('E2')) && types.has('E4') && types.has('E5');
    if (area.level === 'full' && full) level = 'full';
    else if (area.hasSubset && area.declaredSubset?.trim() &&
      current.some(source => ['E1','E2','E3','E4','E6'].includes(source.evidenceType))) level = 'partial';
  }
  return { ...area, level, computedAt: now.toISOString(), approvedSourceIds: current.map(source => source.id) };
}

export type ComputedCoverage = ReturnType<typeof computeCoverage>;

export async function coverageAreas(query: ParkingQuery, now = new Date()): Promise<ComputedCoverage[]> {
  // Additive rollout: old deployments and an unapplied migration stay dark.
  const ready = await query("SELECT to_regclass('public.coverage_areas') IS NOT NULL AS ready", []);
  if (!ready.rows[0]?.ready) return [];
  const { rows } = await query(`
    SELECT a.id, a.name, a.slug, a.timezone, a.level, a.declared_subset AS "declaredSubset",
      a.subset_geom IS NOT NULL AS "hasSubset", a.meters_in_rules AS "metersInRules",
      a.complete_signs AS "completeSigns",
      jsonb_build_array(ST_X(ST_PointOnSurface(a.geom)), ST_Y(ST_PointOnSurface(a.geom))) AS center,
      COALESCE(jsonb_agg(jsonb_build_object('id', e.id, 'evidenceType', e.evidence_type,
        'approvalState', e.approval_state, 'freshnessMinutes', extract(epoch FROM e.freshness_limit)/60,
        'lastSyncAt', sync.finished_at, 'formatValid', COALESCE(sync.status = 'succeeded' AND sync.format_check_passed, false),
        'coversArea', l.covers_entire_area)
        ORDER BY e.id) FILTER (WHERE e.id IS NOT NULL), '[]'::jsonb) AS sources
    FROM public.coverage_areas a
    LEFT JOIN public.coverage_area_sources l ON l.area_id = a.id
    LEFT JOIN public.evidence_sources e ON e.id = l.source_id
    LEFT JOIN LATERAL (
      SELECT finished_at, status, format_check_passed FROM public.source_syncs
      WHERE source_id = e.id ORDER BY started_at DESC, id DESC LIMIT 1
    ) sync ON true
    GROUP BY a.id ORDER BY a.slug
  `, []);
  return rows.map(row => computeCoverage(row as unknown as CoverageArea, now));
}

export async function coverageAt(query: ParkingQuery, bounds: number[], now = new Date()) {
  const areas = (await coverageAreas(query, now)).filter(area => area.level !== 'none');
  if (!areas.length) return { level: 'none' as CoverageLevel, areas: [] as ComputedCoverage[] };
  const { rows } = await query(`SELECT id FROM public.coverage_areas
    WHERE id = ANY($5::uuid[]) AND ST_Intersects(
      CASE WHEN id = ANY($6::uuid[]) THEN geom ELSE subset_geom END,
      ST_MakeEnvelope($1,$2,$3,$4,4326))`, [...bounds, areas.map(area => area.id), areas.filter(area => area.level === 'full').map(area => area.id)]);
  const matching = areas.filter(area => rows.some(row => row.id === area.id));
  // A viewport intersecting an area is not a claim that its entire extent is covered.
  return { level: (matching.length ? 'partial' : 'none') as CoverageLevel, areas: matching };
}
