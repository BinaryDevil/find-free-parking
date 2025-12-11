---
description: Seed a new city with parking data
params:
  city: The name of the city to seed (e.g. "Burnaby", "Richmond")
---

1. **Research Data Source**:

   - search_web for "${city} open data parking meters API" or "${city} ArcGIS REST pay parking".
   - Look for specific "Parking Meters" (Points) or "Pay Parking Zones" (Lines) datasets.
   - **Goal**: Find a direct JSON/GeoJSON API URL.

2. **Fallback - Manual/Browser Download**:

   - If no API is found, search for "${city} open data portal" and browse for "Parking" datasets.
   - Use `browser_subagent` if necessary to navigate and locate a download link.
   - Download the file (GeoJSON preferred) to `sample_data/${city}_parking.geojson`.

3. **Develop Seeding Script**:

   - Create a new script `scripts/seed_${city_lowercase}.ts` (e.g. `seed_burnaby.ts`).
   - Copy the structure from `scripts/seed_coquitlam.ts` (if converting Zones/Lines to Points) or `scripts/seed_vancouver.ts` (if native Points).
   - If using API: Fetch directly in the script.
   - If using Downloaded File: Read from `sample_data/${city}_parking.geojson`.
   - **Important**: Normalize data to match `parking_meters` schema (rate, time_limit, geom).

4. **Register in Master Script**:

   - Import and call the new function in `scripts/seed_all.ts`.
   - **CRITICAL**: Do NOT clear the database. Ensure the script checks if data for this city already exists (e.g., `count(*) > 0`) and skips insertion if true.
   - Use the `if (count > 0) { skip } else { seed }` pattern.

5. **Verify**:
   - Run `npx tsx scripts/seed_${city_lowercase}.ts` to test.
   - Run `npx tsx scripts/count_by_city.ts` to confirm insertion.
