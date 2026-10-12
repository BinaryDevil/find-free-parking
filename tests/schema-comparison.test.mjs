import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

test('schema comparison ignores dump session tokens, but rejects meaningful schema drift', () => {
  const dir = mkdtempSync(join(tmpdir(), 'schema-compare-'));
  const left = join(dir, 'production.sql');
  const right = join(dir, 'fresh.sql');
  const schema = "CREATE TABLE public.parking_meters (parking_evidence jsonb DEFAULT '{}'::jsonb NOT NULL);\nCREATE TYPE public.target_type AS ENUM ('ZONE', 'METER');\nCREATE INDEX meter_geom ON public.parking_meters USING gist (geom);\nCREATE TRIGGER counts AFTER INSERT ON public.reports EXECUTE FUNCTION public.update_parking_report_counts();\nGRANT SELECT ON public.parking_meters TO app_rw;\n";
  const compare = () => spawnSync(process.execPath, [resolve('scripts/compare-schema.mjs'), left, right], { encoding: 'utf8' });
  try {
    writeFileSync(left, '\\restrict token1\n-- Dumped by pg_dump version 17.11\n' + schema + '\\unrestrict token1\n');
    writeFileSync(right, '\\restrict token2\n-- Dumped by pg_dump version 17.10\n' + schema + '\\unrestrict token2\n');
    assert.equal(compare().status, 0);
    for (const changed of [
      schema.replace(' NOT NULL', ''),
      schema.replace("'{}'::jsonb", "'[]'::jsonb"),
      schema.replace("'ZONE', 'METER'", "'METER', 'ZONE'"),
      schema.replace('USING gist', 'USING btree'),
      schema.replace('AFTER INSERT', 'BEFORE INSERT'),
      schema.replace('GRANT SELECT', 'GRANT ALL'),
    ]) {
      writeFileSync(right, changed);
      assert.equal(compare().status, 1);
    }
    const providerAcl = privileges => `--\n-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin\n--\n\nALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ${privileges} ON TABLES TO neon_superuser WITH GRANT OPTION;\n\n\n`;
    writeFileSync(left, schema + providerAcl('ALL'));
    writeFileSync(right, schema + providerAcl('SELECT'));
    assert.equal(compare().status, 1, 'Strict comparison retains provider ACL differences');
    const application = () => spawnSync(process.execPath, [resolve('scripts/compare-schema.mjs'), left, right, '--application']);
    assert.equal(application().status, 0);
    writeFileSync(right, schema.replace('GRANT SELECT', 'GRANT ALL') + providerAcl('SELECT'));
    assert.equal(application().status, 1, 'Application projection still checks application ACLs');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
