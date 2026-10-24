# Distance (m) from coordinates (lot map pin on parking-location pages; transit stop pins on station pages) published on Sound Transit pages to the drawn ParkingSites polygon (0 = inside).
# Usage: python3 -I st_location.py <evidence dir>
import json, math, re, sys
D = sys.argv[1].rstrip("/")
PAGES = {23: "spot-st-pl-mercer-island-park-ride.html", 2: "spot-st-ss-edmonds-station.html", 6: "spot-st-ss-mukilteo-station.html",
         12: "spot-st-ss-tukwila-station.html", 45: "spot-st-pl-ash-way-park-ride.html", 24: "spot-st-ss-mountlake-terrace-station.html",
         5: "spot-st-ss-lakewood-station.html", 30: "spot-st-pl-south-sammamish-park-ride.html"}
feats = {f["properties"]["OBJECTID"]: f for f in json.load(open(f"{D}/raw/st-ParkingSites-0-all.geojson"))["features"]}
def rings(g): return [r for p in (g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]) for r in p]
def inside(pt, ring):
    x, y = pt; c = False
    for (x1, y1), (x2, y2) in zip(ring, ring[1:]):
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1: c = not c
    return c
def seg_dist(p, a, b, k):
    (px, py), (ax, ay), (bx, by) = [(q[0] * k, q[1] * 111320) for q in (p, a, b)]
    dx, dy = bx - ax, by - ay; t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy or 1)))
    return math.hypot(px - ax - t * dx, py - ay - t * dy)
out = {}
for oid, page in PAGES.items():
    s = open(f"{D}/raw/{page}", errors="replace").read()
    s = s.split('"map_settings"')[0]  # drop the page's default map centre
    pts = [(float(lo), float(la)) for la, lo in re.findall(r'"lat":\s*(-?[\d.]+),[^{}]*?"lon":\s*(-?[\d.]+)', s)]
    pts += [(float(lo), float(la)) for la, lo in re.findall(r'daddr=(-?[\d.]+),(-?[\d.]+)', s)]
    rs = rings(feats[oid]["geometry"]); k = 111320 * math.cos(math.radians(rs[0][0][1]))
    best = min((0 if any(inside(p, r) for r in rs) else min(seg_dist(p, a, b, k) for r in rs for a, b in zip(r, r[1:])), p) for p in pts) if pts else None
    out[oid] = {"page": page, "points_on_page": len(pts), "min_distance_m": round(best[0]) if best else None}
print(json.dumps(out, indent=1))
