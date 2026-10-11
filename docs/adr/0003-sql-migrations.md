# Timestamped SQL migrations with node-pg-migrate

Accepted for #9. The application uses raw `pg`; adding an ORM solely to migrate
would introduce a second schema representation. Use pinned `node-pg-migrate`
9.0.0 with timestamped SQL under `sql/migrations/`, its transaction/advisory lock,
order check, and separate `migration_meta.pgmigrations` history. No application
queries change. See the [tool API](https://salsita.github.io/node-pg-migrate/api).

The baseline is the production schema captured read-only with PostgreSQL 17.11
`pg_dump --schema-only` on 2026-10-10. Keep defaults, nullability, enum order,
constraints, spatial indexes, triggers, function bodies/security settings,
ownership and table/column ACLs. Remove psql-only restrict commands and the
provider-managed `cloud_admin` default ACL statements, which Neon supplies and
may change for newly created databases. Preserve their strict comparison diff;
an explicit application-only projection may exclude these two sections, without
claiming full database parity or escalating provider grants.
The baseline creates passwordless application roles only when absent; existing
Neon branch roles are preserved. The database owner remains the existing project
owner. Temporary permissions needed to transfer the definer function are removed
without changing pre-existing membership or CREATE privileges.

Database CONNECT/TEMP/CREATE ACLs, provider roles/default ACLs, credentials and
deployment environment settings are operator infrastructure, not portable
application-schema migrations. Inspect them separately using DB_ROLES.md.
Extension versions come from Neon; comparison must check versions as well as
schema. PostGIS extension-owned objects are installed by CREATE EXTENSION.

CI seals every migration in the PR base or previous push, a stronger rule than
sealing only applied files. It compares Git bytes, detects deletion/rename, and
needs no production secret. Commit migrations before any approved application;
fixes are new migrations. Migration execution is manual and never part of build
or deployment. Existing databases must adopt the baseline through reviewed fake
marking, never by replaying it. No down/reset interface is offered: redeploy older
code against additive schema, and review any data repair separately.
