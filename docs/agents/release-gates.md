# Release gates

Work ships to production in **releases**. Each release covers one or more consecutive GitHub milestones (`R0`–`R5`) and ships through one **release PR** from `dev` into `main`. Merging a release PR deploys production and approves the production actions it lists ([ADR-0005](../adr/0005-agent-verified-gates.md)). Only a human merges it. Agents prepare and verify everything else.

Which tickets belong to which release lives only in the milestones (`gh api 'repos/BinaryDevil/find-free-parking/milestones?state=all'`, `gh issue list --milestone "<title>"`). The milestone descriptions summarise each release. This file holds the process.

## Order

Milestones ship in order: R0 → R1 → R2 → R3 → R4 → R5. One release PR may carry several consecutive milestones when all their tickets are closed. R2 and R3 are invisible to drivers, so R0–R3 can ship together.

- **R0 Safe environments.** Credentials, backups, least-privilege role, query stats, isolated preview/dev database, automation access.
- **R1 Stop the harm.** Fail-safe map, test runner and CI, upgrades, request automation, policy ADR. Changes what drivers see.
- **R2 Evidence foundation.** Additive schema only; no change drivers can see.
- **R3 Rules engine (dark launch).** The server evaluator and Coverage are active only inside approved Coverage areas. None exist yet, so drivers see no change.
- **R4 Seattle and Vancouver go live.** The first Verified Free Parking Rules reach production.
- **R5 More cities.**

Tickets in a later milestone may be worked and merged into `dev` early, as long as their code stays dark (gated by approved Coverage) until that milestone's release.

## Tickets and ticket PRs

- **Branch:** `issue-<n>-<slug>` (or the agent's own prefix) from `dev`. The PR targets `dev`, says `Refs #n`, and keeps to that ticket's scope.
- **Picking work:** take an open `ready-for-agent` ticket in the earliest unreleased milestone whose native `blocked_by` issues are all closed and that has no assignee. Assign yourself first (see `docs/agents/issue-tracker.md`).
- **Ticket body:** two lists. *Merge criteria* are what the agent verifies before merging into `dev`. *Release checks* are what can only be checked in production; the release PR copies them.
- **Merging:** an agent merges its own ticket PR into `dev` under ADR-0005: CI green, self-verification recorded, independent review agent with zero open findings, and the branch current with `dev` and with overlapping open PRs. It then closes the ticket with a comment linking the merge.
- **Overlapping PRs:** when two open PRs touch the same migrations or files, the second to merge rebases or merges `dev` and reruns the DB tests on a fresh database.
- **`ready-for-human`** is only for the one-time account setup listed in ADR-0005. Approvals and verification are agent work.

## Release PR

When a milestone's tickets are all closed, an agent opens the release PR (`dev` → `main`), titled `R<N> <milestone title>` (or `R<N>–R<M>`), with `Refs` to every ticket. Its description has:

- **Production actions.** Every production write in order: migrations by file name, source approvals going live, syncs and loads, legacy retirement steps. Each comes with its verification and rollback. Anything not listed is not approved by the merge.
- **Gate checks** below, each ticked by the agent with linked evidence.
- **Release checks** copied from every included ticket.

Keep the release PR current with `dev` until merge.

## Gate checks (agent-verified before the human merges)

- [ ] Every ticket in the included milestones is closed, or moved to a later milestone with a comment saying why.
- [ ] CI is green on `dev` at the release head.
- [ ] The DB test suite passes against a fresh disposable database at the release head.
- [ ] The preview deployment of the release head was checked against the **dev** database, on desktop and mobile, covering each ticket's driver-visible behaviour.
- [ ] **Migrations (if any):** additive. Applied to a fresh Neon branch of production, and the current production code still works against that branch. The release code fails closed against production's pre-migration schema.
- [ ] Rollback stated: redeploy the previous production deployment; for migrations, why the old code works against the new schema.
- [ ] The independent review agent has reviewed the release diff and the production actions list with zero open findings.

For the automated migration plan, exact PR action syntax, credential skip behavior
and recovery, see [production release automation](../PRODUCTION_RELEASE.md).

## After merge (agent)

1. Take a Neon snapshot branch of production.
2. Run the production actions in order, verifying each.
3. Verify production: the map, `/api/health`, the parking APIs, every release check, and the release-specific checks below, on desktop and mobile.
4. Record the results with the date as a comment on the release PR. On failure, restore the previous deployment and open a ticket.

## Release-specific checks

- **R0:** a preview deployment and a pulled local env both connect to the dev database; a production restore point at least 24 hours old exists.
- **R1:** the 2026-10-05 failures are fixed in production (West End blocks not shown free; three reports don't create "Verified Free"; no "real-time regulations" claim); `pnpm audit --prod` shows no critical or high advisories in `next`, `axios`, `uuid` or `maplibre-gl`.
- **R2:** a fresh Neon branch built from migrations alone matches production's schema; running an import twice adds no rows.
- **R3:** with no approved Coverage area, the API and map behave exactly as after R1 (dark launch); the evaluator test suite passes.
- **R4:** each served source is approved by agent review in its inventory (ADR-0005); sources without published reuse terms are excluded and the Coverage subset says so; the go-live spot checks pass on the live site.
- **R5:** each city's sources are approved by agent review before their data is served.
