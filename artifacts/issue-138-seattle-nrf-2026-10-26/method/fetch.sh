#!/bin/sh
# Fresh retrieval for #138. Anonymous HTTPS GETs only. Usage: sh method/fetch.sh <artifact-dir>
set -u
OUT="$1/raw"; LOG="$1/retrievals.tsv"
S=https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services
[ -f "$LOG" ] || printf 'utc\thttp\tfile\turl\n' > "$LOG"
get() { # name url
  code=$(curl -sS -L -m 60 -o "$OUT/$1" -w '%{http_code}' "$2")
  printf '%s\t%s\t%s\t%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$code" "$1" "$2" >> "$LOG"
}
q() { python3 -I -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1],safe=""))' "$1"; }
# Layer metadata and counts
for L in Blockface/FeatureServer/1 Parking_Signs/FeatureServer/0 Parking_Features/FeatureServer/4 \
  Temporary_No_Parking_1/FeatureServer/0 Temporary_No_Parking_Unpaid/FeatureServer/10 \
  Restricted_Parking_Zone_Areas/FeatureServer/4 Restricted_Parking_Zone_Areas/FeatureServer/3 \
  Peak_Hour_Parking_Restrictions/FeatureServer/3 Curbspace_Transit_Layover/FeatureServer/0 \
  Curb_Space_Categories/FeatureServer/6 SDOT_Pay_Stations/FeatureServer/0; do
  n=$(echo "$L" | sed 's#/FeatureServer/#-#')
  get "meta-$n.json" "$S/$L?f=json"
  get "count-$n.json" "$S/$L/query?where=1%3D1&returnCountOnly=true&f=json"
done
B="$S/Blockface/FeatureServer/1/query"
get count-Blockface-1-LOAD_notnull.json "$B?where=$(q 'LOAD_ IS NOT NULL')&returnCountOnly=true&f=json"
st() { # name where groupby
  get "$1" "$B?where=$(q "$2")&groupByFieldsForStatistics=$3&outStatistics=$(q '[{"statisticType":"count","onStatisticField":"OBJECTID","outStatisticFieldName":"n"}]')&f=json"
}
st stats-blockface-category.json "1=1" PARKING_CATEGORY,CSM
st stats-blockface-tl-limit.json "PARKING_CATEGORY='Time Limited Parking'" PARKING_TIME_LIMIT,CSM
st stats-blockface-tl-hours.json "PARKING_CATEGORY='Time Limited Parking'" START_TIME_WKD,END_TIME_WKD,START_TIME_SAT,END_TIME_SAT,START_TIME_SUN,END_TIME_SUN
st stats-blockface-unrestricted.json "PARKING_CATEGORY='Unrestricted Parking'" CSM,UNRESTRICTED
st stats-blockface-unrestricted-competing.json "PARKING_CATEGORY='Unrestricted Parking'" NOPARK,NOSTOP,BUS,ZONE,TOTAL_ZONES,PEAK_HOUR
get stats-signs-category.json "$S/Parking_Signs/FeatureServer/0/query?where=1%3D1&groupByFieldsForStatistics=CATEGORY,CATEGORYDESCR&outStatistics=$(q '[{"statisticType":"count","onStatisticField":"OBJECTID","outStatisticFieldName":"n"}]')&f=json"
# Items
for id in b35fb25c8c93425980705474b5e82815 de918034c876456cbf11e4b234985142 dd379f4f60294aea9d813185fb5144a4; do
  get "item-$id.json" "https://www.arcgis.com/sharing/rest/content/items/$id?f=json"
done
# Service directory of the SDOT/City org
get services-root.json "$S?f=json"
# Catalog searches for restriction sources beyond SDOT parking layers
srch() { get "search-$1.json" "https://www.arcgis.com/sharing/rest/search?num=50&f=json&q=$(q "$2")"; }
srch kcm-stops 'bus stops King County Metro'
srch school-zones 'school zones Seattle'
srch sweeping 'street sweeping Seattle'
srch special-events 'special events Seattle street closure'
srch street-use 'street use permits Seattle'
srch loading 'loading zones Seattle'
srch disabled 'disabled parking Seattle'
srch tow 'tow away zone Seattle'
srch port 'Port of Seattle parking'
srch wsdot-parking 'WSDOT no parking state route'
srch citations 'parking citations Seattle'
soc() { get "socrata-$1.json" "https://api.us.socrata.com/api/catalog/v1?domains=data.seattle.gov&limit=50&q=$(q "$2")"; }
soc parking 'parking'
soc street-use 'street use'
soc citation 'citation'
soc school 'school zone'
