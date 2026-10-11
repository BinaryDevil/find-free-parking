# Query visibility

[Issue #6](https://github.com/BinaryDevil/find-free-parking/issues/6) requires production approval, extension installation, and a review after a week of traffic. This runbook prepares those operations; merging it does not install the extension.

## Enable and verify

1. Confirm the Neon project is `find-free-parking`, the database is `find-free-parking-db`, and the selected branch is the intended target. Use the database owner through a direct connection; do not change application credentials or grant `pg_read_all_stats` to `app_rw`.
2. Check `pg_extension` for `pg_stat_statements`, `SHOW shared_preload_libraries`, and `SHOW pg_stat_statements.track`. If installed already, verify it rather than reinstalling it. If not preloaded or tracking is disabled, stop and review configuration before proceeding.
3. Validate [the SQL](../sql/archived/16.pg_stat_statements.sql) on an isolated nonproduction Neon branch. For production, record explicit approval on #6 and confirm a current restore point before executing the same file. No application rows are modified.
4. Verify the extension version, then run a harmless read twice (`SELECT count(*) FROM public.covered_cities;`). Run `neon inspect db outliers` and `neon inspect db calls` with explicit project, branch, and database selectors. The Neon MCP `inspect_database` checks of the same names are equivalent. Success means the checks return data; it does not establish representative production traffic.

## Review after a week of traffic

Record the production enablement time on #6 and review after seven days of traffic. Inspect both cumulative execution time (`outliers`) and frequency (`calls`); record counts and timing metrics plus a redacted query description where useful. Exclude administrative probes when assessing application performance. Read `pg_stat_statements_info.stats_reset` and `pg_postmaster_start_time()` alongside each review to describe the actual observation window. Do not reset statistics to manufacture a window.

[Neon statistics do not survive compute suspension or restart](https://neon.com/docs/extensions/pg_stat_statements). A check seven days later may cover a shorter window. Record that limitation and arrange another read-only review if traffic or retention is insufficient; do not change compute settings as part of this ticket.

Query text can contain sensitive literals, especially utility statements. Inspect raw output only in an authorized private context. Keep query text, credentials, IP addresses, and precise driver locations out of issue/PR comments, committed files, and routine logs. Summarize metrics without raw SQL; do not export statistics to a public artifact.

Leave #6 open until production installation and the traffic review are evidenced. Schedule a quiet follow-up only after the production start time is known; notify only on a meaningful result, failure, or required human action.

## Rollback

The extension is additive and independent of application code. Reverting these files does not uninstall it. Preserve application data and collected statistics; do not drop the extension or reset statistics as a routine rollback. Any database rollback requires separate approval under [data operations](DATA.md).
