# Redaction note

Date: 2026-10-26

Files changed: `raw/signal-74ix-6xdj.json`, `raw/signal-7jzm-ucez.json`, `raw/signal-gg89-k5p6.json`, `raw/signal-hiyf-7edq.json`, `raw/signal-jxcr-rhfz.json`, `raw/signal-q2e4-e7e5.json`.

Removed from each Socrata view-metadata capture:

- `columns[].cachedContents.top` (cached most-frequent values per column).
- `columns[].cachedContents.smallest` and `largest` (single cached row values per column).
- `displayName`, `screenName` and profile image URLs of `owner`, `tableAuthor` and approval submitters and reviewers (account names).

Why: the complaints dataset capture (`signal-74ix-6xdj.json`) cached vehicle licence plates and street addresses, and the other captures cached row-level values and account names. This is personal data that the review does not need.

Kept: dataset id, name, update timestamps, row counts, column names and types, `cachedContents` cardinality, count and null counts, and licence. The review's conclusions do not depend on the removed values.

The same pattern was checked in `issue-24-seattle-public-review-2026-10-21/signal-*.json`; those files hold only column names, counts, licence and URLs, so they were left unchanged. `SHA256SUMS` was regenerated for this directory.
