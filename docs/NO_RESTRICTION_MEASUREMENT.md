# No Restriction Found: measurement runbook

Refs [#137](https://github.com/BinaryDevil/find-free-parking/issues/137). The spec is rule 5 of the [ADR-0001 No Restriction Found amendment](adr/0001-verified-rules-only.md#no-restriction-found-amendment). The checker is described in [implementation/no-restriction-found.md](implementation/no-restriction-found.md).

**Status.** The procedure and the tool exist. No city has been measured, no register records a passed measurement, and the owner has not yet set the maximum acceptable bound. The label stays dark everywhere.

A city shows No Restriction Found only after an independent agent runs this measurement and it passes. "Unmeasured" is never an enabled state. If no eligible signal exists, the city gets no label.

## Order of work

1. **Pre-register.** Write `preregistration.json` and commit it before any labels are computed or any signal record is looked at for the sampled pairs.
2. **Snapshot.** Save the inputs the checker reads to `inputs.json`: register, sources, and the frame of places with their parking-layer record and nearby restriction records, including the signal's records. Use the same loaders as the served evaluator. Do not edit the snapshot after the pre-registration is committed.
3. **Run.** `node scripts/nrf-measure.ts preregistration.json inputs.json results.json`. The script is pure and deterministic: the same files always give the same result.
4. **Review.** A second agent checks the pre-registration, the snapshot and every miss, under ADR-0005.
5. **Record.** Only a passing result may be written as the register's `measurement_ref` and `measured_at`. That write is a production data action and needs a merged release PR (ADR-0005).

Keep the three files together in `artifacts/<issue>-nrf-measure-<city>-<date>/`. They must not contain driver locations or credentials.

## Pre-registration

Fields read by the script:

| Field | Meaning |
| --- | --- |
| `id`, `city` | Names the measurement. |
| `seed` | Integer seed for the sampler. Fixed before the run. |
| `sampleSize` | At least 30 labelled (place, time) pairs. |
| `weekStart` | An absolute instant. Times are drawn uniformly by minute over the 7 days after it. |
| `stayMinutes` | The stay used for every pair. `null` uses the checker default (2 hours). |
| `signal.kind` | `held_out` or `independent` (see below). |
| `signal.sourceId`, `signal.label` | The source, and the name the sentence uses, for example "Seattle's sign inventory". |
| `signal.reason` | Why this source was chosen. |
| `signal.separatelyMaintained` | Must be `true`. State in `reason` why it is not a view or export of an input. |
| `signal.detects` | The categories the signal can detect. A held-out source may list only categories the register maps to it. |
| `maxUpperBound` | The owner's maximum acceptable bound. `null` until the owner sets it; no measurement passes while it is `null`. |

The pre-registration must also state, in prose next to the JSON:
- what the signal cannot detect (see "What the number means");
- the miss rule and the hard-block rule below, unchanged or with any stricter change.

## Sample frame

- The frame is every place in the snapshot: each block side or lot with its parking-layer record and the restriction records near it.
- The script sorts places by id, then draws a place and a minute of the week uniformly with a seeded generator (mulberry32). Repeated pairs are skipped.
- It computes the held-out label for each draw and keeps only labelled pairs (`NO_RESTRICTION_FOUND`). This gives a uniform sample of labelled pairs across the week.
- It stops at `sampleSize` labelled pairs. If 1,000 draws per wanted pair do not fill the sample, the verdict is `insufficient_sample`. The sample is never padded.

## Choosing the signal

The signal must be an official source that was not used to compute the sampled labels. Two kinds are allowed:

- **Independent official signal** (`independent`): an approved official source that is not in the register and is not a parking layer.
- **Held-out source** (`held_out`): used when every official source is already a label input. The sampled labels are computed without one restriction source, and checked against it. It must:
  - be in the approved register;
  - be separately maintained, not a view or export of another input;
  - carry records across the sampled area.

The script refuses a signal that:
- is not approved;
- is a parking layer;
- is the register's E5 temporary-restrictions source, which the label needs in order to be shown at all;
- has no records in the frame;
- is not marked as separately maintained;
- claims categories the register does not map to it (held-out kind).
 Whether a source is really separately maintained, and whether its records really span the area, are judgements for the pre-registration and the reviewing agent.

Citation data may withhold the label, never grant it. A citation source can be a signal only if it meets the same conditions.

## Labels and the miss rule

**Measured label.** The script calls the merged checker with the signal's register entries and records removed. Inside this computation the register's measurement gate is treated as met (`measurementRef` is set to `pre-registration:<id>`). Nothing is written back.

**Miss.** A sampled pair is a miss when adding the signal's records for that place makes the checker withhold the label for a restriction reason: `restriction_applies`, `restriction_recorded`, `limit_exceeded`, `incomplete_schedule`, `empty_band`, `unclassifiable_record`, `uncertain_location` or `operator_conflict`. The checker's own reach rules decide which signal records belong to the place (15 m for points, both sides for block records, the whole lot). Freshness and register reasons are not misses.

A recorded restriction counts as a miss even outside its hours, because the driver-facing text says no restriction is recorded there. A signal record in a category not listed in `detects` still counts.

## What the number means

For restriction records, withholding is a union: adding a record can only add withholding reasons, never remove one. This includes operator conflicts on lots, where two or more operators with more than one distinct rule between them always conflict. The property is tested in `tests/no-restriction-found.test.mjs`. Two inputs work the other way, because the label needs them in order to be shown: the parking layer and the E5 temporary-restrictions source. Neither can be the signal. So the served label, which also uses the signal, withholds at least as much as the measured label, and the measurement bounds the misses **that the signal can detect**.

It does **not** measure, and the publication names rather than counts:
- restrictions that no official source records (missing categories);
- categories the signal does not record;
- blind spots the signal shares with the inputs;
- wrong values that all sources agree on.

## Hard block

A single sampled miss blocks the label for the city if the missed restriction prohibits an ordinary vehicle of the general public from parking at that time, or may lead to towing. The script marks a miss as a hard block when any of these hold:
- a missed record applies during the sampled stay and its category is anything other than `payment` or `time_limit`;
- any withholding reason for the pair, from all the signal's records together or from one alone, is `unclassifiable_record`, `empty_band`, `incomplete_schedule`, `uncertain_location` or `operator_conflict`;
- no single signal record reproduces the miss on its own.

A missed restriction that is recorded but not active during the sampled stay, payment, or a limit shorter than the stay is a miss but not a hard block. The reviewing agent checks every miss and may only make the result stricter.

## Result and verdict

`results.json` contains the sample, the miss count and details, `upperBound95`, `hardBlock`, the unchecked categories, the sentence and the verdict.

- **Bound.** The exact one-sided 95% Clopper-Pearson upper bound: the miss rate at which seeing this many misses or fewer has probability 5%. For 30 pairs: 0 misses ≈ 9.50%, 1 ≈ 14.86%, 2 ≈ 19.53%.
- **Verdict.**
  - `insufficient_sample`: fewer labelled pairs than pre-registered.
  - `fail`: any hard block, or the bound is above `maxUpperBound`.
  - `no_threshold`: the owner has not set `maxUpperBound`.
  - `pass`: otherwise.

## Published sentence

The city page and the popup show the miss count, the bound and what was checked, in the ADR's format:

> Checked 30 places against Seattle's sign inventory: 1 had a restriction the other data missed (up to about 1 in 6). Bus stops and transit layovers and loading zones are not in any official dataset here and were not checked. The check cannot catch restrictions that no official source records, that Seattle's sign inventory also misses, or that all sources record wrongly.

- **"about 1 in N" rounds down:** N = floor(1 / bound), so the stated rate is never below the bound. For 30 pairs, 0, 1 and 2 misses give 1 in 10, 1 in 6 and 1 in 5. The ADR example's "1 in 7" for one miss illustrates the format; rounding to the nearest number would understate the 14.9% bound. The exact bound is kept in `results.json`.
- **Missing categories.** The next sentence names categories that neither the signal nor any non-citation register source records for the sampled place types.
- **Categories the signal does not record.** Another sentence names the other categories the signal does not record: "<Signal> does not record …, so they were not checked."
- **What it cannot catch.** A fixed last sentence names what rule 5 says is named, not counted: restrictions no official source records, blind spots the signal shares with the inputs, and wrong values all sources agree on.
- Translating the sentence into the eight locales belongs to the display work ([#136](https://github.com/BinaryDevil/find-free-parking/issues/136)).

## Re-measurement

Re-measure:
- after any change to the city's sources, the register, the parser or the classifier;
- at least every 6 months.

After such a change, or when 6 months pass, the label shows Unknown in that city until a new measurement passes. Each re-measurement needs a new pre-registration with a new seed, committed before the run.
