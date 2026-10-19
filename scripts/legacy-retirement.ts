import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { Pool } from 'pg';
import type { PoolClient } from 'pg';
import { coverageAreas } from '../lib/coverage.ts';

export const retirementTables = ['parking_meters', 'street_segments', 'parking_zones'] as const;
type Table = typeof retirementTables[number];
interface Member { place_table: Table; place_id: string; row_sha256: string }
interface Counts { count: number; sha256: string }
export interface RetirementInput {
  action: 'retire' | 'reverse';
  retirementId: string;
  approvalRef: string;
  snapshotRef: string;
  expectedDatabase: string;
  coverageIds: string[];
  expected: Record<Table, Counts>;
  sourceChecks: { sourceId: string; syncId: string; fetched: number; accepted: number; quarantined: number; excluded: number }[];
}
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
function summarize(members: Member[]) {
  return Object.fromEntries(retirementTables.map(table => {
    const rows = members.filter(row => row.place_table === table).sort((a,b) => a.place_id.localeCompare(b.place_id));
    return [table, { count: rows.length, sha256: hash(rows.map(row => `${row.place_id}:${row.row_sha256}`).join('\n')) }];
  })) as Record<Table, Counts>;
}
function manifestHash(members: Member[]) {
  return hash(retirementTables.map(table => `${table}:${summarize(members)[table].sha256}`).join('\n'));
}
async function cohort(client: PoolClient, coverageIds: string[]) {
  const areas = (await coverageAreas((sql, values) => client.query(sql, values), new Date())).filter(area => coverageIds.includes(area.id));
  if (!coverageIds.length || new Set(coverageIds).size !== coverageIds.length || areas.length !== coverageIds.length || areas.some(area => area.level === 'none')) {
    throw new Error('Every selected Coverage must be approved and current');
  }
  const members: Member[] = [];
  for (const table of retirementTables) {
    // Suppress the entire context geometry if any part overlaps replacement Coverage.
    // Historical tables are context only, including provenance-tagged old imports.
    const result = await client.query(`SELECT '${table}' AS place_table, p.id::text AS place_id,
      encode(sha256(convert_to(to_jsonb(p)::text, 'UTF8')), 'hex') AS row_sha256
      FROM public.${table} p WHERE EXISTS (SELECT 1 FROM public.coverage_areas a
        WHERE a.id = ANY($1::uuid[]) AND ST_Intersects(p.geom,
          CASE WHEN a.id = ANY($2::uuid[]) THEN a.geom ELSE a.subset_geom END))
      ORDER BY p.id`, [coverageIds, areas.filter(area => area.level === 'full').map(area => area.id)]);
    members.push(...result.rows);
  }
  return { members, areas };
}

/** Read-only plan preparation. Aggregate output excludes row IDs and row material. */
export async function inspectRetirement(pool: Pool, coverageIds: string[]) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    await client.query("SET LOCAL statement_timeout = '30s'");
    const { members } = await cohort(client, coverageIds);
    await client.query('COMMIT');
    return summarize(members);
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

