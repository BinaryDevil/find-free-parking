// Wall-clock boundaries can repeat or be skipped. Offset transitions are
// boundaries too, so every candidate is expressed as an absolute instant.
export function ruleClock(timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short',
    hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23',
  });
  const read = (ms: number) => {
    const parts = formatter.formatToParts(ms);
    const value = (type: string) => parts.find(part => part.type === type)?.value ?? '';
    const wall = Date.UTC(Number(value('year')), Number(value('month')) - 1, Number(value('day')), Number(value('hour')), Number(value('minute')), Number(value('second')));
    return { wall, day: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(value('weekday')), minute: Number(value('hour')) * 60 + Number(value('minute')) };
  };
  const offset = (ms: number) => read(ms).wall - Math.floor(ms / 1000) * 1000;
  const boundaries = (start: number, end: number, minutes: number[]) => {
    const candidates = new Set<number>();
    const offsets = new Set<number>();
    const step = 21600000;
    let previous = start - 86400000;
    let previousOffset = offset(previous);
    offsets.add(previousOffset);
    for (let probe = previous + step; probe <= end + 86400000 + step; probe += step) {
      const currentOffset = offset(probe);
      offsets.add(currentOffset);
      if (currentOffset !== previousOffset) {
        let low = previous, high = probe;
        while (high - low > 1000) {
          const mid = Math.floor((low + high) / 2000) * 1000;
          if (offset(mid) === previousOffset) low = mid; else high = mid;
        }
        candidates.add(high);
      }
      previous = probe;
      previousOffset = currentOffset;
    }
    const midnight = Math.floor(read(start).wall / 86400000) * 86400000;
    for (let date = midnight - 86400000; date <= end + 86400000; date += 86400000) {
      for (const minute of minutes) {
        const wall = date + minute * 60000;
        for (const zoneOffset of offsets) {
          const candidate = wall - zoneOffset;
          if (read(candidate).wall === wall) candidates.add(candidate);
        }
      }
    }
    return [...candidates].filter(ms => ms > start && ms <= end).sort((a, b) => a - b);
  };
  return { read, boundaries };
}
