"""Write subset-preregistration.json from source data only (meter feed, permit polygons, street blocks).
Usage: python3 -I prereg.py <raw_dir> <out_json>"""
import sys, os, json, hashlib, datetime, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import STRATA, load_streets, map_meter, in_polygon

raw, out = sys.argv[1], sys.argv[2]
sha = lambda p: hashlib.sha256(open(os.path.join(raw, p), 'rb').read()).hexdigest()
meters = json.load(open(os.path.join(raw, 'meters-export.json')))
streets = load_streets(os.path.join(raw, 'public-streets.geojson'))
rpp = json.load(open(os.path.join(raw, 'rpp-page0.geojson')))['features']

metered_blocks = set(); mapping = {}
for r in meters:
    if r['service_status'] == 'Removed':
        continue
    g = r['geo_point_2d']; m = map_meter(g['lon'], g['lat'], streets)
    mapping[r['feature_id']] = m
    if m['status'] != 'unmapped':
        metered_blocks.add(m['hblock'])
        for d, h in m['candidates']:
            if d <= 30.0:
                metered_blocks.add(h)

pop = {k: sorted(r['feature_id'] for r in meters if f(r)) for k, f in STRATA.items()}
pframe = []
for s in streets:
    if s['streetuse'] == 'Closed' or not s['mid'] or s['hblock'] in metered_blocks:
        continue
    hits = [f['properties'] for f in rpp if f['geometry'] and in_polygon(s['mid']['lon'], s['mid']['lat'], f['geometry'])]
    if hits:
        pframe.append(s['hblock'])
pop['P'] = sorted(set(pframe))

