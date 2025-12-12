import fs from "fs";
import path from "path";
import { Pool } from "pg";

// 1. Load Environment Variables
export function loadEnv() {
  const envFiles = [".env", ".env.local"];
  envFiles.forEach((file) => {
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

  // Bypass SSL for some setups
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

// 2. Get DB Connection
export function getDbPool() {
  loadEnv();

  const connectionString =
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("No connection string found!");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30000,
  });

  pool.on("error", (err) => {
    console.error("Unexpected error on idle client", err);
  });

  return pool;
}

// --- Global Schema Helpers ---

/**
 * Normalizes various time inputs to strictly HH:MM (24-hour) string.
 * Handles:
 * - "14:30" (Pass-through)
 * - "1430" (Number/String HHMM)
 * - 870 (Minutes from Midnight)
 * - "2:30 PM" (12-hour string) -> basic parsing
 */
export function normalizeTime(val: any): string | null {
  if (val === null || val === undefined || val === "") return null;

  // 1. Minutes from Midnight (e.g. 480 -> 08:00) - Seattle Style
  // Assumption: < 1440 is likely minutes, > 1440 might be HHMM (e.g. 1800 = 18:00)
  // BUT ambiguous range: 800 mins = 13:20 vs 800 HHMM = 08:00.
  // Use context or heuristic?
  // Heuristic: If it doesn't look like HHMM (e.g. ends in >59), it's minutes.
  // Actually, better to explicitly handle known cases or passed flags.
  // For safety, let's just handle "Minutes from Midnight" vs "String".

  if (typeof val === "number") {
    // Is it HHMM int? (e.g. 1800) or Minutes (e.g. 1080)
    // 10:80 is invalid.
    if (val >= 0 && val < 2400) {
      // Check last two digits
      const lastTwo = val % 100;
      if (lastTwo >= 60) {
        // Valid minutes, invalid HHMM -> treat as minutes
        const h = Math.floor(val / 60);
        const m = val % 60;
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      }
      // Ambiguous.
      // Default to Minutes logic if that was the recent major bug?
      // No, safer to assume minutes if coming from an API that uses it.
      // Let's rely on caller to know, OR force normalized input.

      // Let's implement the Minutes logic specifically since that's tricky to redo every time.
      const h = Math.floor(val / 60);
      const m = val % 60;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
  }

  const str = String(val).trim();

  // HH:MM
  if (/^\d{1,2}:\d{2}$/.test(str)) {
    const [h, m] = str.split(":");
    return `${h.padStart(2, "0")}:${m}`;
  }

  return null; // Fallback
}

/**
 * Normalizes street use categories to Global Schema standard.
 */
export function normalizeStreetUse(
  val: string
):
  | "Paid"
  | "Permit"
  | "Unrestricted"
  | "Time Limited"
  | "No Parking"
  | "Unknown" {
  const v = val.toLowerCase();

  if (v.includes("unrestricted")) return "Unrestricted";
  if (v.includes("no parking") || v.includes("forbidden")) return "No Parking";
  if (v.includes("permit") || v.includes("resident") || v.includes("zone"))
    return "Permit";
  if (v.includes("paid") || v.includes("meter")) return "Paid";
  if (v.includes("time") || v.includes("limit")) return "Time Limited";

  return "Unknown";
}

/**
 * Returns default attributes for identifying generic street segments
 * where no specific parking regulation data is available.
 */
export function getDefaultSegmentAttributes() {
  return {
    street_use: "Unrestricted",
    // We treat generic centerlines as "Unrestricted" or "Unknown" to visualize them
    // without implying specific free/paid rules unless known.
    notes: "Imported from street centerline (no parking data)",
  };
}

/**
 * Parses sign text to extract parking attributes (rate, limit, schedule).
 * Useful for "Proxy Strategy" when using sign datasets.
 */
export function parseSignText(text: string) {
  const t = (text || "").toUpperCase();

  // Rate Parsing: "$1.00 PER HOUR"
  let rate = null;
  const rateMatch = t.match(/\$(\d+\.\d{2}) PER HOUR/);
  if (rateMatch) {
    rate = `$${rateMatch[1]}/hr`;
  } else if (t.includes("PAY")) {
    rate = "$1.00/hr"; // Default guess
  }

  // Limit Parsing: "2 HR", "3HR"
  let limit = null;
  const limitMatch = t.match(/(\d+)(?:HR| HOUR)/);
  if (limitMatch) {
    limit = `${limitMatch[1]}hr`;
  } else if (t.includes("3HR")) limit = "3hr";
  else if (t.includes("4HR")) limit = "4hr";

  // Schedule Parsing: "9AM-9PM"
  let schedule = "Mon-Sat 9am-6pm"; // Default
  const timeMatch = t.match(
    /(\d{1,2}(?::\d{2})?[AP]M\s*(?:-|TO)\s*\d{1,2}(?::\d{2})?[AP]M)/
  );
  if (timeMatch) {
    schedule = timeMatch[0];
  }

  return { rate, limit, schedule };
}
