import assert from 'node:assert/strict';
import test from 'node:test';
import { isScheduleActive } from '../lib/schedule.ts';

const weekday = { days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], start: '09:00', end: '18:00' };
const overnight = { days: ['Mon'], start: '18:00', end: '02:00' };
const cases = [
  ['weekday start is inclusive', [weekday], 5, 9, 0, true],
  ['weekday end is exclusive', [weekday], 5, 18, 0, false],
  ['day must match', [weekday], 10, 12, 0, false],
  ['overnight evening matches', [overnight], 5, 23, 0, true],
  ['overnight morning matches current weekday', [overnight], 5, 1, 59, true],
  ['overnight end is exclusive', [overnight], 5, 2, 0, false],
  ['overnight daytime is inactive', [overnight], 5, 12, 0, false],
  // Characterize current behavior: it does not carry Monday's range into Tuesday.
  ['overnight next day requires that day in days', [overnight], 6, 1, 0, false],
  ['any matching rule activates the schedule', [weekday, overnight], 5, 23, 0, true],
  ['missing days matches every day', [{ start: '09:00', end: '18:00' }], 10, 12, 0, true],
  ['empty schedule is inactive', [], 5, 12, 0, false],
  ['missing range is inactive', [{ days: ['Mon'] }], 5, 12, 0, false],
  ['invalid time is inactive', [{ start: 'invalid', end: '18:00' }], 5, 12, 0, false],
  ['equal endpoints currently match all day', [{ start: '09:00', end: '09:00' }], 5, 12, 0, true],
];

for (const [name, schedules, day, hour, minute, expected] of cases) {
  test(name, () => {
    // Local construction preserves the existing browser-local Date semantics in any CI timezone.
    assert.equal(isScheduleActive(schedules, new Date(2026, 9, day, hour, minute)), expected);
  });
}
