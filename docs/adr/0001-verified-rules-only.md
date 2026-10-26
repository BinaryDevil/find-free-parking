# Verified rules only

The service will recommend nearby places only from Verified Free Parking Rules, city by city. It will not infer free parking from missing data, road type, or a lack of a meter, and it will not claim that a physical space is vacant; this trades breadth for a promise that unfamiliar drivers can trust.

## No Restriction Found amendment

**Acceptance.** This section takes effect when the project owner merges the PR that adds it (ADR-0005: ADR changes are owner decisions). An agent must not merge it. On acceptance it qualifies the paragraph above. Besides Verified Free Parking Rules, the service may show **No Restriction Found** places as a separate, weaker answer under the rules below. It is not a recommendation of free parking, never counts as Coverage, and never infers anything from a place that no official parking layer records.

**Why.** Public city data has not supported a single Verified Free Parking Rule. Four pre-registered tests failed ADR-0002 criterion 7: Seattle Blockface ([#123](https://github.com/BinaryDevil/find-free-parking/pull/123)), the Vancouver meter feed ([#124](https://github.com/BinaryDevil/find-free-parking/pull/124)), the Seattle sign inventory ([#128](https://github.com/BinaryDevil/find-free-parking/pull/128)) and Seattle-region lots ([#132](https://github.com/BinaryDevil/find-free-parking/pull/132)). They failed in three ways:
- **Omissions.** Restrictions the data does not record: bus stops, loading, partial no-parking, carpool-only lots, closures.
- **Wrong values.** Recorded hours that are wrong. 7 of 35 Seattle permit zones have conflicting, split or alternative hours.
- **Conflicts between official layers.** For example SDOT's sign and curb layers, and the Metro and Sound Transit lot limits.

A rule that waits for complete data shows drivers nothing. The owner asked for a clearly weaker answer that is honest about these gaps.

**1. What drivers see.** Every surface uses the full text, in every locale, never shortened:
- **No limit recorded:** "Not verified: official data shows no payment or restriction here. Posted signs and parking laws (hydrants, driveways, crosswalks) still apply."
- **A recorded limit fits the stay:** "Not verified: official data shows no payment here. Limit: <limit and hours>. Posted signs and parking laws still apply." The words "no restriction" are used only where no source records any limit.
- **"No payment" needs a payment source.** It is claimed only where an approved payment source covers that place type. Otherwise the text says "Not verified: official data shows no restriction here, and payment is not recorded for this place. Posted signs and parking laws (hydrants, driveways, crosswalks) still apply." If a recorded limit also applies, the text replaces "no restriction" with "Limit: <limit and hours>".
- **Map marking.** A hollow blue outline, distinct from Verified Free (solid green), conditional free (#127, dashed green) and Unknown (grey dashed). The legend entry reads "Not verified: no restriction found".
- **Free view.** These places show by default, ranked below Verified Free, with a toggle to hide them. The summary bar counts them separately.
- **Popup.** Lists every source checked with its as-of date, the categories no source records here, and the city's measured miss rate.

**2. Parking layer.** An official parking-regulation layer (ADR-0002 E1, E3 or E6) must positively record the exact block side or lot.
- It must pass ADR-0002 criteria 1–6 **in full**: C3 at block side or lot footprint or entrance, and C4 for every limit, hour or eligibility value the label shows or relies on.
- Two agents must approve it for this role under ADR-0005, and the city inventory records that role.
- An E3 side qualifies only when every sign assigned to it is parsed (ADR-0002 E3).
- E2 meter feeds, E4 zones, road maps, road class, OSM and missing meters are never parking layers.

**3. Restriction register.** Before the label is enabled, the city has a pre-registered restriction register approved by two agents under ADR-0005. It must:
- list every official source in the jurisdiction and from any agency operating there (transit, port, state);
- map each restriction category to the sources that record it. The categories are no stopping, tow-away, no parking, peak hour, loading (commercial, truck, passenger), bus and transit layover, disabled-only, permit or resident-only, eligibility (customers, riders, carpool), vehicle class, school zone, street cleaning, events and closures, temporary restrictions, payment, and time limits shorter than the stay. A recorded time limit or lot maximum that fits the stay is not a withholding restriction; it is shown in the text as in rule 1.

The checker reads every listed source. A category with no source is named on the city page and in the popup, for example "Bus stops and loading zones are not in any official dataset here". Citation data may withhold the label, never grant it (ADR-0002 signals).

**4. When it is withheld.** The label is withheld, and the place shows the stricter answer or Unknown, if any of these hold:
- **A restriction applies.** Any listed source shows, for the selected time and vehicle, payment, a permit or eligibility requirement, a limit or lot maximum shorter than the stay, or any other restriction category above.
- **Silence outside listed hours.** A source records payment, permit or a restriction there at any time, and its schedule is not a complete documented schedule. An empty or null band is Unknown, never "none found".
- **A record the checker cannot classify** lies on or near the place.
- **Location is uncertain.** A restriction record withholds the label from every place it could belong to: every side within 15 m of a point record, both sides for records located only to a block, and the whole lot for any record inside or within 15 m of its footprint.
- **Lots.** User eligibility, operator system-wide rules and the shortest published maximum stay are restrictions. If operators publish different rules for one lot, it is Unknown.
- **Freshness.** A parking or restriction source has not synced successfully within 7 days, E5 within 24 hours, or citation data is more than 60 days behind. A city with no E5 source for a place type (street or lot) cannot show the label for that type. That E5 source must pass ADR-0002 criteria 1–6 in full and be approved for this role by two agents, the same bar as rule 2; criterion 7 is not required for this role.
- **The stay is too long.** The stay exceeds the shortest of 72 hours, the jurisdiction's general limit and any operator maximum. With no stay given, the service assumes 2 hours and shows that assumption.

**5. Measurement, which can never be skipped.** A city enables the label only after an independent agent's measurement has run and passed.
- **Sample.** Pre-register a uniform random sample of at least 30 labelled (place, time) pairs across the week. The pre-registration names the signal, what it can and cannot detect, and the miss rule.
- **The signal must be independent.** It must be an official source not used to compute the sampled labels.
- **Holding a source back.** If every available official source is already a label input, hold out one restriction source. Compute the sampled labels without it and check them against it. The held-out source must be in the approved register, be separately maintained (not a view or export of another input), and carry records across the sampled area. The pre-registration names it and says why it was chosen.
- **What the number means.** Because withholding is a union, the served label (which also uses the held-out source) can only withhold more than the measured label. So the measurement bounds misses that the held-out source can detect. It does **not** measure restrictions that no official source records, blind spots the held-out source shares with the inputs, or wrong values all sources agree on. Those are named, not counted.
- **No independent signal means no label.** "Unmeasured" is never an enabled state.
- **Hard block.** A single sampled miss blocks the label for the city if the missed restriction prohibits an ordinary vehicle of the general public from parking at that time, or may lead to towing.
- **Publish the uncertainty honestly.** The city page and the popup show the miss count, its 95% upper bound and what was checked. For example: "Checked 30 places against Seattle's sign inventory: 1 had a restriction the other data missed (up to 1 in 6 at most). Bus stops and loading zones are not in any official dataset here and were not checked." The owner sets the maximum acceptable bound before the first city is enabled.
- **Re-measure** after any change to sources, parser or classifier, and at least every 6 months. After such a change the label shows Unknown in that city until the new measurement passes.

**6. Unchanged.**
- Verified Free Parking Rules, ADR-0002 criteria, and Coverage levels and pages. A page gains one line saying it also shows places where no restriction was found in official data.
- Driver Reports stay display-only warnings.
- No outreach (ADR-0004).
- ADR-0005 gates.

**Accepted risk.** Some labelled places will carry restrictions the data omits or records wrongly, so a driver who relies on the label without reading signs may be ticketed or towed. The safeguards reduce this risk; they do not remove it:
- the "Not verified" wording;
- the distinct marking;
- whole-side and lot-wide withholding;
- the restriction register;
- the measured upper bound;
- the hard block on prohibiting or tow-type misses.

The owner accepts this residual risk in exchange for giving drivers a useful but clearly qualified answer.

**Consequences.**
- Accepting this also accepts the matching edits in this PR to `AGENTS.md` and `GLOSSARY.md`.
- **Implementation tickets after acceptance:**
  - the result type and texts in all eight locales;
  - the restriction register and its checker;
  - the map, legend, popup and toggle;
  - the city-page line;
  - the measurement procedure.
- **No source is assumed eligible.**
  - Seattle Blockface is pending on C3 and C4 (2026-10-23 review) and would need to pass them in full first.
  - Vancouver has no E1 or E3 parking layer, so all Vancouver streets, metered or not, stay Unknown. Only lots could qualify.
