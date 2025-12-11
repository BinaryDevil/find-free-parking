import fs from "fs";
import path from "path";
import { getDbPool } from "./seed_utils";

const pool = getDbPool();

async function run() {
  const args = process.argv.slice(2);
  const fileName = args[0];

  if (!fileName) {
    console.error("Usage: npx tsx scripts/run_sql.ts <filename.sql>");
    const sqlDir = path.join(process.cwd(), "sql");
    if (fs.existsSync(sqlDir)) {
      console.log("\nAvailable SQL files:");
      const files = fs.readdirSync(sqlDir).filter((f) => f.endsWith(".sql"));
      files.forEach((f) => console.log(` - ${f}`));
    }
    process.exit(1);
  }

  const filePath = path.join(process.cwd(), "sql", fileName);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  console.log(`Executing ${fileName}...`);
  try {
    const sqlContent = fs.readFileSync(filePath, "utf8");
    await pool.query(sqlContent);
    console.log("Success!");
  } catch (e) {
    console.error("Execution Failed:", e);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
