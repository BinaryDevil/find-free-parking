# Seattle sign-inventory (E3) curb rule feasibility test, 2026-10-24

Refs [#126](https://github.com/BinaryDevil/find-free-parking/issues/126) (parents [#2](https://github.com/BinaryDevil/find-free-parking/issues/2), [#25](https://github.com/BinaryDevil/find-free-parking/issues/25)). It follows up the [2026-10-23 Seattle review](seattle-review-2026-10-23.md). That review left SDOT Parking Signs pending because arrow and extent semantics were undocumented. This test asks whether SDOT Parking Signs can be matched reliably to block sides in one pre-registered neighbourhood and turned into rules that pass ADR-0002 criterion 7 against Curb Space Categories.

**Verdict: NO-GO for sign-based curb rule adapters (#25, #32 Seattle path).** Three of the pre-registered verdict conditions fail:

1. **Documentation.** SDOT's published attribute forms do not define sign arrows or how far along the curb a sign applies. The definition of sign `DISTANCE` is truncated. Without those semantics a sign can only assert a rule at its own point, so no curb length can be given a rule from signs.
2. **Matching.** 4 signs on 2 of the 12 sides fall outside their own block side under the pre-registered position rule (G1). The data shows why: layer 4 `DISTANCE` is already measured on the segment axis, not from the block face start as the truncated text suggests.
3. **Contradictions.** Under the pre-registered rule, 11 of 12 sampled sides contradict Curb Space Categories, 8 of them on criterion-7 listed fields (no parking, permit, payment). That count overstates real disagreement, so it is split here:
   - **(a) Real conflicts between the two official layers on the same side: 4 sides.** Side 8: RPZ zone 7 permit signs, but plain `TL` spaces. This is a listed field. Side 2: a disabled-permit sign, but no disabled space on the side. Side 7: truck-load-only signs, but a plain `TL` space. Side 12: a `CVLZ` loading space, but no loading sign on the side. The independent reviewer re-fetched these 4 sides live on 2026-10-24 and found them unchanged.
   - **(b) Contradictions that depend on the matcher's own readings: the rest.** These are the position axis (M3, shown wrong by the data), families taken from `CATEGORY` alone (pay signs filed `PR` or `PRZ`), point-only extent, and the `PS-TR` and streetcar-zone mappings. They show the limits of a documented-fields-only matcher, not errors in SDOT's data.
   - After three post-hoc relaxations, 7 of 12 sides still contradict, 5 on listed fields. Of those, only the four sides in (a) are real layer conflicts.

No source is approved and no Coverage changes. Seattle stays not covered. No database write, import, source activation, deployment, outreach or merge took place.

## Timeline and evidence

All files are in [`artifacts/issue-126-seattle-sign-test-2026-10-24/`](../../artifacts/issue-126-seattle-sign-test-2026-10-24/). [`SHA256SUMS`](../../artifacts/issue-126-seattle-sign-test-2026-10-24/SHA256SUMS) covers every file. [`SHA256SUMS-prereg`](../../artifacts/issue-126-seattle-sign-test-2026-10-24/SHA256SUMS-prereg) is the subset committed with the pre-registration.

| UTC 2026-10-24 | Step |
|---|---|
| 18:09:45 | Documentation retrieval began (`docs-raw/`): SDOT attribute PDFs, ArcGIS item metadata, catalog searches. |
| before 18:14 | Population count statistics only (`prereg-raw/`): Curb Space Categories counts by `PAIDAREA` × `SPACETYPE`, and by status. No side-level record. |
| 18:14:13 | [`preregistration.json`](../../artifacts/issue-126-seattle-sign-test-2026-10-24/preregistration.json) written. |
| 18:14:19 | Pre-registration committed (`25c205e`) and pushed to `claude/issue-126-sign-test`. |
| 18:15:21 | Sampling frame fetched (3,644 in-service First Hill curb spaces, `raw/frame-page-*.json`), then per-side evidence for the 12 drawn sides (`raw/<ELMNTKEY>-{blockface,signs0,signs4,spaces}.json`). |
| after | [`results.json`](../../artifacts/issue-126-seattle-sign-test-2026-10-24/results.json) written by the pure grader. |

**Redaction (2026-10-24, after review):** `docs-raw/related-c599cc4b87bd411787ab88cd4e99fbda.json` held two third-party ArcGIS owner IDs (an email address and a username) on unrelated related items. Both were replaced with `[redacted-third-party-owner]`; nothing else changed, and the file is not used by any conclusion. Its SHA-256 at the pre-registration commit `25c205e` was `559c41015308eec88bb31a036877307f9c8ca7135b7a6de6cb54a1148479b5f6`. `SHA256SUMS` and `SHA256SUMS-prereg` now list the redacted file (`1b7a5a2d9d1380eb539393150a1a9bc70d5e84e5c8b453a15b2c26d883c48249`). `preregistration.json` is unchanged. The original file remains in Git history at `25c205e`, because rewriting a pushed branch is not allowed.

All retrievals were anonymous HTTPS GETs against public City of Seattle ArcGIS services, seattle.gov and the Google Drive file linked from the data.gov Paid Area Curb Spaces record. No sign-in, payment or access-control bypass was used.

Reproduce: `node scripts/seattle-sign-test.ts grade artifacts/issue-126-seattle-sign-test-2026-10-24`. This is pure and offline over the saved files. `tests/seattle-sign-test.test.mjs` checks that the saved sample and `results.json` reproduce exactly. `fetch` mode re-queries live data and will drift.

## Documentation: what is published and what is missing

Sources: [Street Signs OD](https://www.seattle.gov/Documents/Departments/SDOT/GIS/Street_Signs_OD.pdf), [Blockface Elements OD](https://www.seattle.gov/Documents/Departments/SDOT/GIS/Blockface_Elements%20OD.pdf) and `Curbspaces_OD.pdf`. The last is linked as "Attribute Information" from the [data.gov Paid Area Curb Spaces record](https://catalog.data.gov/dataset/paid-area-curb-spaces). The ArcGIS item metadata for Parking Signs (`de918034…`), Parking Features (`c599cc4b…`) and Curb Space Categories (`4a2fe0ab…`) carries no field definitions or coded-value domains. Socrata catalog searches for parking signs and curb space on data.seattle.gov returned nothing.

| Semantics | Status | Source wording or gap |
|---|---|---|
| Sign → block side (`ELMNTKEY`) | documented | "Foreign key to the associated block face record" |
| Sign position (`DISTANCE`) | **incomplete** | "Asset location (in feet) from the low address end of associated". The text stops there. The data shows the value is on the segment axis: Alder St 31541, block face starts at 13 ft and the sign `UNITDESC` says "34 FT NE/O TERRY AVE", so `DISTANCE` = 47. |
| Side of street (`SIDE`) | documented, not published | Defined in the form; absent from layers 0 and 4 |
| `FACING` | documented without codes | "Direction the sign is facing" |
| Arrows | **undocumented** | Only implied by `SIGNTYPE` suffixes such as `R7-NPL` / `R7-NPR` and by `TEXT` such as "[LEFT ARROW]". There is no `SIGNTYPE` code list and no statement of the frame of reference (viewer, `FACING`, or addressing direction). |
| Extent (how far a sign applies) | **undocumented** | Nothing states whether a sign governs up to the next sign, the block end, or an arrow's direction |
| `SIGNTYPE` | partial | R7 means generally not allowed and R8 means allowed. No code list. |
| `CATEGORY` | in-record only | One sub-category per sign, described by `CATEGORYDESCR`. Pay-to-park signs are `PR` "Parking-Regulatory"; pay + RPZ signs are `PRZ`. |
| `STARTDAY` / `ENDDAY` | partial | 1 = Sunday, 2 = Monday, 6 = Saturday; 7 not stated. No holiday or variable-date codes. |
| Curb space extent (`BLOCK_ST`, `BLOCK_END`) and side (`WIDTH_OFFSET` sign) | documented | Segment centreline axis; negative offset = right side in the addressing direction |
| Curb space type (`SPACETYPE`) | partial | Code list in `Curbspaces_OD.pdf`, but incomplete. `MVZ` (Music Venue Zone) is defined only in the Curb Space Categories item description (`docs-raw/item-4a2fe0ab….json`). `PS-WASTE`, `PS-EV`, `PLZ-VEND`, `L/UL-P` and `TL-TR` appear in the data with no published definition. |
| Curb space completeness | documented for CSM blocks only | Blockface OD: in CSM paid areas "every linear feet of blockface is measured and assigned" |

The documentation gate in the pre-registration therefore fails on arrows and extent. The issue's stop condition applies. The bounded test below was still run, as pre-registered, to measure whether matching and sign completeness would be reliable if SDOT published those semantics.

## Pre-registered design (summary)

The full text is in [`preregistration.json`](../../artifacts/issue-126-seattle-sign-test-2026-10-24/preregistration.json).

- **Neighbourhood:** the Curb Space Categories `PAIDAREA` that maximises the minimum count across four case groups (metered `PS`; permit `PS-RPZ` + `TL-RPZ`; time-limited `TL`; no parking `NP` + `TAZ`). The rule picked **First Hill**: 442 / 451 / 17 / 466 (runner-up Capitol Hill, minimum 11). It has to be a paid area, because Curb Space Categories exists only there.
- **Frame and sample:** every `ELMNTKEY` with an in-service First Hill curb space, stratified by those four groups. `mulberry32(20261024)` drew 3 per stratum without replacement, in the order permit, metered, time-limited, no parking: 12 sides.
- **Matcher** ([`scripts/seattle-sign-test.ts`](../../scripts/seattle-sign-test.ts)):
  - In-service signs are layer 4 records with `CURRENT_STATUS='INSVC'`.
  - Position = Blockface `DISTANCE` + sign `DISTANCE` (M3).
  - Family comes from `CATEGORY`.
  - A sign asserts its family at its own point only; arrows are ignored as undocumented.
  - There is **no free output**: every curb length without a sign point is Unknown.
- **Claims graded against Curb Space Categories**, with 10 ft tolerance:
  - **G1 matching:** the sign lies within its own side.
  - **G2 point agreement:** a curb space at the sign's point has the sign's family.
  - **G3 completeness:** every regulated curb space has a sign of its family somewhere on the side. Statutory and physical spaces (driveway, hydrant, crosswalk, clearance, curb bulb and similar) are exempt.
- **Contradiction:** any G1 failure, or any G2 or G3 contradiction. Families NO_PARKING, PERMIT and PAID are criterion-7 listed fields.

## Results per sampled side

Signs: 96 in-service layer 4 records on the 12 sides. Every layer 0 record matched an in-service layer 4 record. Curb spaces: 181 in-service. "S3" is the most lenient post-hoc reading (next section); it is shown for diagnosis only and does not decide the verdict.

| # | Stratum | Side (`ELMNTKEY`), Blockface category | Pre-registered | S3 | Main reason |
|---|---|---|---|---|---|
| 1 | permit | Alder St, Terry–Broadway, NW (31541), RPZ | contradict (listed) | contradict (listed) | "PAY TO PARK … RPZ 7" signs are filed `PRZ` only, so `CATEGORY` cannot show payment on four `PS-RPZ` spaces. A no-parking arrow sign also falls on clearance. |
| 2 | permit | Alder St, 9th–Terry, SE (54038), RPZ | contradict (listed) | contradict (listed) | The same pay + RPZ category gap on eight spaces (matcher artefact). **Real layer conflict:** a "STATE DISABLED PARKING PERMIT REQUIRED" sign stands where the curb spaces show `PS-RPZ` and a curb bulb, and the side has no disabled space. |
| 3 | permit | Seneca St, Boren–Minor, NW (58085), RPZ | contradict (listed) | agree | Position offset (M3) and clearance reading only |
| 4 | metered | University St, 9th–Terry, NW (35821), Paid | agree | contradict (listed) | Agrees only because the `PR` pay signs are not graded. Once read as paid, two pay signs sit inside a passenger-load and a car-share space: a sign on a zone boundary needs extent semantics. |
| 5 | metered | Marion St, 7th–8th, NW (79657), Paid | contradict (listed) | agree | Pay sign category `PR`, plus offset |
| 6 | metered | Harvard Ave, Broadway–Spring, NE (56086), Paid | contradict (listed) | agree | G1: three signs 42–76 ft past the side end under M3 (block face starts at 100 ft). Pay sign category `PR`. |
| 7 | time-limited | Broadway, Terrace–Jefferson, E (54702), Time Limited | contradict | contradict | Four "30 M TRUCK LOAD ONLY, TAZ" signs (284 and 303 ft) and three streetcar-zone tow-away signs (117, 125 and 284 ft) stand inside one 216 ft space (97–313 ft) that the curb spaces show as plain `TL`. **Real layer conflict:** the truck-load-only signs have no loading space in the curb-space layer. The streetcar-zone signs ("PARK WITHIN LINE … TOW AWAY ZONE") govern where to park within the lane and are compatible with `TL`; their contradictions come from the pre-registered `PZONE` → SPECIAL mapping. |
| 8 | time-limited | 9th Ave, E Fir–Alder, SW (76397), Time Limited | contradict (listed) | contradict (listed) | Signs carry an RPZ zone 7 exemption (`R8-RPZX`), and Blockface itself has `RPZ_ZONE='7'`, but all curb spaces are `TL`, not `TL-RPZ`: a **real permit conflict** between official layers. The two 2-hour sign point failures here come from point-only extent. |
| 9 | time-limited | Broadway, Boren–Terrace, E (32250), Time Limited | contradict | contradict | Matcher artefact only: a streetcar-zone "PARK WITHIN LINE" sign at 200 ft, mapped to SPECIAL, inside a `TL` space it is compatible with. Not a layer conflict. |
| 10 | no parking | Boren Ave, Jefferson–James, NE (54542), No Parking | contradict | agree | Offset only (bus signs landed beside the `BUS` space) |
| 11 | no parking | Yesler Way, 8th–Broadway, S (36362), Paid | contradict (listed) | agree | Offset, clearance and `PR` pay category |
| 12 | no parking | Marion St, Minor–Boylston, NW (34309), Paid | contradict (listed) | contradict (listed) | The curb-space layer has 23 `PS-TR` spaces ("pay station – temp removal") and a 36 ft `CVLZ`. All 8 signs on the side read "NO PARKING". Paid parking temporarily removed is consistent with no-parking signs, so the `PS-TR` contradictions come from the pre-registered `PS-TR` → PAID mapping and are not a payment conflict. **Real layer conflict:** the `CVLZ` has no loading sign anywhere on the side. |

Totals, pre-registered: **1 agree, 11 contradict, 0 unverified**. 8 sides have a listed-field contradiction. Findings: G1 4 contradictions; G2 38 agree, 27 contradict, 3 unverified; G3 69 agree, 46 contradict.

## Post-hoc sensitivity (not the verdict)

Each run changes one reading on top of the previous one. All are in `results.json` under `sensitivity_post_hoc`.

| Run | Change | Agree | Contradict | Sides with listed-field contradiction |
|---|---|---:|---:|---:|
| pre-registered | — | 1 | 11 | 8 |
| S1 | position = sign `DISTANCE` (segment axis, as the data shows) | 2 | 10 | 8 |
| S2 | + `PR` signs whose `TEXT` contains "PAY" count as paid | 3 | 9 | 7 |
| S3 | + a no-parking sign agrees with a nearby clearance or physical space | 5 | 7 | 5 |

S1 removes every G1 failure, so matching to the side is reliable once the axis is known. S2 and S3 show that `CATEGORY` is not a usable rule field: payment needs free-text parsing, and SDOT publishes no grammar for that text. Some of what remains after S3 still comes from the matcher and the missing semantics:
- the PAID residuals on sides 1 and 2, because S2 relaxes only `PR` while the `PRZ` signs' text also says "PAY TO PARK";
- the boundary pay signs on side 4, which need extent semantics;
- the streetcar-zone mapping on sides 7 and 9, and the `PS-TR` mapping on side 12.

Real conflicts between the two official layers remain on sides 2 (disabled), 7 (truck load), 8 (RPZ permit, a listed field) and 12 (`CVLZ` without a loading sign). Two official layers that disagree cannot both be the authoritative rule, and neither can grade the other to zero contradictions.

## Why this is a no-go, not a "fix the parser" result

- **Arrows and extent are the rule.** The 12 sampled sides have 4 to 41 curb spaces each (median 15), while the signs are points on poles. Turning points into segments is exactly the undocumented arrow and extent semantics. Guessing them is forbidden (ADR-0001, ADR-0002 C4), and ADR-0004 rules out asking SDOT.
- **The grading signal stops where free parking starts.** Curb Space Categories is complete only on CSM (paid) blocks. On unpaid streets, where a free claim would matter, there is no independent space-level signal. The sign layer would grade itself, which the 2026-10-23 review already ruled circular.
- **The official layers conflict on 4 of 12 sides:** permit (side 8, a listed field), disabled parking (side 2), truck loading (side 7) and commercial loading (side 12). No matcher change reaches zero contradictions on those sides.

## Effect on sources

No `approval_state` changes. Parking Signs layer 0 and Parking Features layer 4 stay **pending** (C3, C4, C7). The reasons are now measured, not only noted: arrows and extent undocumented, `DISTANCE` definition truncated, `CATEGORY` single-valued, and 11 of 12 contradictions. Curb Space Categories 6 stays **pending**. It remains the better candidate for a paid-area, space-level `PAID` subset (#25), but this test found it conflicting with signs on permit (side 8), disabled parking (side 2) and loading (sides 7 and 12). Side 12's `PS-TR` spaces are consistent with its no-parking signs and are not a payment conflict. Any such subset needs its own pre-registered check, with signs as the second signal and these conflict types named in advance.

## Not verified

- Field truth: which of two disagreeing official layers is right on sides 2, 7, 8 and 12. No field work (ADR-0004).
- Rates, day and hour windows, and time-limit values. Curb Space Categories has no schedule, so they were not graded.
- Any neighbourhood other than First Hill, and any unpaid street.
- Live data after the retrieval times above.

## Validation

- `pnpm test`, including `tests/seattle-sign-test.test.mjs`: 13 table-driven and reproduction tests. They cover sampler determinism, the family tables, each grading outcome, never-free output, the sensitivity options, and exact reproduction of `sample.json` and `results.json` from the saved evidence.
- `pnpm lint` at the 71-finding baseline, zero new; `pnpm typecheck` zero.
- `shasum -a 256 -c SHA256SUMS` in the artifact directory.
