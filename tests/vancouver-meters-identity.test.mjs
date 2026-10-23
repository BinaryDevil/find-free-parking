import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { adaptVancouverMeters, createVancouverMeterAdapter } from '../lib/vancouver-meters.ts';

// All 32 public rows behind the 16 repeated meter_id values, recorded 2026-10-23.
const recorded = JSON.parse(readFileSync(new URL('./fixtures/vancouver/duplicate-meter-groups.json', import.meta.url))).results;
const source = { id: 'synthetic-only', name: 'Synthetic meter evidence', evidenceType: 'E2', approvalState: 'approved', lastSyncAt: '2026-10-15T06:00:00Z', formatValid: true, freshnessMinutes: 10080 };
const options = { source, fetchedAt: source.lastSyncAt, sourceEditedAt: null };
const signal = new AbortController().signal;
const rows = () => structuredClone(recorded);
const byId = records => new Map(records.map(record => [record.sourceRecordId, record]));
const groups = Map.groupBy(recorded, row => row.meter_id);

/** Offset server that sorts by the requested field; ties flip between requests like an unstable sort. */
function server(feed, { ignoreOrder = false } = {}) {
  let calls = 0;
  const metadata = { metas: { default: { records_count: feed.length, modified: '2026-10-19T13:31:55+00:00' } } };
  return async url => {
    const target = new URL(url);
    if (!target.pathname.endsWith('/records')) return { ok: true, json: async () => metadata };
    const field = ignoreOrder ? 'meter_id' : target.searchParams.get('order_by');
    const flip = calls++ % 2 ? -1 : 1;
    const sorted = feed.map((row, index) => ({ row, index }))
      .sort((a, b) => a.row[field] < b.row[field] ? -1 : a.row[field] > b.row[field] ? 1 : flip * (a.index - b.index))
      .map(({ row }) => structuredClone(row));
    const offset = Number(target.searchParams.get('offset'));
    return { ok: true, json: async () => ({ total_count: feed.length, results: sorted.slice(offset, offset + Number(target.searchParams.get('limit'))) }) };
  };
}

test('recorded repeats are distinct equipment: one identity per publisher feature_id', () => {
  assert.equal(recorded.length, 32);
  assert.equal(groups.size, 16);
  for (const [meterId, pair] of groups) {
    assert.equal(pair.length, 2, meterId);
    assert.notEqual(pair[0].feature_id, pair[1].feature_id, meterId);
    assert.notEqual(pair[0].post_feature_id, pair[1].post_feature_id, meterId);
    assert.equal(pair.filter(row => row.service_status === 'Removed').length, 1, meterId);
  }
  const records = adaptVancouverMeters(rows(), options).records;
  assert.deepEqual(records.map(record => record.sourceRecordId), recorded.map(row => `feature:${row.feature_id}`));
  assert.deepEqual(records.map(record => record.raw), recorded);
});

test('identity is stable across refetch and row reordering', () => {
  const baseline = byId(adaptVancouverMeters(rows(), options).records);
  for (const [name, order] of [
    ['refetch', rows()],
    ['reversed', rows().reverse()],
    ['rotated', [...rows().slice(13), ...rows().slice(0, 13)]],
    ['pair members swapped', [...groups.values()].flatMap(pair => structuredClone([pair[1], pair[0]]))],
  ]) {
    const records = byId(adaptVancouverMeters(order, options).records);
    assert.deepEqual([...records.keys()].sort(), [...baseline.keys()].sort(), name);
    for (const [id, record] of records) assert.deepEqual(record.rules, baseline.get(id).rules, `${name} ${id}`);
  }
});

test('rate, limit, schedule and status changes keep both members\' identities', () => {
  const live = recorded.find(row => row.meter_id === '303009' && row.service_status === 'In Service');
  const baseline = byId(adaptVancouverMeters(rows(), options).records);
  for (const change of [
    { rate_9am_6pm: '$9.00' }, { rate_6pm_10pm: '$1.00' }, { time_limit_9am_6pm: '4 Hr' },
    { prohibition_1_days: 'Mon-Fri', prohibition_1_time: '7:00 AM - 9:00 AM', prohibition_1_zone: 'NO STOPPING' },
    { am_rush_hours: '7:00 AM - 9:30 AM' }, { service_status: 'Out of Service' },
  ]) {
    const feed = rows().map(row => row.feature_id === live.feature_id ? { ...row, ...change } : row);
    const records = byId(adaptVancouverMeters(feed, options).records);
    assert.deepEqual([...records.keys()], [...baseline.keys()], JSON.stringify(change));
    const id = `feature:${live.feature_id}`;
    assert.notDeepEqual(records.get(id).raw, baseline.get(id).raw);
    assert.ok(records.get(id).rules.every(rule => rule.sourceRecordId === id && rule.id.startsWith(`${id}:`)));
  }
});

