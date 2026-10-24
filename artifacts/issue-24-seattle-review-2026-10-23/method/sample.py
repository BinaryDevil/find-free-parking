import json, random, urllib.request, urllib.parse, datetime
B="https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services"
def q(layer, **p):
    p.setdefault('f','json')
    url=f"{B}/{layer}/query?"+urllib.parse.urlencode(p)
    with urllib.request.urlopen(url, timeout=90) as r: return json.load(r)
pre=json.load(open('subset-preregistration.json'))
rng=random.Random(20261023)
out={"retrieved_utc":datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds'),"strata":{}}
for name in ["T_time_limited_free","P_paid","R_permit","N_no_parking"]:
    w=pre['strata'][name]['where']
    keys=sorted(set(f['attributes']['ELMNTKEY'] for f in q("Blockface/FeatureServer/1",where=w,outFields="ELMNTKEY",returnGeometry="false",resultRecordCount=4000)['features']))
    pick=rng.sample(keys,3)
    recs=[]
    for k in pick:
        bf=q("Blockface/FeatureServer/1",where=f"ELMNTKEY={k}",outFields="*",returnGeometry="false")['features']
        sg=q("Parking_Signs/FeatureServer/0",where=f"ELMNTKEY={k}",outFields="COMPKEY,ELMNTKEY,DISTANCE,WIDTH,UNITDESC,SIGNTYPE,STANDARDTEXT,CATEGORY,CATEGORYDESCR,FACING,CUSTOMTEXT,STARTDAY,ENDDAY,STARTTIME,ENDTIME",returnGeometry="false")['features']
        pf=q("Parking_Features/FeatureServer/4",where=f"ELMNTKEY={k}",outFields="*",returnGeometry="false")['features']
        recs.append({"ELMNTKEY":k,"blockface":[f['attributes'] for f in bf],"parking_signs_0":[f['attributes'] for f in sg],"parking_features_4":[f['attributes'] for f in pf]})
    out['strata'][name]={"population":len(keys),"sample":pick,"records":recs}
json.dump(out,open('spot-check-sample.json','w'),indent=1)
for n,s in out['strata'].items(): print(n,s['population'],s['sample'])
