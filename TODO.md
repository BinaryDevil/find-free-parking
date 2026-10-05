# Unfinished work

Status is based on the 2026-10-04 source review in [docs/STATUS.md](docs/STATUS.md). These are planning items, not authorization to change production data or implement everything at once.

## Priority 1: Deliver the verified-rules promise

- [ ] Choose a first city and document authoritative sources, reuse terms, location precision, schedules, timezone, conditions, and freshness policy. **Done when:** a reviewed source inventory defines which rules the product can safely recommend and which remain unknown.
- [ ] Define and enforce evidence eligibility across meters, streets, and zones. **Done when:** absent meters, generic road types, OSM tags, stale evidence, and unverified zone flags cannot independently produce a verified free recommendation; unknown cases remain explicit.
- [ ] Make Driver Reports advisory Driver Warnings. **Done when:** report counts cannot promote a location to verified free or replace an authoritative rule, with a regression check for the three-report threshold.
- [ ] Evaluate permission and payment rules in the location's timezone and selected vehicle/time context. **Done when:** tests cover missing/malformed schedules, overnight day boundaries, daylight-saving changes, permit/time-limit restrictions, and payment inactivity without permission evidence.
- [ ] Align coverage and city-page claims with reviewed evidence. **Done when:** a city boundary, seed completion, or entry in `SUPPORTED_CITIES` alone cannot imply verified Coverage.

## Priority 2: Validate operations and reliability

- [ ] Review existing city data against the evidence policy without deleting preserved records by default. **Done when:** each reviewed dataset has source/freshness findings and an explicit remediation scope.
- [ ] Review request-driven seeding before scheduling it. **Done when:** city names cannot become unsafe command input, seed scope is controlled, failures are observable, and activation requires evidence approval. Verify any external scheduler separately.
- [ ] Establish targeted regression checks for classification, stale map requests, selected time, popup escaping, and report submission. **Done when:** the checks reproduce the relevant failure and pass with the intended behavior.
- [ ] Establish current lint/typecheck baselines and address debt in separately scoped work. **Done when:** existing diagnostics are recorded and new changes can be assessed without conflating baseline failures.
- [ ] Verify Neon schema/data migration and deployed environment against reviewed expectations. **Done when:** read-only checks confirm required tables, PostGIS, report aggregation, connectivity, and applicable database access controls; record the date and environment.
- [ ] Verify production map/API behavior, translations, SEO, and analytics after relevant releases. **Done when:** dated observations distinguish implemented, deployed, and production-verified behavior.

## Existing features, not proof of completion

The old checklist marked localization, SEO/analytics, coverage requests, automatic seeding, lots, report overrides, restricted-street filtering, and result counts complete. Those features exist in source to varying degrees; [status](docs/STATUS.md) records their limits. In particular, report-based corrections and inferred coverage conflict with the accepted verified-rules decision. Revalidate result counts and restricted-street behavior when classification changes.