test('real repeats serve only the non-Removed member; a removed duplicate retires only its own place', async () => {
  const snapshot = async feed => (await createVancouverMeterAdapter(options, server(feed)).fetchSnapshot(signal)).places;
  const live = await snapshot(rows());
  assert.deepEqual(live.map(place => place.sourceRecordId).sort(),
    recorded.filter(row => row.service_status !== 'Removed').map(row => `feature:${row.feature_id}`).sort());
  for (const [meterId, pair] of groups) {
    // Synthetic: both members served, then the publisher drops one of them.
    const served = rows().map(row => row.meter_id === meterId ? { ...row, service_status: 'In Service' } : row);
    const before = byId(await snapshot(served));
    for (const gone of pair) {
      const after = byId(await snapshot(served.filter(row => row.feature_id !== gone.feature_id)));
      assert.deepEqual([...before.keys()].filter(id => !after.has(id)), [`feature:${gone.feature_id}`], meterId);
      assert.equal(after.size, before.size - 1);
      for (const [id, place] of after) assert.deepEqual(place, before.get(id), `${meterId} ${id}`);
    }
  }
});

test('ambiguous identity evidence fails the whole snapshot atomically', async () => {
  const [first, second] = groups.get('302128');
  const edit = (feature, change) => rows().map(row => row.feature_id === feature ? { ...row, ...change } : row);
  const without = (feature, field) => rows().map(row => {
    if (row.feature_id !== feature) return row;
    const copy = { ...row }; delete copy[field]; return copy;
  });
  for (const [name, feed, error] of [
    ['byte-identical repeated row', [...rows(), structuredClone(first)], /Duplicate feature_id/],
    ['repeated feature_id with different content', [...rows(), { ...structuredClone(first), rate_9am_6pm: '$9.00' }], /Duplicate feature_id/],
    ['same meter_id on the same post', edit(second.feature_id, { post_feature_id: first.post_feature_id }), /Ambiguous repeated meter_id/],
    ['missing feature_id', without(first.feature_id, 'feature_id'), /feature_id/],
    ['null feature_id', edit(first.feature_id, { feature_id: null }), /feature_id/],
    ['text feature_id', edit(first.feature_id, { feature_id: String(first.feature_id) }), /feature_id/],
    ['fractional feature_id', edit(first.feature_id, { feature_id: 1.5 }), /feature_id/],
    ['zero feature_id', edit(first.feature_id, { feature_id: 0 }), /feature_id/],
    ['missing post_feature_id', without(first.feature_id, 'post_feature_id'), /post_feature_id/],
  ]) {
    assert.throws(() => adaptVancouverMeters(feed, options), error, name);
    await assert.rejects(() => createVancouverMeterAdapter(options, server(feed)).fetchSnapshot(signal), /feature_id|order|Ambiguous/, name);
  }
});

test('a page boundary inside a duplicate group neither drops nor double-counts a record', async () => {
  const filler = recorded.find(row => row.service_status === 'In Service');
  const make = (n, prefix, start) => Array.from({ length: n }, (_, i) => ({
    ...structuredClone(filler), meter_id: `${prefix}${String(i).padStart(5, '0')}`, feature_id: start + i, post_feature_id: start + i,
  }));
  // Under meter_id order the 303009 pair sits at positions 99 and 100: across the first page boundary.
  const feed = [...make(99, '0', 100000), ...structuredClone(groups.get('303009')), ...make(5, '9', 200000)];
  const expected = feed.map(row => `feature:${row.feature_id}`).sort();

  // The old meter_id order really loses a record here, so the fixture exercises the boundary.
  const naive = server(feed);
  const naiveRows = [];
  while (naiveRows.length < feed.length) {
    naiveRows.push(...(await (await naive(`https://x/records?order_by=meter_id&limit=100&offset=${naiveRows.length}`)).json()).results);
  }
  assert.ok(new Set(naiveRows.map(row => row.feature_id)).size < feed.length, 'meter_id paging should drop/double a tied record');

  const places = (await createVancouverMeterAdapter(options, server(feed)).fetchSnapshot(signal)).places;
  assert.deepEqual(places.map(place => place.sourceRecordId).sort(),
    expected.filter(id => id !== `feature:${groups.get('303009').find(row => row.service_status === 'Removed').feature_id}`));

  // A publisher that ignores the requested order is detected rather than trusted.
  await assert.rejects(() => createVancouverMeterAdapter(options, server(feed, { ignoreOrder: true })).fetchSnapshot(signal), /order/);
});
