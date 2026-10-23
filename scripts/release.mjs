import { pathToFileURL } from 'node:url';
import { reportFailure } from './github-alert.ts';
import { canonical, digest, resolveMigrationLineage } from './migration-lineage.mjs';
import { readMigrationState, readAdoptionInputs, verifyAdoptionReference, captureSchema } from './preservation-adoption.mjs';
import { loadMigrationManifest } from './migration-lineage.mjs';
import { materializeAdoptionReference } from './preservation-reference.mjs';
import { basename } from 'node:path';
import { directMigrationUrl, verifyMigrationIdentity } from './migration-connection.mjs';

const repository = 'BinaryDevil/find-free-parking';
const migrationPattern = /^\d{13}_[a-z0-9_]+\.sql$/;
const project = 'misty-breeze-47060812';
const parent = 'br-rough-base-aryz0z5a';

export function productionMigrationUrl(connectionString, endpoints, databases) {
  const url = directMigrationUrl(connectionString);
  const endpoint = endpoints.find(e => e.branch_id === parent && e.type === 'read_write' && e.host === url.hostname);
  const databaseName = decodeURIComponent(url.pathname.slice(1));
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.hostname.includes('-pooler') || !endpoint ||
      !databases.some(d => d.name === databaseName && d.owner_name === decodeURIComponent(url.username)) ||
      decodeURIComponent(url.username) !== 'find-free-parking-db_owner') throw new Error('Production identity mismatch');
  return url;
}

