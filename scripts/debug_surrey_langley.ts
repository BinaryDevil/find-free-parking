import axios from "axios";

async function testQuery(city: string, state: string, country: string) {
  // Logic from seed_osm_utils.ts
  if (state === "BC" && country === "United States") {
    country = "Canada";
  }

  let areaFilter: string;
  // Use Metro Vancouver for specific testing
  areaFilter = `area["name"="Metro Vancouver Regional District"]->.state;`;

  const query = `
    [out:json][timeout:60];
    ${areaFilter}
    relation["name"~"${city}",i]["admin_level"="8"](area.state)->.cityRel;
    .cityRel map_to_area -> .searchArea;
    (
      way["highway"~"^(primary|secondary|tertiary|residential|unclassified|living_street)$"](area.searchArea);
    );
    out count;
  `;

  console.log(`Testing: ${city} in ${country} (Filter: Metro Vancouver)...`);
  try {
    const res = await axios.post(
      "https://overpass-api.de/api/interpreter",
      query,
      {
        headers: { "Content-Type": "text/plain" },
      }
    );
    // Output should contain "Element count: X"
    console.log("Result:", res.data);
  } catch (e: any) {
    console.log("Error:", e.message);
  }
}

async function run() {
  await testQuery("Surrey", "BC", "Canada");
  await testQuery("City of Langley", "BC", "Canada");
  await testQuery("Township of Langley", "BC", "Canada");
  // Try alternates
  await testQuery("Langley", "BC", "Canada");
}

run();
