import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyParking, isVisibleInParkingView } from '../lib/parking-classification.ts';

const selectedTime = new Date(2026, 9, 5, 10);

test('West End road-class-only Residential blocks are Unknown', () => {
  assert.equal(classifyParking('STREET', { street_use: 'Residential', meter_infos: [] }, selectedTime), 'UNKNOWN');
});

test('three FREE Driver Reports cannot turn an Unknown street into free parking', () => {
  assert.equal(classifyParking('STREET', { street_use: 'Residential', report_counts: { FREE: 3 } }, selectedTime), 'UNKNOWN');
});

test('OSM-only and incomplete official street categories never establish permission', () => {
  for (const street_use of ['Unrestricted', 'Time Limited', 'Paid', 'Permit', 'No Parking']) {
    assert.equal(classifyParking('STREET', { street_use }, selectedTime), 'UNKNOWN');
  }
  assert.equal(classifyParking('STREET', { meter_infos: [[{ rate: 2 }]] }, selectedTime), 'UNKNOWN');
});

test('OSM fee=no, fee=yes and missing fee lots remain unverified, even with legacy verified flags', () => {
  for (const metadata of [{ fee: 'no', access: 'customers' }, { fee: 'yes' }, {}]) {
    assert.equal(classifyParking('ZONE', {
      source: 'OSM', type: metadata.fee === 'no' ? 'FREE_UNLIMITED' : 'PAID',
      metadata, verified: true, report_counts: { FREE: 10, PAID: 3 },
    }, selectedTime), 'UNKNOWN');
  }
});

const paidMeter = { schedules: [{ days: ['Mon'], start: '09:00', end: '18:00', rate: 2 }] };

test('an active meter lists payment, while after hours never implies free permission', () => {
  assert.equal(classifyParking('METER', paidMeter, selectedTime), 'PAID');
  assert.equal(classifyParking('METER', paidMeter, new Date(2026, 9, 5, 8)), 'UNKNOWN');
  assert.equal(classifyParking('METER', paidMeter, new Date(2026, 9, 5, 19)), 'UNKNOWN');
  assert.equal(classifyParking('METER', paidMeter, new Date(2026, 9, 6, 10)), 'UNKNOWN');
});

test('FREE and PAID reports cannot override meter payment or Unknown classification', () => {
  for (const report_counts of [{ FREE: 3 }, { PAID: 3 }, { FREE: 20, PAID: 20, NO_PARKING: 1 }]) {
    assert.equal(classifyParking('METER', { ...paidMeter, report_counts }, selectedTime), 'PAID');
    assert.equal(classifyParking('METER', { report_counts }, selectedTime), 'UNKNOWN');
    assert.equal(classifyParking('STREET', { report_counts }, selectedTime), 'UNKNOWN');
  }
});

test('missing, malformed, zero-rate and guessed schedules cannot imply free parking or payment', () => {
  for (const schedules of [undefined, [], '[{}]', [null], [{}],
    [{ days: ['Mon'], start: '09:00', end: '18:00', rate: 0 }],
    [{ days: ['Mon'], start: '25:00', end: '18:00', rate: 2 }],
    [{ start: '09:00', end: '18:00', rate: 2 }],
    [{ days: ['Mon'], start: '09:00', end: '09:00', rate: 2 }],
  ]) {
    assert.equal(classifyParking('METER', { schedules }, selectedTime), 'UNKNOWN');
  }
});

test('Unknown context remains visible in both views, while payment is excluded from the free view', () => {
  assert.equal(isVisibleInParkingView('UNKNOWN', 'FREE'), true);
  assert.equal(isVisibleInParkingView('UNKNOWN', 'PAID'), true);
  assert.equal(isVisibleInParkingView('PAID', 'FREE'), false);
  assert.equal(isVisibleInParkingView('PAID', 'PAID'), true);
});
