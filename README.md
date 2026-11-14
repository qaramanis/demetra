# Demetra

Demetra is a map dashboard for the cropland of California. For each block of 990 m x 990 m
and for each year, it shows the crops in the block, the estimated revenue of each crop and the
soil below each crop. It is a NASA Space Apps 2026 project.

The data is real. It comes from public USDA datasets (Cropland Data Layer, gSSURGO, County
Agricultural Commissioners' data) and is in a Postgres + PostGIS database. The scope, the
database tables and the data limits are in [`docs/scope.md`](docs/scope.md).

## Run locally

You need Node.js 20.9 or later, pnpm 12 and the database.

1. Start the database. It is the container `demetra-db` of the data pipeline
   (`127.0.0.1:5433`). The pipeline is not in this repository.
2. Copy `apps/web/.env.example` to `apps/web/.env.local` and set the password in
   `DATABASE_URL`. A Neon connection string works too.
3. Install and start:

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

| Command          | Function                                                         |
| ---------------- | ---------------------------------------------------------------- |
| `pnpm dev`       | Starts the dashboard in development mode.                        |
| `pnpm build`     | Makes the production build of the dashboard.                     |
| `pnpm start`     | Starts the production build.                                     |
| `pnpm lint`      | Runs ESLint.                                                     |
| `pnpm typecheck` | Runs the TypeScript compiler on all packages.                    |
| `pnpm test`      | Runs the Vitest tests.                                           |
| `pnpm db:pull`   | Reads the table structure from the database (`drizzle-kit pull`). |
| `pnpm db:studio` | Starts Drizzle Studio on the host, on port 4984.                 |

## What the dashboard does

- **Map.** MapLibre GL JS with two basemaps: OpenFreeMap vector tiles and Esri World Imagery.
  The first view is California. You can search for a place or go to an area (Central Valley,
  Salinas Valley, Imperial Valley).
- **Blocks.** Each block is a square of 990 m (33 x 33 cells of the Cropland Data Layer). A
  block exists only where there is cropland. Move the pointer above a block to see its value.
  Click a block to select it.
- **Map layers.** The layer gives the blocks their color:
  - *Main crop*: the crop class with the largest area, in the official color of the Cropland
    Data Layer.
  - *Revenue per acre*: the estimated revenue of the crops, in US dollars for each acre.
  - *Soil quality*: the California Revised Storie index (0 to 100).
- **Filters.** The year, the crop class and the county. With a crop filter, the values of a
  block are the values of that crop in the block.
- **Legend.** The largest crops in the view for the crop layer. A color ramp for the number
  layers.
- **Detail panel.** All crops of the selected block with acres, share and revenue, the county
  data of a crop (commodity, yield, price) and the soil values below that crop.

## Data limits

The dashboard shows these limits in the interface:

- Revenue and yield are county averages. They are not values for a field.
- Grain revenue (wheat, barley, oats, triticale) is not reliable.
- Fallow land has no revenue, and some crops have no county revenue data.
- Crop classes come from satellite images and can be incorrect.
- Soil maps are correct for areas of 1 to 10 acres, not for one cell.
- There is no weather, water or cost data. Profit cannot be calculated.

## Repository

This is a pnpm workspace.

```
apps/web                  The Next.js dashboard
  app/                    Layout, page and global styles
  app/api/                The GET routes that the browser calls
  components/             Interface components (map, filters, legend, detail panel)
  config/                 Basemaps, areas and color ramps
  data/api.ts             The requests to the GET routes
  data/queries.ts         TanStack Query hooks
  i18n/en.json            All interface text
  store/                  Zustand stores (interface state)
packages/core             Shared types and constants, with no interface code
packages/db               Drizzle ORM: the table definitions, the client and the queries
docs/scope.md             The scope, the database tables and the data limits
```

Internal packages export TypeScript source. There is no build step for them.

## Data flow

The browser does not connect to the database. The queries run in server code.

```
component → TanStack Query hook → GET route → query function → Drizzle → Postgres + PostGIS
            apps/web/data          apps/web/app/api   packages/db/src/queries
```

| Route                                                           | Answer                                                                  |
| --------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `GET /api/reference`                                            | The years, the crop classes and the counties for the filters.          |
| `GET /api/blocks?bbox=w,s,e,n&year=2017[&crop=75][&county=06019]` | The blocks of a map area as GeoJSON, with one summary for each block.   |
| `GET /api/blocks/<id>?year=2017`                                | All crops of one block with revenue and soil values.                   |

- The map requests only the blocks of the visible area. One answer has a maximum of
  100,000 blocks (`MAX_BLOCKS`). California has 86,623 blocks.
- A block has more than one crop. The summary of a block is calculated from all its crops
  that agree with the filters. The main crop is only the color of the block in the crop
  layer.
- The routes are GET Route Handlers and not Server Functions (`"use server"`): Next.js runs
  Server Functions one at a time and recommends Route Handlers for data that a client
  library reads.

## Database and Drizzle

The data pipeline makes and loads the tables (`blocks`, `block_crops`, `crops`, `counties`
and the view `block_main_crop`). Drizzle only reads them.

- `packages/db/src/schema.ts` comes from `drizzle-kit pull`. After a change of the tables,
  run `pnpm db:pull` and copy the changes from `packages/db/pulled/schema.ts`.
- Do not add `drizzle-kit generate`, `migrate` or `push`: they change the tables.
- Drizzle can decode only PostGIS points. A query does not select `blocks.geom` directly: it
  uses `ST_AsGeoJSON(geom)`.
- Drizzle Studio for the local database is the container `demetra-studio` of the pipeline
  stack. Open `https://local.drizzle.studio/`.
- `pnpm db:studio` starts Drizzle Studio on the host with the database of
  `apps/web/.env.local` (for example Neon). Open `https://local.drizzle.studio/?port=4984`.

## Map services

- [OpenFreeMap](https://openfreemap.org) vector tiles. Data © OpenStreetMap contributors.
- Esri World Imagery raster tiles. Imagery © Esri, Maxar, Earthstar Geographics, and the GIS
  User Community.
- [Nominatim](https://nominatim.org) place search. Its usage policy permits a maximum of one
  request each second and does not permit search while the user types. Thus the search starts
  when the user presses Enter.

## Not in this version

More years (2018 to 2022 are planned), land use change and crop rotation between years,
predictions from the model team, the tool that draws custom fields, user accounts and a Greek
interface. All interface text is in `apps/web/i18n/en.json`, so a second language needs a
second JSON file and no change in the components.
