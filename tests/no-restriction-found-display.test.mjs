import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { addParkingLayers, NO_RESTRICTION_FOUND_STYLE } from '../components/parking-map/layers.ts';
import { classifiedMapFeatures, summarySegments } from '../components/parking-map/data.ts';
import { displayClassification, measurementText, missingCategoriesText, noRestrictionFoundPopupLines } from '../components/parking-map/no-restriction-found.ts';
import { clopperPearsonUpper, oneIn } from '../lib/nrf-bound.ts';
import { parkingLabelKey, popupLines } from '../components/parking-map/popup.ts';
import { cityNoRestrictionFound, noRestrictionFoundEnabled } from '../lib/no-restriction-found-city.ts';

const locales = ['ar', 'bn', 'en', 'es', 'fr', 'hi', 'pt', 'zh'];
const messages = Object.fromEntries(locales.map(locale => [locale, JSON.parse(readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), 'utf8'))]));
const t = (key, values = {}) => {
  const message = key.split('.').reduce((node, part) => node?.[part], messages.en.HomePage);
  assert.equal(typeof message, 'string', `missing message ${key}`);
  return message.replace(/\{(\w+)\}/g, (_, name) => String(values[name]));
};

const measurement = { sampled: 50, misses: 1, checkedAgainst: "Seattle's sign inventory", measuredAt: '2026-10-01T00:00:00Z', verdict: 'pass' };
function evaluation(variant, overrides = {}) {
  const limits = variant.startsWith('limit') ? [{ minutes: 120, bands: [{ days: [1, 2, 3, 4, 5], startMinute: 480, endMinute: 1080 }] }] : [];
  return {
    classification: 'NO_RESTRICTION_FOUND', explanation: 'x', timeLimitMinutes: limits[0]?.minutes ?? null, rate: null,
    nextChange: null, activeRules: [], source: null, asOf: null, driverWarnings: [],
    noRestrictionFound: {
      classification: 'NO_RESTRICTION_FOUND', notVerified: true, variant, textKey: 'ignored', limits,
      sourcesChecked: [{ id: 's1', name: 'SDOT Blockface', asOf: '2026-10-20T12:00:00Z' }],
      missingCategories: ['bus_transit', 'loading'], stayMinutes: 120, stayAssumed: true,
    },
    noRestrictionFoundMeasurement: measurement,
    ...overrides,
  };
}
const feature = (value, type = 'LineString') => ({ type: 'Feature', geometry: { type, coordinates: [] }, properties: { evaluation: value } });
const plain = classification => ({ classification, driverWarnings: [], timeLimitMinutes: null, rate: null });

test('layer style: a hollow blue outline under Verified Free, never the solid, dashed or grey styles', () => {
  const layers = [];
  addParkingLayers({ addLayer: layer => layers.push(layer) });
  const byId = Object.fromEntries(layers.map((layer, index) => [layer.id, { ...layer, index }]));
  const isNrf = ['==', ['get', 'classification'], 'NO_RESTRICTION_FOUND'];
  const notNrf = ['!=', ['get', 'classification'], 'NO_RESTRICTION_FOUND'];
  for (const prefix of ['streets', 'zones']) {
    const outer = byId[`${prefix}-nrf-outer`], inner = byId[`${prefix}-nrf-inner`];
    assert.deepEqual(outer.filter, isNrf);
    assert.deepEqual(inner.filter, isNrf);
    assert.equal(outer.paint['line-color'], NO_RESTRICTION_FOUND_STYLE.outline);
    assert.equal(inner.paint['line-color'], NO_RESTRICTION_FOUND_STYLE.inner);
    const width = value => Array.isArray(value) ? value.at(-1) : value;
    assert.ok(width(outer.paint['line-width']) > width(inner.paint['line-width']) + 2, 'outer line visibly wider than the inner line');
    assert.ok(outer.index < inner.index, 'inner line draws on the outer line');
    assert.equal(outer.paint['line-dasharray'], undefined, 'not dashed like Unknown');
  }
  // Existing styles never draw these places, and Verified Free ranks above.
  for (const id of ['streets-line', 'streets-line-outline', 'zones-line']) assert.deepEqual(byId[id].filter, notNrf);
  assert.ok(byId['streets-nrf-inner'].index < byId['streets-line'].index);
  assert.deepEqual(byId['zones-fill'].paint['fill-opacity'], ['case', isNrf, 0, 0.4]);
  const spots = byId['spots-unclustered'];
  assert.deepEqual(spots.paint['circle-stroke-color'], ['case', isNrf, NO_RESTRICTION_FOUND_STYLE.outline, '#fff']);
  assert.deepEqual(spots.paint['circle-stroke-width'], ['case', isNrf, 3, 1.5]);
  const fill = spots.paint['circle-color'];
  assert.equal(fill[fill.indexOf('NO_RESTRICTION_FOUND') + 1], NO_RESTRICTION_FOUND_STYLE.inner);
  assert.deepEqual(spots.layout['circle-sort-key'], ['case', isNrf, 0, 1]);
});

