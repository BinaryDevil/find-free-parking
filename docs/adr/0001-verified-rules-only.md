# Verified rules only

The service will recommend nearby places only from Verified Free Parking Rules, city by city. It will not infer free parking from missing data, road type, or a lack of a meter, and it will not claim that a physical space is vacant; this trades breadth for a promise that unfamiliar drivers can trust.

## No Restriction Found amendment — proposed 2026-10-26, awaiting owner acceptance

**Status: proposed.** Nothing changes until the project owner accepts this by merging the PR that adds it (ADR-0005). Until then the paragraph above applies unchanged.

**Why.** Public city data has not supported a single Verified Free Parking Rule. Four pre-registered tests failed ADR-0002 criterion 7: Seattle Blockface ([#123](https://github.com/BinaryDevil/find-free-parking/pull/123)), the Vancouver meter feed ([#124](https://github.com/BinaryDevil/find-free-parking/pull/124)), the Seattle sign inventory ([#128](https://github.com/BinaryDevil/find-free-parking/pull/128)) and Seattle-region lots ([#132](https://github.com/BinaryDevil/find-free-parking/pull/132)). Most failures were omissions: bus stops, loading zones, partial no-parking stretches, carpool-only lots and closures that the tested data does not record. A rule that waits for complete data shows drivers nothing. The owner asked for a weaker, clearly separate answer that is honest about this gap.

**Decision.** Add a second, weaker answer, **No Restriction Found**, beside Verified Free. It is never called free and never counts as Coverage.

1. **What it says.** "No payment or restriction found in official data. Signs may differ: read them before you park." The map, popup and filters never present it as free parking or as a Verified Free Parking Rule.
2. **When it may be shown.** All of these must hold for the selected time, stay and vehicle:
   - **A parking layer records the place.** An official parking-regulation layer (ADR-0002 E1, E3 or E6) positively records the exact block side or lot, and that layer passes ADR-0002 criteria 1–6 for this role. Road maps, road class, OpenStreetMap, missing meters or the absence of any record never qualify. A place no parking layer records stays Unknown.
   - **No restriction anywhere.** No official restriction source for that city shows a restriction, payment, permit requirement, time limit shorter than the stay, or condition on or near the place. Sources include meter and payment feeds, permit zones, sign inventories, curb-space layers, temporary restrictions and official citation data. A restriction found anywhere on a block side withholds the label for the **whole side**; a restriction at a lot withholds the whole lot. Citation data may withhold the label, never grant it (ADR-0002 signals).
   - **Everything is fresh.** Every source the city uses for this check is within its ADR-0002 freshness limit, and a temporary-restriction source has synced within 24 hours. If any of them failed, is stale or is missing, the place is Unknown.
   - **The stay fits.** The intended stay is at most 72 hours and fits any time limit the parking layer records.
3. **How it looks.** It uses a marking clearly distinct from Verified Free and from conditional free (#127), for example a muted outline rather than the free colour. It has its own legend entry, and in the Free view it is ranked below Verified Free. The popup names every source checked and its as-of date.
4. **Measured before use, and the result shown.** A city enables the label only after an independent agent runs a pre-registered random sample of at least 30 labelled places. Each is checked against an official signal not used to make the label. The observed rate of missed restrictions is published on the city page in plain words (for example "in a check of 30 places, 2 had a restriction the data missed"). If no such signal exists, the page says the rate is unmeasured. **Any** missed no-stopping, tow-away, bus-zone or fire-lane restriction in the sample blocks the label for that city. The owner sets the maximum acceptable rate for other restriction types before the first city is enabled.
5. **Unchanged.**
   - Verified Free Parking Rules, ADR-0002 criteria and Coverage levels.
   - City pages still say "not covered" unless real Coverage exists. A page with this label adds one line saying it shows places where no restriction was found in official data.
   - Driver Reports stay display-only warnings that never change an answer.
   - No outreach (ADR-0004), and agents verify while the owner merges releases (ADR-0005).

**Accepted risk.** Some places with this label will carry a restriction the data omits. The tests above show that omissions are common, so a driver may be ticketed or towed if they ignore the signs. The safeguards are the separate wording and marking, the whole-side withholding rule, the published measured rate, and the hard block on tow-away-type misses. They reduce this risk; they do not remove it. The owner accepts this residual risk in exchange for giving drivers a useful but clearly qualified answer. The glossary gains a **No Restriction Found** entry with the wording in rule 1.

**Consequences.**
- **Implementation tickets after acceptance:** a new result type in the evaluator, the restriction-check pipeline across a city's sources, the distinct map and popup style in all eight locales, the city-page line and the measurement procedure.
- **No current source is assumed eligible.** Each parking and restriction layer needs a fresh review for this role. For example, Seattle Blockface could be a parking layer, with the sign inventory and citation data used to withhold the label. Vancouver has no official parking layer for unmetered streets, so most of Vancouver would stay Unknown.
