# Find Free Parking

A mobile-first map intended to help unfamiliar drivers find nearby places with verified rules permitting parking without payment, now or at a selected time. Paid parking is a secondary view. The service does not observe whether a space is vacant.

The current implementation does **not yet meet the verified-rules-only promise**. The [verified-rules spec](https://github.com/BinaryDevil/find-free-parking/issues/2) records the verified gaps, and its sub-issues track the remaining work.

## Start here

- [Project context and vocabulary](CONTEXT.md): intended promise and domain definitions.
- [Verified-rules decision](docs/adr/0001-verified-rules-only.md): accepted product boundary.
- [Returning and local setup](docs/RETURNING.md): environment, validation, and deployment checks.
- [Data operations](docs/DATA.md): source review, seeding, and database safety.
- [Agent instructions](AGENTS.md): development rules; `CLAUDE.md` links to the same file.

## Local development

Use pnpm with the committed lockfile:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Provide a local `.env.local` with a PostgreSQL/PostGIS connection before starting. See [setup details](docs/RETURNING.md). Open http://localhost:3000.

## Code map

| Area | Location |
| --- | --- |
| Locale and city pages | `app/[locale]/` |
| Map, classification, schedules, popups | `components/MainMap.tsx` |
| Parking and report endpoints | `app/api/` |
| Coverage checks and requests | `app/actions/` |
| Database connection and city page registry | `lib/` |
| Translation files and routing | `messages/`, `i18n/` |
| Imports and database operations | `scripts/`, `sql/` |
| Source datasets | `datasets/`, `sample_data/` |

Stack: Next.js 16, React 19, TypeScript, MapLibre, next-intl, Tailwind CSS 4, and PostgreSQL/PostGIS via `pg`. Version and command details live in `package.json`.
