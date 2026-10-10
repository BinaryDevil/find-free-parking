import { requestOverpass } from "./overpass";

async function run() {
  const city = "Coquitlam";
  const areaName = "Metro Vancouver Regional District";

  const query = `
    [out:json][timeout:25];
    area["name"="${areaName}"]->.state;
    relation["name"~"${city}",i]["admin_level"="8"](area.state);
    out geom;
  `;

  console.log("Querying:\n", query);

  try {
    const res = await requestOverpass(query);
    console.log("Result Count:", res.data.elements.length);
    if (res.data.elements.length > 0) {
      console.log(
        "First Element:",
        JSON.stringify(res.data.elements[0], null, 2)
      );
    } else {
      console.log("No elements found.");

      // Try broader query
      console.log("Trying broader query (British Columbia)...");
      const query2 = `
            [out:json][timeout:25];
            area["name"="British Columbia"]->.state;
            relation["name"~"${city}",i]["admin_level"="8"](area.state);
            out geom;
        `;
      const res2 = await requestOverpass(query2);
      console.log("Result Count (BC):", res2.data.elements.length);
      if (res2.data.elements.length > 0) {
        console.log(
          "First Element (BC):",
          JSON.stringify(res2.data.elements[0], null, 2)
        );
      }
    }
  } catch (e: any) {
    console.error("Error:", e.message);
    if (e.response) console.error(e.response.data);
  }
}

run();
