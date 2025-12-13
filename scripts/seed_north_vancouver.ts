import { getDbPool } from "./seed_utils";
import {
  seedOsmParkingLots,
  seedOsmCityCoverage,
  seedOsmStreets,
} from "./seed_osm_utils";
import fs from "fs";
import path from "path";

const pool = getDbPool();

export async function seedNorthVancouver() {
  console.log("Starting North Vancouver Seeding...");
  try {
    // City of North Vancouver
    await seedOsmParkingLots("North Vancouver");
    await seedOsmCityCoverage("North Vancouver");

    // District of North Vancouver (Usually 'North Vancouver District' or separate relation in OSM)
    // We'll try to seed both or rely on 'North Vancouver' covering both if OSM relations are set up that way.
    // Often OSM has "City of North Vancouver" and "District of North Vancouver"
    // Let's explicitly try District as well if 'North Vancouver' behaves strictly as the city.
    // Ideally we pass a clearer name if needed, but 'North Vancouver' often fuzzy matches both or center.
    // Let's add specific call for District coverage if the first one doesn't cover it.
    // However, seedOsmCityCoverage uses Nominatim/Overpass which might find the City.
    // Let's add a separate call for "District of North Vancouver" just in case.

    await seedOsmCityCoverage("District of North Vancouver");
    // Lots might be covered by generic box query or named area.
    // seedOsmParkingLots uses a bounding box of the city relation.
    // We might need to run it for District too.
    await seedOsmParkingLots("District of North Vancouver");

    // Streets
    await seedOsmStreets("North Vancouver", "BC");
    await seedOsmStreets("District of North Vancouver", "BC");

    console.log("[North Vancouver] Seeding Complete.");
  } catch (e) {
    console.error("North Vancouver Seeding Failed:", e);
  }
}

if (require.main === module) {
  seedNorthVancouver().finally(() => pool.end());
}
