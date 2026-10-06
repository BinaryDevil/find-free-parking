# Release gates

Work ships to production in **releases**. Each release is one GitHub milestone (`R0`–`R5`) and one **release PR** into `main`. Merging a release PR deploys production, so the release PR is the **gate**: everything it contains must pass the gate checks below before a human merges it.

Which tickets belong to which release lives only in the milestones (`gh api repos/BinaryDevil/find-free-parking/milestones`, `gh issue list --milestone "<title>"`). The milestone descriptions summarise each release. This file holds the process.

## Order

Releases ship in order: R0 → R1 → R2 → R3 → R4 → R5. Work on a release starts when the previous release PR is merged; R0 is the exception, because most of it is human ops work.

- **R0 Safe environments** (ops). Credentials, backups, least-privilege role, query stats, and an isolated preview/dev database. Its release PR carries only the doc updates those tickets require. R1 and later need R0's isolated database to verify previews safely.
- **R1 Stop the harm.** Fail-safe map, test runner and CI, upgrades, request automation, policy ADR. Changes what drivers see.
- **R2 Evidence foundation.** Additive schema only; no change drivers can see.
- **R3 Rules engine (dark launch).** The server evaluator and coverage are active only inside approved coverage areas. None exist yet, so drivers see no change.
- **R4 Seattle and Vancouver go live.** The first Verified Free Parking Rules reach production.
- **R5 More cities.**

Docs-only tickets in a later milestone (the source inventories) may start early. They still ship with their milestone's release PR.

## Branches and PRs

- **Release branch:** `release/r<N>-<slug>` from `main`, created when the release starts. Open the release PR (`release/...` → `main`) as a draft right away, titled `R<N> <milestone title>`, with `Closes #n` for every ticket in the milestone.
- **Ticket branch:** `issue-<n>-<slug>` from the release branch. Its PR targets the **release branch**, references `#n`, and keeps to that ticket's scope.
- **Picking work:** take an open ticket in the current milestone whose native `blocked_by` issues are all closed or merged into the release branch, and with no assignee. Assign yourself before starting (see `docs/agents/issue-tracker.md`).
- **Merging ticket PRs:** an agent may merge a ticket PR into the release branch once CI is green and every acceptance criterion is verified and ticked in the PR description. Tickets labelled `ready-for-human` are completed by a human; agents prepare what those tickets need (docs, scripts, checklists).
- **Merging the release PR:** only a human merges a release PR into `main`.
- Keep the release branch current with `main` (merge `main` in) whenever `main` changes.

## Gate checks (every release PR)

The release PR description carries this checklist; the agent preparing the release ticks what it verified and leaves the rest for the human.

- [ ] Every ticket in the milestone is merged into the release branch or explicitly moved to a later milestone (with a comment saying why).
- [ ] CI is green on the release branch (lint and typecheck against the recorded baseline, plus tests).
- [ ] The preview deployment was verified against the **dev** database, never production, covering each ticket's driver-visible behaviour on desktop and mobile.
- [ ] **Migrations (if any):** additive and backward compatible with the code currently in production; applied to a Neon branch and verified there; a production snapshot taken; then applied to production **before** the release PR is merged.
- [ ] **Production data writes (if any):** approved by a human in the related `ready-for-human` ticket, with the snapshot taken first.
- [ ] Rollback plan stated: redeploy the previous production deployment; for migrations, why the old code still works against the new schema.
- [ ] After merge, production is verified (map, `/api/health`, the parking APIs, and the release's key behaviour), recorded with the date as a comment on the release PR.

## Release-specific checks

- **R0:** a preview deployment and a pulled local env both connect to the dev database; a production restore point at least 24 hours old exists.
- **R1:** the 2026-10-05 failures are fixed in production (West End blocks not shown free; three reports don't create "Verified Free"; no "real-time regulations" claim); `pnpm audit --prod` shows no critical or high advisories in `next`, `axios`, `uuid` or `maplibre-gl`.
- **R2:** a fresh Neon branch built from migrations alone matches production's schema; running an import twice adds no rows.
- **R3:** with no approved coverage area, the API and map behave exactly as after R1 (dark launch); the evaluator test suite passes.
- **R4:** the source inventories are approved and Vancouver's permit-zone permission is recorded before production loading; the go-live ticket's spot checks pass on the live site.
- **R5:** each city's inventory is approved before its data is served.
