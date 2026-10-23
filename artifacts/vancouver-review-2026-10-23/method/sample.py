"""Draw the pre-registered sample, fetch signals, grade. Usage: python3 -I sample.py <artifact_dir>"""
import sys, os, json, gzip, random, datetime, urllib.request, urllib.parse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import STRATA, load_streets, map_meter, in_polygon

A = sys.argv[1]; RAW = os.path.join(A, 'raw')
pre = json.load(open(os.path.join(A, 'subset-preregistration.json')))
gz = lambda p: json.load(gzip.open(os.path.join(RAW, p + '.gz')))
meters = gz('meters-export.json'); byfid = {r['feature_id']: r for r in meters}
import tempfile
tmp = tempfile.NamedTemporaryFile(suffix='.geojson', delete=False); tmp.write(gzip.open(os.path.join(RAW, 'public-streets.geojson.gz')).read()); tmp.close()
streets = load_streets(tmp.name); os.unlink(tmp.name)
rpp = gz('rpp-page0.geojson')['features']
PORTAL = 'https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/parking-tickets/records'
HOSTED = 'https://services3.arcgis.com/qrcTTRTwUoS8N47o/arcgis/rest/services/paMeter/FeatureServer/0/query'
now = lambda: datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds')

def get(url, name):
    t = now(); body = urllib.request.urlopen(url, timeout=60).read()
    open(os.path.join(RAW, name), 'wb').write(body)
    return json.loads(body), t

# --- populations, mapping (same rule as prereg) and draw
mapped = {}
for r in meters:
    if r['service_status'] != 'Removed':
        g = r['geo_point_2d']; mapped[r['feature_id']] = map_meter(g['lon'], g['lat'], streets)
pops = {k: sorted(r['feature_id'] for r in meters if f(r)) for k, f in STRATA.items()}
metered_blocks = set()
for m in mapped.values():
    for d, h in m['candidates']:
        if d <= 30.0: metered_blocks.add(h)
pf = set()
for s in streets:
    if s['streetuse'] != 'Closed' and s['mid'] and s['hblock'] not in metered_blocks and any(
            f['geometry'] and in_polygon(s['mid']['lon'], s['mid']['lat'], f['geometry']) for f in rpp):
        pf.add(s['hblock'])
pops['P'] = sorted(pf)
assert {k: len(v) for k, v in pops.items()} == pre['population_counts'], 'population drift'
rng = random.Random(20261023)
draw = {k: rng.sample(pops[k], 3) for k in ['MT', 'MR', 'MX', 'P']}

CATS = pre['ticket_categories']
def cat(text):
    return [c for c, keys in CATS.items() if any(k in text for k in keys)]

def block_meters(hb):
    return [byfid[f] for f, m in mapped.items() if m['status'] != 'unmapped' and m['hblock'] == hb]

def represented(c, ms):
    zones = {z for r in ms for z in (r['prohibition_1_zone'], r['prohibition_2_zone']) if z}
    rush = any(r['am_rush_hours'] or r['pm_rush_hours'] for r in ms)
    veh = {r['vehicle_type'] for r in ms}
    return {'NS': 'NO STOPPING' in zones or rush, 'RUSH': rush, 'CLZ': 'CVLZ' in zones,
            'LZ': bool(zones & {'LOADING ZONE', 'CVLZ'}), 'PZ': 'PASSENGER ZONE' in zones, 'TOUR': 'TOUR BUS ZONE' in zones,
            'BUS': False, 'BIKE': False,
            'CLASS': bool(zones & {'TAXI ZONE', 'POLICE ZONE', 'MILITARY ZONE', 'AUTHORIZED VEHICLES ONLY', 'PERMIT PARKING ONLY'}) or bool(veh - {'Any Vehicle'}),
            'DIS': 'Accessibility' in veh, 'NP': bool(zones), 'SR': bool(zones) or bool(veh - {'Any Vehicle'})}[c]

SAFETY = ['NS', 'RUSH', 'CLZ', 'LZ', 'PZ', 'TOUR', 'BUS', 'CLASS', 'DIS', 'BIKE', 'NP', 'SR']
ZONECAT = {'NO STOPPING': {'NS'}, 'LOADING ZONE': {'LZ', 'CLZ'}, 'CVLZ': {'CLZ', 'LZ'}, 'PASSENGER ZONE': {'PZ'}, 'TOUR BUS ZONE': {'TOUR'}}

def tickets(hb, tag):
    blk, street = hb.split(' ', 1)
    q = {'select': 'infractiontext,status,bylaw,section,count(*) as n', 'where': f'block={int(blk)} and street="{street}"',
         'group_by': 'infractiontext,status,bylaw,section', 'limit': 100}
    j, t = get(PORTAL + '?' + urllib.parse.urlencode(q), f'tickets-{tag}.json')
    q2 = {'select': 'count(*) as n', 'where': f'street="{street}"'}
    j2, _ = get(PORTAL + '?' + urllib.parse.urlencode(q2), f'tickets-{tag}-streetcount.json')
    rows = j['results']
    for r in rows: r['cats'] = cat(r['infractiontext'])
    return rows, (j2['results'][0]['n'] if j2['results'] else 0), t

