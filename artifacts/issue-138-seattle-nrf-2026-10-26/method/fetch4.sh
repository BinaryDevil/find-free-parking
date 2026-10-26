#!/bin/sh
# Fourth pass for #138: King County Metro stops by jurisdiction and service flag. Usage: sh method/fetch4.sh <artifact-dir>
set -u
OUT="$1/raw"; LOG="$1/retrievals.tsv"
K=https://services.arcgis.com/Ej0PsM5Aw677QF1W/arcgis/rest/services/TRANSITSTOP_POINT_2648/FeatureServer/0/query
ST=$(python3 -I -c 'import urllib.parse;print(urllib.parse.quote("[{\"statisticType\":\"count\",\"onStatisticField\":\"OBJECTID\",\"outStatisticFieldName\":\"n\"}]"))')
code=$(curl -sS -m 60 -o "$OUT/stats-kcm-stops-jurisdiction.json" -w '%{http_code}' "$K?where=1%3D1&groupByFieldsForStatistics=JURISDICTION,IN_SERVICE_FLAG,STOP_STATUS&outStatistics=$ST&f=json")
printf '%s\t%s\t%s\t%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$code" stats-kcm-stops-jurisdiction.json "$K?groupBy=JURISDICTION,IN_SERVICE_FLAG,STOP_STATUS" >> "$LOG"
