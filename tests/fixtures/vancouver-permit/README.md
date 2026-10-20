# Vancouver permit-zone fixtures

Retrieved 2026-10-19 from the City of Vancouver ResidentialParkingPermitZones
FeatureServer/0 (endpoint exported by the adapter). `layer.json` is metadata;
`records.geojson` retains RPP025 and one RPO/VRPP part from a 535-record WGS84
query selecting only OBJECTID, MAPID, TYPE, NAME, DESCRIPTION and URL.
This sample is not a complete feed. Repeated MAPIDs identify multipart programs;
geometry hashes distinguish parts without treating export OBJECTID as stable.

The source's published reuse terms and seven policy criteria remain under #24
review. These research fixtures do not approve the source or enable serving.
Administrative permit fees/expiry dates never establish parking schedules.

The DB regression uses the inventory's explicitly approximate 1000 Bidwell
representative (-123.13686855, 49.28819891), not a surveyed curb position.
Comox/Bute (-123.13123262895633, 49.28319052114935) was retrieved independently
from the City's `street-intersections` Explore v2.1 endpoint on the same date
with `xstreet like '%COMOX%' and xstreet like '%BUTE%'`.
Both establish RPP025 polygon membership only. Neither confirms signed curb,
enforcement hours, visitor allowance or vehicle exemption semantics.
