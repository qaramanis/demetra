# Demetra: scope

Updated on 2026-11-14. This file replaces the scope of the first phase (mock data for Greece).

## Purpose

Demetra is a map dashboard for the cropland of California. It shows, for each block of
990 m x 990 m and for each year:

- the crops in the block and their area,
- the estimated revenue of each crop,
- the soil below each crop.

The data comes from public USDA datasets. A second team trains prediction models on the same
data (for example, the crop of the next year). The dashboard will show their results later.

## Data

| Dataset | Source | Detail | Use |
|---|---|---|---|
| Cropland Data Layer (CDL) | USDA NASS | 30 m, one grid for each year | Crop class of each cell |
| gSSURGO California | USDA NRCS | 10 m soil map unit grid + tables | Soil values. The same for all years. |
| County Agricultural Commissioners' data | USDA NASS | One CSV for each year | Yield, price and value for each county and crop |
| TIGER/Line 2017 counties | US Census | Vector | County of each cell |

- **Area:** the 58 counties of California. Cropland only (43.8 million cells of 30 m, 9.75 million acres in 2017).
- **Years:** 2017 is processed and loaded. 2018 to 2022 are planned.
- **Grid:** the national CDL grid, EPSG:5070 (NAD83 / Conus Albers), origin x = -2356095, y = 3172605.
- **Units:** acres and US dollars.
- The 10 m CDL exists for 2024 and 2025 only. The project uses the 30 m grid.

## Data pipeline

The pipeline is outside this repository: `/Users/apostoloskaramanis/Downloads/cdl_soil_unified/`.
The scripts run with the conda environment `sars` (GDAL, rasterio, geopandas, pandas).

| Folder | Content |
|---|---|
| `scripts/` | The Python and shell scripts |
| `work/` | California grids (`cdl_ca.tif`, `county_ca.tif`, `mukey_ca_30m.tif`) and lookup tables. It holds one year at a time. |
| `output/` | `california_<year>_blocks_990m.csv` (loaded in the database), the 30 m cell file (13.7 GB, optional), the county + crop + soil summary |
| `db/` | `docker-compose.yml`, `Dockerfile`, `schema.sql`, `load_year.sh`, `.env` (password) |
| `model_data/` | The package for the model team: `common/` + one folder for each year + `README.md` |

Steps for a new year:

1. Cut the CDL of that year to the California window (`prep_rasters.py` does this. Its soil step is
   out of date: `mukey_mode.py` made the correct soil grid, and that grid is not made again).
2. `build_tables.py`: soil table and county revenue table. The county files of 2020, 2021 and 2022
   have different column names and layouts. The script must be adapted for them.
3. `build_blocks.py <work> <output> <year>`: the 990 m block file.
4. `db/load_year.sh <year> <block csv>`: load the year. It replaces only that year.
5. `scripts/package_year.sh <year> <county csv>`: the folder for the model team.

The original downloads are in `/Users/apostoloskaramanis/Downloads/2017 open data/`.

## Database

Postgres 17 with PostGIS 3.7, in Docker Desktop.

| Item | Value |
|---|---|
| Stack / container | `demetra` / `demetra-db` |
| Host and port | `127.0.0.1:5433` (local access only) |
| Database / user | `cropland` / `cropland` |
| Password | `POSTGRES_PASSWORD` in `/Users/apostoloskaramanis/Downloads/cdl_soil_unified/db/.env` |

### Tables

| Table | Rows | Content |
|---|---|---|
| `blocks` | 86,623 | `block_id`, `block_col`, `block_row`, center, `geom` (the square, EPSG:4326, GiST index), `center` |
| `block_crops` | 544,039 for each year | Key: `year`, `block_id`, `county_fips`, `cdl_code` |
| `crops` | 135 | `cdl_code`, `cdl_class`, `color` (official CDL color) |
| `counties` | 58 | `county_fips`, `county_name` |
| `block_main_crop` (view) | 86,623 for each year | The main crop of each block with `geom`, crop name, color, revenue and soil quality |

### `block_crops` columns

- **Area:** `cells`, `acres`, `share_of_block`, `share_of_block_cropland`, `is_block_main_crop`, `block_cropland_acres`.
- **Revenue (county data):** `econ_match` (`direct`, `group`, `double`, `none`), `main_commodity`,
  `n_commodities`, `county_harvested_acres`, `yield_per_acre`, `yield_unit`, `price_per_unit_usd`,
  `county_value_usd`, `revenue_per_acre_county_usd`, `revenue_per_acre_state_usd`, `est_revenue_usd`.
- **Soil (cells of that crop in that block):** `dominant_mukey`, `dominant_mukey_share`, `n_soil_units`,
  `soil_component`, `soil_order`, `surface_texture`, `sand_pct`, `silt_pct`, `clay_pct`,
  `organic_matter_pct`, `ph`, `ec_ds_m`, `sar`, `ksat_um_s`, `cec_meq_100g`, `slope_pct`,
  `drainage_class`, `hydrologic_group`, `flood_frequency`, `depth_to_bedrock_cm`,
  `depth_to_water_table_cm`, `aws_0_100_cm`, `root_zone_depth_cm`, `soc_0_30_g_m2`,
  `irr_capability_class`, `nonirr_capability_class`, `farmland_class`, `storie_index` (0 to 100),
  `storie_grade`, `nccpi_all` (0 to 1).

