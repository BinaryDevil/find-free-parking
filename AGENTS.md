# Project instructions

## Goal and trust boundary

Help unfamiliar drivers find nearby places with Verified Free Parking Rules for now or a selected time; paid parking is a secondary view. Keep the map fast, clear, mobile-friendly, and explicit about costs and conditions. The map displays rules; authoritative evidence establishes them. The service does not observe vacancy.

- Recommend free parking only from current authoritative rules with precise location, schedule, and applicable vehicle conditions. Missing meters, generic road types, OSM tags, or absent payment data do not establish permission.
- Treat Driver Reports as advisory Driver Warnings, never authoritative verification. A city polygon or page registry entry does not establish Coverage.
- Current code does not fully meet this promise. Do not describe intended behavior as implemented, or existing heuristics as approved policy.

## Context to read

- Source discovery must follow [ADR-0004: No external outreach](docs/adr/0004-no-external-outreach.md). Use available evidence; do not send or prepare requests to officials, governments or service providers, or ask for authorization to do so.

- Before product or classification work, read `GLOSSARY.md`, `docs/adr/0001-verified-rules-only.md`, and the verified-rules spec (https://github.com/BinaryDevil/find-free-parking/issues/2) with its open sub-issues.
- Before local setup, validation, or release work, read `docs/RETURNING.md`.
- To add, seed, or expand a city, read [ADR-0002: Evidence Source Policy](docs/adr/0002-evidence-source-policy.md) and use the `cover-city` skill. Before seeding, schema changes, cleanup, or rollback, read `docs/DATA.md` and inspect the target script. Preserve database data; a code change does not authorize production data writes. Only a merged release PR authorizes the production actions it lists ([ADR-0005](docs/adr/0005-agent-verified-gates.md)). Record schema changes in `sql/` before execution.
- For UI text, use next-intl and update matching keys across the eight locales. Inspect `scripts/generate_locales.ts` before using it; keep its corresponding keys consistent and review the generated diff for unrelated rewrites.

## Working rules

- Inspect current source, Git status, and relevant scripts before editing. Preserve unrelated user work and existing style.
- Scope each implementation to the requested outcome. Record status and backlog changes on the relevant GitHub issue, keeping the glossary separate from operational history.
- Match validation to the change. For bug fixes, reproduce the failure and verify the public behavior. Record existing lint/typecheck failures separately; docs-only work needs link, consistency, symlink, and diff checks.
- Distinguish source implementation, local validation, deployment, and production verification. A push or successful seed does not prove live correctness.
- Keep credentials, database URLs, IP addresses, and precise driver locations out of committed context and routine logs. Preserve existing popup escaping, parameterized SQL, and report validation when changing those paths.
- `AGENTS.md` is the instruction source of truth; `CLAUDE.md` must remain a relative symlink to it.

# Behavioral guidelines

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## Agent skills

### Issue tracker

Issues and specs live in GitHub Issues for BinaryDevil/find-free-parking, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default label vocabulary: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: the glossary is the "Language" section of `GLOSSARY.md`, and ADRs live in `docs/adr/`. See `docs/agents/domain.md`.

### Release gates

Work ships in milestone releases R0–R5 through release PRs from `dev` into `main` that only a human merges. Agents verify their own work, merge ticket PRs into `dev` after an independent review agent passes them, and approve sources by two-agent review ([ADR-0005](docs/adr/0005-agent-verified-gates.md)). Pick tickets from the current milestone and follow `docs/agents/release-gates.md`.
