import { Pool } from 'pg';
import { reportFailure } from './github-alert.ts';
import { pathToFileURL } from 'node:url';
import { runGithub } from './coverage_requests.ts';
import { sourceAdapters } from './source-adapters.ts';
import { syncSource, type SourceAdapter, type SyncResult, type SyncSource } from './source-sync.ts';

type Github = (args: string[], input?: string) => Promise<string>;

export function syncConnection(env: NodeJS.ProcessEnv): URL {
  if (env.SOURCE_SYNC_APPROVED !== 'sync-approved-sources') throw new Error('Source sync is disabled');
  let url: URL;
  try { url = new URL(env.SOURCE_SYNC_DATABASE_URL ?? ''); } catch { throw new Error('Select the direct sync target'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.hostname.includes('-pooler') ||
    !env.SOURCE_SYNC_EXPECTED_HOST || url.hostname !== env.SOURCE_SYNC_EXPECTED_HOST ||
    !env.SOURCE_SYNC_EXPECTED_DATABASE || decodeURIComponent(url.pathname.slice(1)) !== env.SOURCE_SYNC_EXPECTED_DATABASE) {
    throw new Error('Select the direct sync target');
  }
  return url;
}

/** Issue text contains only internal IDs and generic diagnostics, never source
 * payloads, SQL, upstream error messages, connection details or driver data. */
export async function reportSyncFailure(github: Github, result: SyncResult) {
  const marker = `<!-- source-sync:${result.sourceId} -->`;
  const body = ['Part of #15. Automated Evidence Source sync failure.',
    `Source ID: ${result.sourceId}. Latest sync ID: ${result.syncId ?? 'unavailable'}.`,
    'Rules from a failed or unfinished source sync remain Unknown. Inspect the private source_syncs record and adapter configuration. Retry only against the approved target; source approval, production writes and deployment remain separate decisions.',
  ].join('\n\n');
  await reportFailure(github, marker, `Evidence Source sync failed: ${result.sourceId}`, body);
}

/** The command checks every approved source, including ones missing an adapter.
 * Missing adapters fail closed instead of allowing old successful data to linger. */
export async function runScheduledSyncs(pool: Pool, adapters: SourceAdapter[], github: Github, now: () => number = () => performance.now()): Promise<SyncResult[]> {
  const deadline = now() + 18 * 60 * 1000;
  const sources = await pool.query(`SELECT e.id,e.source_key,e.area,e.evidence_type,
      sync.id AS sync_id,sync.status AS sync_status,
      (sync.id IS NULL OR sync.status <> 'succeeded' OR e.evidence_type = 'E5' OR
        sync.started_at <= clock_timestamp()-interval '23 hours') AS due
    FROM public.evidence_sources e LEFT JOIN LATERAL (
      SELECT id,status,started_at FROM public.source_syncs WHERE source_id=e.id ORDER BY started_at DESC,id DESC LIMIT 1
    ) sync ON true WHERE e.approval_state='approved' AND e.evidence_type IN ('E1','E2','E3','E4','E5','E6')
    ORDER BY sync.started_at ASC NULLS FIRST,e.id`);
  const results: SyncResult[] = [];
  let alertFailed = false;
  // Persisted delivery state survives GitHub outages and subsequent successful
  // imports. One issue per source; retries update its body rather than commenting.
  async function deliverAlerts() {
    const failures = await pool.query(`SELECT source_id,array_agg(id ORDER BY started_at DESC,id DESC) AS ids FROM public.source_syncs
      WHERE status='failed' AND alert_reported_at IS NULL GROUP BY source_id ORDER BY source_id`);
    for (const failure of failures.rows) {
      try {
        await reportSyncFailure(github, { sourceId: failure.source_id, syncId: failure.ids[0], status: 'failed' });
        await pool.query(`UPDATE public.source_syncs SET alert_reported_at=clock_timestamp()
          WHERE id=ANY($1::uuid[]) AND status='failed' AND alert_reported_at IS NULL`, [failure.ids]);
      } catch { alertFailed = true; }
    }
  }
  await deliverAlerts();
  for (const source of sources.rows) {
    // Bound work below the workflow deadline. Oldest-attempt ordering ensures
    // unfinished batches rotate to untouched sources on the next invocation.
    if (now() >= deadline) break;
    if (!source.due) continue;
    const adapter = adapters.find(a => a.sourceKey === source.source_key && a.area === source.area);
    const result = await syncSource(pool, source as SyncSource, adapter);
    results.push(result);
    await deliverAlerts();
  }
  if (alertFailed) throw new Error('Sync failure alert delivery failed; retry required');
  return results;
}

async function main() {
  let pool: Pool | undefined;
  try {
    const url = syncConnection(process.env);
    pool = new Pool({ connectionString: url.toString(), max: 2, connectionTimeoutMillis: 15000,
      options: '-c statement_timeout=120000 -c lock_timeout=15000' });
    const identity = (await pool.query('SELECT current_database() AS database,current_user AS role')).rows[0];
    if (identity.database !== process.env.SOURCE_SYNC_EXPECTED_DATABASE || identity.role !== 'find-free-parking-db_owner') {
      throw new Error('Use the separate direct migration/import owner, never an app credential');
    }
    const results = await runScheduledSyncs(pool, sourceAdapters, runGithub);
    console.log(JSON.stringify({ sources: results.length, succeeded: results.filter(r => r.status === 'succeeded').length,
      failed: results.filter(r => r.status === 'failed').length, skipped: results.filter(r => r.status === 'skipped').length }));
    if (results.some(r => r.status === 'failed')) process.exitCode = 1;
  } catch {
    console.error('Source sync failed or is disabled; inspect configuration privately.');
    process.exitCode = 1;
  } finally { await pool?.end(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
