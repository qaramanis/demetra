# Demetra

pnpm workspace monorepo. A map dashboard for the cropland of California: crops, estimated
revenue, soil and climate for each block of 990 m, for each year. The data is real (USDA datasets) and
is in a Postgres + PostGIS database.

**Read `docs/scope.md` first.** It has the scope, the database tables, the data limits, and
the list of code to remove and to keep.

## State of the code

The first version for this scope is implemented (2026-11-15). The code of the first phase is
removed: the mock provider, the six metrics, the five crops, the UTM and EEA grids, the
rotation strategies and the tool that draws custom fields. Do not add it again.

- `apps/web` — the Next.js dashboard. Its own `AGENTS.md` applies there, not here.
  - `app/api/` — the GET Route Handlers that the browser calls: `reference`, `blocks`,
    `blocks/[id]`, `climate`, `predictions` and `predictions/[id]`.
  - `data/api.ts` and `data/queries.ts` — the requests to these routes and the TanStack Query
    hooks.
- `packages/core` — shared types and constants: the contract between the server code and the
  interface.
- `packages/db` — Drizzle ORM: the schema, the client and the query functions
  (`src/queries/`). Server code only.

## Data

- Database: Postgres 17 + PostGIS, container `demetra-db`, `127.0.0.1:5433`, database and user
  `cropland`. The password is in `/Users/apostoloskaramanis/Downloads/cdl_soil_unified/db/.env`.
- Tables: `blocks`, `block_crops`, `crops`, `counties`, `climate_cells`, `block_predictions`
  (the crop predictions of the model team), and the view `block_main_crop`.
- The data pipeline is outside this repository, in `/Users/apostoloskaramanis/Downloads/cdl_soil_unified/`.
  Do not add the pipeline scripts to this repository.

## Rules

- Keep the reusable components of the first phase. This is not a completely new start.
- Database queries use Drizzle ORM. The pipeline makes and loads the tables: make the Drizzle
  schema from the database, and do not let Drizzle change or delete the tables.
- The browser does not connect to the database. Queries run in server code.
- Do not read the database in a `useEffect` hook. Use TanStack Query or server components.
- Request blocks for the visible map area only, with a limit on the number of blocks.
- The answer of `/api/blocks` has values only. The browser calculates the square of each block
  from its id (`packages/core/src/block-grid.ts`). Do not add the shapes to the answer: it then
  exceeds the size limits of the host.
- A block has more than one crop. Do not show the main crop as the only crop of a block.
- Show the data limits in the interface (county averages, unreliable grain revenue, no revenue
  for fallow land, climate values that are estimates for cells of 10 km).
- The answer of `/api/blocks` has no climate values. The browser gets the climate cells of the
  year from `/api/climate` and finds the cell of each block (`packages/core/src/climate.ts`).
- Do not commit the database password. Use an environment file that is not committed.
- Internal packages export TypeScript source (`"exports": "./src/index.ts"`). There is no
  build step for them.
- All interface text is in `apps/web/i18n/en.json`.
- Use `pnpm`, not `npm`.
