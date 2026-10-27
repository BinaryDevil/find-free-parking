# Writes probe-preregistration.json for #138. Run before any sign record is fetched.
import json, datetime
W = ("PARKING_CATEGORY='Unrestricted Parking' AND COALESCE(NOPARK,0)=0 AND COALESCE(TOTAL_NOPARK,0)=0 "
     "AND COALESCE(NOSTOP,0)=0 AND COALESCE(BUS,0)=0 AND COALESCE(ZONE,0)=0 AND COALESCE(TOTAL_ZONES,0)=0 "
     "AND COALESCE(CARPOOL_SPACES,0)=0 AND COALESCE(RPZ_SPACES,0)=0 AND COALESCE(PAID_SPACES,0)=0 "
     "AND COALESCE(TL_SPACES,0)=0 AND PEAK_HOUR IS NULL AND LOAD_ IS NULL")
doc = {
 "registered_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
 "purpose": "Feasibility probe for issue #138, question 3. NOT the ADR-0001 rule 5 measurement: no (place, time) pairs, author agent, Blockface-only inputs. It estimates how often the SDOT sign inventory, if held out, would record a restriction on a side that Blockface alone leaves eligible.",
 "population": {"source": "https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/Blockface/FeatureServer/1", "where": W},
 "sampling": "returnIdsOnly OBJECTIDs for the population, sorted ascending; random.Random(138).sample(ids, 60); then fetch ELMNTKEY for those OBJECTIDs",
 "signal": "Parking_Signs/FeatureServer/0 (all records, no status field) on the same ELMNTKEY; sensitivity: SDOT_Street_Signs/FeatureServer/1 records on the same ELMNTKEY, split by CURRENT_STATUS",
 "classes": {
   "prohibiting_or_tow": ["PNP","PNS","PPEAK","PBZ","PBLO","PLU","PCVL","PTRKL","PPL","PZONE","PSCH","PDIS","PGA"],
   "permit_or_payment_or_eligibility": ["PRZ","PS","PPP","PCARPL"],
   "time_limit": ["PTIML","P1H"],
   "unclassifiable_by_category": ["PR"],
   "informational": ["PINST"]},
 "side_result": "a side is 'hit' if it carries any sign in prohibiting_or_tow, permit_or_payment_or_eligibility, time_limit or unclassifiable_by_category; reported per class and overall, with the exact Clopper-Pearson 95% interval on the hit share",
 "decision_use": "None for approval. Under rule 5 a single sampled miss of a prohibiting or tow restriction blocks the city; a high hit share here predicts that a held-out sign measurement would fail."
}
json.dump(doc, open("probe-preregistration.json", "w"), indent=1)
print(doc["registered_utc"])
