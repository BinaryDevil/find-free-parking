# TODO

Coverage requests now open `needs-triage` GitHub issues titled `Cover city: <City>` after more than 10 case-insensitive requests, skipping matching open issues. `pnpm check-requests --dry-run` prints proposed issues without creating them. The check reads request counts and never seeds or changes database rows; legacy city/page entries do not establish Coverage or suppress review.

Follow the `cover-city` skill and ADR-0002 through source inventory and human approval before any separately authorized loading. Implementation tracking remains in [#22](https://github.com/BinaryDevil/find-free-parking/issues/22); computed Coverage remains [#12](https://github.com/BinaryDevil/find-free-parking/issues/12). No request-check scheduler is configured in this repository.
