# Runs the pre-registered probe for #138. Usage: python3 -I method/probe.py <artifact-dir>
# Fetches into <dir>/raw/probe-*.json, appends to retrievals.tsv, writes <dir>/probe-results.json.
import json, sys, random, datetime, urllib.request, urllib.parse
D = sys.argv[1]; P = json.load(open(f"{D}/probe-preregistration.json"))
S = "https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services"
def get(name, url, data=None):
    req = urllib.request.Request(url, data=urllib.parse.urlencode(data).encode() if data else None)
    with urllib.request.urlopen(req, timeout=90) as r:
        body = r.read(); code = r.status
    open(f"{D}/raw/{name}", "wb").write(body)
    with open(f"{D}/retrievals.tsv", "a") as f:
        f.write(f"{datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}\t{code}\t{name}\t{url}{' (POST)' if data else ''}\n")
    return json.loads(body)
B = P["population"]["source"] + "/query"
ids = sorted(get("probe-population-ids.json", B, {"where": P["population"]["where"], "returnIdsOnly": "true", "f": "json"})["objectIds"])
pick = random.Random(138).sample(ids, 60)
sides = get("probe-sample-blockface.json", B, {"objectIds": ",".join(map(str, pick)), "outFields": "OBJECTID,ELMNTKEY,UNITDESC,SIDE,CSM,PARKING_CATEGORY,BLOCKFACE_LENGTH", "returnGeometry": "false", "f": "json"})["features"]
keys = sorted({s["attributes"]["ELMNTKEY"] for s in sides})
inkeys = "ELMNTKEY IN (" + ",".join(map(str, keys)) + ")"
s0 = get("probe-signs0.json", f"{S}/Parking_Signs/FeatureServer/0/query", {"where": inkeys, "outFields": "ELMNTKEY,CATEGORY,SIGNTYPE,STANDARDTEXT,CUSTOMTEXT,DISTANCE", "returnGeometry": "false", "resultRecordCount": "2000", "f": "json"})["features"]
s1 = get("probe-streetsigns1.json", f"{S}/SDOT_Street_Signs/FeatureServer/1/query", {"where": inkeys, "outFields": "ELMNTKEY,CATEGORY,SIGNTYPE,TEXT,DISTANCE,CURRENT_STATUS", "returnGeometry": "false", "resultRecordCount": "2000", "f": "json"})["features"]
cls = {c: k for k, v in P["classes"].items() for c in v}
def tally(feats, keep=lambda a: True):
    per = {k: set() for k in keys}
    for f in feats:
        a = f["attributes"]
        if keep(a): per[a["ELMNTKEY"]].add(cls.get((a.get("CATEGORY") or "").strip(), "other_or_null"))
    return per
def ci(x, n):  # exact Clopper-Pearson 95% two-sided, by bisection on the binomial tail
    from math import comb
    cdf = lambda k, p: sum(comb(n, i) * p**i * (1-p)**(n-i) for i in range(k+1))
    def solve(f):
        lo, hi = 0.0, 1.0
        for _ in range(60):
            m = (lo+hi)/2
            (lo, hi) = (m, hi) if f(m) else (lo, m)
        return round((lo+hi)/2, 4)
    lower = 0.0 if x == 0 else solve(lambda p: 1-cdf(x-1, p) < 0.025)
    upper = 1.0 if x == n else solve(lambda p: cdf(x, p) > 0.025)
    return [lower, upper]
HIT = ["prohibiting_or_tow", "permit_or_payment_or_eligibility", "time_limit", "unclassifiable_by_category"]
def summary(per):
    n = len(per); out = {"sides": n}
    for c in HIT + ["informational", "other_or_null"]:
        out[c] = sum(1 for v in per.values() if c in v)
    out["no_sign_record"] = sum(1 for v in per.values() if not v)
    h = sum(1 for v in per.values() if v & set(HIT)); out["hit"] = h; out["hit_ci95"] = ci(h, n)
    p = out["prohibiting_or_tow"]; out["prohibiting_or_tow_ci95"] = ci(p, n)
    return out
statuses = sorted({(f["attributes"].get("CURRENT_STATUS") or "null") for f in s1})
res = {"computed_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
 "population_size": len(ids), "sampled_objectids": pick, "elmntkeys": keys,
 "primary_parking_signs_0": summary(tally(s0)),
 "sensitivity_street_signs_1_all": summary(tally(s1)),
 "street_signs_1_status_values": statuses,
 "per_side_primary": {str(k): sorted(v) for k, v in tally(s0).items()}}
json.dump(res, open(f"{D}/probe-results.json", "w"), indent=1)
print(json.dumps({k: v for k, v in res.items() if k not in ("sampled_objectids", "elmntkeys", "per_side_primary")}, indent=1))
