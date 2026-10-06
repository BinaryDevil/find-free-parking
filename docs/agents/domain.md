# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`GLOSSARY.md`** at the repo root: its **Language** section is this repo's glossary (Parking Rule, Free Parking Rule, Verified Free Parking Rule, Available Space, Coverage, Driver Report, Driver Warning).
- **`docs/adr/`**: read ADRs that touch the area you're about to work in. ADR-0001 (verified rules only) governs all classification and data work.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved; new terms belong in the `GLOSSARY.md` Language section.

## File structure

Single-context repo:

```
/
├── GLOSSARY.md         ← Language section = glossary
├── docs/adr/
│   └── 0001-verified-rules-only.md
├── app/
├── components/
└── lib/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in the `GLOSSARY.md` Language section. Don't drift to synonyms the glossary explicitly avoids (e.g. "free spot", "parking status", "supported city", "verified data").

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0001 (verified rules only), but worth reopening because…_
