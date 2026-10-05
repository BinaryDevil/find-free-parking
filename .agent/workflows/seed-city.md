---
description: Review evidence and safely import parking data for a city
params:
  city: The city whose authoritative parking sources will be reviewed
---

# City data workflow

Read [data operations](../../docs/DATA.md), [ADR-0001](../../docs/adr/0001-verified-rules-only.md), and [unfinished work](../../TODO.md) before designing or running an import. These replace the old geometry-first and OSM-based free-parking workflow.

1. Inventory authoritative rules and missing conditions; document source, freshness, geometry precision, timezone, and evidence eligibility.
2. Inspect relevant city scripts and shared helpers. Use geometry as context, not evidence of free permission. Review parser defaults and rerun behavior.
3. Prepare a scoped import and verify it in a non-production database. Preserve existing data unless replacement is explicitly authorized.
4. Verify affected records and API/map behavior against the evidence policy. Keep unknown cases explicit.
5. Register a city page only with accurate coverage claims. Seed completion, row counts, and request volume do not independently establish Coverage.

For shared or production execution, establish the authorized target, scope, backup, and verification plan first. Do not copy the old delete-and-reseed shortcut or promote driver reports to verified rules.
