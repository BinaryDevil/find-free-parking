// Issue #126: bounded feasibility test of SDOT Parking Signs (E3) against
// Curb Space Categories, under artifacts/issue-126-seattle-sign-test-2026-10-24/preregistration.json.
//
//   node scripts/seattle-sign-test.ts fetch <dir>   network: saves the frame and per-side evidence
//   node scripts/seattle-sign-test.ts grade <dir>   pure: grades the saved evidence, writes results.json
//
// Grading is pure and deterministic over the saved files. It never produces a free result:
// sign arrows and extents are undocumented, so a sign asserts its family at its own point only.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export type Families = { sign_category: Record<string, string>; spacetype: Record<string, string[]> };
export type Stratum = 'permit' | 'metered' | 'time_limited' | 'no_parking';
export type FrameRow = { ELMNTKEY: number; SPACETYPE: string };
export type Blockface = { ELMNTKEY: number; DISTANCE: number; END_DISTANCE: number };
export type SignText = { UNITID: string; ELMNTKEY: number; DISTANCE: number; SIGNTYPE: string; CATEGORY: string | null; CURRENT_STATUS: string | null; TEXT: string | null };
export type SignStructured = { UNITID: string; ELMNTKEY: number };
export type CurbSpace = { SPACEKEY: number; ELMNTKEY: number; BLOCK_ST: number; BLOCK_END: number; SPACETYPE: string; CURRENT_STATUS: string | null };

export const STRATA: readonly Stratum[] = ['permit', 'metered', 'time_limited', 'no_parking'];
const STRATUM_TYPES: Record<Stratum, readonly string[]> = {
  permit: ['PS-RPZ', 'TL-RPZ'], metered: ['PS'], time_limited: ['TL'], no_parking: ['NP', 'TAZ'],
};
const NOT_SIGN_REQUIRING = new Set(['STATUTORY_OR_PHYSICAL', 'UNRESTRICTED', 'UNDOCUMENTED']);
const NOT_GRADED_SIGN = new Set(['IGNORE', 'UNCLASSIFIED']);
const LISTED = new Set(['NO_PARKING', 'PERMIT', 'PAID']);

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function strataFromFrame(frame: FrameRow[]): Record<Stratum, number[]> {
  const out = {} as Record<Stratum, number[]>;
  for (const s of STRATA) {
    out[s] = [...new Set(frame.filter(r => STRATUM_TYPES[s].includes(r.SPACETYPE)).map(r => r.ELMNTKEY))].sort((a, b) => a - b);
  }
  return out;
}

export function drawSample(strata: Record<Stratum, number[]>, seed: number, perStratum = 3): { stratum: Stratum; ELMNTKEY: number }[] {
  const rng = mulberry32(seed);
  const drawn = new Set<number>();
  const out: { stratum: Stratum; ELMNTKEY: number }[] = [];
  for (const s of STRATA) {
    const candidates = strata[s].filter(k => !drawn.has(k));
    for (let i = 0; i < perStratum && candidates.length > 0; i++) {
      const [k] = candidates.splice(Math.floor(rng() * candidates.length), 1);
      drawn.add(k);
      out.push({ stratum: s, ELMNTKEY: k });
    }
  }
  return out;
}

export function signFamily(category: string | null, families: Families): string {
  const c = (category ?? '').trim();
  return families.sign_category[c] ?? families.sign_category._other;
}

export function spaceFamilies(spacetype: string, families: Families): string[] {
  return families.spacetype[spacetype.trim()] ?? families.spacetype._other;
}

export type Finding = { check: 'G1' | 'G2' | 'G3'; result: 'agree' | 'contradict' | 'unverified'; family?: string; listed?: boolean; unitid?: string; spacekey?: number; position?: number; detail: string };
export type SideResult = {
  ELMNTKEY: number; result: 'agree' | 'contradict' | 'unverified';
  signsInService: number; signsStatusUnknown: number; spacesInService: number;
  findings: Finding[];
  // There is deliberately no free output: unsigned curb is Unknown.
  rule: { kind: 'unknown_except_sign_points'; points: { position: number; family: string; unitid: string }[] };
};

// Post-hoc sensitivity options. PREREGISTERED is the rule that decides the verdict; the others
// only show which failures come from the data rather than from the pre-registered reading.
export type Options = {
  axis: 'blockface_plus_sign' | 'sign_only'; // M3 as pre-registered, or sign DISTANCE already on the segment axis
  payFromText: boolean;                       // PR-category signs whose TEXT contains "PAY" count as PAID
  clearanceIsNoParking: boolean;              // a NO_PARKING sign agrees with clearance/physical spaces nearby
};
export const PREREGISTERED: Options = { axis: 'blockface_plus_sign', payFromText: false, clearanceIsNoParking: false };
export const SENSITIVITY: Record<string, Options> = {
  S1_sign_axis: { axis: 'sign_only', payFromText: false, clearanceIsNoParking: false },
  S2_plus_pay_text: { axis: 'sign_only', payFromText: true, clearanceIsNoParking: false },
  S3_plus_clearance: { axis: 'sign_only', payFromText: true, clearanceIsNoParking: true },
};

