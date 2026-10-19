# Agents verify; a release merge is the human gate

Accepted 2026-10-18 at the project owner's request to minimize human work. Amends the approval steps of [ADR-0002](0002-evidence-source-policy.md) and the production-write rule in `AGENTS.md`. It does not change what evidence may establish ([ADR-0001](0001-verified-rules-only.md), ADR-0002) or the no-outreach rule ([ADR-0004](0004-no-external-outreach.md)).

## Decision

Agents do and verify the work themselves. A human acts only at these points:

1. **Merging a release PR into `main`.** The merge approves exactly what the PR lists under *Production actions* (migrations, source approvals going live, data loads, legacy retirement). Nothing else is approved by it.
2. **One-time account setup that agents cannot change**, such as security settings and secrets. Each item has its own `ready-for-human` ticket.
3. **Changing an ADR.** Owner decisions stay owner decisions.

Everything else, including ticket PR merges into `dev`, source approval and post-release verification, belongs to agents under the rules below.

## Ticket PRs

A ticket is done when its PR is merged into `dev` with every **merge criterion** verified. The ticket closes then. Checks that can only happen in production are written as **release checks** on the ticket, and the release PR copies them into its checklist.

An agent may merge a ticket PR into `dev` when all of these hold:

- CI is green.
- The PR records its self-verification (below), with commands and results.
- An **independent review agent** has reviewed the diff against the ticket and the standards and has zero open findings. It runs in a fresh context, with no access to the author's drafts or reasoning. The author agent may not be the reviewer.
- The branch is current with `dev`, and any other open PR that touches the same files or migrations has been rebased onto it or integrated with it.

## Self-verification ladder

Use every rung the change touches:

1. Unit and table-driven tests (`pnpm test`), lint and typecheck against the recorded baselines.
2. **Disposable database.** Run DB tests against a fresh, empty database: either local PostGIS in Docker (image `imresamu/postgis:17-3.5` on arm64, run serially, from a container that shares the database clock) or a Neon branch created for the test. Never use shared dev or production.
3. **Preview deployment** against the dev database: desktop and mobile viewports in a browser, `/api/health` and the parking APIs. Access goes through the Vercel automation-bypass secret; agents never sign in as a human.
4. **Independent review agent**, as above.

A rung that can't run is named in the PR with the reason. That rung stays unverified; it is never reported as passing.

## Source approval

A source is approved when two agents agree in writing, both recorded in the city inventory:

- The **author agent** records evidence for each of ADR-0002's seven criteria.
- An **independent reviewer agent** re-fetches the endpoint, licence page and spot-check signals itself and re-checks every criterion. It does not rely on the author's notes.

The inventory line reads `approved by agent review on <date> (author <PR>, reviewer <PR or comment>)`. The release PR that first serves the source lists it under *Production actions*, and the human merge makes it live.

- **Reuse terms (criterion 6):** only a published licence or published terms covering the exact item count. Where none exists, the source is excluded and Coverage narrows. No human judgement or outreach stands in for missing terms.
- **Old data (criterion 5):** where the last edit is more than 24 months old, the reviewer agent's own fresh spot check, dated within 30 days, takes the place of human re-review.
- **Spot checks (criterion 7):** a field photo is not required. The other independent official signals suffice.
- Any disagreement between the two agents leaves the source `pending`, with the reason recorded.

## Production actions

- Every production write is listed in the release PR before merge: each migration, each source to sync, and each retirement step, with its verification and rollback.
- After the human merge, the release workflow (or, until it exists, an agent) runs them in order. It takes a Neon snapshot branch of production first, then applies migrations, then loads data. It verifies each step and records the results as a comment on the release PR.
- Migrations stay additive. The release code must work, failing closed, against production's pre-migration schema. This is verified on a Neon branch of production before merge.
- When post-release verification fails, an agent may restore the previous production deployment. Restoring data from a snapshot over user data needs a human.
- Agents write to production only through a merged release PR's listed actions.

## Shared dev and disposable databases

- **Shared dev database:** after a migration merges into `dev`, an agent takes a Neon snapshot branch of dev and applies the migration, so previews reflect `dev`. It may also run syncs of sources approved under this ADR against dev. It never deletes or rewrites existing rows, and never writes test fixtures there.
- **Disposable databases:** agents may create, clear and delete Neon branches named `validation/...` and local Docker databases that they created for a test. They never touch other branches.

## Reading older runbooks

Runbooks under `docs/` written before this ADR ask for "separate human approval", "explicit approval naming the target" or an approval recorded on a ticket. Read those requirements as follows:

- **Production step:** the step is listed under a merged release PR's *Production actions*. The approval variables a script requires (for example `*_APPROVED=...`) are set by whoever runs that listed action.
- **Shared dev step:** allowed under the section above. Record the target, snapshot and result on the ticket.
- **Disposable step:** allowed under the section above.

Their preflight, snapshot, verification and stop-on-drift steps still apply unchanged; agents perform them.

## Consequences

- Human work per release drops to reviewing and merging one PR.
- Some sources that a human might have accepted on judgement will stay excluded. That is consistent with ADR-0004: missing evidence stays missing.
- Agents need the one-time automation access listed in the setup ticket before rung 3 and the release workflow can run.