checks = []
for k in ['MT', 'MR', 'MX', 'P']:
    for i, key in enumerate(draw[k], 1):
        tag = f'{k}{i}'; c = {'id': tag, 'stratum': k}
        if k == 'P':
            hb = key; s = next(s for s in streets if s['hblock'] == hb)
            hits = [f['properties'] for f in rpp if f['geometry'] and in_polygon(s['mid']['lon'], s['mid']['lat'], f['geometry'])]
            c.update({'hblock': hb, 'streetuse': s['streetuse'], 'polygons': hits, 'mapping': {'status': 'frame'}})
        else:
            r = byfid[key]; m = mapped[key]
            c.update({'feature_id': key, 'meter_id': r['meter_id'], 'record': r, 'mapping': m, 'hblock': m.get('hblock')})
            hj, ht = get(HOSTED + '?' + urllib.parse.urlencode({'where': f'FID_METER={key}', 'outFields': '*', 'returnGeometry': 'false', 'f': 'json'}), f'pameter-{tag}.json')
            hf = [f['attributes'] for f in hj.get('features', [])]
            pairs = [('meter_id', 'METER_ID'), ('service_status', 'SERVICE_STATUS'), ('rate_9am_6pm', 'RATE_9A_6P'), ('rate_6pm_10pm', 'RATE_6P_10P'),
                     ('time_limit_9am_6pm', 'TIME_LIMIT_9A_6P'), ('time_limit_6pm_10pm', 'TIME_LIMIT_6P_10P'), ('time_limit_weekend_9am_6pm', 'TIME_LIMIT_WEEKEND_9A_6P'),
                     ('time_limit_weekend_6pm_10pm', 'TIME_LIMIT_WEEKEND_6P_10P'), ('am_rush_hours', 'AM_RUSH_HOURS'), ('pm_rush_hours', 'PM_RUSH_HOURS'),
                     ('prohibition_1_zone', 'PROHIBITION_1_ZONE'), ('prohibition_1_days', 'PROHIBITION_1_DAYS'), ('prohibition_1_time', 'PROHIBITION_1_TIME'),
                     ('prohibition_2_zone', 'PROHIBITION_2_ZONE'), ('vehicle_type', 'VEHICLE_TYPE'), ('time_limit_override', 'TIME_LIMIT_OVERRIDE'), ('prohibition_override', 'PROHIBITION_OVERRIDE')]
            diffs = [p for p, h in pairs if hf and (r[p] or None) != (hf[0].get(h) or None)]
            c['pameter_transcription'] = {'retrieved_utc': ht, 'records': len(hf), 'differing_fields': diffs if hf else 'no record'}
        if c['mapping']['status'] in ('ambiguous', 'unmapped'):
            c['result'] = 'UNVERIFIED'; c['reason'] = f"block {c['mapping']['status']}"; checks.append(c); continue
        hb = c['hblock']; rows, scount, t = tickets(hb, tag)
        c['tickets_retrieved_utc'] = t; c['tickets'] = rows; c['street_2026_ticket_count'] = scount
        present = {x for r in rows for x in r['cats']}
        c['categories_present'] = sorted(present)
        if scount == 0:
            c['result'] = 'UNVERIFIED'; c['reason'] = 'street name has no 2026 tickets citywide'; checks.append(c); continue
        if k == 'P':
            ms = block_meters(hb)
            if 'METER' in present:
                c['result'] = 'CONTRADICTION'; c['reason'] = 'metered-space tickets on a permit-claim block'
            elif present & {'SR', 'NP'}:
                c['result'] = 'AGREE'; c['reason'] = 'signed restriction tickets on block'
            else:
                c['result'] = 'UNVERIFIED'; c['reason'] = 'no SR/NP ticket on block'
        else:
            ms = block_meters(hb)
            c['block_meters'] = [{'feature_id': x['feature_id'], 'meter_id': x['meter_id'], 'status': x['service_status'], 'vehicle': x['vehicle_type'],
                                  'rush': [x['am_rush_hours'], x['pm_rush_hours']], 'zones': [x['prohibition_1_zone'], x['prohibition_2_zone']]} for x in ms]
            unrep = sorted(x for x in present & set(SAFETY) if not represented(x, ms))
            c['unrepresented'] = unrep
            need = {'MT': set(), 'MR': {'RUSH', 'NS'}, 'MX': ZONECAT.get(c['record']['prohibition_1_zone'], {'CLASS'})}[k]
            if unrep:
                c['result'] = 'CONTRADICTION'; c['reason'] = 'unrepresented restriction categories on block: ' + ', '.join(unrep)
            elif 'METER' not in present:
                c['result'] = 'UNVERIFIED'; c['reason'] = 'no metered-space ticket on block'
            elif need and not (present & need):
                c['result'] = 'UNVERIFIED'; c['reason'] = 'no ticket matching the claimed restriction'
            else:
                c['result'] = 'AGREE'; c['reason'] = 'payment and claimed restriction corroborated; no unrepresented restriction'
        checks.append(c)

out = {'generated_utc': now(), 'draw': draw, 'checks': checks,
       'summary': {r: sum(1 for c in checks if c['result'] == r) for r in ['AGREE', 'CONTRADICTION', 'UNVERIFIED']}}
json.dump(out, open(os.path.join(A, 'spot-check-sample.json'), 'w'), indent=1)
for c in checks:
    print(c['id'], c.get('meter_id', ''), c['hblock'], c['result'], '-', c['reason'], c.get('pameter_transcription', {}).get('differing_fields', ''))
print(out['summary'])
