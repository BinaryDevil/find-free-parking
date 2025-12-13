import { getDbPool } from "./seed_utils";

const pool = getDbPool();

async function run() {
  console.log("Cleaning Surrey and Langley streets...");

  const delSurrey = await pool.query(
    "DELETE FROM street_segments WHERE raw_data->>'city' = 'Surrey'"
  );
  console.log(`Deleted ${delSurrey.rowCount} Surrey streets.`);

  const delCityLang = await pool.query(
    "DELETE FROM street_segments WHERE raw_data->>'city' = 'City of Langley'"
  );
  console.log(`Deleted ${delCityLang.rowCount} City of Langley streets.`);

  const delLangCity = await pool.query(
    "DELETE FROM street_segments WHERE raw_data->>'city' = 'Langley City'"
  );
  console.log(`Deleted ${delLangCity.rowCount} Langley City streets.`);

  const delTwpLang = await pool.query(
    "DELETE FROM street_segments WHERE raw_data->>'city' = 'Township of Langley'"
  );
  console.log(`Deleted ${delTwpLang.rowCount} Township of Langley streets.`);

  console.log("Cleanup Done.");
}

run().finally(() => pool.end());