function familyOf(s: SignText, families: Families, opts: Options): string {
  const family = signFamily(s.CATEGORY, families);
  if (opts.payFromText && family === 'UNCLASSIFIED' && /\bPAY\b/.test(s.TEXT ?? '')) return 'PAID';
  return family;
}

export function gradeSide(input: { blockface: Blockface[]; signs4: SignText[]; signs0: SignStructured[]; spaces: CurbSpace[] }, families: Families, tol: number, opts: Options = PREREGISTERED): SideResult {
  const [bf] = input.blockface;
  const key = bf?.ELMNTKEY ?? input.signs4[0]?.ELMNTKEY ?? input.spaces[0]?.ELMNTKEY;
  const signs = input.signs4.filter(s => s.CURRENT_STATUS === 'INSVC');
  const inService = new Set(signs.map(s => s.UNITID));
  const statusUnknown = input.signs0.filter(s => !inService.has(s.UNITID)).length;
  const spaces = input.spaces.filter(s => s.CURRENT_STATUS === 'INSVC');
  const findings: Finding[] = [];
  const points: SideResult['rule']['points'] = [];

  if (!bf) {
    findings.push({ check: 'G1', result: 'contradict', detail: 'no Blockface record for this ELMNTKEY' });
  }
  for (const s of signs) {
    const family = familyOf(s, families, opts);
    const position = opts.axis === 'sign_only' ? s.DISTANCE : (bf?.DISTANCE ?? NaN) + s.DISTANCE;
    if (bf && (position < bf.DISTANCE - tol || position > bf.END_DISTANCE + tol)) {
      findings.push({ check: 'G1', result: 'contradict', unitid: s.UNITID, position, family, detail: `sign at ${position} ft outside side [${bf.DISTANCE}, ${bf.END_DISTANCE}]` });
    }
    if (NOT_GRADED_SIGN.has(family)) continue;
    points.push({ position, family, unitid: s.UNITID });
    const near = spaces.filter(sp => position >= sp.BLOCK_ST - tol && position <= sp.BLOCK_END + tol);
    const listed = LISTED.has(family);
    if (near.length === 0) {
      findings.push({ check: 'G2', result: 'unverified', unitid: s.UNITID, position, family, listed, detail: `${s.SIGNTYPE}: no curb space within ${tol} ft` });
    } else if (near.some(sp => spaceFamilies(sp.SPACETYPE, families).includes(family)
      || (opts.clearanceIsNoParking && family === 'NO_PARKING' && spaceFamilies(sp.SPACETYPE, families).includes('STATUTORY_OR_PHYSICAL')))) {
      findings.push({ check: 'G2', result: 'agree', unitid: s.UNITID, position, family, listed, detail: `${s.SIGNTYPE} matches ${near.map(sp => sp.SPACETYPE).join('/')}` });
    } else {
      findings.push({ check: 'G2', result: 'contradict', unitid: s.UNITID, position, family, listed, detail: `${s.SIGNTYPE} (${family}) but nearby spaces are ${near.map(sp => sp.SPACETYPE).join('/')}` });
    }
  }
  const signFams = new Set(signs.map(s => familyOf(s, families, opts)));
  for (const sp of spaces) {
    for (const family of spaceFamilies(sp.SPACETYPE, families)) {
      if (NOT_SIGN_REQUIRING.has(family)) continue;
      const listed = LISTED.has(family);
      findings.push(signFams.has(family)
        ? { check: 'G3', result: 'agree', spacekey: sp.SPACEKEY, family, listed, detail: `${sp.SPACETYPE} [${sp.BLOCK_ST}, ${sp.BLOCK_END}] has a ${family} sign on the side` }
        : { check: 'G3', result: 'contradict', spacekey: sp.SPACEKEY, family, listed, detail: `${sp.SPACETYPE} [${sp.BLOCK_ST}, ${sp.BLOCK_END}] has no in-service ${family} sign on the side` });
    }
  }
  let result: SideResult['result'];
  if (findings.some(f => f.result === 'contradict')) result = 'contradict';
  else if (spaces.length === 0 || signs.length === 0) result = 'unverified';
  else result = 'agree';
  return { ELMNTKEY: key, result, signsInService: signs.length, signsStatusUnknown: statusUnknown, spacesInService: spaces.length, findings, rule: { kind: 'unknown_except_sign_points', points } };
}

// ---------- I/O (not used by tests except through saved files) ----------

const B = 'https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services';
type Attrs = Record<string, unknown>;

async function query(layer: string, params: Record<string, string>): Promise<{ text: string; features: Attrs[] }> {
  const url = `${B}/${layer}/query?` + new URLSearchParams({ f: 'json', returnGeometry: 'false', outFields: '*', ...params });
  const res = await fetch(url);
  const text = await res.text();
  const body = JSON.parse(text);
  if (!res.ok || body.error) throw new Error(`${layer}: ${res.status} ${JSON.stringify(body.error)}`);
  return { text, features: body.features.map((f: { attributes: Attrs }) => f.attributes) };
}