### Block model

- A block is 33 x 33 cells of 30 m. `block_id` is `<block_col>_<block_row>` on the national grid and is the same in all years.
- A block has one row for each crop in it (6 rows on average). Only 62% of the crop cells are the
  main crop of their block, so the dashboard must not show the main crop as the only crop.
- A block on a county border has rows for each county.
- A block exists only where there is cropland. Forest, cities and water have no blocks.

## Limits that the dashboard must show

- Revenue and yield are county averages. They are not values for a field.
- Grain revenue (wheat, barley, oats, triticale) is not reliable.
- Fallow land has no revenue. Revenue covers 75% of the crop cells (county) and 83% (state average).
- Crop classes come from satellite images and have errors.
- Soil maps are correct for 1 to 10 acres, not for one cell.
- There is no weather data, no water data and no cost data. Profit cannot be calculated.

## Application

The first implementation was for a different scope (mock data, Greece, vegetation health and
rotation metrics). Its data model is removed. This is not a completely new start: the reusable
components stay.

### Remove

- `packages/providers/mock` and the "Mock data" badge
- The six metrics in `packages/core/src/config/metrics.ts` and their ranking code
- The five crops in `packages/core/src/config/crops.ts`
- The UTM and EEA grids
- The rotation strategies, the months filter and the irrigation filter
- The Greece areas, the stremmata and the euros
- The tool that draws custom fields (the draw button, the drawing code, the custom fields layer
  and the `terra-draw` packages). It can come back later as an extra feature.

### Keep and adapt

- The Next.js project, the pnpm workspace and the build setup
- The map (MapLibre), the two basemaps and the place search
- The block layer with hover and selection
- The layout of the filters sidebar, the legend and the detail panel
- The TanStack Query hooks, the Zustand stores and `apps/web/i18n/en.json`

### First version (2017 data)

- **Map layers (three, decided):** main crop of each block (crop colors from `crops.color`),
  revenue per acre, soil quality (Storie index).
- **Filters:** year, crop class, county.
- **Legend:** crop colors for the crop layer, a color ramp for the number layers.
- **Detail panel:** the crops in the selected block with acres and revenue, and the soil values.
- **First view:** California, with area presets (for example Central Valley, Salinas Valley, Imperial Valley).
- **Limits:** a short note in the interface about the limits above.

### Suggestions for more layers (not decided)

Possible with the 2017 data:

- **One crop.** The share of each block that is the crop selected in the filter (for example, where the almonds are).
- **Fallow land.** The share of the cropland in each block that is fallow.
- **Estimated revenue of the block.** The sum of `est_revenue_usd`, in dollars and not per acre.
- **More soil layers.** Texture, drainage class, salinity (`ec_ds_m`), water storage (`aws_0_100_cm`), irrigated capability class, farmland class.
- **Good soil with low revenue.** Blocks with a high Storie index and a low revenue per acre.
- **Crop mix.** The number of crops in each block.
- **County totals.** One value for each county at low zoom, so that the full state is visible on one screen.

### Later (needs more years or the model team)

- Land use change and crop rotation between years
- Change by soil quality
- Predictions from the model team
- The tool that draws custom fields

### Technical points

- A browser cannot connect to Postgres. The queries run in server code of the Next.js application.
- The map requests only the blocks in the visible area (`geom && ST_MakeEnvelope(...)`), with a limit
  on the number of blocks. The full state has 86,623 blocks.
- Do not read the database in a `useEffect` hook. Use TanStack Query or server components.
- The database connection string goes in an environment file that is not committed.

### Drizzle (decided, not installed yet)

- **In the application:** Drizzle ORM for all database queries.
- **In Docker:** a Drizzle Studio container in the `demetra` stack. The user opens it at
  `https://local.drizzle.studio/`.
- **Port:** Drizzle Studio uses local port 4983 by default. The container `adrenaline-spike-studio`
  of a different project uses that port when it runs. If the two must run at the same time, use a
  different port for Demetra (for example 4984, opened as `https://local.drizzle.studio/?port=4984`).
- **Tables:** the tables exist already, and the pipeline (`schema.sql`, `load_year.sh`) makes and
  loads them. Make the Drizzle schema from the database (`drizzle-kit pull`). Do not let Drizzle
  change or delete these tables, and keep the PostGIS system tables out of its control.

## Decisions

- The reusable components of the first implementation stay. There is no completely new start.
- The first version has three map layers. More layers are open for suggestions.
- Drizzle ORM in the application and Drizzle Studio in Docker.
- The tool that draws custom fields is removed. It is a possible later feature.
- The pipeline scripts stay outside this repository.
