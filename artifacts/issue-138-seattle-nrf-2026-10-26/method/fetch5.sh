#!/bin/sh
# Fifth pass for #138 (review F2): peak-hour and transit-lane records on probe side 76913. Usage: sh method/fetch5.sh <artifact-dir>
set -u
OUT="$1/raw"; LOG="$1/retrievals.tsv"
S=https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services
get() { code=$(curl -sS -L -m 60 -o "$OUT/$1" -w '%{http_code}' "$2")
  printf '%s\t%s\t%s\t%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$code" "$1" "$2" >> "$LOG"; }
get side-76913-peak3.json "$S/Peak_Hour_Parking_Restrictions/FeatureServer/3/query?where=ELMNTKEY%3D76913&outFields=*&returnGeometry=false&f=json"
get side-76913-blockface.json "$S/Blockface/FeatureServer/1/query?where=ELMNTKEY%3D76913&outFields=ELMNTKEY,SEGKEY,UNITDESC,PARKING_CATEGORY,PEAK_HOUR,NOPARK,NOSTOP&returnGeometry=false&f=json"
