import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { loadMigrationManifest, resolveMigrationLineage, checkManifestExtension } from '../scripts/migration-lineage.mjs';

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'preservation-lineage-'));
  const files = [
    ['sql/migrations/1791676800000_baseline.sql', 'SELECT 1;'],
    ['sql/migrations/1791853200000_schema_hygiene.sql', 'SELECT 2;'],
    ['sql/preservation-v1/1792627200000_foundation.sql', 'SELECT 3;'],
  ].map(([path, sql]) => {
    mkdirSync(join(root, path, '..'), { recursive: true }); writeFileSync(join(root, path), sql);
    return { path, sha256: createHash('sha256').update(sql).digest('hex') };
  });
  const manifest = { version: 1, baseline: files[0], legacy: files.slice(0, 2), preservation: [files[2]], superseded: [files[1].path] };
  const save = () => writeFileSync(join(root, 'sql/migration-manifest.json'), JSON.stringify(manifest));
  save();
  return { root, manifest, save, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

test('baseline-only target can explicitly adopt preservation without recording superseded operations', () => {
  const f = fixture();
  try {
    const manifest = loadMigrationManifest(f.root);
    const plan = resolveMigrationLineage(manifest, { legacy: ['1791676800000_baseline'], preservation: [], adoption: null }, { adopt: true });
    assert.equal(plan.lineage, 'preservation-v1');
    assert.deepEqual(plan.pending.map(file => file.path), ['sql/preservation-v1/1792627200000_foundation.sql']);
    assert.equal(plan.requiresAdoption, true);
    assert.equal(plan.requiresBaseline, false);
    assert.throws(() => resolveMigrationLineage(manifest, { legacy: ['1791676800000_baseline'], preservation: [], adoption: null }, { lineage: 'preservation-v1' }), /adoption/);
  } finally { f.cleanup(); }
});

test('changed hashes, unlisted files and rewritten history fail before selecting a migration', () => {
  const f = fixture();
  try {
    const manifest = loadMigrationManifest(f.root);
    for (const legacy of [['unknown'], ['1791853200000_schema_hygiene'], ['1791676800000_baseline', '1791676800000_baseline']]) {
      assert.throws(() => resolveMigrationLineage(manifest, { legacy, preservation: [], adoption: null }, { adopt: true }), /history/);
    }
    assert.throws(() => resolveMigrationLineage(manifest, { legacy: ['1791676800000_baseline', '1791853200000_schema_hygiene'], preservation: [], adoption: null }, { adopt: true }), /Later legacy/);
    const append = structuredClone(manifest); append.preservation.push({ path: 'sql/preservation-v1/1792627200001_later.sql', sha256: 'a'.repeat(64) });
    assert.doesNotThrow(() => checkManifestExtension(manifest, append));
    append.preservation[0].sha256 = 'b'.repeat(64);
    assert.throws(() => checkManifestExtension(manifest, append), /prefix/);
    writeFileSync(join(f.root, manifest.baseline.path), 'SELECT 99;');
    assert.throws(() => loadMigrationManifest(f.root), /hash/);
  } finally { f.cleanup(); }
});

test('manifest cannot smuggle a third lineage, symlink or reordered operation', () => {
  const f = fixture();
  try {
    f.manifest.alternate = []; f.save();
    assert.throws(() => loadMigrationManifest(f.root), /manifest/);
  } finally { f.cleanup(); }
});

test('preservation manifest names every sealed operation it does not execute', () => {
  const f = fixture();
  try { f.manifest.superseded = []; f.save(); assert.throws(() => loadMigrationManifest(f.root), /superseded/); }
  finally { f.cleanup(); }
});
