import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, lstatSync } from 'node:fs';
import { join, basename } from 'node:path';

const pattern = /^\d{13}_[a-z0-9_]+\.sql$/;
export const baselineName = '1791676800000_baseline';
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
export const digest = value => createHash('sha256').update(value).digest('hex');
const identity = file => basename(file.path, '.sql');

export function checkManifestExtension(before, after) {
  if (before.version !== after.version || canonical(before.baseline) !== canonical(after.baseline) || canonical(before.superseded) !== canonical(after.superseded)) throw new Error('Changed immutable manifest contract');
  for (const lineage of ['legacy', 'preservation']) {
    if (canonical(before[lineage]) !== canonical(after[lineage].slice(0, before[lineage].length))) throw new Error('Changed immutable manifest prefix');
  }
}

export function loadMigrationManifest(root = '.') {
  const manifest = JSON.parse(readFileSync(join(root, 'sql/migration-manifest.json'), 'utf8'));
  if (canonical(Object.keys(manifest).sort()) !== canonical(['baseline', 'legacy', 'preservation', 'superseded', 'version']) || manifest.version !== 1 || !Array.isArray(manifest.legacy) || !Array.isArray(manifest.preservation) || !Array.isArray(manifest.superseded) ||
      manifest.legacy.length === 0 || canonical(manifest.baseline) !== canonical(manifest.legacy[0]) || identity(manifest.baseline) !== baselineName) throw new Error('Invalid migration manifest');
  for (const [key, directory] of [['legacy', 'sql/migrations'], ['preservation', 'sql/preservation-v1']]) {
    const entries = manifest[key];
    const names = entries.map(entry => basename(entry.path));
    if (new Set(names).size !== names.length || canonical(names) !== canonical([...names].sort())) throw new Error('Invalid migration order');
    for (const entry of entries) {
      if (canonical(Object.keys(entry).sort()) !== canonical(['path', 'sha256']) || !pattern.test(basename(entry.path)) || entry.path !== `${directory}/${basename(entry.path)}` || !/^[a-f0-9]{64}$/.test(entry.sha256) ||
          !lstatSync(join(root, entry.path)).isFile() || digest(readFileSync(join(root, entry.path))) !== entry.sha256) throw new Error('Migration identity or hash mismatch');
    }
    if (canonical(readdirSync(join(root, directory)).sort()) !== canonical(names)) throw new Error('Unlisted migration file');
  }
  if (canonical(manifest.superseded) !== canonical(manifest.legacy.slice(1).map(file => file.path)) || new Set(manifest.superseded).size !== manifest.superseded.length || manifest.superseded.some(path => !manifest.legacy.slice(1).some(file => file.path === path))) throw new Error('Invalid superseded operations');
  return manifest;
}

function assertHistory(applied, files) {
  if (!Array.isArray(applied) || applied.some(name => typeof name !== 'string') || canonical(applied) !== canonical(files.slice(0, applied.length).map(identity))) throw new Error('Unknown or out-of-order migration history');
}

export function resolveMigrationLineage(manifest, state, { lineage, adopt = false } = {}) {
  assertHistory(state.legacy, manifest.legacy);
  assertHistory(state.preservation, manifest.preservation);
  if (state.adoption) {
    if (adopt || state.adoption.lineage !== 'preservation-v1' || (lineage && lineage !== 'preservation-v1')) throw new Error('Conflicting lineage adoption');
    checkManifestExtension(state.adoption.manifest, manifest);
    if (state.adoption.manifest_hash !== digest(canonical(state.adoption.manifest)) || state.adoption.baseline_hash !== manifest.baseline.sha256 ||
        state.adoption.history_hash !== digest(canonical([baselineName])) || canonical(state.legacy) !== canonical([baselineName])) throw new Error('Invalid adoption history');
    return { lineage: 'preservation-v1', requiresAdoption: false, requiresBaseline: false, pending: manifest.preservation.slice(state.preservation.length) };
  }
  if (state.preservation.length) throw new Error('Preservation history without adoption');
  if (adopt) {
    if (lineage && lineage !== 'preservation-v1') throw new Error('Conflicting lineage adoption');
    if (state.legacy.length > 1) throw new Error('Later legacy migrations prevent preservation adoption');
    return { lineage: 'preservation-v1', requiresAdoption: true, requiresBaseline: state.legacy.length === 0, pending: manifest.preservation };
  }
  if (lineage && lineage !== 'legacy') throw new Error('Explicit adoption required');
  return { lineage: 'legacy', requiresAdoption: false, requiresBaseline: state.legacy.length === 0, pending: manifest.legacy.slice(state.legacy.length) };
}
