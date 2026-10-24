import json, datetime
C="COALESCE(BUS,0)=0 AND COALESCE(NOSTOP,0)=0 AND COALESCE(LOAD_,0)=0 AND COALESCE(ZONE,0)=0 AND COALESCE(TOTAL_ZONES,0)=0 AND COALESCE(CARPOOL_SPACES,0)=0 AND PEAK_HOUR IS NULL AND OVERRIDEYN='N'"
strata = {
 "T_time_limited_free": {"claim":"VERIFIED_FREE with PARKING_TIME_LIMIT minutes applied at all times (conservative); no other use on the side",
   "where": f"PARKING_CATEGORY='Time Limited Parking' AND {C} AND COALESCE(RPZ_SPACES,0)=0 AND COALESCE(PAID_SPACES,0)=0 AND COALESCE(NOPARK,0)=0 AND COALESCE(TOTAL_NOPARK,0)=0 AND TL_SPACES>0 AND PARKING_TIME_LIMIT IS NOT NULL"},
 "P_paid": {"claim":"PAID at WKD/SAT/SUN rate bands with PARKING_TIME_LIMIT; outside bands UNKNOWN (never free)",
   "where": f"CSM='Y' AND PARKING_CATEGORY='Paid Parking' AND {C} AND COALESCE(RPZ_SPACES,0)=0 AND COALESCE(TL_SPACES,0)=0 AND PAID_SPACES>0"},
 "R_permit": {"claim":"RESTRICTED (permit zone RPZ_ZONE) during zone hours; outside hours UNKNOWN (never free)",
   "where": f"PARKING_CATEGORY='Restricted Parking Zone' AND {C} AND COALESCE(PAID_SPACES,0)=0 AND RPZ_SPACES>0 AND RPZ_ZONE NOT IN ('13','14','21','22','25')"},
 "N_no_parking": {"claim":"RESTRICTED no parking at all times (conservative); never free",
   "where": "PARKING_CATEGORY='No Parking Allowed' AND COALESCE(PARKING_SPACES,0)=0 AND COALESCE(TOTAL_SPACES,0)=0 AND COALESCE(NOSTOP,0)=0 AND PEAK_HOUR IS NULL AND OVERRIDEYN='N'"},
}
doc = {"registered_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds'),
 "source":"https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/Blockface/FeatureServer/1",
 "sampling":"for each stratum: query all ELMNTKEY matching where, sort ascending, random.Random(20261023).sample(keys, 3) using one RNG in stratum order T,P,R,N",
 "contradiction_rule":"any Parking_Signs-0 / Parking_Features-4 sign on the same ELMNTKEY (CURRENT_STATUS in service, or all if status absent) that establishes payment, permit (RPZ or disabled), no parking, no stopping, tow-away, loading, bus, or a shorter time limit / different hours not represented by the Blockface record and the stratum claim; and for P, rates differing from SDOT published rate table; for R, zone hours in sign text differing from the RPZ polygon INEFFECT",
 "excluded_upfront":"RPZ zones 13,14,21,22,25 (known split/alternative/conflicting hours from 2026-10-19/21 reviews)",
 "strata":strata}
json.dump(doc, open('subset-preregistration.json','w'), indent=1)
print(doc['registered_utc'])
