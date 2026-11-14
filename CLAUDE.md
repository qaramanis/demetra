# Demetra

pnpm workspace monorepo. A map dashboard for the cropland of California: crops, estimated
revenue and soil for each block of 990 m, for each year. The data is real (USDA datasets) and
is in a Postgres + PostGIS database.

**Read `docs/scope.md` first.** It has the scope, the database tables, the data limits, and
the list of code to remove and to keep.

## State of the code

The code in this repository is from the first phase (mock data for Greece, a different scope).
Its data model is being replaced. Do not extend the mock provider, the six metrics, the five
crops, the UTM and EEA grids, the rotation strategies or the tool that draws custom fields.

- `apps/web` — the Next.js dashboard. Its own `AGENTS.md` applies there, not here.
- `packages/core` — shared types and config. The old domain code here is to be replaced.
- `packages/providers/mock` — the old mock provider. To be removed.

## Data

- Database: Postgres 17 + PostGIS, container `demetra-db`, `127.0.0.1:5433`, database and user
  `cropland`. The password is in `/Users/apostoloskaramanis/Downloads/cdl_soil_unified/db/.env`.
- Tables: `blocks`, `block_crops`, `crops`, `counties`, and the view `block_main_crop`.
- The data pipeline is outside this repository, in `/Users/apostoloskaramanis/Downloads/cdl_soil_unified/`.
  Do not add the pipeline scripts to this repository.

## Rules

- Keep the reusable components of the first phase. This is not a completely new start.
- Database queries use Drizzle ORM. The pipeline makes and loads the tables: make the Drizzle
  schema from the database, and do not let Drizzle change or delete the tables.
- The browser does not connect to the database. Queries run in server code.
- Do not read the database in a `useEffect` hook. Use TanStack Query or server components.
- Request blocks for the visible map area only, with a limit on the number of blocks.
- A block has more than one crop. Do not show the main crop as the only crop of a block.
- Show the data limits in the interface (county averages, unreliable grain revenue, no revenue
  for fallow land).
- Do not commit the database password. Use an environment file that is not committed.
- Internal packages export TypeScript source (`"exports": "./src/index.ts"`). There is no
  build step for them.
- All interface text is in `apps/web/i18n/en.json`.
- Use `pnpm`, not `npm`.
