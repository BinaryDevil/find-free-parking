
function parseTimeStr(timeStr: string): number {
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
  if (!notes) return true;
  // Regex from route.ts
  const regex = /METER IN EFFECT:\s*(\d{1,2}:\d{2}\s*[AP]M)\s*TO\s*(\d{1,2}:\d{2}\s*[AP]M)/i;
  const match = notes.match(regex);
  
  console.log("Testing Note:", notes);
  
  if (!match) {
      console.log("No regex match!");
      return true;
  }

  const startMinutes = parseTimeStr(match[1]);
  const endMinutes = parseTimeStr(match[2]);
  
  const currentMinutes = targetDate.getHours() * 60 + targetDate.getMinutes();
  
  console.log(`Window: ${match[1]} (${startMinutes}) to ${match[2]} (${endMinutes})`);
  console.log(`Target: ${targetDate.toLocaleTimeString()} (${currentMinutes})`);

  if (startMinutes === -1 || endMinutes === -1) return true;

  const isActive = currentMinutes >= startMinutes && currentMinutes < endMinutes;
  console.log(`Is Paid Active: ${isActive}`);
  return isActive;
}

const note = "METER IN EFFECT: 9:00 AM TO 10:00 PM";
// Test at 2:54 PM (14:54)
const date = new Date("2025-12-10T14:54:00");

const isPaid = isPaidInEffect(note, date);
const isFree = !isPaid;

console.log("--------------------------------");
console.log(`Final Result - Is this spot Free? ${isFree}`);
if (isFree) {
    console.log("BUG: Spot is marked FREE but should be PAID.");
} else {
    console.log("CORRECT: Spot is marked PAID/NOT FREE.");
}
