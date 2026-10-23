"""Shared, deterministic helpers for the 2026-10-23 Vancouver review (stdlib only)."""
import json, math

LAT0 = math.radians(49.25)
R = 6371008.8

def xy(lon, lat):
    return (math.radians(lon) * R * math.cos(LAT0), math.radians(lat) * R)

def seg_dist(p, a, b):
    ax, ay = a; bx, by = b; px, py = p
    dx, dy = bx - ax, by - ay
    L = dx * dx + dy * dy
    t = 0.0 if L == 0 else max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / L))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))

def lines(geom):
    if geom['type'] == 'LineString':
        return [geom['coordinates']]
    return geom['coordinates']

def load_streets(path):
    out = []
    for f in json.load(open(path))['features']:
        g = f.get('geometry')
        if not g:
            continue
        pts = [[xy(*c[:2]) for c in ln] for ln in lines(g)]
        xs = [p[0] for ln in pts for p in ln]; ys = [p[1] for ln in pts for p in ln]
        out.append({'hblock': f['properties']['hblock'], 'streetuse': f['properties']['streetuse'],
                    'pts': pts, 'bbox': (min(xs), min(ys), max(xs), max(ys)),
                    'mid': f['properties'].get('geo_point_2d')})
    return out

def nearest_blocks(lon, lat, streets, radius=60.0):
    """Return [(distance_m, hblock)] sorted, best distance per distinct hblock, within radius."""
    p = xy(lon, lat); best = {}
    for s in streets:
        x0, y0, x1, y1 = s['bbox']
        if p[0] < x0 - radius or p[0] > x1 + radius or p[1] < y0 - radius or p[1] > y1 + radius:
            continue
        for ln in s['pts']:
            for a, b in zip(ln, ln[1:]):
                d = seg_dist(p, a, b)
                if d < best.get(s['hblock'], 1e18):
                    best[s['hblock']] = d
    return sorted((d, h) for h, d in best.items() if d <= radius)

def map_meter(lon, lat, streets):
    """Pre-registered rule: nearest hblock within 30 m; ambiguous if another hblock is within 3 m of it."""
    nb = nearest_blocks(lon, lat, streets)
    if not nb or nb[0][0] > 30.0:
        return {'status': 'unmapped', 'candidates': nb[:3]}
    if len(nb) > 1 and nb[1][0] - nb[0][0] < 3.0:
        return {'status': 'ambiguous', 'hblock': nb[0][1], 'candidates': nb[:3]}
    return {'status': 'mapped', 'hblock': nb[0][1], 'candidates': nb[:3]}

def point_in_ring(x, y, ring):
    inside = False
    for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]):
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            inside = not inside
    return inside

def in_polygon(lon, lat, geom):
    polys = [geom['coordinates']] if geom['type'] == 'Polygon' else geom['coordinates']
    for poly in polys:
        if point_in_ring(lon, lat, [tuple(c[:2]) for c in poly[0]]) and not any(
                point_in_ring(lon, lat, [tuple(c[:2]) for c in h]) for h in poly[1:]):
            return True
    return False

COMMON = lambda r: (r['service_status'] == 'In Service' and r['vehicle_type'] == 'Any Vehicle'
                    and r['time_limit_override'] == 'No' and r['prohibition_override'] == 'No'
                    and r['rate_9am_6pm'] and r['rate_6pm_10pm']
                    and r['time_limit_9am_6pm'] in ('2 Hr', '3 Hr', '4 Hr')
                    and r['time_limit_6pm_10pm'] in ('2 Hr', '3 Hr', '4 Hr')
                    and r['time_limit_weekend_9am_6pm'] in ('2 Hr', '3 Hr', '4 Hr')
                    and r['time_limit_weekend_6pm_10pm'] in ('2 Hr', '3 Hr', '4 Hr'))
NORUSH = lambda r: not r['am_rush_hours'] and not r['pm_rush_hours']
NOPROH = lambda r: not r['prohibition_1_zone'] and not r['prohibition_2_zone']
STRATA = {
    'MT': lambda r: COMMON(r) and NORUSH(r) and NOPROH(r),
    'MR': lambda r: COMMON(r) and not NORUSH(r) and NOPROH(r),
    'MX': lambda r: COMMON(r) and bool(r['prohibition_1_zone']) and bool(r['prohibition_1_days']) and bool(r['prohibition_1_time'])
                    and (not r['prohibition_2_zone'] or (r['prohibition_2_days'] and r['prohibition_2_time'])),
}