doc = {
  'registered_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds'),
  'note': 'Written before any spot-check signal (ticket records for any sampled block, City web pages, hosted paMeter records) was fetched. Only signal vocabularies/field lists were read: parking-tickets infraction-text and status counts citywide, and 3 unfiltered records for field formats.',
  'inputs': {
    'meters': {'url': 'https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/parking-meters/exports/json', 'retrieved_utc': '2026-10-23T19:40:08Z', 'dataset_modified': '2026-10-19T13:31:55+00:00', 'rows': len(meters), 'sha256': sha('meters-export.json')},
    'permit_polygons': {'url': 'https://services3.arcgis.com/qrcTTRTwUoS8N47o/arcgis/rest/services/ResidentialParkingPermitZones/FeatureServer/0/query (outSR=4326, all 545)', 'retrieved_utc': 'between 2026-10-23T19:40:08Z and 19:41:22Z', 'rows': len(rpp), 'sha256': sha('rpp-page0.geojson')},
    'street_blocks': {'url': 'https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/public-streets/exports/geojson', 'retrieved_utc': '2026-10-23T19:41:22Z', 'dataset_modified': '2026-07-27T13:32:20+00:00', 'rows': len(streets), 'sha256': sha('public-streets.geojson')},
  },
  'common_meter_filter': "service_status='In Service' AND vehicle_type='Any Vehicle' AND time_limit_override='No' AND prohibition_override='No' AND both rates present AND all four time limits in ('2 Hr','3 Hr','4 Hr')  [Removed, Out of Service, motorcycle, accessibility, EV, override, null/No-Time-Limit/13 Hr/30 Min limits excluded]",
  'strata': {
    'MT': {'case': 'metered + time-limited', 'where': 'common AND no am/pm rush AND no prohibition zone',
           'claim': 'PAID 09:00-18:00 at rate_9am_6pm and 18:00-22:00 at rate_6pm_10pm, every day, with the listed weekday/weekend limits; VERIFIED_FREE 22:00-09:00 (E2 after-hours, prohibition and limit fields present and empty of restrictions)'},
    'MR': {'case': 'metered + rush-hour no stopping', 'where': 'common AND (am OR pm rush) AND no prohibition zone',
           'claim': 'RESTRICTED (no stopping) during each rush window on every day (days undocumented, so conservative); PAID as MT otherwise 09:00-22:00; 22:00-09:00 UNKNOWN except the AM rush window, which is RESTRICTED'},
    'MX': {'case': 'no-parking / prohibition zone on a meter', 'where': 'common AND prohibition_1 zone, days and time all present (and slot 2 complete if present)',
           'claim': 'RESTRICTED (the named zone) on the listed days and times for both slots; PAID as MT otherwise 09:00-22:00; otherwise UNKNOWN'},
    'P': {'case': 'permit', 'where': 'public-streets hblock (streetuse != Closed) whose geo_point_2d lies inside any ResidentialParkingPermitZones polygon (RPP, RPO or VRPP), excluding every hblock to which a non-Removed meter maps (nearest or within 30 m)',
          'claim': 'RESTRICTED (resident permit program of the containing polygon) at all times; never free; hours UNKNOWN'},
  },
  'population_counts': {k: len(v) for k, v in pop.items()},
  'population_sha256': {k: hashlib.sha256(json.dumps(v).encode()).hexdigest() for k, v in pop.items()},
  'sampling': "keys = sorted feature_id (MT, MR, MX) or sorted distinct hblock (P); rng = random.Random(20261023); for stratum in ['MT','MR','MX','P']: rng.sample(keys, 3). 12 checks.",
  'block_mapping': 'Meter point -> nearest public-streets hblock by planar distance (equirectangular, lat0 49.25). Must be <= 30 m. If a different hblock is within 3 m of the nearest, the check is UNVERIFIED (block ambiguous); no re-draw.',
  'counted_signal': "City of Vancouver parking-tickets (current dataset, 2026 tickets), all statuses, rows with block = hblock number AND street = hblock street text exactly. If the street text has no 2026 ticket anywhere in the city, the check is UNVERIFIED (name mismatch). Location precision is the 100-block, both sides; no time of day is published.",
  'ticket_categories': {
    'NS':   ["PROHIBITS STOPPING"],
    'RUSH': ["PRIORITY CONGESTION MANAGEMENT", "GRANVILLE MALL BETWEEN 7 A.M."],
    'CLZ':  ["STOP IN COMMERCIAL LOADING ZONE"],
    'LZ':   ["STOP IN LOADING ZONE"],
    'PZ':   ["STOP IN PASSENGER ZONE"],
    'TOUR': ["TOUR BUS ZONE"],
    'BUS':  ["DESIGNATED AS A BUS STOP"],
    'CLASS':["RESERVED FOR ONE OR MORE CLASS OF VEHICLE"],
    'DIS':  ["DISABLED PERSON'S PARKING PLACARD"],
    'BIKE': ["DESIGNATED FOR USE BY PERSONS ON BICYCLES"],
    'NP':   ["PROHIBITS PARKING"],
    'SR':   ["RESTRICTS PARKING"],
    'METER':["METERED SPACE"],
    'TL':   ["LONGER PERIOD OF TIME THAN INDICATED", "FOR MORE THAN 3 HRS"],
  },
  'represented_by_meters_on_block': {
    'NS': 'any non-Removed meter mapped to the block with a NO STOPPING prohibition zone or any rush window',
    'RUSH': 'any rush window', 'CLZ': 'CVLZ', 'LZ': 'LOADING ZONE or CVLZ', 'PZ': 'PASSENGER ZONE', 'TOUR': 'TOUR BUS ZONE',
    'BUS': 'never (no meter field)', 'BIKE': 'never (no meter field)',
    'CLASS': 'TAXI/POLICE/MILITARY/AUTHORIZED VEHICLES ONLY/PERMIT PARKING ONLY zone, or a meter with vehicle_type other than Any Vehicle',
    'DIS': 'a meter with vehicle_type Accessibility', 'NP': 'any prohibition zone', 'SR': 'any prohibition zone or a non-Any-Vehicle meter'},
  'contradiction_rule': {
    'MT_MR_MX': 'CONTRADICTION if the block has a 2026 ticket in NS, RUSH, CLZ, LZ, PZ, TOUR, BUS, CLASS, DIS, BIKE, NP or SR that is not represented by the meters mapped to that block. Rationale: the feed gives points, not curb extents, so an unrepresented signed restriction on the same block cannot be excluded from the claimed curb (fails closed; side-blind).',
    'P': 'CONTRADICTION if the block has any 2026 METER ticket (payment applies, contrary to a permit-only claim and to the frame excluding metered blocks).',
    'general': 'CONTRADICTION for every MT/MR/MX check if the City meter web page states paid hours other than 9am-10pm daily, or states that rush/prohibition signs do not override payment.'},
  'agreement_rule': {
    'MT': 'no contradiction AND >=1 2026 METER ticket on the block',
    'MR': 'no contradiction AND >=1 METER ticket AND >=1 RUSH or NS ticket on the block',
    'MX': 'no contradiction AND >=1 METER ticket AND >=1 ticket in the category matching the zone (NO STOPPING->NS, LOADING ZONE->LZ or CLZ, CVLZ->CLZ or LZ, PASSENGER ZONE->PZ, TOUR BUS ZONE->TOUR, other->CLASS)',
    'P': 'no contradiction AND >=1 SR or NP ticket on the block',
    'otherwise': 'UNVERIFIED'},
  'not_counted': 'Statutory location offences (hydrant, crosswalk, intersection, curb distance, driveway, lane, direction, large vehicle, derelict, boulevard, sidewalk), TL, water/idling/snow. The hosted paMeter layer (same City asset system, FID_METER = feature_id) is compared per sampled meter as a transcription check only; it is not independent. The RPP record URL page is read as program corroboration only.',
  'pass_rule': 'Subset passes criterion 7 only if >=10 checks AGREE, 0 CONTRADICT, and each case type (MT, MR, MX, P) has >=1 AGREE. Any contradiction: the subset stays pending; a narrower subset needs a new pre-registration and a new seed, never a re-draw of this one.',
}
json.dump(doc, open(out, 'w'), indent=1)
print(json.dumps({'counts': doc['population_counts'], 'mapping': collections.Counter(m['status'] for m in mapping.values())}))
