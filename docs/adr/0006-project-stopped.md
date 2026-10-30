# Stop the project: not feasible with available public data

Accepted 2026-10-29 by the project owner. Development stops. No more source reviews, adapters, features or city surveys are started.

## Why

The product promise is to recommend free parking only from authoritative rules ([ADR-0001](0001-verified-rules-only.md)), using public data without outreach ([ADR-0004](0004-no-external-outreach.md)), with sources that pass every [Evidence Source Policy](0002-evidence-source-policy.md) criterion, including zero contradictions. No official public source in the cities assessed meets that bar:

- **Seattle.**
  - SDOT Blockface contradicted the City's own sign inventory on 6 of 12 sampled sides ([review](../sources/seattle-review-2026-10-23.md)).
  - The sign inventory lacks published arrow and extent semantics ([sign test](../sources/seattle-sign-test-2026-10-24.md)).
  - Transit lots contradicted operator pages on 8 of 12 lots ([lots review](../sources/seattle-lots-review-2026-10-24.md); author review, not independently re-checked).
  - The weaker No Restriction Found label is not eligible either ([eligibility](../sources/seattle-nrf-eligibility.md); author review, not independently re-checked).
- **Vancouver.**
  - The City publishes no sign inventory or block-level regulations.
  - Meters contradicted 2026 ticket records on 8 of 12 checks ([review](../sources/vancouver-review-2026-10-23.md)).
  - Permit zones publish no hours.
- **North Vancouver and Kirkland.** No source was approved; Coverage is none ([North Vancouver](../sources/north-vancouver.md), [Kirkland](../sources/kirkland.md)).

The contradictions were common and of the kind that leads to tickets or towing, not borderline sampling noise. Cities outside this region (for example, ones with sign-level datasets) were not assessed. The owner chose to stop rather than survey them.

## Consequences

- The code, docs, evidence and the No Restriction Found work stay on `dev` as they are. Nothing is deleted.
- Production is unchanged by this decision. No release PR is planned. Any change to the live site or its hosting is a separate owner decision.
- Open tickets are not worked. Restarting needs an explicit owner decision that supersedes this one, for example to assess other cities.
