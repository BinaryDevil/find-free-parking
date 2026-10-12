import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';

const checker = resolve('scripts/check-migration-files.mjs');

test('migration CI permits additions but rejects edits, deletions and renames already in Git', () => {
  const dir = mkdtempSync(join(tmpdir(), 'migration-files-'));
  const git = (...args) => execFileSync('git', args, { cwd: dir, stdio: 'pipe' });
  const check = () => spawnSync(process.execPath, [checker, 'HEAD'], { cwd: dir, encoding: 'utf8' });
  try {
    git('init');
    git('config', 'user.email', 'test@example.invalid');
    git('config', 'user.name', 'Migration test');
    mkdirSync(join(dir, 'sql/migrations'), { recursive: true });
    const baseline = join(dir, 'sql/migrations/001_baseline.sql');
    writeFileSync(baseline, 'SELECT 1;\n');
    git('add', '.');
    git('commit', '-m', 'baseline');
    assert.equal(check().status, 0);
    writeFileSync(join(dir, 'sql/migrations/002_next.sql'), 'SELECT 2;\n');
    assert.equal(check().status, 0);
    writeFileSync(baseline, 'SELECT 3;\n');
    assert.equal(check().status, 1);
    writeFileSync(baseline, 'SELECT 1;\n');
    renameSync(baseline, join(dir, 'sql/migrations/003_renamed.sql'));
    assert.equal(check().status, 1);
    rmSync(join(dir, 'sql/migrations/003_renamed.sql'));
    assert.equal(check().status, 1);
    const badRef = spawnSync(process.execPath, [checker, 'missing-ref'], { cwd: dir });
    assert.equal(badRef.status, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
