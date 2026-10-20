import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSignText } from '../lib/kirkland-signs.ts';

// Public examples recorded in issue #32 and docs/sources/kirkland.md.
test('any-time prohibition is recognized without granting a curb assignment', () => {
  const sign = parseSignText('NO PARKING ANY TIME');
  assert.equal(sign.status, 'parsed');
  assert.equal(sign.rule.kind, 'no_parking');
  assert.equal(sign.rule.allDay, true);
  assert.equal(sign.rawText, 'NO PARKING ANY TIME');
  assert.equal(sign.rate, null);
});

test('posted time limit retains explicit hours but missing days stay Unknown', () => {
  const sign = parseSignText('2 HR PARKING 9:00 AM TO 7:30 PM');
  assert.equal(sign.status, 'unknown');
  assert.equal(sign.rule, null);
  assert.equal(sign.limit, '2hr');
  assert.equal(sign.schedule, null);
  assert.deepEqual(sign.postedWindow, { start: '09:00', end: '19:30' });
});

test('incomplete conditions and malformed text preserve raw text without guesses', () => {
  for (const rawText of [
    '', 'PAY PARKING', 'PAY $1.00 PER HOUR',
    'NO PARKING BETWEEN SIGNS', 'NO OVERNIGHT PARKING',
    'RESERVED PARKING STATE DISABLED PARKING PERMIT REQUIRED',
    'NO EMPLOYEE PARKING 9:00AM TO 9:00PM KMC 12.45.250',
    'NO PARKING ANYTIME W/DBL ARROW',
    'NO PARKING 8AM - 2PM SCHOOL DAYS EXCEPT BY PERMIT',
    'NO PARKING ANY TIME EXCEPT BY PERMIT',
    '2 HR PARKING 13:00 AM TO 7:30 PM',
    '2 HR PARKING 9:60 AM TO 7:30 PM',
    '2 HR PARKING 9:00 AM TO 7:30 PM EXCEPT SUNDAY',
  ]) {
    const sign = parseSignText(rawText);
    assert.equal(sign.status, 'unknown', rawText);
    assert.equal(sign.rule, null, rawText);
    assert.equal(sign.rawText, rawText);
    assert.equal(sign.rate, null);
    assert.equal(sign.limit, null);
    assert.equal(sign.schedule, null);
  }
});
