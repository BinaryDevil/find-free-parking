# Historical SQL — superseded

These files are archived reference material. The live-schema baseline in
[`../migrations/1791676800000_baseline.sql`](../migrations/1791676800000_baseline.sql)
supersedes the historical schema sequence. Numbers collide, some files delete
data, and some include seed rows. **Never replay this directory.** Use the
migration workflow in [DATA.md](../../docs/DATA.md).

Archiving does not mean every file was applied. In particular, operator files
`15.app_rw.sql`, `15.app_rw.verify.sql`, `16.pg_stat_statements.sql`, and
`17.driver_warning_read.sql` retain their separately approved rollout/verification
uses in [DB_ROLES.md](../../docs/DB_ROLES.md),
[QUERY_STATS.md](../../docs/QUERY_STATS.md), and
[RETURNING.md](../../docs/RETURNING.md). The baseline captures production on
2026-10-10, including its applied restricted function owner and query-statistics
extension, but not dev's additional report-status SELECT grant. Do not reapply
the role-creation script to roles that already exist.
