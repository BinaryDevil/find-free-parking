"use server";

import { query } from '../../lib/db';
import { coverageAt } from '../../lib/coverage';

export type CoverageResult = { isCovered: boolean; level: 'full' | 'partial' | 'none' };

export async function checkCoverage(lng: number, lat: number): Promise<CoverageResult> {
  if (!Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lng) > 180 || Math.abs(lat) > 90) {
    return { isCovered: false, level: 'none' };
  }
  const result = await coverageAt(query, [lng, lat, lng, lat]);
  return { isCovered: result.areas.length > 0, level: result.areas.some(area => area.level === 'full') ? 'full' : result.level };
}
