---
trigger: always_on
---

# Database changes

Before schema changes, imports, cleanup, or rollback, read [data operations](../../docs/DATA.md). Follow [AGENTS.md](../../AGENTS.md) for scope and verification rules. Store reviewed schema changes in `sql/` before executing them; do not run historical SQL files as an automatic migration sequence.
