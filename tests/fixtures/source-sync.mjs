export function fixtureSnapshot() {
  return { complete: true, sourceEditedAt: '2026-10-14T00:00:00Z', places: [{
    sourceRecordId: 'curb-a', kind: 'curb', city: 'Fixture', timezone: 'America/Vancouver',
    geom: { type: 'LineString', coordinates: [[0, 0], [0.1, 0.1]] }, rawData: { public: 'fixture' },
    rules: [{ sourceRecordId: 'rule-a', kind: 'free', days: [0,1,2,3,4,5,6], startMinute: 0, endMinute: 1440,
      priority: 0, parsed: true, permissionComplete: true, rawData: { public: 'fixture' } }],
  }] };
}

