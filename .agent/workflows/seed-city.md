---
description: Seed a new city with parking data
params:
  city: The name of the city to seed (e.g. "Burnaby", "Richmond")
---

## Tables to Populate

| Table             | Description                                         | Source                          |
| ----------------- | --------------------------------------------------- | ------------------------------- |
| `parking_meters`  | On-street paid parking points (meters/pay stations) | City Open Data                  |
| `street_segments` | Street line geometries with parking info            | City Open Data (Vancouver only) |
| `parking_zones`   | Off-street parking lots (polygons)                  | OSM via `seedOsmParkingLots`    |
| `covered_cities`  | City boundary and metadata                          | OSM via `seedOsmCityCoverage`   |

**Not seeded (runtime):** `reports`, `user_submissions`, `city_requests`

---

## Parking Zone Classification Logic

The `seedOsmParkingLots` function uses **conservative classification**:

| Condition                                                      | Classification    |
| -------------------------------------------------------------- | ----------------- |
| `access` = private/customers/no/employees/residents/permissive | **Skip entirely** |
| `fee` = yes                                                    | PAID              |
| `fee` = no + `maxstay` tag                                     | FREE_LIMITED      |
| `fee` = no (no maxstay)                                        | FREE_UNLIMITED    |
| `access` = yes/public OR city operator                         | MIXED             |
| **Default (unknown)**                                          | **PAID**          |

> [!WARNING]
> OSM data quality varies. Some lots may be incorrectly tagged (e.g. `fee=no` for permit-only lots). Users can correct these via the "Update Status" feature.

---

## Workflow Steps

1. **Research Data Source**:

   - For each data type (`parking_meters` points, `street_segments` lines, `parking_zones` polygons, `covered_cities` boundary), search_web for `${city} open data <type> API` and `${city} ArcGIS REST <type>`, plus downloadable datasets (JSON/GeoJSON/CSV/SHP/KML) on the portal.
   - Accept APIs and downloads (ArcGIS REST, WFS, Socrata, CKAN, static files)—use anything available to maximize coverage.
   - **Goal**: Collect every available feed or file for each data type.

2. **Manual/Browser Download (in addition to APIs)**:

   - Even if an API exists, also capture downloadable datasets for each layer to ensure completeness; if no API, use downloads exclusively.
   - Use `browser_subagent` if necessary to navigate and locate a download link.
   - Download the file to `sample_data/${city}_<type>.geojson` (or appropriate extension) so each layer is captured.

3. **Develop Seeding Script**:

   - Create `scripts/seed_${city_lowercase}.ts`.
   - Copy structure from `seed_coquitlam.ts` (Lines→Points) or `seed_vancouver.ts` (native Points).
   - **Implement Fallback Strategy (Crucial)**:
     - Check 1: Look for a local file in `datasets/${city}_<type>.<ext>`.
     - Check 2: If found, read and parse the local file (fast/offline).
     - Check 3: If missing, `fetch` from the official API URL (fallback).
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
   - Verify `parking_zones`: `SELECT type, count(*) FROM parking_zones WHERE city='${city}' GROUP BY type`
   - Verify `covered_cities`: `SELECT city_name FROM covered_cities`

6. **Cleanup**:
   - Delete any temporary probe scripts or data files.
   - Keep the final `scripts/seed_${city}.ts` file.
