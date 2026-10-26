#!/bin/sh
# Third pass for #138: layers whose id is not 0, King County Metro stops, signal columns. Usage: sh method/fetch3.sh <artifact-dir>
set -u
OUT="$1/raw"; LOG="$1/retrievals.tsv"
S=https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services
K=https://services.arcgis.com/Ej0PsM5Aw677QF1W/arcgis/rest/services
get() { code=$(curl -sS -L -m 60 -o "$OUT/$1" -w '%{http_code}' "$2")
  printf '%s\t%s\t%s\t%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$code" "$1" "$2" >> "$LOG"; }
for L in Transit_Lanes/FeatureServer/1 SDOT_Street_Signs/FeatureServer/1 Road_Closure_%28Active%29/FeatureServer/2 \
  SPU_Street_Sweeping/FeatureServer/2 Street_Sweeping_Routes/FeatureServer/0; do
  n=$(echo "$L" | sed 's#%28##;s#%29##;s#/FeatureServer/#-#')
  get "meta-$n.json" "$S/$L?f=json"
  get "count-$n.json" "$S/$L/query?where=1%3D1&returnCountOnly=true&f=json"
done
get sample-Street_Sweeping_Routes-0.json "$S/Street_Sweeping_Routes/FeatureServer/0/query?where=1%3D1&outFields=*&returnGeometry=false&resultRecordCount=3&f=json"
get sample-Transit_Lanes-1.json "$S/Transit_Lanes/FeatureServer/1/query?where=1%3D1&outFields=*&returnGeometry=false&resultRecordCount=3&f=json"
get item-kcm-stops.json "https://www.arcgis.com/sharing/rest/content/items/554131a77997491bb84114223da5511d?f=json"
get svc-kcm-stops.json "$K/TRANSITSTOP_POINT_2648/FeatureServer?f=json"
get meta-kcm-stops-0.json "$K/TRANSITSTOP_POINT_2648/FeatureServer/0?f=json"
get count-kcm-stops-0.json "$K/TRANSITSTOP_POINT_2648/FeatureServer/0/query?where=1%3D1&returnCountOnly=true&f=json"
# The 74ix-6xdj row sample was removed after the first run: rows hold licence plates and addresses.
