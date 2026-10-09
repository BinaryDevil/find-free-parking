-- Prepared for #6. Production requires explicit approval on the ticket.
-- Run as the database owner using the DIRECT connection after the
-- docs/QUERY_STATS.md preflight. No application rows or roles are changed.
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
