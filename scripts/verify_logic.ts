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

function parseTimeStr(timeStr: string): number {
  // "9:00 AM" -> minutes from midnight
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return -1;
  let [_, h, m, p] = match;
  let hours = parseInt(h, 10);
  const minutes = parseInt(m, 10);
  const period = p.toUpperCase();

  if (period === "PM" && hours < 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

function isPaidInEffect(notes: string | null, targetDate: Date): boolean {
  if (!notes) return true; // Default to paid if no notes to say otherwise? Or assume always valid?
  // Sample format: "METER IN EFFECT: 9:00 AM TO 10:00 PM"
  // Note: Added relaxed regex to handle potential variances if any, but sticking to logic in route.ts
  const regex = /METER IN EFFECT:\s*(\d{1,2}:\d{2}\s*[AP]M)\s*TO\s*(\d{1,2}:\d{2}\s*[AP]M)/i;
  const match = notes.match(regex);
  
  if (!match) return true; // If we can't parse limits, assume it's paid/in-effect.

  const startMinutes = parseTimeStr(match[1]);
  const endMinutes = parseTimeStr(match[2]);

  if (startMinutes === -1 || endMinutes === -1) return true;

  const currentMinutes = targetDate.getHours() * 60 + targetDate.getMinutes();

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

async function verifyLogic() {
  console.log("Verifying parking logic...");
  
  // Fetch sample spots
  const result = await query("SELECT id, notes FROM parking_spots WHERE notes IS NOT NULL LIMIT 5");
  
  // Test with a few times
  // 1. A time likely to be paid (e.g. 2 PM)
  // 2. A time likely to be free (e.g. 11 PM) - specific to Vancouver meters usually 9am-10pm
  
  const testTimes = [
    { label: "2:00 PM (Should be PAID)", date: new Date("2023-01-01T14:00:00") },
    { label: "11:00 PM (Should be FREE)", date: new Date("2023-01-01T23:00:00") },
    { label: "Now", date: new Date() }
  ];

  for (const row of result.rows) {
     console.log(`\nSpot ID: ${row.id}`);
     console.log(`Notes: ${row.notes}`);
     
     for (const t of testTimes) {
        const isPaid = isPaidInEffect(row.notes, t.date);
        const isFree = !isPaid;
        console.log(`  At ${t.label} (${t.date.toLocaleTimeString()}): PaidActive=${isPaid} => EffectiveFree=${isFree}`);
     }
  }
}

verifyLogic();
