"use server";

export type CoverageResult = { isCovered: boolean };

export async function checkCoverage(): Promise<CoverageResult> {
  // No approved runtime Evidence Sources exist yet. City polygons and legacy
  // parking rows cannot establish Coverage. Computed Coverage belongs to #12.
  return { isCovered: false };
}
