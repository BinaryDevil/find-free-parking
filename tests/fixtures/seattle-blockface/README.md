# Recorded SDOT Blockface fixtures

Retrieved read-only on 2026-10-15 UTC (2026-10-14 America/Vancouver).
No data loaded into shared dev or production; no source approved.

- [Official layer metadata](https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/Blockface/FeatureServer/1?f=pjson): `layer.json` is a projection of the returned id/name, geometry type, object ID field, editingInfo and all field names/types. Drawing configuration and other presentation metadata are omitted.
- [Official record query](https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/Blockface/FeatureServer/1/query): `where=ELMNTKEY in (62009,70725,31497,88477,14366,33434,14362,1625,8281,29021,82237,11009,125319,8613,70726,1034,1033,68917,53805,33741,31313,30698,1821,6357,31893,33146,86061,27430)`, `outFields=*`, `outSR=4326`, `f=geojson`. All 28 requested asset keys returned; JSON whitespace normalized only.
- Keys come from tables A/C/H in the [Seattle inventory](../../../docs/sources/seattle.md). `ELMNTKEY` identifies a block side; `OBJECTID` is an export row and can change. These are public curb locations, not driver locations.

The independently recorded inventory comparisons remain the evidence reference;
these fixtures do not replace approval or establish zero safety contradictions.
Rates are dollars per hour and numeric payment bounds are minutes after midnight.
The published 659/1019/etc. end bounds are preserved without guessing an inclusive
conversion. Mixed curb extents, sign completeness, peak applicability, RPZ
enforcement, holidays/events and temporary restrictions remain unresolved.
All adapter output is unparsed, so even a synthetic approved test source returns
Unknown. No category, null Sunday rate or zero payment band becomes a Free
Parking Rule. Saturday/weekday fixtures are recorded; the Sunday positive-rate
case is explicitly synthetic in the test.
