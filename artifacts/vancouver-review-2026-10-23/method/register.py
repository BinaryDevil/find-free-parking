"""Fetch layer/dataset/item metadata for every Vancouver candidate. Usage: python3 -I register.py <artifact_dir>"""
import sys, os, json, datetime, urllib.request, urllib.parse
A = sys.argv[1]; RAW = os.path.join(A, 'raw', 'register'); os.makedirs(RAW, exist_ok=True)
now = lambda: datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds')
H = 'https://services3.arcgis.com/qrcTTRTwUoS8N47o/arcgis/rest/services'
P = 'https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets'
def get(url, name):
    t = now()
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'find-free-parking-review'})
        b = urllib.request.urlopen(req, timeout=60).read(); code = 200
    except urllib.error.HTTPError as e:
        b = e.read(); code = e.code
    open(os.path.join(RAW, name), 'wb').write(b)
    try: j = json.loads(b)
    except Exception: j = None
    return code, j, t
ms = lambda v: datetime.datetime.fromtimestamp(v / 1000, datetime.timezone.utc).isoformat(timespec='seconds') if v else None
reg = {'generated_utc': now(), 'arcgis': [], 'portal': [], 'other': []}
for svc in ['paMeter', 'ResidentialParkingPermitZones', 'Road_Ahead_View', 'DisabilityParking', 'COVMotorcycleParkingNonMetered', 'COVCarShareParking', 'RoadAheadHistoricFilmPermits_3820d']:
    base = f'{H}/{svc}/FeatureServer/0'
    c1, j, t = get(base + '?f=pjson', f'{svc}-layer.json')
    c2, cnt, _ = get(base + '/query?where=1%3D1&returnCountOnly=true&f=json', f'{svc}-count.json')
    c3, svcj, _ = get(f'{H}/{svc}/FeatureServer?f=pjson', f'{svc}-service.json')
    item = (svcj or {}).get('serviceItemId')
    it = {}
    if item:
        _, it, _ = get(f'https://www.arcgis.com/sharing/rest/content/items/{item}?f=json', f'{svc}-item.json')
    ei = (j or {}).get('editingInfo', {})
    reg['arcgis'].append({'service': svc, 'url': base, 'retrieved_utc': t, 'http': c1, 'count': (cnt or {}).get('count'),
        'geometry': (j or {}).get('geometryType'), 'wkid': ((j or {}).get('extent') or {}).get('spatialReference', {}).get('wkid'),
        'lastEditDate': ms(ei.get('lastEditDate')), 'dataLastEditDate': ms(ei.get('dataLastEditDate')),
        'fields': [f['name'] for f in (j or {}).get('fields', [])], 'item': item, 'owner': (it or {}).get('owner'),
        'access': (it or {}).get('access'), 'licenseInfo': (it or {}).get('licenseInfo'), 'accessInformation': (it or {}).get('accessInformation')})
for d in ['parking-meters', 'motorcycle-parking', 'disability-parking', 'road-ahead-current-road-closures', 'road-ahead-projects-under-construction',
          'road-ahead-upcoming-projects', 'parking-tickets', 'parking-tickets-2020-2025', 'street-intersections', 'public-streets']:
    c, j, t = get(f'{P}/{d}', f'portal-{d}.json')
    m = (j or {}).get('metas', {}).get('default', {})
    reg['portal'].append({'dataset': d, 'url': f'{P}/{d}', 'retrieved_utc': t, 'http': c, 'records': m.get('records_count'),
        'modified': m.get('modified'), 'data_processed': m.get('data_processed'), 'license': m.get('license'),
        'publisher': m.get('publisher'), 'fields': [f['name'] for f in (j or {}).get('fields', [])]})
for name, url in [('GDH-paMeter-1', 'https://maps.vancouver.ca/server/rest/services/GDH/paMeter/MapServer/1?f=pjson'),
                  ('GDH-paMeter-1-count', 'https://maps.vancouver.ca/server/rest/services/GDH/paMeter/MapServer/1/query?where=1%3D1&returnCountOnly=true&f=json'),
                  ('roadahead-atom', 'https://vanmapp1.vancouver.ca/georss/roadahead_atom.xml'),
                  ('roadahead-georss', 'https://vanmapp1.vancouver.ca/georss/roadahead_georss.xml'),
                  ('licence-page', 'https://opendata.vancouver.ca/pages/licence/')]:
    c, j, t = get(url, name + ('.json' if 'GDH' in name else '.txt'))
    reg['other'].append({'name': name, 'url': url, 'retrieved_utc': t, 'http': c,
                         'count': (j or {}).get('count') if isinstance(j, dict) else None,
                         'fields': [f['name'] for f in (j or {}).get('fields', [])] if isinstance(j, dict) else None})
json.dump(reg, open(os.path.join(A, 'register.json'), 'w'), indent=1)
for r in reg['arcgis']: print(r['service'], r['http'], r['count'], r['dataLastEditDate'], r['owner'], r['access'], repr(r['licenseInfo'])[:60])
for r in reg['portal']: print(r['dataset'], r['http'], r['records'], r['modified'], r['license'])
for r in reg['other']: print(r['name'], r['http'], r['count'])
