# Project status

Reviewed 2026-10-04 against repository HEAD `795d36c`. This is a source review; no live database, scheduler, or production deployment was verified.

## Current challenge

The product decision is verified rules only, but the application remains a broader parking map with heuristic classification. The immediate challenge is to define and enforce authoritative evidence for one city before expanding the promise to more cities.

| Area | Implemented in source | Remaining gap |
| --- | --- | --- |
| Map | Location/search, selected time, free/paid filters, meters, streets, lots, directions | Free results are not universally backed by authoritative rules |
| Streets | API associates meters within 15 metres; map classifies street categories | No-meter Residential/Unrestricted/Time Limited streets can become free; proximity does not establish a legal blockface rule |
| Meters and schedules | Missing meter schedules excluded from free filter; schedule evaluator handles wrapping time ranges | Inactive payment schedule alone does not establish permission; browser-local day/time is used without a city timezone model |
| Lots | Zone API exposes source, verified flag, types, and limits | Queries do not require `verified`; type-based free filtering does not enforce current authoritative evidence |
| Reports | Submission validation, IP parsing, duplicate check over 90 days, generic client errors | Map promotes three FREE/PAID reports into classification overrides rather than advisory warnings |
| Coverage | Active city polygon lookup, request form, city page registry | Boundary and route existence are not proof of trustworthy rule coverage |
| Expansion | Request-check script invokes matching seed script above 10 requests | No scheduler configuration tracked here; execution and evidence approval are unverified |
| Languages/SEO | Eight locale files, city pages, metadata, sitemap, JSON-LD, optional GA | Translation accuracy, deployed analytics, indexing, and truth of city claims are unverified |
| Database | Neon pooled app connection with direct fallback; migration utility | Live migration completeness, schema, data quality, and access controls were not inspected |
| Recent fixes | Stale-result protection, selected-time use, popup escaping, report validation | Source implementation is not production verification or comprehensive regression coverage |

## Evidence to inspect when changing behavior

- `components/MainMap.tsx`: `isScheduleActive`, `loadSpots`, report thresholds and overrides.
- `app/api/parking/route.ts`: meter proximity and viewport queries.
- `app/api/parking/zones/route.ts`: zone selection and verification metadata.
- `app/api/report/route.ts`, `sql/11.zone_reports.sql`: report intake and aggregation.
- `app/actions/coverage.ts`, `lib/cities.ts`: polygon coverage versus page registry.
- `scripts/seed_osm_utils.ts`: OSM fee/type heuristics, including neighborhood roads marked Unrestricted.
- `scripts/seed_utils.ts`: sign parsing with a default schedule.
- `scripts/automate_seeding.ts`: request threshold and child script execution.

## History and verification limits

September's verified-rule implementation was rolled back while preserving database data. Later commits added map/API safety fixes and Neon connection changes; current HEAD is therefore not identical to the old rollback baseline. The accepted product decision and glossary remain in place, but the repository no longer contains the September `parking_evidence` migration or an enforced evidence pipeline.

Previously applied additive evidence columns may remain in a database. Their presence and contents were not checked in this review. Keep historical rollout claims separate from current source and live verification.

The public site is recorded as https://findfreeparking.info/. The deployment connection and current behavior must be checked when releasing application changes. No automated test script is configured in `package.json`; historical lint debt needs a current baseline before attributing failures to a change.