/** Operator seam. Connection selection is separately verified by the CLI; no env-file loading. */
export async function runLegacyRetirement(pool: Pool, input: RetirementInput) {
  if (!input.approvalRef?.trim() || !input.snapshotRef?.trim()) throw new Error('Explicit action approval and retained snapshot references required');
  if (!['retire','reverse'].includes(input.action) || !input.retirementId || !input.expectedDatabase || !input.expected) throw new Error('Incomplete retirement plan');
  for (const table of retirementTables) {
    if (!Number.isSafeInteger(input.expected[table]?.count) || input.expected[table].count < 0 || !/^[a-f0-9]{64}$/.test(input.expected[table].sha256)) throw new Error('Expected cohort counts and hashes required');
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
    await client.query("SET LOCAL statement_timeout = '30s'");
    await client.query("SET LOCAL lock_timeout = '5s'");
    const identity = await client.query('SELECT current_database() AS database, current_user AS role');
    if (identity.rows[0]?.database !== input.expectedDatabase || identity.rows[0]?.role !== 'find-free-parking-db_owner') throw new Error('Operator database/owner identity mismatch');
    // Prevent source sync, Coverage edits, and historical/report-count updates during verification.
    await client.query(`LOCK TABLE public.parking_meters, public.street_segments, public.parking_zones,
      public.evidence_sources, public.source_syncs, public.coverage_areas, public.coverage_area_sources,
      public.places, public.parking_rules IN SHARE MODE`);
    await client.query('LOCK TABLE public.legacy_retirements, public.legacy_retirement_members IN SHARE ROW EXCLUSIVE MODE');
    let members: Member[];
    if (input.action === 'retire') {
      const selected = await cohort(client, input.coverageIds);
      members = selected.members;
      if (!members.length) throw new Error('Empty retirement cohort');
      for (const area of selected.areas) {
        const footprint = await client.query(`SELECT count(*)::int AS count,
          count(*) FILTER (WHERE p.timezone <> a.timezone OR NOT EXISTS (
            SELECT 1 FROM public.parking_rules r WHERE r.place_id = p.id AND r.removed_at IS NULL)
            OR EXISTS (SELECT 1 FROM public.parking_rules r
              LEFT JOIN public.evidence_sources e ON e.id = r.source_id WHERE r.place_id = p.id AND (
                NOT EXISTS (SELECT 1 FROM public.coverage_area_sources required
                  WHERE required.area_id = a.id AND required.source_id = r.source_id)
                OR (r.removed_at IS NULL AND (NOT r.parsed OR e.approval_state <> 'approved'
                  OR e.evidence_type !~ '^E[1-7]$' OR r.fetched_at > clock_timestamp()
                  OR r.fetched_at < clock_timestamp() - least(e.freshness_limit,
                    CASE e.evidence_type WHEN 'E5' THEN interval '1 day' WHEN 'E7' THEN e.freshness_limit ELSE interval '7 days' END)
                  OR (r.kind = 'free' AND NOT r.permission_complete))))))::int AS unsafe
          FROM public.places p JOIN public.coverage_areas a ON a.id = $1
          WHERE p.removed_at IS NULL AND p.source_id = ANY($2::uuid[])
            AND ST_Covers(CASE WHEN $3::boolean THEN a.geom ELSE a.subset_geom END,p.geom)`,
        [area.id,area.sources.map(source => source.id),area.level === 'full']);
        if (!footprint.rows[0]?.count || footprint.rows[0].unsafe) throw new Error('Selected Coverage has no eligible replacement places');
      }
      const sources = [...new Set(selected.areas.flatMap(area => area.sources.map(source => source.id)))].sort();
      if (!Array.isArray(input.sourceChecks) || input.sourceChecks.length !== sources.length || new Set(input.sourceChecks.map(source => source.sourceId)).size !== sources.length || input.sourceChecks.some(source => !sources.includes(source.sourceId))) throw new Error('Complete source reconciliation required');
      for (const check of input.sourceChecks) {
        if (![check.fetched,check.accepted,check.quarantined,check.excluded].every(n => Number.isSafeInteger(n) && n >= 0) || check.fetched !== check.accepted + check.quarantined + check.excluded || check.accepted < 1) throw new Error('Incomplete fetched source totals');
        const sync = await client.query(`SELECT id, status, format_check_passed, records_added, records_updated, records_removed, drift_report,
          (SELECT count(*)::int FROM public.places p WHERE p.source_id = $1 AND p.removed_at IS NULL) AS place_count
          FROM public.source_syncs WHERE source_id = $1 ORDER BY started_at DESC, id DESC LIMIT 1`, [check.sourceId]);
        const row = sync.rows[0];
        const drift = row?.drift_report;
        if (!row || row.id !== check.syncId || row.status !== 'succeeded' || row.format_check_passed !== true || row.place_count !== check.accepted ||
          !Array.isArray(drift?.added) || !Array.isArray(drift?.changed) || !Array.isArray(drift?.removed) ||
          !Number.isSafeInteger(drift?.unchanged) || drift.unchanged < 0 ||
          drift.added.length !== row.records_added || drift.changed.length !== row.records_updated || drift.removed.length !== row.records_removed ||
          row.records_added + row.records_updated + drift.unchanged !== check.accepted) throw new Error('Latest source sync or accepted place count changed');
        // This initial retirement command supports complete one-place-per-record
        // snapshots only. Adapters with expansion/exclusions need a richer stored
        // reconciliation contract; operator assertions cannot substitute for it.
        if (check.quarantined !== 0 || check.excluded !== 0 || check.fetched !== check.accepted) throw new Error('Only complete one-place-per-record snapshots supported');
        const replacement = await client.query(`SELECT
          count(DISTINCT p.id)::int AS places,
          count(DISTINCT r.id)::int AS rules,
          count(DISTINCT p.id) FILTER (WHERE EXISTS (
            SELECT 1 FROM public.coverage_areas a WHERE a.id = ANY($2::uuid[])
              AND ST_Covers(CASE WHEN a.id = ANY($3::uuid[]) THEN a.geom ELSE a.subset_geom END,p.geom)))::int AS inside,
          count(DISTINCT p.id) FILTER (WHERE p.fetched_at > clock_timestamp() OR
            p.fetched_at < clock_timestamp() - least(e.freshness_limit,
              CASE e.evidence_type WHEN 'E5' THEN interval '1 day' WHEN 'E7' THEN e.freshness_limit ELSE interval '7 days' END)
            OR NOT EXISTS (SELECT 1 FROM public.parking_rules usable WHERE usable.place_id = p.id
              AND usable.source_id = p.source_id AND usable.removed_at IS NULL AND usable.parsed
              AND usable.fetched_at <= clock_timestamp() AND usable.fetched_at >= clock_timestamp() - least(e.freshness_limit,
                CASE e.evidence_type WHEN 'E5' THEN interval '1 day' WHEN 'E7' THEN e.freshness_limit ELSE interval '7 days' END)))::int AS unsafe
          FROM public.places p JOIN public.evidence_sources e ON e.id = p.source_id
          LEFT JOIN public.parking_rules r ON r.place_id = p.id AND r.source_id = p.source_id AND r.removed_at IS NULL
          WHERE p.source_id = $1 AND p.removed_at IS NULL`,
        [check.sourceId,input.coverageIds,selected.areas.filter(area => area.level === 'full').map(area => area.id)]);
        const counts = replacement.rows[0];
        if (!counts.inside || counts.unsafe || counts.places !== check.accepted ||
          !Number.isSafeInteger(drift.rules?.added) || !Number.isSafeInteger(drift.rules?.updated) || !Number.isSafeInteger(drift.rules?.removed) ||
          [drift.rules.added,drift.rules.updated,drift.rules.removed].some(n => n < 0) ||
          counts.rules !== drift.rules.added + drift.rules.updated) throw new Error('Replacement place/rule reconciliation failed');
      }
    } else {
      const existing = await client.query('SELECT manifest_sha256 FROM public.legacy_retirements WHERE id = $1 AND reversed_at IS NULL FOR UPDATE', [input.retirementId]);
      if (!existing.rows.length) throw new Error('Active retirement not found');
      members = (await client.query('SELECT place_table, place_id::text, row_sha256 FROM public.legacy_retirement_members WHERE retirement_id = $1', [input.retirementId])).rows;
      if (manifestHash(members) !== existing.rows[0].manifest_sha256) throw new Error('Archive manifest changed');
      for (const table of retirementTables) {
        const result = await client.query(`SELECT count(*)::int AS count FROM public.${table} p
          JOIN public.legacy_retirement_members m ON m.place_id = p.id AND m.place_table = $2
          WHERE m.retirement_id = $1 AND m.row_sha256 = encode(sha256(convert_to(to_jsonb(p)::text, 'UTF8')),'hex')`, [input.retirementId,table]);
        if (result.rows[0].count !== members.filter(row => row.place_table === table).length) throw new Error('Retained legacy rows changed');
      }
    }
    const actual = summarize(members);
    if (retirementTables.some(table => actual[table].count !== input.expected[table].count || actual[table].sha256 !== input.expected[table].sha256)) throw new Error('Retirement cohort count/hash drift');
    if (input.action === 'retire') {
      await client.query('INSERT INTO public.legacy_retirements(id, approval_ref, snapshot_ref, manifest_sha256, coverage_ids) VALUES ($1,$2,$3,$4,$5)', [input.retirementId,input.approvalRef,input.snapshotRef,manifestHash(members),input.coverageIds]);
      await client.query(`INSERT INTO public.legacy_retirement_members(retirement_id,place_table,place_id,row_sha256)
        SELECT $1, x.place_table, x.place_id, x.row_sha256 FROM jsonb_to_recordset($2::jsonb)
        AS x(place_table text, place_id uuid, row_sha256 text)`, [input.retirementId,JSON.stringify(members)]);
    } else {
      await client.query('UPDATE public.legacy_retirements SET reversed_at = clock_timestamp(), reverse_approval_ref = $2, reverse_snapshot_ref = $3 WHERE id = $1', [input.retirementId,input.approvalRef,input.snapshotRef]);
    }
    await client.query('COMMIT');
    return actual;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export function retirementConnection(env: NodeJS.ProcessEnv) {
  const url = new URL(env.RETIREMENT_DATABASE_URL || '');
  if (!['postgres:','postgresql:'].includes(url.protocol) || url.hostname.includes('-pooler') || !env.RETIREMENT_EXPECTED_HOST || url.hostname !== env.RETIREMENT_EXPECTED_HOST || !env.RETIREMENT_EXPECTED_DATABASE || decodeURIComponent(url.pathname.slice(1)) !== env.RETIREMENT_EXPECTED_DATABASE) throw new Error('Select the verified direct owner endpoint and database');
  return url.toString();
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let pool: Pool | undefined;
  try {
    const connectionString = retirementConnection(process.env);
    if (process.argv.length !== 3) throw new Error('Provide one private reviewed plan JSON file');
    const input = JSON.parse(readFileSync(process.argv[2], 'utf8')) as RetirementInput;
    if (input.expectedDatabase !== process.env.RETIREMENT_EXPECTED_DATABASE || process.env.RETIREMENT_ACTION_APPROVED !== `${input.action}:${input.retirementId}`) throw new Error('Explicit action approval does not match plan');
    pool = new Pool({ connectionString, max: 1 });
    console.log(JSON.stringify(await runLegacyRetirement(pool, input)));
  } catch { console.error('Retirement stopped; inspect target and reviewed plan privately.'); process.exitCode = 1; }
  finally { await pool?.end(); }
}
