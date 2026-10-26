#!/bin/sh
# Second pass for #138: register candidates found in pass 1. Usage: sh method/fetch2.sh <artifact-dir>
set -u
OUT="$1/raw"; LOG="$1/retrievals.tsv"
S=https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services
get() { code=$(curl -sS -L -m 60 -o "$OUT/$1" -w '%{http_code}' "$2")
  printf '%s\t%s\t%s\t%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$code" "$1" "$2" >> "$LOG"; }
for svc in Road_Closure_\(Active\) Road_Closure_View School_Zones_CDL Street_Sweeping_Routes SPU_Street_Sweeping \
  SDOT_Street_Sweeper_Routes Street_Closure_BPPS Existing_Layover_Zone Special_Event_Permitting_Downtown_Core \
  Transit_Lanes SDOT_Street_Signs SU_Permit_Data_Model_Relationships; do
  n=$(echo "$svc" | tr -d '()')
  u=$(python3 -I -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1]))' "$svc")
  get "svc-$n.json" "$S/$u/FeatureServer?f=json"
  get "meta-$n-0.json" "$S/$u/FeatureServer/0?f=json"
  get "count-$n-0.json" "$S/$u/FeatureServer/0/query?where=1%3D1&returnCountOnly=true&f=json"
done
for id in 554131a7d4d84d79a1db05ddd2b06d3c 4ad7e91f e6717e9a; do :; done
get search-kcm-stops-owner.json "https://www.arcgis.com/sharing/rest/search?num=20&f=json&q=owner%3AKingCounty%20Metro%20Stops"
get socrata-views-search-parking.json "https://data.seattle.gov/api/views.json?limit=50&q=parking"
for v in 74ix-6xdj jxcr-rhfz; do get "signal-$v.json" "https://data.seattle.gov/api/views/$v.json"; done
# Strip cached top values at once: for 74ix-6xdj they hold licence plates and addresses.
for v in 74ix-6xdj jxcr-rhfz; do python3 -I -c 'import json,sys,os
f=sys.argv[1]; j=json.load(open(f))
[c.pop("cachedContents",None) for c in j.get("columns",[])]
json.dump(j,open(f.replace(".json","-redacted.json"),"w"),indent=1); os.remove(f)' "$OUT/signal-$v.json"; done
