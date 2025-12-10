import fs from "fs";
import path from "path";

// Load .env and .env.local
[".env", ".env.local"].forEach((file) => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    console.log(`Loading env from ${file}`);
    const envConfig = fs.readFileSync(filePath, "utf8");
    envConfig.split("\n").forEach((line) => {
      if (!line.trim() || line.trim().startsWith("#")) return;
      const [key, ...rest] = line.split("=");
      let val = rest.join("=");
      if (key && val) {
        val = val.trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        process.env[key.trim()] = val;
      }
    });
  }
});
console.log(
  "Loaded env vars:",
  Object.keys(process.env).filter((k) => k.includes("URL"))
);

if (process.env.POSTGRES_URL_NON_POOLING) {
  console.log("Using POSTGRES_URL_NON_POOLING for migration");
  process.env.POSTGRES_PRISMA_URL = process.env.POSTGRES_URL_NON_POOLING;
}

// import { query } from "../lib/db"; // Remove static import

async function applyMigration() {
  const { query } = await import("../lib/db"); // Dynamic import

  const fileArg = process.argv[2];
  const migrationPath = fileArg
    ? path.resolve(process.cwd(), fileArg)
    : path.join(process.cwd(), "sql", "3.add_metadata.sql");

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
