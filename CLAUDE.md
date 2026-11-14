# Demetra

pnpm workspace monorepo. A map dashboard for crop-rotation risk, cost and yield, and the
computing code behind it.

- `apps/web` — the Next.js dashboard. Its own `AGENTS.md` applies there, not here.
- `packages/core` — crop config, metric definitions, grids, the `FieldDataProvider`
  interface and the types that the dashboard and the providers share.
- `packages/providers/{id}` — one package per data provider. `mock` is the only one now.

## Rules

- The dashboard reads field data only through `FieldDataProvider`. Adding a provider must
  not need a change in the dashboard other than the import in `apps/web/data/provider.ts`.
- Provider packages do not import React or Next.js. They return plain data.
- A provider must return each metric inside its range in `packages/core/src/config/metrics.ts`.
- Internal packages export TypeScript source (`"exports": "./src/index.ts"`). There is no
  build step for them.
- All interface text is in `apps/web/i18n/en.json`.
- Use `pnpm`, not `npm`.
