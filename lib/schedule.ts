export interface Schedule {
  days?: string[];
  start?: string;
  end?: string;
}

// Legacy schedule semantics retained for interim listed-payment information.
export const isScheduleActive = (schedules: Schedule[], now: Date): boolean => {
  if (!Array.isArray(schedules) || schedules.length === 0) return false;

  // Map JS day (0=Sun) to Schedule day strings
  const dayMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const currentDay = dayMap[now.getDay()];
  // HH:MM
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const parseMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
  };

  // Check if ANY rule matches
  return schedules.some((rule) => {
    // 1. Day Check
    if (rule.days && !rule.days.includes(currentDay)) return false;

    // 2. Time Check
    if (rule.start && rule.end) {
      const start = parseMinutes(rule.start);
      const end = parseMinutes(rule.end);
      if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
      // Overnight ranges such as 18:00-02:00 wrap past midnight.
      if (end <= start) {
        return currentMinutes >= start || currentMinutes < end;
      }
      return currentMinutes >= start && currentMinutes < end;
    }
    return false; // No time range? assume not active/free? Or active all day?
    // Safest to assume inactive if malformed.
  });
};