test('popup gives the full rule-1 text per variant, sources with as-of dates, missing categories and the measurement', () => {
  const expected = {
    no_limit: 'Not verified: official data shows no payment or restriction here. Posted signs and parking laws (hydrants, driveways, crosswalks) still apply.',
    limit_fits: 'Not verified: official data shows no payment here. Limit: 120 min (Mon, Tue, Wed, Thu, Fri 08:00–18:00). Posted signs and parking laws still apply.',
    no_payment_source: 'Not verified: official data shows no restriction here, and payment is not recorded for this place. Posted signs and parking laws (hydrants, driveways, crosswalks) still apply.',
    limit_no_payment_source: 'Not verified: payment is not recorded for this place. Limit: 120 min (Mon, Tue, Wed, Thu, Fri 08:00–18:00). Posted signs and parking laws (hydrants, driveways, crosswalks) still apply.',
  };
  for (const [variant, text] of Object.entries(expected)) {
    const lines = noRestrictionFoundPopupLines(evaluation(variant), t, 'en');
    assert.deepEqual(lines, [
      { role: 'title', text: 'Not verified: no restriction found' },
      { role: 'text', text },
      { role: 'note', text: 'Assumes a stay of 120 min.' },
      { role: 'text', text: "Checked 50 places against Seattle's sign inventory: 1 had a restriction the other data missed (up to about 1 in 10)." },
      { role: 'heading', text: 'Sources checked:' },
      { role: 'item', text: `SDOT Blockface, as of ${new Date('2026-10-20T12:00:00Z').toLocaleDateString('en')}` },
      { role: 'text', text: 'No official dataset here records the following, so they were not checked: bus stops and transit layovers and loading zones (commercial, truck, passenger).' },
    ], variant);
  }
});

test('popup text is rendered through textContent only, so source names cannot inject markup', () => {
  const created = [];
  globalThis.document = { createElement: tag => {
    const element = { tag, style: {}, set innerHTML(_) { throw new Error('innerHTML must not be used'); } };
    created.push(element);
    return element;
  } };
  try {
    const hostile = '<img src=x onerror=alert(1)>';
    const value = evaluation('no_limit');
    value.noRestrictionFound.sourcesChecked[0].name = hostile;
    const elements = popupLines(noRestrictionFoundPopupLines(value, t, 'en'));
    assert.equal(elements.length, 7);
    assert.ok(elements.some(element => element.textContent.startsWith(`${hostile}, as of`)));
    assert.ok(elements.every(element => typeof element.textContent === 'string' && element.tag === 'div'));
  } finally {
    delete globalThis.document;
  }
});

