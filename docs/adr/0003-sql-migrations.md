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

CI seals every migration in the PR base, or previous push on dev/main; feature
pushes compare against dev. It detects deletion/rename and needs no production
secret. Unmerged migrations may be corrected during disposable validation.
Integrate reviewed migrations before applying them to shared databases;
subsequent fixes are new migrations. Migration execution is manual, never part of build
or deployment. Existing databases must adopt the baseline through reviewed fake
marking, never by replaying it. No down/reset interface is offered: redeploy older
code against additive schema, and review any data repair separately.

## Preservation lineage amendment — accepted 2026-10-21

The owner approved the exact amendment proposed in [#111](https://github.com/BinaryDevil/find-free-parking/pull/111) for [#91](https://github.com/BinaryDevil/find-free-parking/issues/91). This changes the migration contract; it does not establish implementation, target adoption or production verification. The guarded runners now share explicit lineage selection and adoption; local implementation evidence does not establish target readiness. See the [operator runbook](../implementation/preservation-runner.md). See the [implementation design and acceptance criteria](../plans/schema91-preservation-design.md).

Existing integrated migration files and existing migration history remain immutable. The project supports the legacy migration lineage and a separately identified preservation-v1 lineage. The latter starts from the unchanged baseline and reviewed additive foundation, preserves all existing fields and rows during installation, and does not record superseded legacy operations as executed. A committed append-only manifest fixes lineage membership, order, SQL hashes and superseded identities. Target selection requires explicit reviewed adoption with exact schema/history comparison; runners never select a lineage by inference or an arbitrary runtime file filter. The migration and release runners use the same manifest and target adoption record, retain transaction/advisory-lock and strict selected-lineage order checks, and reject unknown history or changed hashes before any write. Initial adoption supports empty or baseline-only targets; later legacy targets require a separate reviewed reconciliation. Every production adoption metadata write and migration remains a listed action under a human-merged release PR. Code-only releases perform neither.
