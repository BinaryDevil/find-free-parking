import { coverageAt } from './coverage.ts';
import type { ParkingQuery } from './classified-places.ts';

export async function approvedParkingPlaceIds(query: ParkingQuery, bounds: number[], now = new Date()): Promise<string[]> {
  const { areas } = await coverageAt(query, bounds, now);
  if (!areas.length) return [];
  const { rows } = await query(`
    SELECT DISTINCT p.id FROM public.places p
    JOIN public.coverage_areas a ON a.id = ANY($5::uuid[]) AND p.timezone = a.timezone
    JOIN public.coverage_area_sources l ON l.area_id = a.id AND l.source_id = p.source_id
    WHERE ST_Covers(CASE WHEN a.id = ANY($6::uuid[]) THEN a.geom ELSE a.subset_geom END, p.geom)
      AND ST_Intersects(p.geom, ST_MakeEnvelope($1,$2,$3,$4,4326))
      -- Do not discard unreviewed rules: one could be a restriction. Keep the
      -- whole place outside the gate unless every rule source is linked here.
      AND NOT EXISTS (
        SELECT 1 FROM public.parking_rules r WHERE r.place_id = p.id
          AND NOT EXISTS (
            SELECT 1 FROM public.coverage_area_sources required
            WHERE required.area_id = a.id AND required.source_id = r.source_id
          )
      )
    LIMIT 1000
  `, [...bounds, areas.map(area => area.id), areas.filter(area => area.level === 'full').map(area => area.id)]);
  return rows.map(row => String(row.id));
}
