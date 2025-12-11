"use server";

import { query } from "@/lib/db";

export type CoverageResult = {
  isCovered: boolean;
  city?: {
    name: string;
    country: string;
  };
};

export async function checkCoverage(lat: number, lng: number): Promise<CoverageResult> {
  try {
    // Check if the point is within any active covered city polygon
    const result = await query(
      `
      SELECT city_name, country 
      FROM covered_cities 
      WHERE is_active = true 
      AND ST_Intersects(bounds, ST_SetSRID(ST_MakePoint($1, $2), 4326))
      LIMIT 1
      `,
      [lng, lat] // PostGIS uses (x, y) -> (lng, lat)
    );

    if (result.rows.length > 0) {
      return {
        isCovered: true,
        city: {
          name: result.rows[0].city_name,
          country: result.rows[0].country,
        },
      };
    }

    return { isCovered: false };
  } catch (error) {
    console.error("Error checking coverage:", error);
    // Fail open or closed? If DB fails, maybe say not covered to avoid bad UX or just throw? 
    // Let's return false for now but log it.
    return { isCovered: false };
  }
}
