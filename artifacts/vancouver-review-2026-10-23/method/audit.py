"""Apply the pre-registered grading rule to every member of each stratum, using one grouped 2026 ticket export.
Usage: python3 -I audit.py <artifact_dir>. Exact street match (as pre-registered) and a post-hoc 'AV'->'AVE' variant."""
import sys, os, json, gzip, tempfile, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import STRATA, load_streets, map_meter, in_polygon
A = sys.argv[1]; RAW = os.path.join(A, 'raw')
pre = json.load(open(os.path.join(A, 'subset-preregistration.json')))
meters = json.load(gzip.open(os.path.join(RAW, 'meters-export.json.gz'))); byfid = {r['feature_id']: r for r in meters}
t = tempfile.NamedTemporaryFile(suffix='.geojson', delete=False); t.write(gzip.open(os.path.join(RAW, 'public-streets.geojson.gz')).read()); t.close()
streets = load_streets(t.name); os.unlink(t.name)
rpp = json.load(gzip.open(os.path.join(RAW, 'rpp-page0.geojson.gz')))['features']
tk = json.load(open(os.path.join(RAW, 'tickets-2026-by-block-infraction.json')))
CATS = pre['ticket_categories']
cat = lambda s: [c for c, ks in CATS.items() if any(k in s for k in ks)]
blocks = collections.defaultdict(set); street_names = set()
for r in tk:
    street_names.add(r['street'])
    for c in cat(r['infractiontext']): blocks[(r['block'], r['street'])].add(c)
mapped = {}
for r in meters:
    if r['service_status'] != 'Removed':
        g = r['geo_point_2d']; mapped[r['feature_id']] = map_meter(g['lon'], g['lat'], streets)
onblock = collections.defaultdict(list); metered_blocks = set()
for f, m in mapped.items():
    if m['status'] != 'unmapped': onblock[m['hblock']].append(byfid[f])
    for d, h in m['candidates']:
        if d <= 30.0: metered_blocks.add(h)
def rep(c, ms):
    z = {x for r in ms for x in (r['prohibition_1_zone'], r['prohibition_2_zone']) if x}
    rush = any(r['am_rush_hours'] or r['pm_rush_hours'] for r in ms); v = {r['vehicle_type'] for r in ms} - {'Any Vehicle'}
    return {'NS': 'NO STOPPING' in z or rush, 'RUSH': rush, 'CLZ': 'CVLZ' in z, 'LZ': bool(z & {'LOADING ZONE', 'CVLZ'}), 'PZ': 'PASSENGER ZONE' in z,
            'TOUR': 'TOUR BUS ZONE' in z, 'BUS': False, 'BIKE': False, 'DIS': 'Accessibility' in v, 'NP': bool(z), 'SR': bool(z) or bool(v),
            'CLASS': bool(z & {'TAXI ZONE', 'POLICE ZONE', 'MILITARY ZONE', 'AUTHORIZED VEHICLES ONLY', 'PERMIT PARKING ONLY'}) or bool(v)}[c]
SAFETY = ['NS', 'RUSH', 'CLZ', 'LZ', 'PZ', 'TOUR', 'BUS', 'CLASS', 'DIS', 'BIKE', 'NP', 'SR']
def key(hb, norm):
    b, s = hb.split(' ', 1)
    if norm and s.endswith(' AV'): s += 'E'
    return (int(b), s) if b.isdigit() else (None, s)
out = {}
for norm in (False, True):
    res = {}
    for k, f in STRATA.items():
        cnt = collections.Counter(); unrep_c = collections.Counter()
        for r in meters:
            if not f(r): continue
            m = mapped[r['feature_id']]
            if m['status'] != 'mapped': cnt['block ' + m['status']] += 1; continue
            kk = key(m['hblock'], norm)
            if kk[0] is None: cnt['range hblock (no single block number)'] += 1; continue
            if kk[1] not in street_names: cnt['street name not in tickets'] += 1; continue
            present = blocks.get(kk, set()); u = [c for c in SAFETY if c in present and not rep(c, onblock[m['hblock']])]
            if u:
                cnt['contradiction'] += 1; unrep_c.update(u)
            elif 'METER' not in present: cnt['no METER ticket'] += 1
            else: cnt['no contradiction, payment corroborated'] += 1
        res[k] = {'members': sum(cnt.values()), 'outcomes': dict(cnt), 'unrepresented_category_counts': dict(unrep_c)}
    pc = collections.Counter(); seen = set()
    for s in streets:
        if s['streetuse'] == 'Closed' or not s['mid'] or s['hblock'] in metered_blocks or s['hblock'] in seen: continue
        if not any(g['geometry'] and in_polygon(s['mid']['lon'], s['mid']['lat'], g['geometry']) for g in rpp): continue
        seen.add(s['hblock'])
        kk = key(s['hblock'], norm); present = blocks.get(kk, set())
        if kk[0] is None: pc['range hblock (no single block number)'] += 1
        elif kk[1] not in street_names: pc['street name not in tickets'] += 1
        elif 'METER' in present: pc['contradiction (METER tickets)'] += 1
        elif present & {'SR', 'NP'}: pc['SR/NP tickets (agree)'] += 1
        else: pc['no SR/NP ticket'] += 1
    res['P'] = {'members': sum(pc.values()), 'outcomes': dict(pc)}
    out['post_hoc_AV_to_AVE' if norm else 'as_preregistered'] = res
json.dump(out, open(os.path.join(A, 'population-audit.json'), 'w'), indent=1)
print(json.dumps(out, indent=1))