export function authorizeRelease(prs, sha) {
  const matches = prs.filter(pr => pr.merged && pr.merge_commit_sha === sha && pr.merged_by?.type === 'User' &&
    pr.base?.ref === 'main' && pr.head?.ref === 'dev' &&
    pr.base.repo?.full_name === repository && pr.head.repo?.full_name === repository);
  if (matches.length !== 1) throw new Error('No unique human-merged dev release');
  const pr = matches[0];
  const actions = pr.body?.match(/^## Production actions\s*\n([\s\S]*?)(?=^## |$(?![\s\S]))/m)?.[1];
  if (!actions) throw new Error('Missing Production actions');
  if (/^- (?:Migration lineage|Migration manifest|Adoption reference):/m.test(actions) || actions.includes('sql/preservation-v1/')) {
    const lineages = [...actions.matchAll(/^- Migration lineage: `([^`]+)`\s*$/gm)].map(match => match[1]);
    const hashes = [...actions.matchAll(/^- Migration manifest: `([a-f0-9]{64})`\s*$/gm)].map(match => match[1]);
    const references = [...actions.matchAll(/^- Adoption reference: `([a-f0-9]{64})`\s*$/gm)].map(match => match[1]);
    const entries = [...actions.matchAll(/^- Migration: `sql\/preservation-v1\/(\d{13}_[a-z0-9_]+\.sql)`\s*$/gm)].map(match => match[1]);
    const reserved = actions.split('\n').filter(line => /^- (?:Migration(?: lineage| manifest)?|Adoption reference):/.test(line));
    if (lineages.length !== 1 || lineages[0] !== 'preservation-v1' || hashes.length !== 1 || references.length > 1 || entries.length === 0 ||
        reserved.length !== 2 + references.length + entries.length || new Set(entries).size !== entries.length || /^No automated migrations\.$/m.test(actions)) throw new Error('Invalid preservation production actions');
    return { number: pr.number, lineage: 'preservation-v1', manifestHash: hashes[0], adoptionReference: references[0] ?? null, migrations: entries.sort() };
  }
  const migrations = [...actions.matchAll(/^- Migration: `sql\/migrations\/(\d{13}_[a-z0-9_]+\.sql)`\s*$/gm)].map(m => m[1]);
  if (migrations.length && /^No automated migrations\.$/m.test(actions)) throw new Error('Contradictory migration list');
  if (!migrations.length && !/^No automated migrations\.$/m.test(actions)) throw new Error('List exact migrations or explicitly none');
  if (new Set(migrations).size !== migrations.length) throw new Error('Duplicate migrations');
  return { number: pr.number, migrations: migrations.sort() };
}

export async function releaseForCommit(github, sha) {
  const summaries = JSON.parse(await github(['api', `repos/${repository}/commits/${sha}/pulls`, '--paginate', '--slurp'])).flat();
  const prs = await Promise.all(summaries.map(pr => github(['api', `repos/${repository}/pulls/${pr.number}`]).then(JSON.parse)));
  if (!prs.some(pr => pr.merged && pr.merge_commit_sha === sha && pr.base?.ref === 'main' && pr.head?.ref === 'dev')) return null;
  return authorizeRelease(prs, sha);
}

export async function runRelease(release, config, { github, database, readiness, snapshot, migrate, smoke, preflightAdoption, adopt }) {
  const results = [];
  const comment = async () => github(['api', `repos/${repository}/issues/${release.number}/comments`, '--method', 'POST', '--input', '-'],
    JSON.stringify({ body: `Production release ${config.sha}\n\n${results.join('\n')}` }));
  try {
    if (release.lineage) {
      const manifest = config.manifest;
      const expected = { lineage: release.lineage, manifestHash: release.manifestHash, adoptionReference: release.adoptionReference, migrations: release.migrations };
      if (!manifest || release.lineage !== 'preservation-v1' || release.manifestHash !== digest(canonical(manifest)) || canonical(config.plan) !== canonical(expected) ||
          release.migrations.some(file => !manifest.preservation.some(entry => basename(entry.path) === file))) throw new Error('Preservation plan differs from merged release');
      const state = await readMigrationState(database);
      const selected = resolveMigrationLineage(manifest, state, { lineage: release.lineage, adopt: !state.adoption });
      const pending = selected.pending.map(entry => basename(entry.path));
      if (selected.requiresBaseline || pending.some(file => !release.migrations.includes(file))) throw new Error('Preservation baseline or pending authorization mismatch');
      if (selected.requiresAdoption) {
        if (!release.adoptionReference || typeof preflightAdoption !== 'function' || typeof adopt !== 'function') throw new Error('Explicit adoption authorization required');
        await preflightAdoption();
      } else if (release.adoptionReference && digest(canonical(state.adoption.reference)) !== release.adoptionReference) throw new Error('Recorded adoption reference differs');
      results.push('Exact preservation manifest, selected history and adoption authorization verified.');
      await readiness();
      const branch = await snapshot();
      results.push(`Snapshot retained: ${branch}.`);
      await readiness();
      if (selected.requiresAdoption) {
        await adopt({ snapshotReference: branch });
        const adopted = await readMigrationState(database);
        if (!adopted.adoption || resolveMigrationLineage(manifest, adopted).lineage !== 'preservation-v1' || digest(canonical(adopted.adoption.reference)) !== release.adoptionReference) throw new Error('Adoption verification failed');
        results.push('Explicit preservation adoption metadata verified; no legacy operation marked executed.');
      }
      if (selected.requiresAdoption) await readiness();
      await migrate({ lineage: selected.lineage });
      const after = await readMigrationState(database);
      if (!after.adoption || resolveMigrationLineage(manifest, after).pending.length) throw new Error('Preservation history mismatch');
      results.push(`Preservation migrations verified: ${pending.length} applied; legacy fields and history retained.`);
      await smoke();
      results.push('Health and Seattle/Vancouver parking API smoke checks passed.');
      await comment();
      return { snapshot: branch, applied: pending };
    }
    if (config.files.some(f => !migrationPattern.test(f)) || !Array.isArray(config.plan) || config.plan.some(f => !migrationPattern.test(f)) ||
        JSON.stringify([...config.plan].sort()) !== JSON.stringify(release.migrations)) throw new Error('Plan differs from merged release');
    await database.query("SELECT to_regclass('migration_meta.pgmigrations') AS ledger");
    let pending = [];
    if (release.migrations.length) {
      const selected = resolveMigrationLineage(config.manifest, await readMigrationState(database), { lineage: 'legacy' });
      pending = selected.pending.map(entry => basename(entry.path));
      if (pending.some(f => !release.migrations.includes(f))) throw new Error('Pending migration not authorized');
      // Existing production must adopt the baseline separately; never replay its DDL.
      if (selected.requiresBaseline) throw new Error('Baseline adoption required');
      results.push('Authorization and pending migration checks passed.');
      await readiness();
      results.push('Exact release deployment and public production revision verified before migrations.');
    } else {
      results.push('Code-only release authorized; no baseline adoption, migrations or migration-history writes.');
    }
    const branch = await snapshot();
    results.push(`Snapshot retained: ${branch}.`);
    // Snapshot readiness can wait; do not reuse deployment proof from before it.
    await readiness();
    if (release.migrations.length) {
      await migrate({ lineage: 'legacy' });
      const after = (await database.query('SELECT name FROM migration_meta.pgmigrations ORDER BY id')).rows.map(r => `${r.name}.sql`);
      if (JSON.stringify(after) !== JSON.stringify(config.files)) throw new Error('Migration history mismatch');
      results.push(`Migrations verified: ${pending.length} applied; ${pending.length ? 'additive rollback uses previous deployment' : 'no-op'}.`);
    } else {
      results.push('Exact code-only release deployment and public production revision verified.');
    }
    await smoke();
    results.push('Health and Seattle/Vancouver parking API smoke checks passed.');
    await comment();
    return { snapshot: branch, applied: pending };
  } catch {
    results.push('FAILED. Inspect the private workflow configuration and target; no data restore is authorized.');
    // Try both channels independently so a comment outage does not suppress alerts.
    const notifications = await Promise.allSettled([
      comment(),
      reportFailure(github, `<!-- production-release:${config.sha} -->`, `Production release failed: ${config.sha.slice(0, 12)}`,
        `Release PR #${release.number}. Run: https://github.com/${repository}/actions/runs/${config.runId || ''}\n\n${results.join('\n')}\n\nInspect privately. Restore the previous deployment if needed; restoring data over user data requires a human. Retry the same workflow only after resolving the failure.`),
    ]);
    if (notifications.some(r => r.status === 'rejected')) throw new Error('Release failed; notification delivery incomplete');
    throw new Error('Release failed; results reported');
  }
}

