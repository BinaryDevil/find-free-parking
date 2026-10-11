import { execFileSync } from 'node:child_process';

// Every migration integrated into the comparison base is sealed, even if an
// environment has not applied it yet. This needs no database secrets in CI.
try {
  const base = process.argv[2];
  if (!base) throw new Error('Usage: node scripts/check-migration-files.mjs <base-ref>');
  const git = (...args) => execFileSync('git', args, { stdio: ['ignore', 'pipe', 'pipe'] });
  git('rev-parse', '--verify', `${base}^{commit}`);
  const files = git('ls-tree', '-r', '--name-only', '-z', base, '--', 'sql/migrations').toString().split('\0').filter(Boolean);
  for (const file of files) {
    // Git applies the checkout's line-ending filters, including on Windows.
    git('diff', '--exit-code', base, '--', file);
  }
  console.log(`Migration immutability passed (${files.length} sealed files).`);
} catch {
  console.error('Migration immutability failed: missing base, missing file, or changed sealed migration. Add a new migration instead.');
  process.exitCode = 1;
}
