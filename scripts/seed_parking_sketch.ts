import { query } from "../lib/db";
import https from "https";

// Polyfill fetch if needed (Node 18+ has it global)
// We'll rely on global fetch.

async function fetchDataset(datasetId: string, rows = 1000) {
  let allRecords: any[] = [];
  let offset = 0;

  // Minimal fetch loop - in production we'd stream, but for these sizes (meters ~3k?, streets ~?) it might fit in memory.
  // Actually, public-streets is big. We should process in chunks.

  while (true) {
    console.log(`Fetching ${datasetId} offset ${offset}...`);
    // Using V2 API exports/json is better for bulk? No, exports/json dumps the whole file.
    // Catalog API `records` endpoint allows pagination.
    const url = `https://opendata.vancouver.ca/api/v2/catalog/datasets/${datasetId}/exports/json?limit=-1&pretty=false`;
    // export/json dumps ALL. Better than pagination if we can handle the memory.
    // Let's try to stream or just fetch all if it's < 50MB.

    // Changing approach: Use paginated records API to avoid memory usage
    const pageUrl = `https://opendata.vancouver.ca/api/v2/catalog/datasets/${datasetId}/records?limit=${rows}&offset=${offset}&pretty=false`;

    const res = await fetch(pageUrl);
    if (!res.ok)
      throw new Error(`Failed to fetch ${datasetId}: ${res.statusText}`);

    const json = await res.json();
    const records = json.records || [];

    if (records.length === 0) break;

    // Process chunk
    const values = records.map((r: any) => r);
    // Return or process callback?
    // Let's just create a callback version
    return; // Wait, defining helper below
  }
}

async function seedMeters() {
  console.log("Seeding Meters...");
  let offset = 0;
  const limit = 100;

  while (true) {
    const url = `https://opendata.vancouver.ca/api/v2/catalog/datasets/parking-meters/records?limit=${limit}&offset=${offset}`;
    console.log(`Fetching meters offset ${offset}...`);
    const res = await fetch(url);
    const data = await res.json();
    const records = data.records;

    if (!records || records.length === 0) break;

    for (const record of records) {
      const props = record.record.fields; // V2 API structure might be different?
      // V2 records: { record: { id, timestamp, size, fields: {} } } ?
      // Let's check the sample structure I inspected earlier.
      // parking_meters_sample.json was a DIRECT DUMP (exports/json).
      // exports/json format: [ { ...fields... }, { ... } ]
      // records API format: { total_count, records: [ { record: { fields: ... } } ] }

      // I'll use exports/json approach but I'll implement a streaming parser or just load it if size permits.
      // parking-meters is small (few MB). public-streets might be 10-20MB.
      // Let's use the exports/json payload I saw in sample.
      // But wait, fetching the whole array at once is easier.
    }

    offset += limit;
  }
}

// Re-writing with robust logic using the /exports/json endpoint which returns a plain array of objects
// We will fetch the whole JSON (buffer). Node can handle 50MB.
async function seedDataset(
  datasetId: string,
  tableName: string,
  mapper: (item: any) => any[]
) {
  console.log(`Fetching ${datasetId}...`);
  const url = `https://opendata.vancouver.ca/api/v2/catalog/datasets/${datasetId}/exports/json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Status ${res.status}`);
  const data = await res.json(); // loads entire array
  console.log(`Fetched ${data.length} records. Inserting...`);

  let inserted = 0;
  for (const item of data) {
    try {
      const values = mapper(item);
      if (!values) continue; // skip invalid

      // Construct query placeholders? No, use pg param array.
      // We need dynamic SQL for columns?
      // Let's hardcode for now for simplicity.
    } catch (e) {
      console.error(e);
    }
  }
}

// ... wait, I need specific logic for meters/segments.

async function run() {
  // Meters
  // Columns: pay_station_id, meter_head, time_in_effect, credit_card, geom, raw_data
  await seedDataset("parking-meters", "parking_meters", (item) => {
    // item is the object from array.
    // fields: pay_phone, meterhead, timeineffe, creditcard, geom (GeoJSON)

    if (!item.geom) return null;

    const pay_station_id = item.pay_phone;
    const meter_head = item.meterhead;
    const time_in_effect = item.timeineffe;
    const credit_card = item.creditcard === "Yes";
    const geom = JSON.stringify(item.geom);
    const raw_data = JSON.stringify(item);

    return [
      pay_station_id,
      meter_head,
      time_in_effect,
      credit_card,
      geom,
      raw_data,
    ];
  });
}
