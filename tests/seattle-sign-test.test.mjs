import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import {
  mulberry32, strataFromFrame, drawSample, signFamily, spaceFamilies, gradeSide, gradeDir,
  PREREGISTERED, SENSITIVITY,
} from '../scripts/seattle-sign-test.ts';

const dir = new URL('../artifacts/issue-126-seattle-sign-test-2026-10-24/', import.meta.url);
const pre = JSON.parse(readFileSync(new URL('preregistration.json', dir)));
const families = pre.families;
const tol = pre.tolerance_ft;

const bf = { ELMNTKEY: 1, DISTANCE: 10, END_DISTANCE: 210 };
const sign = (UNITID, DISTANCE, CATEGORY, extra = {}) => ({ UNITID, ELMNTKEY: 1, DISTANCE, SIGNTYPE: 'X', CATEGORY, CURRENT_STATUS: 'INSVC', TEXT: '', ...extra });
const space = (SPACEKEY, BLOCK_ST, BLOCK_END, SPACETYPE, CURRENT_STATUS = 'INSVC') => ({ SPACEKEY, ELMNTKEY: 1, BLOCK_ST, BLOCK_END, SPACETYPE, CURRENT_STATUS });

test('seeded sampler is deterministic, ordered by stratum and never repeats a side', () => {
  const a = mulberry32(20261024), b = mulberry32(20261024);
  for (let i = 0; i < 5; i++) assert.equal(a(), b());
  const frame = [
    ...[1, 2, 3, 4].map(k => ({ ELMNTKEY: k, SPACETYPE: 'PS-RPZ' })),
    ...[1, 2, 3, 4, 5].map(k => ({ ELMNTKEY: k, SPACETYPE: 'PS' })),
    { ELMNTKEY: 9, SPACETYPE: 'TL' },
    { ELMNTKEY: 7, SPACETYPE: 'TAZ' }, { ELMNTKEY: 8, SPACETYPE: 'NP' }, { ELMNTKEY: 8, SPACETYPE: 'NP' },
  ];
  const strata = strataFromFrame(frame);
  assert.deepEqual(strata.no_parking, [7, 8]);
  const sample = drawSample(strata, 20261024);
  assert.deepEqual(drawSample(strata, 20261024), sample);
  assert.deepEqual(sample.map(s => s.stratum), ['permit', 'permit', 'permit', 'metered', 'metered', 'time_limited', 'no_parking', 'no_parking']);
  assert.equal(new Set(sample.map(s => s.ELMNTKEY)).size, sample.length);
});

test('family tables are the pre-registered ones, with unknown codes kept unclassified', () => {
  for (const [category, family] of [['PNP', 'NO_PARKING'], ['PNS', 'NO_PARKING'], ['PRZ', 'PERMIT'], ['PR', 'UNCLASSIFIED'], ['ZZZ', 'UNCLASSIFIED'], [null, 'UNCLASSIFIED'], ['PINST', 'IGNORE']]) {
    assert.equal(signFamily(category, families), family, String(category));
  }
  for (const [type, fams] of [['PS-RPZ', ['PAID', 'PERMIT']], ['CLR', ['STATUTORY_OR_PHYSICAL']], ['MVZ', ['UNDOCUMENTED']], ['TAZ', ['NO_PARKING']]]) {
    assert.deepEqual(spaceFamilies(type, families), fams, type);
  }
});

