# Demetra

> **Scope change (2026-11-14).** Demetra now shows real data for the cropland of California:
> crops, estimated revenue and soil for each block of 990 m. The new scope is in
> [`docs/scope.md`](docs/scope.md). The text below describes the first phase (mock data for
> Greece). It will be written again with the new implementation.

Demetra is a map dashboard that shows crop-rotation risk, cost and yield for each
agricultural block. It is a NASA Space Apps 2026 project. The demo area is the Thessaly plain
and Central Macedonia, Greece.

This phase is the frontend with generated (mock) data. No real dataset is connected.

## Run locally

You need Node.js 20.9 or later and pnpm 12.

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

| Command          | Function                                         |
| ---------------- | ------------------------------------------------ |
| `pnpm dev`       | Starts the dashboard in development mode.        |
| `pnpm build`     | Makes the production build of the dashboard.     |
| `pnpm start`     | Starts the production build.                     |
| `pnpm lint`      | Runs ESLint.                                     |
| `pnpm typecheck` | Runs the TypeScript compiler on all packages.    |
| `pnpm test`      | Runs the Vitest tests (grids and mock provider). |

No API key and no environment variable are necessary.

## What the dashboard does

- **Map.** MapLibre GL JS with two basemaps: OpenFreeMap vector tiles and Esri World Imagery.
  The first view is Larissa. You can search for a place or go to a demo area.
- **Blocks.** The land is divided into square cells of a grid. Each block has a colour from
  the active metric. Move the pointer above a block to see its value. Click a block to select it.
- **Custom fields.** "Draw a field" lets you draw a polygon. You select a custom field in the
  same way as a block.
- **Filters.** The metric on the map, the crop, the growing season (year and months), the
  water supply (irrigated or rainfed), the grid and the cell size.
- **Legend.** Class colours for the vegetation health score. A continuous colour ramp with
  the minimum and the maximum for the other metrics.
- **Detail panel.** Area in stremmata and hectares (1 stremma = 0.1 ha), centre coordinates,
  one card for each metric, and three rotation strategies of three years. You can find the
  best strategy by profit or by yield.

## Repository

This is a pnpm workspace.

```
apps/web                  The Next.js dashboard
  app/                    Layout, page and global styles
  components/             Interface components (map, filters, legend, detail panel)
  config/                 Basemaps, demo areas, palettes, seasons
  data/provider.ts        The one file that selects the data provider
  data/queries.ts         TanStack Query hooks
  i18n/en.json            All interface text
  store/                  Zustand stores (interface state)
packages/core             Shared domain code, with no interface code
  src/config/crops.ts     Static crop parameters
  src/config/metrics.ts   Metric definitions and ranges
  src/grid/               The grids
  src/provider.ts         The FieldDataProvider interface
packages/providers/mock   The mock data provider
```

Code that calculates values from real datasets goes into a new package in `packages/`.

## Data layer

The dashboard reads field data only through the `FieldDataProvider` interface in
`packages/core/src/provider.ts`:

```ts
interface FieldDataProvider {
  readonly meta: ProviderMeta;
  getBlocks(query: BlocksQuery): Promise<BlockFeatureCollection>;
  getBlockMetrics(block: Block, filters: Filters): Promise<BlockMetrics>;
  getRotationStrategies(block: Block, filters: Filters): Promise<RotationStrategy[]>;
}
```

A block is a GeoJSON polygon in WGS84 with an id. This is the same for a grid cell and for a
custom field, so a provider can use the geometry directly to read a raster or a vector
dataset.

To add a real provider:

1. Make a package in `packages/providers/<name>` that implements `FieldDataProvider`.
2. Return each metric inside its range in `packages/core/src/config/metrics.ts`.
3. Change the import in `apps/web/data/provider.ts`.

The dashboard needs no other change. The "Mock data" badge on the map goes away when
`meta.kind` is `live`.

## Grids

| Grid          | Coordinate system    | Area   | Cells agree with the pixels of |
| ------------- | -------------------- | ------ | ------------------------------ |
| Global grid   | UTM zones (WGS84)    | World  | Sentinel-2 rasters             |
| EEA reference | ETRS89-LAEA (3035)   | Europe | Copernicus HRL 10 m rasters    |

Each grid has cells of 1 km, 100 m and 10 m. A larger cell contains 10 × 10 smaller cells.
A cell id is stable: the same cell has the same id in each request. The EEA grid uses the
EEA cell codes, for example `1kmE5387N1926` in Larissa.

To add a grid for a different raster dataset, use `createProjectedGrid` in
`packages/core/src/grid/` with the coordinate system of the raster, a corner of one pixel
and the cell sizes. Then add the grid to `GRIDS` in `packages/core/src/grid/index.ts`.

## Mock data

`MockFieldDataProvider` generates its values. The same block and the same filters always
give the same values. A value comes from two parts: a smooth field at the position of the
block (adjacent blocks are similar) and a small difference from the id of the block.

| Metric                  | Range        | The value changes with                    |
| ----------------------- | ------------ | ----------------------------------------- |
| Vegetation health (FHS) | 0 to 100     | crop, water supply, year, months          |
| Crop water deficit (WD) | 0 to 600 mm  | crop, water supply, year, months          |
| Erosion risk (ERI)      | 0 to 1       | crop, year                                |
| Profit margin           | −100 to 100 % | crop, water supply, year, months          |
| Resilience              | 0 to 100 %   | crop, water supply, year, months          |
| Confidence              | 0 to 100 %   | months                                    |

FHS classes: A is 75 or more, B is 50 to 74, C is 49 or less.

The model is in `packages/providers/mock/src/model.ts`. It uses the crop parameters in
`crops.ts`. The other numbers in the model are placeholders, not agronomic results.

## Map services

- [OpenFreeMap](https://openfreemap.org) vector tiles. Data © OpenStreetMap contributors.
- Esri World Imagery raster tiles. Imagery © Esri, Maxar, Earthstar Geographics, and the GIS
  User Community.
- [Nominatim](https://nominatim.org) place search. Its usage policy permits a maximum of one
  request each second and does not permit search while the user types. Thus the search starts
  when the user presses Enter.

## Not in this phase

Real data, the calculation engine, machine learning, user accounts, persistence and a Greek
interface. All interface text is in `apps/web/i18n/en.json`, so a second language needs a
second JSON file and no change in the components.
