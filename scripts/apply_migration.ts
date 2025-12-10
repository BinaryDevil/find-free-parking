import fs from "fs";
import path from "path";

// Load .env.local
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, "utf8");
  envConfig.split("\n").forEach((line) => {
    const [key, val] = line.split("=");
    if (key && val) {
      process.env[key.trim()] = val.trim();
    }
  });
}

import { query } from "../lib/db";

async function applyMigration() {
  const migrationPath = path.join(process.cwd(), "sql", "3.add_metadata.sql");
  console.log(`Applying migration from ${migrationPath}...`);
  
  try {
    const sql = fs.readFileSync(migrationPath, "utf-8");
    await query(sql);
    console.log("Migration applied successfully.");
  } catch (error) {
    console.error("Error applying migration:", error);
    process.exit(1);
  }
}

applyMigration();