test('the label shows only with a passed check and a valid measurement; otherwise Unknown', () => {
  assert.equal(displayClassification(evaluation('no_limit')), 'NO_RESTRICTION_FOUND');
  assert.equal(displayClassification(plain('VERIFIED_FREE')), 'FREE');
  assert.equal(displayClassification(plain('PAID')), 'PAID');
  for (const broken of [
    { noRestrictionFoundMeasurement: undefined },
    { noRestrictionFoundMeasurement: { ...measurement, sampled: 29 } },
    { noRestrictionFoundMeasurement: { ...measurement, sampled: 30 } },
    { noRestrictionFoundMeasurement: { ...measurement, misses: 31 } },
    { noRestrictionFoundMeasurement: { ...measurement, checkedAgainst: ' ' } },
    // Rule 5: only a passed run enables the label (#143 verdicts; a hard block is 'fail').
    { noRestrictionFoundMeasurement: { ...measurement, verdict: 'fail' } },
    { noRestrictionFoundMeasurement: { ...measurement, verdict: 'no_threshold' } },
    { noRestrictionFoundMeasurement: { ...measurement, verdict: 'insufficient_sample' } },
    { noRestrictionFoundMeasurement: { ...measurement, verdict: undefined } },
    { noRestrictionFound: { ...evaluation('no_limit').noRestrictionFound, classification: 'WITHHELD' } },
    { noRestrictionFound: { ...evaluation('no_limit').noRestrictionFound, variant: 'free' } },
    { noRestrictionFound: undefined },
  ]) {
    const value = evaluation('no_limit', broken);
    assert.equal(displayClassification(value), 'UNKNOWN');
    assert.deepEqual(noRestrictionFoundPopupLines(value, t, 'en'), []);
  }
  assert.equal(parkingLabelKey({ classification: 'NO_RESTRICTION_FOUND' }), 'noRestrictionFound.legend');
});

test('the bound is the shared exact Clopper-Pearson value and "1 in N" rounds down, as in the #143 tool', () => {
  assert.ok(Math.abs(clopperPearsonUpper(0, 30) - (1 - 0.05 ** (1 / 30))) < 1e-12);
  assert.ok(Math.abs(clopperPearsonUpper(1, 30) - 0.14859606865911315) < 1e-9);
  const sentence = misses => measurementText({ ...measurement, sampled: 30, misses }, t);
  assert.equal(sentence(0), "Checked 30 places against Seattle's sign inventory: 0 had a restriction the other data missed (up to about 1 in 10).");
  assert.equal(sentence(1), "Checked 30 places against Seattle's sign inventory: 1 had a restriction the other data missed (up to about 1 in 6).");
  for (const misses of [0, 1, 2, 3]) {
    const bound = clopperPearsonUpper(misses, 30);
    assert.ok(1 / oneIn(bound) >= bound, 'never understates the bound');
  }
  assert.equal(missingCategoriesText([], t, 'en'), null);
});

test('Free view shows these places by default, apart from Verified Free; the toggle hides them; Paid view never shows them', () => {
  const features = [feature(plain('VERIFIED_FREE')), feature(evaluation('no_limit')), feature(evaluation('limit_fits'), 'Point'),
    feature(evaluation('no_limit', { noRestrictionFoundMeasurement: undefined })), feature(plain('PAID'))];
  const shown = classifiedMapFeatures(features, 'FREE');
  assert.deepEqual(shown.lines.map(item => item.properties.classification), ['FREE', 'NO_RESTRICTION_FOUND', 'UNKNOWN']);
  assert.deepEqual(shown.points.map(item => item.properties.classification), ['NO_RESTRICTION_FOUND']);
  assert.equal(shown.lineCount, 1, 'not counted as Verified Free');
  assert.equal(shown.pointCount, 0);
  assert.equal(shown.noRestrictionFoundCount, 2);
  assert.equal(shown.noRestrictionFoundAvailable, 2);
  assert.equal(shown.unknownCount, 1);
  const hidden = classifiedMapFeatures(features, 'FREE', false);
  assert.deepEqual(hidden.lines.map(item => item.properties.classification), ['FREE', 'UNKNOWN']);
  assert.equal(hidden.points.length, 0);
  assert.equal(hidden.noRestrictionFoundCount, 0);
  assert.equal(hidden.noRestrictionFoundAvailable, 2, 'the toggle stays available while hidden');
  const paid = classifiedMapFeatures(features, 'PAID');
  assert.ok(paid.lines.every(item => item.properties.classification !== 'NO_RESTRICTION_FOUND'));
  assert.equal(paid.noRestrictionFoundAvailable, 0);
});

test('summary bar counts these places separately, after the view\'s own places and before Unknown', () => {
  assert.deepEqual(summarySegments({ meters: 0, streets: 2, zones: 1, noRestrictionFound: 3, unknown: 4 }), {
    main: [{ key: 'blocks', count: 2 }, { key: 'lots', count: 1 }],
    extra: [{ key: 'noRestrictionFound.count', count: 3 }, { key: 'unknownCount', count: 4 }],
  });
  assert.deepEqual(summarySegments({ meters: 0, streets: 0, zones: 0, noRestrictionFound: 0, unknown: 0 }), { main: [], extra: [] });
  assert.equal(t('noRestrictionFound.count', { count: 3 }), 'Not verified: no restriction found: 3');
});