const cases = [
  { name: 'sign family present in the space at its point agrees',
    signs: [sign('a', 50, 'PNP')], spaces: [space(1, 50, 90, 'NP')], result: 'agree', checks: ['G2:agree', 'G3:agree'] },
  { name: 'sign family absent from the spaces at its point contradicts',
    signs: [sign('a', 50, 'PNP')], spaces: [space(1, 50, 90, 'PS')], result: 'contradict', checks: ['G2:contradict', 'G3:contradict'] },
  { name: 'curb space regulation with no sign of that family on the side contradicts (completeness)',
    signs: [sign('a', 50, 'PNP')], spaces: [space(1, 50, 90, 'NP'), space(2, 120, 140, 'L/UL')], result: 'contradict', checks: ['G2:agree', 'G3:agree', 'G3:contradict'] },
  { name: 'sign beyond the side end fails matching',
    signs: [sign('a', 250, 'PNP')], spaces: [space(1, 50, 90, 'NP')], result: 'contradict', checks: ['G1:contradict', 'G2:unverified', 'G3:agree'] },
  { name: 'statutory and physical spaces need no sign',
    signs: [sign('a', 50, 'PTIML')], spaces: [space(1, 50, 90, 'TL'), space(2, 90, 100, 'HYD'), space(3, 100, 120, 'DW')], result: 'agree', checks: ['G2:agree', 'G3:agree'] },
  { name: 'out-of-service signs and spaces are not evidence',
    signs: [sign('a', 50, 'PNP', { CURRENT_STATUS: 'RETIRED' })], spaces: [space(1, 50, 90, 'NP', 'OUTSVC')], result: 'unverified', checks: [] },
  { name: 'a side with spaces but no signs is unverified, never free',
    signs: [], spaces: [space(1, 50, 90, 'UNR')], result: 'unverified', checks: [] },
  { name: 'informational and unclassified signs are not graded at their point',
    signs: [sign('a', 50, 'PINST'), sign('b', 60, 'PR', { TEXT: 'PAY TO PARK' })], spaces: [space(1, 50, 90, 'UNR')], result: 'agree', checks: [] },
];

for (const c of cases) {
  test(`grading: ${c.name}`, () => {
    const r = gradeSide({ blockface: [bf], signs4: c.signs, signs0: [], spaces: c.spaces }, families, tol);
    assert.equal(r.result, c.result);
    assert.deepEqual(r.findings.map(f => `${f.check}:${f.result}`).sort(), [...c.checks].sort());
    assert.equal(r.rule.kind, 'unknown_except_sign_points');
    assert.ok(!JSON.stringify(r).toLowerCase().includes('free'), 'the matcher never emits a free rule');
  });
}

test('position uses blockface start plus sign distance unless the sensitivity axis is chosen', () => {
  const input = { blockface: [{ ELMNTKEY: 1, DISTANCE: 100, END_DISTANCE: 200 }], signs4: [sign('a', 150, 'PNP')], signs0: [], spaces: [space(1, 140, 160, 'NP')] };
  assert.equal(gradeSide(input, families, tol).rule.points[0].position, 250);
  assert.equal(gradeSide(input, families, tol, SENSITIVITY.S1_sign_axis).rule.points[0].position, 150);
  assert.equal(gradeSide(input, families, tol, SENSITIVITY.S1_sign_axis).result, 'agree');
});

test('sensitivity options: pay text and clearance readings', () => {
  const pay = { blockface: [bf], signs4: [sign('a', 50, 'PR', { TEXT: 'PARKING SYMBOL PAY TO PARK 8AM-8PM' })], signs0: [], spaces: [space(1, 40, 80, 'PS')] };
  assert.equal(gradeSide(pay, families, tol, PREREGISTERED).result, 'contradict');
  assert.equal(gradeSide(pay, families, tol, SENSITIVITY.S2_plus_pay_text).result, 'agree');
  const clr = { blockface: [bf], signs4: [sign('a', 50, 'PNP')], signs0: [], spaces: [space(1, 40, 80, 'CLR')] };
  assert.equal(gradeSide(clr, families, tol, SENSITIVITY.S2_plus_pay_text).result, 'contradict');
  assert.equal(gradeSide(clr, families, tol, SENSITIVITY.S3_plus_clearance).result, 'agree');
});

test('saved sample and committed results reproduce from the saved public evidence', () => {
  const raw = new URL('raw/', dir);
  const frame = readdirSync(raw).filter(f => f.startsWith('frame-page-'))
    .flatMap(f => JSON.parse(readFileSync(new URL(f, raw))).features.map(x => ({ ELMNTKEY: Number(x.attributes.ELMNTKEY), SPACETYPE: String(x.attributes.SPACETYPE) })));
  const saved = JSON.parse(readFileSync(new URL('sample.json', dir)));
  assert.deepEqual(drawSample(strataFromFrame(frame), pre.seed), saved.sample);
  const results = JSON.parse(readFileSync(new URL('results.json', dir)));
  assert.deepEqual(gradeDir(dir.pathname), results.preregistered);
  for (const [name, opts] of Object.entries(SENSITIVITY)) assert.deepEqual(gradeDir(dir.pathname, opts), results.sensitivity_post_hoc[name]);
});
