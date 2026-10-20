/** Text interpretation only: no source approval, curb assignment or parking permission. */
export function parseSignText(rawText: string) {
  const text = rawText.trim().replace(/\s+/g, " ").toUpperCase();
  const attributes = { rawText, rate: null, limit: null, schedule: null };
  if (text === "NO PARKING ANY TIME") {
    return { ...attributes, status: "parsed" as const, rule: { kind: "no_parking" as const, allDay: true } };
  }
  const limited = text.match(/^([1-9]\d*) HR PARKING (0?[1-9]|1[0-2]):([0-5]\d) (AM|PM) TO (0?[1-9]|1[0-2]):([0-5]\d) (AM|PM)$/);
  if (limited) {
    const clock = (hour: string, minute: string, period: string) =>
      `${String(Number(hour) % 12 + (period === "PM" ? 12 : 0)).padStart(2, "0")}:${minute}`;
    return {
      ...attributes,
      status: "unknown" as const,
      rule: null,
      limit: `${limited[1]}hr`,
      postedWindow: { start: clock(limited[2], limited[3], limited[4]), end: clock(limited[5], limited[6], limited[7]) },
    };
  }
  return { ...attributes, status: "unknown" as const, rule: null };
}