async function fetchEvidence(dir: string): Promise<void> {
  const pre = JSON.parse(readFileSync(join(dir, 'preregistration.json'), 'utf8'));
  const raw = join(dir, 'raw');
  mkdirSync(raw, { recursive: true });
  const frame: Attrs[] = [];
  for (let offset = 0; ; offset += 2000) {
    const page = await query('Curb_Space_Categories/FeatureServer/6', {
      where: "PAIDAREA = 'First Hill' AND CURRENT_STATUS = 'INSVC'", outFields: 'ELMNTKEY,SPACETYPE',
      orderByFields: 'OBJECTID', resultOffset: String(offset), resultRecordCount: '2000',
    });
    writeFileSync(join(raw, `frame-page-${offset}.json`), page.text);
    frame.push(...page.features);
    if (page.features.length < 2000) break;
  }
  const rows = frame.map(r => ({ ELMNTKEY: Number(r.ELMNTKEY), SPACETYPE: String(r.SPACETYPE) }));
  const sample = drawSample(strataFromFrame(rows), pre.seed);
  writeFileSync(join(dir, 'sample.json'), JSON.stringify({ retrieved_utc: new Date().toISOString(), seed: pre.seed, sample }, null, 1) + '\n');
  for (const { ELMNTKEY } of sample) {
    const where = `ELMNTKEY = ${ELMNTKEY}`;
    for (const [name, layer] of [['blockface', 'Blockface/FeatureServer/1'], ['signs0', 'Parking_Signs/FeatureServer/0'], ['signs4', 'Parking_Features/FeatureServer/4'], ['spaces', 'Curb_Space_Categories/FeatureServer/6']]) {
      const params: Record<string, string> = { where, orderByFields: 'OBJECTID' };
      if (name === 'signs0') params.outFields = 'COMPKEY,UNITID,ELMNTKEY,DISTANCE,SIGNTYPE,CATEGORY,CATEGORYDESCR,FACING,CUSTOMTEXT,STARTDAY,ENDDAY,STARTTIME,ENDTIME';
      writeFileSync(join(raw, `${ELMNTKEY}-${name}.json`), (await query(layer, params)).text);
    }
  }
  console.log(`frame rows ${rows.length}; sampled ${sample.map(s => `${s.stratum}:${s.ELMNTKEY}`).join(' ')}`);
}

function readFeatures<T>(path: string): T[] {
  return JSON.parse(readFileSync(path, 'utf8')).features.map((f: { attributes: T }) => f.attributes);
}

export function gradeDir(dir: string, opts: Options = PREREGISTERED) {
  const pre = JSON.parse(readFileSync(join(dir, 'preregistration.json'), 'utf8'));
  const { sample } = JSON.parse(readFileSync(join(dir, 'sample.json'), 'utf8'));
  const raw = join(dir, 'raw');
  const sides = sample.map(({ stratum, ELMNTKEY }: { stratum: Stratum; ELMNTKEY: number }) => ({
    stratum,
    ...gradeSide({
      blockface: readFeatures<Blockface>(join(raw, `${ELMNTKEY}-blockface.json`)),
      signs0: readFeatures<SignStructured>(join(raw, `${ELMNTKEY}-signs0.json`)),
      signs4: readFeatures<SignText>(join(raw, `${ELMNTKEY}-signs4.json`)),
      spaces: readFeatures<CurbSpace>(join(raw, `${ELMNTKEY}-spaces.json`)),
    }, pre.families, pre.tolerance_ft, opts),
  }));
  const count = (r: string) => sides.filter((s: SideResult) => s.result === r).length;
  const listedContradictions = sides.filter((s: SideResult) => s.findings.some(f => f.result === 'contradict' && f.listed)).length;
  return { options: opts, totals: { sides: sides.length, agree: count('agree'), contradict: count('contradict'), unverified: count('unverified'), sides_with_listed_field_contradiction: listedContradictions }, sides };
}

if (import.meta.main) {
  const [mode, dir] = process.argv.slice(2);
  if (mode === 'fetch' && dir) await fetchEvidence(dir);
  else if (mode === 'grade' && dir) {
    const results = { preregistration_commit: '25c205ec2f54faf5145675e5339cb6bc1f9fd42d', preregistered: gradeDir(dir),
      sensitivity_post_hoc: Object.fromEntries(Object.entries(SENSITIVITY).map(([name, opts]) => [name, gradeDir(dir, opts)])) };
    writeFileSync(join(dir, 'results.json'), JSON.stringify(results, null, 1) + '\n');
    console.log('preregistered', JSON.stringify(results.preregistered.totals));
    for (const [name, r] of Object.entries(results.sensitivity_post_hoc)) console.log(name, JSON.stringify(r.totals));
  } else {
    console.error('usage: node scripts/seattle-sign-test.ts fetch|grade <artifact dir>');
    process.exit(2);
  }
}
