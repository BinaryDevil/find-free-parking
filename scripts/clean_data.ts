import { query } from "../lib/db";
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

async function cleanData() {
  console.log("Cleaning data...");
  try {
    await query("TRUNCATE TABLE public.parking_spots CASCADE");
    await query("TRUNCATE TABLE public.parking_zones CASCADE");
    console.log("Data cleaned successfully.");
  } catch (error) {
    console.error("Error cleaning data:", error);
    process.exit(1);
  }
}

cleanData();
