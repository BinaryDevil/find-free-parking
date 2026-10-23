import json, urllib.request, urllib.parse, datetime, collections
B="https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services"
def q(layer, **p):
    p.setdefault('f','json'); data=urllib.parse.urlencode(p).encode()
    with urllib.request.urlopen(urllib.request.Request(f"{B}/{layer}/query",data=data), timeout=120) as r: return json.load(r)
pre=json.load(open('subset-preregistration.json'))
out={"retrieved_utc":datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds'),"method":"for every ELMNTKEY in the stratum, fetch Parking_Signs-0 SIGNTYPE/CATEGORY on that key and count sides with at least one sign per category","strata":{}}
for name in ["T_time_limited_free","P_paid"]:
    keys=sorted(set(f['attributes']['ELMNTKEY'] for f in q("Blockface/FeatureServer/1",where=pre['strata'][name]['where'],outFields="ELMNTKEY",returnGeometry="false",resultRecordCount=4000)['features']))
    cats=collections.defaultdict(set); nosign=set(keys)
    for i in range(0,len(keys),100):
        ch=keys[i:i+100]; off=0
        while True:
            r=q("Parking_Signs/FeatureServer/0",where=f"ELMNTKEY IN ({','.join(map(str,ch))})",outFields="ELMNTKEY,CATEGORY,SIGNTYPE",returnGeometry="false",resultOffset=off,resultRecordCount=2000)
            for f in r['features']:
                a=f['attributes']; cats[a['CATEGORY']].add(a['ELMNTKEY']); nosign.discard(a['ELMNTKEY'])
                if a['SIGNTYPE'] and 'DISAB' in a['SIGNTYPE']: cats['DISABLED_signtype'].add(a['ELMNTKEY'])
            if not r.get('exceededTransferLimit'): break
            off+=2000
    out['strata'][name]={"sides":len(keys),"sides_with_no_signs":len(nosign),"sides_with_category":{k:len(v) for k,v in sorted(cats.items(),key=lambda kv:-len(kv[1]))}}
    print(name,json.dumps(out['strata'][name]))
json.dump(out,open('stratum-sign-audit.json','w'),indent=1)