// The public runtime proof is independent of database/schema readiness.
export async function verifyProductionRevision(github, sha, fetcher = fetch) {
  const deployment = JSON.parse(await github(['api', `repos/${repository}/commits/${sha}/status`]));
  const statuses = deployment.statuses?.filter(status => status.context === 'Vercel');
  if (deployment.sha !== sha || statuses?.length !== 1 || statuses[0].state !== 'success') {
    throw new Error('Release deployment not ready');
  }
  const response = await fetcher('https://findfreeparking.info/api/revision', {
    signal: AbortSignal.timeout(20000), redirect: 'error', cache: 'no-store',
  });
  if (!response.ok) throw new Error('Production revision unavailable');
  const runtime = await response.json();
  if (runtime.revision !== sha || runtime.environment !== 'production') throw new Error('Production revision mismatch');
  // Check after the HTTP boundary too, immediately before returning write readiness.
  const current = JSON.parse(await github(['api', `repos/${repository}/git/ref/heads/main`]));
  if (current.object?.sha !== sha) throw new Error('Release is no longer current main');
}

export async function snapshotProduction(neon, { sha, project, parent }) {
  const path = `projects/${project}/branches`;
  const name = `snapshot/${sha}`;
  let cursor;
  let branch;
  do {
    const page = await neon(`${path}?limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
    branch = page.branches.find(b => b.name === name);
    cursor = page.pagination?.cursor;
  } while (!branch && cursor);
  if (!branch) branch = (await neon(path, { branch: { name, parent_id: parent } })).branch;
  if (!/^br-[a-z0-9-]+$/.test(branch?.id) || branch.parent_id !== parent || branch.name !== name) throw new Error('Snapshot identity mismatch');
  for (let attempt = 0; attempt < 60; attempt++) {
    branch = (await neon(`${path}/${branch.id}`)).branch;
    if (branch.current_state === 'ready' && branch.parent_id === parent) return branch.id;
    if (branch.current_state === 'broken') break;
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  throw new Error('Snapshot not ready');
}

export async function smokeProduction(fetcher = fetch, origin = 'https://findfreeparking.info') {
  const paths = ['/api/health'];
  for (const bbox of ['47.60,-122.35,47.62,-122.32', '49.27,-123.14,49.29,-123.10']) {
    const [south, west, north, east] = bbox.split(',');
    paths.push(`/api/parking?north=${north}&south=${south}&east=${east}&west=${west}`);
    paths.push(`/api/parking/zones?bbox=${bbox}`);
  }
  for (const path of paths) {
    const response = await fetcher(`${origin}${path}`, { signal: AbortSignal.timeout(20000), redirect: 'error', cache: 'no-store' });
    if (!response.ok) throw new Error('Smoke HTTP failure');
    const data = await response.json();
    const bounds = new URL(`${origin}${path}`).searchParams.get('bbox')?.split(',').map(Number);
    const valid = path === '/api/health' ? data.ok === true && data.db === 'up'
      : path.startsWith('/api/parking?') ? ['meters', 'streets', 'places'].every(key => Array.isArray(data[key])) && !!data.coverage
      : data.mode === 'bbox' && Array.isArray(data.features) && Number.isInteger(data.count) && data.count === data.features.length &&
        ['minLat', 'minLng', 'maxLat', 'maxLng'].every((key, index) => Number.isFinite(data.bbox?.[key]) && data.bbox[key] === bounds[index]) &&
        ['none', 'partial', 'full'].includes(data.coverage?.level) && Array.isArray(data.coverage.areas);
    if (!valid) throw new Error('Smoke response failure');
  }
}

async function main() {
  const { readFileSync, readdirSync, appendFileSync } = await import('node:fs');
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const { Client } = await import('pg');
  const execute = promisify(execFile);
  const github = async (args, input) => new Promise((resolve, reject) => {
    const child = execFile('gh', args, { maxBuffer: 4 * 1024 * 1024 }, (error, stdout) => error ? reject(new Error('GitHub request failed')) : resolve(stdout));
    child.stdin.end(input);
  });
  if (process.argv.length > 3 || (process.argv[2] && process.argv[2] !== '--prepare')) throw new Error('Unknown release command');
  const sha = process.env.GITHUB_SHA;
  if (process.env.GITHUB_EVENT_NAME !== 'push' || process.env.GITHUB_REF !== 'refs/heads/main' ||
      process.env.GITHUB_REPOSITORY !== repository || !/^[a-f0-9]{40}$/.test(sha || '')) throw new Error('Not a production push');
  // Direct main pushes and non-release merges have no side effects.
  let release;
  try { release = await releaseForCommit(github, sha); } catch {
    await reportFailure(github, `<!-- production-release:${sha} -->`, `Production release failed: ${sha.slice(0, 12)}`,
      'Release authorization could not be verified. No production actions ran. Inspect the workflow configuration and merged release PR privately.');
    throw new Error('Release authorization failed');
  }
  if (!release) { console.log('Skipped: no authorized human release.'); return; }
  const current = JSON.parse(await github(['api', `repos/${repository}/git/ref/heads/main`]));
  if (current.object.sha !== sha) { console.log('Skipped: a newer main revision exists.'); return; }
  if (process.argv[2] === '--prepare') {
    if (!process.env.GITHUB_OUTPUT) throw new Error('Workflow output is required');
    appendFileSync(process.env.GITHUB_OUTPUT, `needs_pg_dump=${!!(release.lineage && release.adoptionReference)}\n`);
    return;
  }
  const manifest = release.migrations.length ? loadMigrationManifest() : null;
  let referenceFiles;
  const neon = async (path, body) => {
    const response = await fetch(`https://console.neon.tech/api/v2/${path}`, {
      method: body ? 'POST' : 'GET', signal: AbortSignal.timeout(30000), redirect: 'error',
      headers: { Authorization: `Bearer ${process.env.NEON_API_KEY}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) throw new Error('Neon request failed');
    return response.json();
  };
  let client;
  const database = { query: async sql => {
    if (!client) {
      const endpoints = (await neon(`projects/${project}/endpoints`)).endpoints;
      const databases = (await neon(`projects/${project}/branches/${parent}/databases`)).databases;
      const url = productionMigrationUrl(process.env.PRODUCTION_MIGRATION_DATABASE_URL || '', endpoints, databases);
      const databaseName = decodeURIComponent(url.pathname.slice(1));
      client = new Client({ connectionString: url.toString(), connectionTimeoutMillis: 15000,
        options: '-c statement_timeout=120000 -c lock_timeout=15000' });
      await client.connect();
      await verifyMigrationIdentity(client, url);
      process.env.MIGRATION_DATABASE_URL = url.toString();
      process.env.MIGRATION_EXPECTED_HOST = url.hostname;
      process.env.MIGRATION_EXPECTED_DATABASE = databaseName;
    }
    return client.query(sql);
  } };
  try {
    await runRelease(release, { sha, runId: process.env.GITHUB_RUN_ID,
      manifest, files: readdirSync('sql/migrations').sort(), plan: (() => { try { return JSON.parse(readFileSync('.github/production-migrations.json', 'utf8')); } catch { return null; } })() }, {
      github, database,
      readiness: () => verifyProductionRevision(github, sha),
      snapshot: () => snapshotProduction(neon, { sha, project, parent }),
      preflightAdoption: async () => {
        referenceFiles = materializeAdoptionReference(process.env, { approvedHash: release.adoptionReference, baseline: manifest.baseline });
        const inputs = readAdoptionInputs({ ...process.env, ...referenceFiles.paths, MIGRATION_ADOPTION_APPROVED: release.adoptionReference });
        const target = await captureSchema(process.env.MIGRATION_DATABASE_URL);
        verifyAdoptionReference({ ...inputs, baseline: manifest.baseline, targetDump: target.dump, pgDumpVersion: target.version });
      },
      adopt: ({ snapshotReference }) => execute('pnpm', ['db:adopt-preservation'], { env: { ...process.env, ...referenceFiles.paths, MIGRATION_ADOPTION_APPROVED: release.adoptionReference, MIGRATION_SNAPSHOT_REFERENCE: snapshotReference }, timeout: 10 * 60 * 1000 }),
      migrate: ({ lineage }) => execute('pnpm', ['db:migrate'], { env: { ...process.env, MIGRATION_EXPECTED_LINEAGE: lineage }, timeout: 10 * 60 * 1000 }),
      smoke: async () => {
        // Retry transient API failures only after deployment revision verification.
        for (let attempt = 0; ; attempt++) {
          try { await smokeProduction(); return; } catch { if (attempt === 19) throw new Error('Smoke checks failed'); }
          await new Promise(resolve => setTimeout(resolve, 15000));
        }
      },
    });
  } finally { referenceFiles?.cleanup(); await client?.end(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { await main(); } catch { console.error('Release failed. Inspect configuration privately; raw errors are suppressed.'); process.exitCode = 1; }
}