test('English texts match ADR-0001 rule 1 exactly, and every locale has the same keys', () => {
  const adr = readFileSync(new URL('../docs/adr/0001-verified-rules-only.md', import.meta.url), 'utf8');
  const quoted = [...adr.slice(adr.indexOf('**1. What drivers see.**'), adr.indexOf('**2. Parking layer.**')).matchAll(/"(Not verified:[^"]+)"/g)]
    .map(match => match[1].replace('<limit and hours>', '{limit}'));
  const nrf = messages.en.HomePage.noRestrictionFound;
  assert.deepEqual(quoted, [nrf.noLimit, nrf.limitFits, nrf.noPaymentSource, nrf.limitNoPaymentSource, nrf.legend]);
  const shape = value => typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, shape(item)])) : typeof value;
  const placeholders = value => typeof value === 'object' ? Object.values(value).map(placeholders) : [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
  for (const locale of locales) {
    const home = messages[locale].HomePage;
    assert.equal(typeof home.cityNoRestrictionFound, 'string', locale);
    assert.deepEqual(shape(home.noRestrictionFound), shape(nrf), locale);
    assert.deepEqual(placeholders(home.noRestrictionFound), placeholders(nrf), locale);
    assert.ok(!JSON.stringify(home.noRestrictionFound).includes("'"), `${locale}: no ICU-escaping apostrophes`);
  }
});

test('city page shows its line, the miss rate and the missing categories only with a passed summary and an enabled register', async () => {
  const approved = { approval_state: 'approved', approved_by: ['agent-a', 'agent-b'], approval_refs: ['#1', '#2'], measurement_ref: '#137' };
  const queries = [];
  const query = row => async sql => { queries.push(sql); return sql.includes('to_regclass') ? { rows: [{ ready: true }] } : { rows: row ? [row] : [] }; };
  const summary = { measurement, missingCategories: ['bus_transit', 'loading'] };
  assert.equal(await cityNoRestrictionFound(query(approved), 'area', summary), summary);
  assert.equal(await cityNoRestrictionFound(query(undefined), 'area', summary), null, 'no register');
  assert.equal(await cityNoRestrictionFound(query({ ...approved, measurement_ref: null }), 'area', summary), null);
  for (const verdict of ['fail', 'no_threshold', 'insufficient_sample']) {
    assert.equal(await cityNoRestrictionFound(query(approved), 'area', { ...summary, measurement: { ...measurement, verdict } }), null, verdict);
  }
  queries.length = 0;
  assert.equal(await cityNoRestrictionFound(query(approved), 'area', null), null, 'no stored summary: dark today');
  assert.deepEqual(queries, [], 'no summary, no query');
  assert.equal(missingCategoriesText(summary.missingCategories, t, 'en'),
    'No official dataset here records the following, so they were not checked: bus stops and transit layovers and loading zones (commercial, truck, passenger).');
});

test('city-page line needs the latest register approved by two distinct agents and measured', async () => {
  const run = row => noRestrictionFoundEnabled(async sql => sql.includes('to_regclass') ? { rows: [{ ready: true }] } : { rows: row ? [row] : [] }, 'area');
  const approved = { approval_state: 'approved', approved_by: ['agent-a', 'agent-b'], approval_refs: ['#1', '#2'], measurement_ref: '#137' };
  assert.equal(await run(approved), true);
  assert.equal(await run(undefined), false);
  assert.equal(await run({ ...approved, measurement_ref: null }), false);
  assert.equal(await run({ ...approved, approval_state: 'pending' }), false);
  assert.equal(await run({ ...approved, approved_by: ['agent-a', ' agent-a '] }), false);
  assert.equal(await run({ ...approved, approval_refs: ['#1'] }), false);
  assert.equal(await noRestrictionFoundEnabled(async () => ({ rows: [{ ready: false }] }), 'area'), false, 'unapplied migration stays dark');
});
