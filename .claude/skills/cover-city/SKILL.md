---
name: cover-city
description: Set up Coverage for a new city, or expand an existing one, under the Evidence Source Policy. Discovers authoritative parking sources, writes a source inventory with a coverage verdict, and files adapter and approval tickets. Use when adding, seeding, or expanding a city, or acting on coverage requests.
---

# Cover a city

The output is a reviewed **inventory** plus tickets. The inventory decides which sources a city's setup and seeding may use; adapters and seeding come later, through the tickets, after a human approves the inventory. Every step here is read-only against city servers, the database, and the city page registry.

## 1. Load the policy

Read [ADR-0002: Evidence Source Policy](../../../docs/adr/0002-evidence-source-policy.md), the Language section of `GLOSSARY.md`, and [ADR-0001](../../../docs/adr/0001-verified-rules-only.md). Apply ADR-0002 to every later step.

Done when: you can name what each evidence type may and may not establish.

## 2. Discover

Search every place in the policy's search order. The tooling:

- `npx tsx scripts/discover_city_sources.ts "<city>" ["<region or alternate name>"]` searches ArcGIS Online and the Socrata catalog and probes parking-like layers.
- `npx tsx scripts/discover_city_sources.ts --server <ArcGIS REST services URL>` crawls a city GIS server. Find the server root by following any city layer URL from the portal or the search results; unlisted services (e.g. Vancouver's permit zones, North Vancouver's regulations) only show up this way. Also crawl the city's ArcGIS Online organization: `https://servicesN.arcgis.com/<orgId>/arcgis/rest/services`.
- The city open-data portal's own search, the municipal code, transit agencies, and national datasets need a web search or fetch.

Done when: every evidence type E1–E7 has candidate sources or "none found" with the places searched.

## 3. Assess each candidate

For each candidate, record its fields, record count, last edit date, geometry, and a sample record. Then apply the policy's acceptance criteria one by one.

- **Spot check**: record the locations, independent official comparisons, and safety contradictions required by ADR-0002 acceptance criterion 7.
- **Reuse terms**: record the terms required by ADR-0002 acceptance criterion 6 from the portal or the service's item page. A service that isn't in the portal catalogue gets verdict `pending` until permission is recorded.
- Anything the source leaves ambiguous becomes an explicit Unknown case.

Done when: every candidate has a verdict (approved / rejected with the failed criterion / pending with what is missing).

## 4. Write the inventory

Copy `docs/sources/TEMPLATE.md` to `docs/sources/<city-slug>.md` and fill every field. Set the coverage verdict from the policy's coverage levels using approved sources only; a partial verdict names its subset precisely enough to be shown on the city page. Status stays `draft`, since approval is a human decision.

Done when: every row in the template is filled, and each Unknown area says why.

## 5. File tickets

Using `docs/agents/issue-tracker.md` and `docs/agents/triage-labels.md`:

- One adapter issue per approved or pending source: endpoint, fields and their meanings, format checks, the Parking Rules it produces, the Unknown cases, and the spot-check places as test fixtures. Label it `ready-for-agent`. Reference #2, and add `Blocked by: #2` while the evaluator and Evidence Source schema from #2 are unbuilt.
- One coverage-approval issue: link the inventory, list the pending licences and verdicts to confirm, and the city page and registry change it unlocks. Label it `ready-for-human`.
- One data-request issue per missing evidence type that blocks the target coverage level, naming the city department or records channel to contact. Label it `ready-for-human`.

Link every issue back into the inventory's Tickets section.

Done when: every approved or pending source has an adapter issue, and the inventory links all issues.

## 6. Report

Tell the user the coverage verdict, the approved, pending and rejected sources, the Unknown areas, and the issue links. Point out any policy gap the city exposed (a source type the policy doesn't cover) so a policy amendment can be proposed for ADR-0002.
