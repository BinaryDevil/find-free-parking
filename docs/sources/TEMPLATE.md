# <City>, <Region>: source inventory

Status: draft | approved by agent review on <YYYY-MM-DD> (author <PR>, reviewer <PR or comment>)
Timezone: <IANA zone, e.g. America/Los_Angeles>
Coverage verdict: full | partial (<declared subset>) | none
Policy: [ADR-0002: Evidence Source Policy](../adr/0002-evidence-source-policy.md)

## Evidence types

One row per type. Every type is either found or "none found", with the places searched.

| Type | Source(s) | Searched (if none found) |
|---|---|---|
| E1 Block-level regulations | | |
| E2 Meter / payment feed | | |
| E3 Sign inventory | | |
| E4 Zone polygons | | |
| E5 Temporary restrictions | | |
| E6 Lots / operators | | |
| E7 Bylaw default rule | | |
| Signals (citations etc.) | | |

## Sources

Repeat this block for each candidate source, including rejected ones.

### <Source name>

- Type: E1–E7 or signal
- Publisher / channel:
- Endpoint:
- Geometry and precision:
- Records: <count> as of <YYYY-MM-DD>; last edited <YYYY-MM-DD>
- Fields used: <field → meaning, including day/time/limit semantics>
- Reuse terms: <published licence or terms covering this item; link>
- Spot check: <10+ sample places, the independent official signal used for each, contradictions found>
- May establish: <per the policy table>
- Unknown cases: <records or conditions that stay UNKNOWN>
- Verdict: approved | rejected (<which acceptance criterion failed>) | pending (<what is missing>)

## Unknown areas and gaps

<Where results stay UNKNOWN and why; data requests filed with the city (issue links).>

## Tickets

<Issue links: one per adapter, coverage approval, data requests.>
