# Redacts third-party personal identifiers from catalog search results for #138.
# Keeps functional agency addresses and official org accounts. Usage: python3 -I method/redact.py <artifact-dir>
import json, re, sys, glob
D = sys.argv[1]
KEEP_EMAIL = {"mapgis.mapgis@seattle.gov", "dot_it_gis@seattle.gov", "open.data@seattle.gov", "ossdata@kingcounty.gov",
              "as-built.help@kingcounty.gov", "gissupport@ci.seatac.wa.us", "enrollmentplanning@seattleschools.org"}
OFFICIAL = re.compile(r"(_SeattleCityGIS|SeattleCityGI|^SeattleData$|^City_Seattle_GIS$|^KingCounty$|_WSDOT$|^WAECY_|^gisadmin_PSRC$|^gissupport_seatac$)")
EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}")
R = "[redacted-third-party]"
def walk(o):
    if isinstance(o, dict):
        for k, v in list(o.items()):
            if k in ("owner", "orgOwner") and isinstance(v, str) and not OFFICIAL.search(v): o[k] = R
            elif k in ("owner", "tableAuthor", "approvals", "grants") and isinstance(v, (dict, list)): o[k] = R
            else: o[k] = walk(v)
        return o
    if isinstance(o, list): return [walk(x) for x in o]
    if isinstance(o, str): return EMAIL.sub(lambda m: m.group(0) if m.group(0).lower() in KEEP_EMAIL else R, o)
    return o
n = 0
for f in sorted(glob.glob(f"{D}/raw/search-*.json") + glob.glob(f"{D}/raw/socrata-*.json") + glob.glob(f"{D}/raw/signal-*.json") + glob.glob(f"{D}/raw/item-*.json") + glob.glob(f"{D}/raw/meta-*.json") + glob.glob(f"{D}/raw/svc-*.json")):
    s = open(f).read(); out = json.dumps(walk(json.loads(s)), ensure_ascii=False)
    if out != json.dumps(json.loads(s), ensure_ascii=False): open(f, "w").write(out); n += 1; print("redacted", f.split("/raw/")[1])
print(n, "files changed")
