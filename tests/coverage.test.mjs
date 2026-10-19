import test from 'node:test';
import assert from 'node:assert/strict';
import { computeCoverage } from '../lib/coverage.ts';

const now = new Date('2026-10-14T12:00:00Z');
const source = (type, extra = {}) => ({ id: type, evidenceType: type, approvalState: 'approved', lastSyncAt: '2026-10-14T11:00:00Z', formatValid: true, freshnessMinutes: 10080, coversArea: true, ...extra });
const area = (sources, extra = {}) => ({ id: 'area', name: 'Fixture', slug: 'fixture', timezone: 'America/Vancouver', level: 'full', declaredSubset: 'Official metered curbs only', hasSubset: true, metersInRules: false, completeSigns: false, sources, ...extra });

test('a registry area and signal evidence cannot establish Coverage', () => {
  assert.equal(computeCoverage(area([]), now).level, 'none');
  assert.equal(computeCoverage(area([source('signal')]), now).level, 'none');
  assert.equal(computeCoverage(area([source('E1', { approvalState: 'pending' })]), now).level, 'none');
});

test('partial Coverage requires an exact declared subset and current approved evidence', () => {
  assert.equal(computeCoverage(area([source('E2')]), now).level, 'partial');
  for (const extra of [{ hasSubset: false }, { declaredSubset: '' }, { level: 'none' }]) {
    assert.equal(computeCoverage(area([source('E2')], extra), now).level, 'none');
  }
  for (const extra of [{ lastSyncAt: null }, { lastSyncAt: '2026-10-07T11:59:59Z' }, { formatValid: false }, { approvalState: 'rejected' }, { lastSyncAt: '2026-10-15T00:00:00Z' }]) {
    assert.equal(computeCoverage(area([source('E2', extra)]), now).level, 'none');
  }
});

test('Full Coverage needs citywide regulations, meters, permits and daily temporary restrictions', () => {
  const sources = ['E1','E2','E4','E5'].map(type => source(type));
  assert.equal(computeCoverage(area(sources), now).level, 'full');
  assert.equal(computeCoverage(area(sources, { level: 'partial' }), now).level, 'partial');
  assert.equal(computeCoverage(area(sources.filter(s => s.evidenceType !== 'E4')), now).level, 'partial');
  assert.equal(computeCoverage(area(sources.map(s => s.evidenceType === 'E1' ? { ...s, coversArea: false } : s)), now).level, 'partial');
  assert.equal(computeCoverage(area(sources.map(s => s.evidenceType === 'E5' ? { ...s, lastSyncAt: '2026-10-13T11:59:59Z' } : s)), now).level, 'none');
  assert.equal(computeCoverage(area(sources.map(s => s.evidenceType === 'E4' ? { ...s, formatValid: false } : s)), now).level, 'none');
  assert.equal(computeCoverage(area(['E3','E7','E2','E4','E5'].map(type => source(type)), { completeSigns: true }), now).level, 'full');
  assert.equal(computeCoverage(area(['E1','E4','E5'].map(type => source(type)), { metersInRules: true }), now).level, 'full');
});

test('E7 follows its configured freshness while E1–E4 and E6 remain capped at seven days', () => {
  const sources = ['E3','E7','E2','E4','E5'].map(type => source(type,
    type === 'E7' ? { lastSyncAt: '2026-10-01T12:00:00Z', freshnessMinutes: 43200 } : {}));
  assert.equal(computeCoverage(area(sources, { completeSigns: true }), now).level, 'full');
  assert.equal(computeCoverage(area(sources.map(s => s.evidenceType === 'E7' ?
    { ...s, lastSyncAt: '2026-09-13T12:00:00Z' } : s), { completeSigns: true }), now).level, 'none');
  for (const type of ['E1','E2','E3','E4','E6']) {
    assert.equal(computeCoverage(area([source(type, { lastSyncAt: '2026-10-01T12:00:00Z', freshnessMinutes: 43200 })]), now).level, 'none');
  }
});
