---
description: Seed a new city with parking data
params:
  city: The name of the city to seed (e.g. "Burnaby", "Richmond")
---

## Tables to Populate

| Table             | Description                                         | Source                                                |
| ----------------- | --------------------------------------------------- | ----------------------------------------------------- |
| `parking_meters`  | On-street paid parking points (meters/pay stations) | City Open Data                                        |
| `street_segments` | Street line geometries with parking info            | City Open Data OR **OSM Fallback** (`seedOsmStreets`) |
| `parking_zones`   | Off-street parking lots (polygons)                  | OSM via `seedOsmParkingLots`                          |
| `covered_cities`  | City boundary and metadata                          | OSM via `seedOsmCityCoverage`                         |

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

- **Search Strategy (Expanded)**:
  - **Primary (Parking)**: Search for "Parking Meters", "Pay Stations", "Parking Regulations", "Time Limit", "Residential Zones", "RPZ", "Curb Inventory".
  - **Secondary (Proxies)**: If primary data is missing, YOU MUST search for **"Signs"**, **"Street Assets"**, **"Street Furniture"**, **"Traffic Control"**, or **"Utilities"**.
    - _Why?_ "Signs" datasets often contain "PAY PARKING" or "2 HR PARKING" points which can be parsed into meters.
  - **Tertiary (Geometry)**: If no parking data exists at all, YOU MUST search for **"Street Centerline"**, **"Road Network"**, or **"Transportation"** datasets.
    - _Why?_ This allows us to visualize the street network and provide "Unrestricted" coverage, which is better than a blank map.

### 3. Street Network (Fallback)

If official city "Street Centerlines" or "Blockfaces" are unavailable:

1.  Use `seedOsmStreets(cityName, state, country)`.
2.  This function first attempts to find the city relation in OSM.
3.  **Backup Strategy**: If the relation search fails (common for some administrative boundaries), it automatically falls back to using the **City Coverage Polygon** (from `covered_cities` table) to query streets spatially (`poly:"..."`).
    - _Requirement_: `seedOsmCityCoverage` must be run BEFORE `seedOsmStreets`.

- **Fallback Strategy**:
  - Look for a "Data Downloads", "GIS Data", or "FTP" section on the city website (often separate from the main Open Data portal).
  - If you find a "Signs" dataset, download it and `grep` for "PAY", "METER", "LIMIT". If hits > 10, use the **Proxy Strategy** (see below).

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
   - **Implement Proxy Strategy (if using Signs)**:
     - Use `dataset/signs.geojson`.
     - Filter for text containing "PAY", "METER", or specific time limits.
     - Use `parseSignText(text)` from `seed_utils.ts` (see below) to extract rate and schedule.
     - Insert as `parking_meters` with `meter_head: "Pay Station Sign"`.
   - **Normalize Data (CRITICAL)**:
     - Use `normalizeTime(val)` from `seed_utils.ts` for ANY time fields (converts minutes/HHMM to HH:MM).
     - Use `normalizeStreetUse(val)` for street categories (Paid, Unrestricted, etc.).
     - Use `createSchedule(...)` pattern if creating schedule objects manually.
   - Normalize data to match `parking_meters` schema.
   - **Always include**:
     ```typescript
     import {
       seedOsmParkingLots,
       seedOsmCityCoverage,
       seedOsmStreets,
     } from "./seed_osm_utils";
     // At end of seed function:
     await seedOsmParkingLots("${city}");
     await seedOsmCityCoverage("${city}");
     await seedOsmStreets("${city}", "BC");
     ```

4. **Register in Master Script**:

   - Import and call the new function in `scripts/seed_all.ts`.
   - **CRITICAL**: Check if data exists before inserting (idempotent).

5. **Troubleshooting & Re-runs**:

   - Scripts are idempotent: if data exists, they SKIP.
   - **Missing Data?** If a script runs but no data appears (and logs say "Skipping"), you may have partial/broken data.
   - **Fix**: Run `DELETE FROM street_segments WHERE raw_data->>'city' = '${city}'` before re-running.

6. **Verify**:

   - Run `npx tsx scripts/seed_${city_lowercase}.ts` to test.
   - Run `npx tsx scripts/count_by_city.ts` to confirm `parking_meters`.
   - Verify `parking_zones`: `SELECT type, count(*) FROM parking_zones WHERE city='${city}' GROUP BY type`
   - Verify `covered_cities`: `SELECT city_name FROM covered_cities`

7. **Cleanup**:
   - Delete any temporary probe scripts or data files.
   - Keep the final `scripts/seed_${city}.ts` file.
