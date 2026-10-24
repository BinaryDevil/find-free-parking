# Pre-registers the criterion-7 spot-check samples for #125.
# Usage: python3 -I prereg.py <evidence dir>   (reads raw/ population files, writes preregistration.json)
import json, random, sys, platform, hashlib
D = sys.argv[1].rstrip("/")
def sha(p): return hashlib.sha256(open(p, "rb").read()).hexdigest()
SEED = 125
kc_path = f"{D}/raw/kc-PARKRIDE_POINT_386-0-all.geojson"
st_path = f"{D}/raw/st-ParkingSites-0-all.geojson"
kc = [f["properties"] for f in json.load(open(kc_path))["features"]]
st = [f["properties"] for f in json.load(open(st_path))["features"]]
rng = random.Random(SEED)
kc_p = sorted(r["INVENTORY_ID"] for r in kc if r["OWNERSHIP_TYPE"] == "P")
kc_l = sorted(r["INVENTORY_ID"] for r in kc if r["OWNERSHIP_TYPE"] == "L")
st_pop = sorted(r["OBJECTID"] for r in st if r["FACILITY_TYPE"] in ("PR", "Parking", "TC", "FS"))
st_nofacid = sum(1 for r in st if r["FACILITY_TYPE"] in ("PR", "Parking", "TC", "FS") and not r["FACILID"])
draw_kc_p = rng.sample(kc_p, 8)
draw_kc_l = rng.sample(kc_l, 4)
draw_st = rng.sample(st_pop, 10)
name = {r["INVENTORY_ID"]: r["NAME"] for r in kc}
st_by = {r["OBJECTID"]: r for r in st}
out = {
  "issue": 125, "registered_utc": sys.argv[2] if len(sys.argv) > 2 else None,
  "python": platform.python_version(), "seed": SEED,
  "method": "random.Random(125); sample KC-P(8), then KC-L(4), then ST(10), in that order, each from the sorted ID list",
  "populations": {
    "KC": {"layer": "https://services.arcgis.com/Ej0PsM5Aw677QF1W/arcgis/rest/services/PARKRIDE_POINT_386/FeatureServer/0",
           "file": kc_path.split("/")[-1], "sha256": sha(kc_path), "records": len(kc),
           "strata": {"OWNERSHIP_TYPE=P": len(kc_p), "OWNERSHIP_TYPE=L": len(kc_l)}, "id_field": "INVENTORY_ID"},
    "ST": {"layer": "https://services8.arcgis.com/MYIhHZJIRGCSLjBW/arcgis/rest/services/ParkingSites_gdb/FeatureServer/0",
           "file": st_path.split("/")[-1], "sha256": sha(st_path), "records": len(st),
           "filter": "FACILITY_TYPE in (PR, Parking, TC, FS)", "eligible": len(st_pop), "eligible_without_FACILID": st_nofacid, "id_field": "OBJECTID (FACILID recorded; null FACILID means no stable ID)"}},
  "claims_tested": {
    "KC": "The rule an adapter would derive from the layer record plus Metro's published system policy: parking open to transit customers, no charge, first come first served, any hour, maximum stay 72 hours, at the layer point.",
    "ST": "The rule an adapter would derive from the polygon plus Sound Transit's published system policy: open to transit passengers 24 hours a day, maximum stay 24 hours, no charge outside the station permit areas listed on the parking page, within the polygon."},
  "independent_signals": [
    "The operator's own per-lot listing or facility page: Metro's parking-locations entry for the lot; Sound Transit's facility page under /ride-with-us/parking/parking-locations/ or the station page.",
    "Where a different public operator owns or runs the lot, that operator's own official page for the lot (for example Sound Transit for a Metro-listed station garage).",
    "Location: published coordinates in the operator's map link where present, otherwise the published street address compared with the layer address."],
  "contradiction_rule": {
    "safety_fields": ["payment or fee", "permit or reserved spaces", "who may park (eligibility)", "time window or closures", "maximum stay / impound threshold", "no transit parking available", "location"],
    "contradiction_if": [
      "an independent official signal states a fee, permit-only or reserved area, eligibility, time window, closure or maximum stay for the lot that differs from or is absent from the tested claim",
      "the independent signal says no transit-customer parking exists, or the lot is not listed as an operating facility",
      "published coordinates are more than 150 m from the layer point (KC) or outside the polygon by more than 150 m (ST), or the published address names a different site"],
    "not_a_contradiction": ["space counts", "route lists", "spelling of names"],
    "unknown_if": "no independent official per-lot signal can be retrieved; Unknown counts as not confirmed, never as a pass",
    "pass_threshold": "zero contradictions across all drawn lots, and zero Unknown"},
  "sample": {"KC_P": [{"id": i, "name": name[i]} for i in draw_kc_p],
             "KC_L": [{"id": i, "name": name[i]} for i in draw_kc_l],
             "ST": [{"id": i, "FACILID": st_by[i]["FACILID"], "FACILITY_TYPE": st_by[i]["FACILITY_TYPE"], "name": st_by[i]["NAME"]} for i in draw_st]},
  "disclosure": "Before registration the author fetched, for discovery only, Metro's parking-locations and regulations pages, Sound Transit's parking and parking-locations pages, and the Eastgate facility page. These are re-fetched after registration for the spot check."}
json.dump(out, open(f"{D}/preregistration.json", "w"), indent=2)
print(json.dumps(out["sample"], indent=1))
