---
description: Seed a new city with parking data
params:
  city: The name of the city to seed (e.g. "Burnaby", "Richmond")
---

## Tables to Populate

When seeding a new city, the following tables should be populated:

| Table             | Description                                         | Source                          |
| ----------------- | --------------------------------------------------- | ------------------------------- |
| `parking_meters`  | On-street paid parking points (meters/pay stations) | City Open Data                  |
| `street_segments` | Street line geometries with parking info            | City Open Data (Vancouver only) |
| `parking_zones`   | Off-street parking lots (polygons)                  | OSM via `seedOsmParkingLots`    |
| `covered_cities`  | City boundary and metadata                          | OSM via `seedOsmCityCoverage`   |

**Not seeded (runtime data):** `reports`, `user_submissions`, `city_requests`

---

## Workflow Steps

1. **Research Data Source**:

   - search_web for "${city} open data parking meters API" or "${city} ArcGIS REST pay parking".
   - Look for "Parking Meters" (Points) or "Pay Parking Zones" (Lines) datasets.
   - **Goal**: Find a direct JSON/GeoJSON API URL.

2. **Fallback - Manual/Browser Download**:

   - If no API, search for "${city} open data portal" and browse for "Parking" datasets.
   - Use `browser_subagent` if necessary to navigate and locate a download link.
   - Download the file to `sample_data/${city}_parking.geojson`.

3. **Develop Seeding Script**:

   - Create `scripts/seed_${city_lowercase}.ts`.
   - Copy structure from `seed_coquitlam.ts` (Lines→Points) or `seed_vancouver.ts` (native Points).
   - Normalize data to match `parking_meters` schema.
   - **Always include**:
     ```typescript
     import { seedOsmParkingLots, seedOsmCityCoverage } from "./seed_osm_utils";
     // At end of seed function:
     await seedOsmParkingLots("${city}");
     await seedOsmCityCoverage("${city}");
     ```

4. **Register in Master Script**:

   - Import and call the new function in `scripts/seed_all.ts`.
   - **CRITICAL**: Check if data exists before inserting (idempotent).

5. **Verify**:

   - Run `npx tsx scripts/seed_${city_lowercase}.ts` to test.
   - Run `npx tsx scripts/count_by_city.ts` to confirm `parking_meters`.
   - Verify `parking_zones` and `covered_cities` via SQL queries.

6. **Cleanup**:
   - Delete any temporary probe scripts or data files.
   - Keep the final `scripts/seed_${city}.ts` file.
