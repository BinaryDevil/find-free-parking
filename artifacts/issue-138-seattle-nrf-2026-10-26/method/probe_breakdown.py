# Descriptive (not pre-registered) breakdown of probe hits by in-service sign type. Usage: python3 -I method/probe_breakdown.py <artifact-dir>
import json, sys, collections
D = sys.argv[1]
f = json.load(open(f"{D}/raw/probe-streetsigns1.json"))["features"]
by = collections.defaultdict(set)
for x in f:
    a = x["attributes"]
    if (a["CATEGORY"] or "").strip() in ("PNP", "PPEAK"):
        by[f'{(a["SIGNTYPE"] or "").strip()} | {" ".join((a["TEXT"] or "").split())[:60]}'].add(a["ELMNTKEY"])
hit = set().union(*by.values())
nonclear = set().union(*[v for k, v in by.items() if not k.startswith("R7-WI30")])
out = {"sides_by_sign_type": {k: len(v) for k, v in sorted(by.items(), key=lambda kv: -len(kv[1]))},
       "sides_any_prohibiting_or_tow": len(hit), "sides_excluding_30ft_clearance_only": len(nonclear),
       "p_zero_misses_in_30_if_rate_holds": {f"{n}/60": (1 - n/60) ** 30 for n in (len(hit), len(nonclear))}}
json.dump(out, open(f"{D}/probe-breakdown.json", "w"), indent=1); print(json.dumps(out, indent=1))
