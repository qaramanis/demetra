# Demetra: scope

Updated on 2026-11-15. This file replaces the scope of the first phase (mock data for Greece).

## Purpose

Demetra is a map dashboard for the cropland of California. It shows, for each block of
990 m x 990 m and for each year:

- the crops in the block and their area,
- the estimated revenue of each crop,
- the soil below each crop,
- the climate of the year (estimates for cells of approximately 10 km).

The data comes from public USDA datasets. A second team trains prediction models on the same
data (for example, the crop of the next year). The dashboard will show their results later.

## Data

| Dataset | Source | Detail | Use |
|---|---|---|---|
| Cropland Data Layer (CDL) | USDA NASS | 30 m, one grid for each year | Crop class of each cell |
| gSSURGO California | USDA NRCS | 10 m soil map unit grid + tables | Soil values. The same for all years. |
| County Agricultural Commissioners' data | USDA NASS | One CSV for each year | Yield, price and value for each county and crop |
| TIGER/Line 2017 counties | US Census | Vector | County of each cell |
| NASA POWER daily data | NASA LaRC | Source cells of 0.5 x 0.625 degrees (approximately 50 km), 2016 to 2022 | Climate metrics of each year |

- **Area:** the 58 counties of California. Cropland only: 43.4 to 45.3 million cells of 30 m in a
  year (9.7 to 10.1 million acres).
- **Years:** 2017 to 2022 are processed, checked, and loaded in the local database and in Neon
  (2026-11-15).
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
| `output/` | `california_<year>_blocks_990m.csv` (loaded in the database), the 30 m cell file (13.7 GB, optional, kept for 2017 only), the county + crop + soil summary |
| `db/` | `docker-compose.yml`, `Dockerfile`, `schema.sql`, `load_year.sh`, `load_climate.sh`, `load_predictions.sh`, `.env` (password) |
| `predictions/` | The prediction files of the model team (`02_inference_2023_by_block.xlsx`) and the converted files that `load_predictions.sh` loads (`california_2023_predictions.csv`) |
| `model_data/` | The package for the model team: `common/` + one folder for each year + `README.md` + the analysis file |
| `nasa_power_daily/` | The daily NASA POWER data. For the analysis file: `raw_cells/` (cache, one file for each 0.5 degree point) and `climate_cell_year.csv`. For the map: `raw_merra/` (cache, one file for each source cell) and `climate_cell10_year.csv` (the table `climate_cells`). |

Steps for a new year:

1. County file. The scripts read the layout of the 2017 to 2019 files. The 2020 file has three
   different column names and some new spellings of crop names. The 2021 and 2022 files have a new
   layout with group rows. `convert_county_file.py <new layout csv> <out csv>` writes the old layout
   for 2021 and 2022. In all three years the old crop name comes from the commodity code
   (`scripts/county_commodity_names.csv`), so the crosswalk in `build_tables.py` does not change.
   The 2021 and 2022 files give the acres and the value of some crops in different rows of one
   group (strawberries in four counties, wine grapes in Mendocino). The converter makes one row
   from these rows, because `build_tables.py` uses a row only when it has acres and a value.
2. `prep_rasters.py <cdl.tif> <gSSURGO.gdb> <county zip> <work>`: cut the CDL of that year to the
   California window. It keeps `mukey_ca_30m.tif` if the file is in the work folder (copy it from
   `model_data/common/soil_mukey_30m.tif`) and then does not open the soil database.
3. `build_tables.py <gSSURGO.gdb> <county csv> <cdl.tif> <work> <output>`: county revenue table. It
   keeps `soil_by_mukey.csv` if the file is in the work folder (copy it from `model_data/common/`)
   and then does not open the soil database. A crop name that is not in the county file of a year
   gives no rows.
4. `build_blocks.py <work> <output> <year>`: the 990 m block file.
5. `build_cells.py <work> <output> <year>`: the county + crop + soil summary, which step 7 and
   `check_blocks.py` use. It also writes the 30 m cell file (14 GB). Delete the cell file after the
   checks.
6. `check_blocks.py` and `check_output.py`: the checks. Then `db/load_year.sh <year> <block csv>`
   loads the local database, and `db/load_year.sh <year> <block csv> neon` loads Neon. A load
   replaces only that year. Do not run two loads of one database at the same time: they use the
   same table `stage_blocks`.
7. `scripts/package_year.sh <year> <county csv>`: the folder for the model team. It reads `work/`.
8. `build_training_csv.py --all-years <nasa_dir> <out csv> <block csv of each year>`: the analysis
   file for the model team (`model_data/california_blocks_crop_climate_2017_2022.csv`): one row for
   each block and year, with the majority crop (more than 30% of the block), 18 climate metrics from
   NASA POWER (cache in `nasa_power_daily/`) and 7 soil columns. With `--all-years` the file has
   only the blocks that have data in each year (76,772 blocks, 460,632 rows): this is the file that
   the model team gets. Without the option, it has all the blocks, with `crop_type` NULL for a year
   with no data. Put the new file in `/Users/apostoloskaramanis/Desktop/Demetra datasets/` and
   update the README there.
9. `build_climate_grid.py <nasa_dir> <out csv> <block csv of each year>`: the climate table of the
   map (`nasa_power_daily/climate_cell10_year.csv`), one row for each year and cell of 0.1 degrees.
   Run it after step 8, because it uses the cache `raw_cells/` and the formulas of
   `build_training_csv.py`. Then `db/load_climate.sh <csv>` loads the local database and
   `db/load_climate.sh <csv> neon` loads Neon. A load replaces all the rows of `climate_cells`.
   For a new year, first change `END` and `YEARS` in `build_training_csv.py`. See "Climate cells".

Predictions of the model team (see "Predictions (2026-11-15)"):

1. Put the Excel file of the model team in `predictions/`.
2. `scripts/convert_inference_xlsx.py <xlsx> predictions/california_<year>_predictions.csv`: convert
   the sheet `Predictions_<year>` to CSV (crop names, status, scores).
3. `db/load_predictions.sh <csv>` loads the local database, and `db/load_predictions.sh <csv> neon`
   loads Neon. A load replaces only the years of the file. The constraints of the table stop a
   load with an unknown crop name, an unknown block or an unknown status.

`scripts/mock_prediction_csv.py` wrote the mock file of the time before the model file. It is not
used now.

Two years can run at the same time only with different work and output folders (for example
`work_2022/` and `output_2022/`): each script gets these folders as arguments.

The original downloads of 2017, 2018 and 2019 and the soil database `gSSURGO_CA.gdb` were deleted on
2026-11-15. The soil grid and the soil table are in `model_data/common/`. Without the soil
database, `check_output.py` does not do its two soil checks, and a new soil column needs a new
download. Steps 3 and 6 need the national CDL file of the year.

## Database

Postgres 17 with PostGIS 3.7, in Docker Desktop.

| Item | Value |
|---|---|
| Stack / container | `demetra` / `demetra-db` |
| Host and port | `127.0.0.1:5433` (local access only) |
| Database / user | `cropland` / `cropland` |
| Password | `POSTGRES_PASSWORD` in `/Users/apostoloskaramanis/Downloads/cdl_soil_unified/db/.env` |
| Drizzle Studio | container `demetra-studio` in the same stack, `127.0.0.1:4983` |

### Copy in Neon

A copy of the data of 2017 to 2022 is in a Neon database: the same five tables, the same rows, the
same indexes and the view.

| Item | Value |
|---|---|
| Project / branch / database | `demetra` / `production` / `neondb` |
| Version | PostgreSQL 18 with PostGIS 3.6 |
| Plan | Launch (pay for use). One year is approximately 300 MB. |
| Connection string | `NEON_DATABASE_URL` in `/Users/apostoloskaramanis/Downloads/cdl_soil_unified/db/.env.neon` |

- Neon has the years 2017 to 2022 (2.2 GB). Its rows are equal to the local database (row counts
  and checksums, 2026-11-15). This includes the table `climate_cells`.
- Neon has the table `block_predictions` (2023, loaded on 2026-11-15). Its rows are equal to the
  local database (checksum). The map query of the full state takes 0.26 s on Neon. Without this
  table, `/api/reference` fails: load a new database before the application code uses it.
- The local database uses the collation `en_US.utf8` and Neon uses `C.UTF-8`. For a checksum of
  rows in a sorted order, sort with `COLLATE "C"`, so that the two databases use the same order.
- `db/load_year.sh <year> <block csv> neon`, `db/load_climate.sh <csv> neon` and
  `db/load_predictions.sh <csv> neon` load Neon. They read the environment variable
  `NEON_DATABASE_URL`, or `db/.env.neon` if the variable is not set. Use the direct connection
  string, not the pooled one.
- The password in `db/.env.neon` is out of date (2026-11-15): the role password was reset. The
  current connection string (pooled) is `DATABASE_URL` in `apps/web/.env.vercel`. For a load,
  remove `-pooler` from its host name and give the result to the script in `NEON_DATABASE_URL`.
- To use Neon in the application, put the connection string in `DATABASE_URL` in
  `apps/web/.env.local`. It works with no other change.

### Tables

| Table | Rows | Content |
|---|---|---|
| `blocks` | 156,163 (2017 to 2022) | `block_id`, `block_col`, `block_row`, center, `geom` (the square, EPSG:4326, GiST index), `center` |
| `block_crops` | See the table below | Key: `year`, `block_id`, `county_fips`, `cdl_code` |
| `crops` | 135 | `cdl_code`, `cdl_class`, `color` (official CDL color) |
| `counties` | 58 | `county_fips`, `county_name` |
| `climate_cells` | 28,884 (4,814 cells x 6 years) | Key: `year`, `cell_lat`, `cell_lon`. The climate metrics of the year for a cell of 0.1 degrees. See "Climate cells". |
| `block_predictions` | 76,772 (2023), local and Neon | Key: `year`, `block_id`. The predicted crop of the model team, its score and the next two crops. See "Predictions". |
| `block_main_crop` (view) | One row for each block of a year | The main crop of each block with `geom`, crop name, color, revenue and soil quality |

| Year | `block_crops` rows | Blocks | Crop cells | In the databases |
|---|---|---|---|---|
| 2017 | 544,039 | 86,623 | 43,837,440 | Local and Neon |
| 2018 | 678,160 | 109,490 | 45,250,544 | Local and Neon |
| 2019 | 791,606 | 107,257 | 43,959,989 | Local and Neon |
| 2020 | 785,495 | 115,070 | 43,953,919 | Local and Neon |
| 2021 | 800,596 | 115,355 | 43,422,256 | Local and Neon |
| 2022 | 960,363 | 135,573 | 44,481,049 | Local and Neon |

A block is in `blocks` if it has cropland in one year or more. The six years together have 156,163
blocks, and 76,772 blocks have cropland in each of the six years. Many blocks have very little
cropland: in 2022, 24,040 blocks have 1 crop cell and 44,645
blocks have fewer than 5. The blocks with fewer than 5 crop cells have less than 0.2% of the crop
cells of a year.

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

### Climate cells

- **Source.** NASA POWER has no values for cells of 10 km. Its source for these parameters
  (MERRA-2) has cells of 0.5 degrees of latitude x 0.625 degrees of longitude, approximately
  55 km x 55 km in California. A request for a point gives the values of the source cell that
  contains the point (tested: three points in one source cell gave the same daily values).
- **Estimates.** `build_climate_grid.py` puts the daily values of each source cell at the center of
  that cell. The daily values of a cell of 0.1 degrees are the bilinear interpolation of the four
  source cells around its center. The metrics of the year come from these daily values, with the
  formulas of `build_training_csv.py`. The values are smooth between the source cells. They do not
  show the effect of mountains, valleys or the coast inside a source cell.
- **Cells.** The center of a cell is at a multiple of 0.1 degrees (approximately 11 km x 9 km). The
  cell of a block is `cell_lat = floor(lat_center * 10 + 0.5) / 10`, and the same for `cell_lon`. The
  pipeline, the database queries and the browser (`climateCellIndex` in
  `packages/core/src/climate.ts`) use this formula: do not change it in one place only. The table has
  the 3,960 cells that contain a block center and the cells around them (`has_block` = false).
  Each block of each year has a cell.
- **Columns.** `has_block`, then the 18 metrics of the analysis file: `t_mean`, `tmax_summer_mean`,
  `tmin_winter_mean`, `frost_days`, `heat_days`, `gdd10`, `rain_year_mm`, `rain_wateryear_mm`,
  `rain_summer_mm`, `et0_gs_mm`, `water_balance_gs_mm`, `soilwet_root_mean`, `soilwet_root_summer`,
  `n_days`, `rain_wateryear_mm_mean6y`, `heat_days_mean6y`, `t_mean_mean6y`, `rain_anomaly_pct`.
  The map uses four: `t_mean`, `heat_days`, `rain_wateryear_mm` and `rain_anomaly_pct`.
- **Checks (2026-11-15).** A cell at the center of a source cell has the values of that source cell.
  No value is outside the range of the source values. The difference between neighbour cells is
  5 times smaller than between the 0.5 degree points.
- **The analysis file is different.** It has the value of the 0.5 degree point of each block, with
  no interpolation (the method of the model team script). A block thus has different climate
  values in the analysis file and on the map.

### Block model

- A block is 33 x 33 cells of 30 m. `block_id` is `<block_col>_<block_row>` on the national grid and is the same in all years.
- A block has one row for each crop in it (6 rows on average). Only 62% of the crop cells are the
  main crop of their block, so the dashboard must not show the main crop as the only crop.
- A block on a county border has rows for each county.
- A block exists only where there is cropland. Forest, cities and water have no blocks.

## Limits that the dashboard must show

- Revenue and yield are county averages. They are not values for a field.
- Grain revenue (wheat, barley, oats, triticale) is not reliable.
- Fallow land has no revenue. County revenue covers 74% to 82% of the crop cells of a year, and the
  state average covers 80% to 91%.
- The county files of 2020 to 2022 have gaps. Four to six counties are not in them (Lassen is the
  largest), so their crop cells have no county revenue. In 2021 and 2022, wheat in Sacramento, San
  Joaquin and Yolo has no county revenue: these counties give their wheat in an item that the
  crosswalk does not use.
- Crop classes come from satellite images and have errors. Some differences between years are
  classification changes and not real changes: avocados have 0 cells in 2017 and 270,507 in 2018.
- Soil maps are correct for 1 to 10 acres, not for one cell.
- The climate values are estimates for cells of approximately 10 km, interpolated from source cells
  of approximately 50 km. They are not measured values for a block or a field.
- There is no water data and no cost data. Profit cannot be calculated.

## Application

The first implementation was for a different scope (mock data, Greece, vegetation health and
rotation metrics). Its data model is removed. This is not a completely new start: the reusable
components stay.

### Removed (2026-11-15)

- `packages/providers/mock` and the "Mock data" badge
- The six metrics in `packages/core/src/config/metrics.ts` and their ranking code
- The five crops in `packages/core/src/config/crops.ts`
- The UTM and EEA grids
- The rotation strategies, the months filter and the irrigation filter
- The Greece areas, the stremmata and the euros
- The tool that draws custom fields (the draw button, the drawing code, the custom fields layer
  and the `terra-draw` packages). It can come back later as an extra feature.

### Kept and adapted

- The Next.js project, the pnpm workspace and the build setup
- The map (MapLibre), the two basemaps and the place search
- The block layer with hover and selection
- The layout of the filters sidebar, the legend and the detail panel
- The TanStack Query hooks, the Zustand stores and `apps/web/i18n/en.json`

### First version (2017 data, implemented on 2026-11-15)

- **Map layers (three, decided):** main crop of each block (crop colors from `crops.color`),
  revenue per acre, soil quality (Storie index).
- **Filters:** year, crop class, county.
- **Legend:** crop colors for the crop layer, a color ramp for the number layers.
- **Detail panel:** the crops in the selected block with acres and revenue, and the soil values.
- **First view:** California, with area presets (for example Central Valley, Salinas Valley, Imperial Valley).
- **Limits:** a short note in the interface about the limits above.

### Climate layer (2026-11-15)

- **Map layers:** main crop, climate, soil quality (`MAP_LAYER_IDS` in `packages/core/src/layers.ts`).
  The revenue layer is removed from the map. The revenue stays in the detail panel, and the value
  `revenue` stays in the answer of `/api/blocks`, so the layer can come back.
- **Metrics:** the climate layer shows one of four metrics, which the user selects in the list
  below the layer (`CLIMATE_METRIC_IDS` in `packages/core/src/climate.ts`).

  | Metric | Database column | Colors | Range of the colors |
  |---|---|---|---|
  | Mean temperature | `t_mean` | Light peach to dark red | 12 to 20 °C (1 °C for each color; lower and higher values get the end colors) |
  | Heat days (maximum of 35 °C or more) | `heat_days` | Light pink to dark purple | 0 to 120 days |
  | Rain (October of the year before to September) | `rain_wateryear_mm` | Light blue to dark blue | 100 to 900 mm (100 mm for each color; lower and higher values get the end colors) |
  | Rain anomaly (rain compared with the mean of all the years) | `rain_anomaly_pct` | Dark brown, light grey at 0 %, dark blue | -80 to +80 % |

- **Scales:** a scale (`NUMBER_SCALES`) shows one number of each block with a color ramp. The soil
  layer has one scale and each climate metric has one. The ranges are fixed for all the years, so
  the colors of two years can be compared. The ramps are in `apps/web/config/palettes.ts`: 9 colors
  with equal steps of lightness (OKLCH), checked for protanopia and deuteranopia.
- **Legend, tooltip and detail panel:** the legend shows the ramp of the metric, the values of its
  ends and the note "Estimates for cells of 10 km". The tooltip shows the value of the block. The
  detail panel has a section with the four values of the year and a note about the estimates.
- **Data path:** `/api/climate?year=<year>` gives all the climate cells of a year (4,814 rows,
  154 kB, 48 kB with gzip). The browser requests it one time for each year, together with the
  blocks, and `blockFeatures` gives each block the values of its cell. `/api/blocks/<id>` gives the
  climate of one block from the database. For all the 156,163 blocks, the browser and the database
  give the same cell and the same values.

### Predictions (2026-11-15)

The model team predicts the `crop_type` of each block for the year after the newest year (2023).
The prediction is calculated before. The pipeline loads it into the table `block_predictions`, and
the application only reads it.

- **Table:** `block_predictions` (`db/schema.sql` of the pipeline; `blockPredictions` in
  `packages/db/src/schema.ts`). Key `year`, `block_id`. `status` (PREDICTED or
  INSUFFICIENT_CROP_HISTORY), `cdl_code` (NULL = no prediction; 61 = fallow), `score`, and the
  next crops `cdl_code_2`, `score_2`, `cdl_code_3`, `score_3`. Scores are `real`, from 0 to 1.
  Load steps: see "Data pipeline". Until 2026-11-15 the prediction was a CSV file in the
  application (`apps/web/predictions/`). The database replaced it: the file needed the database
  for the crop codes and the counties, a new prediction needed a deployment, and the database
  checks the data when it loads it.
- **Data of 2023:** the inference file of the model team, `02_inference_2023_by_block.xlsx`
  (model ExtraTrees, no ground truth for 2023), converted with `convert_inference_xlsx.py`.
  76,772 blocks, the blocks of the analysis file. 33,418 blocks have a prediction with a model
  score (median 0.89) and two next crops. 43,354 blocks (56%) have no prediction (status
  INSUFFICIENT_CROP_HISTORY): exactly the blocks with `undefined` in one or more of the years
  2020 to 2022. The crops of 2020 to 2022 in the file agree with the analysis file for all blocks.
- **Flow:** when the map shows the newest year (2022), a "Predict next year" button comes in below
  the year field. The button loads the predicted blocks of the view, then the map shows 2023. The
  year list then has a group "Prediction, not real data" with 2023, in the prediction colour
  (violet, `--prediction` in `globals.css`). A note below the year field and the message on the
  map tell that the data is a prediction.
- **Map:** a prediction has only the predicted crop of each block, so a prediction year has only
  the crop layer. A block with no prediction is "No prediction", in light grey. The legend tells
  that the rule of a predicted crop (more than 30% of the block) is different from the main crop
  of the real data (the class with the most cells). The tooltip shows the model score.
- **Detail panel:** the predicted crop with its model score, the two next crops of the model,
  a note that a score is not an exact probability, then the real data of the newest year. A block
  with no prediction shows the reason.
- **Data path:** `/api/reference` gives `predictionYears` (the years of `block_predictions` after
  the newest year of `block_crops`). `/api/predictions?bbox=&year=[&crop=][&county=]`
  (`getPredictedBlocks`) gives the predicted blocks of a map area, with the spatial index of
  `blocks` and the limit `MAX_BLOCKS`: one row `[block id, crop code, score]` for each block
  (code -1 = no prediction, score with 2 decimals). The full state is 76,772 blocks, 1.6 MB, in
  0.14 s. `/api/predictions/<id>?year=` (`getBlockPrediction`) gives one block with its next
  crops. The county filter uses the counties of the blocks in the newest year of `block_crops`.
- **Check of the load (2026-11-15):** all 76,772 rows of the local database are equal to the
  converted file (status, crops and scores), and the answer of `/api/predictions` for the full
  state is equal to the answer of the earlier file version.

### Assistant (2026-11-15)

A chat button in the bottom right corner of the map opens a small chat window. The assistant
answers questions about the blocks, the crop types, the crop rotation, the soil, the climate and
the weather forecast. It is a Claude model that reads the data with tools. It declines other
subjects.

- **Interface:** `apps/web/components/chat/`. The button expands into the window. On a wide
  screen, the button follows the left edge of the detail panel. The map controls (scale, zoom,
  attribution) are above the button and move up when the window opens. The start view has four
  suggestions; they use the selected block, or the example block `144_1075` (Colusa County).
  A line below the text field gives the data limits.
- **Session:** the browser keeps the chat in `sessionStorage` (`apps/web/store/chat-store.ts`).
  The chat stays after a page refresh and goes away when the tab closes. "New chat" deletes it.
  The server keeps no chat. There are no accounts and no history list.
- **Contract:** `packages/core/src/chat.ts`. The browser sends the text of the newest turns
  (a maximum of 20; a user message has a maximum of 1,000 characters) and the state of the
  dashboard (year, selected block, crop filter, county filter). The answer is a stream of
  events (`step`, `text`, `done`, `error`). The server sends codes and ids only: the interface
  text is in `en.json`.
- **Route:** `POST /api/chat` (`apps/web/app/api/chat/route.ts`, code in
  `apps/web/app/api/_lib/chat/`). It is the only route that is not a GET route, and its answer
  is not in the CDN cache (`Cache-Control: no-store`).
- **Model:** `claude-haiku-5-5`, the constant `CHAT_MODEL` in `_lib/chat/limits.ts`. There is one
  model and no model selector. The settings keep the cost low: low effort, a maximum of 4,000
  output tokens for each model call, a maximum of 6 rounds of tool calls, 55 seconds for one
  answer. The server writes one log line for each answer with the token counts. One question
  costs approximately 0.05 to 0.2 US cents (measured on 2026-11-15: one to three model calls,
  with the prompt cache). On the same day, three questions gave the same values on Claude
  Haiku 5.5 and on Claude Sonnet 5.5, which has 20 times the price, so Haiku is the model.
- **Tools** (`_lib/chat/tools.ts`). The results are small JSON objects with no shapes.

  | Tool | Data |
  |---|---|
  | `get_block` | `getBlockDetail`: the crops, the county revenue, the soil and the climate of one block in one year |
  | `get_block_history` | `getBlockCropHistory`: the crops of one block in each year. `getBlockPrediction`: the model prediction |
  | `get_rotation_stats` | `getCropTransitions`: the main crops of the next year in the blocks that have a given main crop |
  | `get_crop_stats` | `getCropStats`: the area, the county values and the area of each year for one crop |
  | `get_weather` | The forecast of Open-Meteo for 7 days at a block or at a point in or near California |

- **Queries:** `packages/db/src/queries/assistant.ts`. `getCropTransitions` uses only the blocks
  with 40 acres of cropland or more in the first year: smaller blocks are 53% of the block-years
  but have 3% of the cropland, and their main crop is not stable. This query takes 0.1 to 0.3
  seconds (0.8 seconds with a cold database cache), so its results stay in the memory of the
  server. After the pipeline loads a year, the results are old until the server starts again.
- **System prompt:** `_lib/chat/prompt.ts`. The stable part has the role, the block model, the
  limits of "Limits that the dashboard must show", and the lists of years, crops and counties.
  The state of the dashboard comes after it.
- **Weather:** Open-Meteo is the only external source. The request has only the coordinates,
  rounded to 0.01 degrees. Terms (read on 2026-11-15): the free service is for non-commercial
  use, and each place that shows the data must have a link to open-meteo.com. The chat shows
  "Weather data by Open-Meteo.com" below an answer that uses the forecast. There is no web search.
- **Protection:** the route has no authentication. The limits are: 8 requests in a minute and 60
  in an hour for each address (in memory, so not exact on a serverless host), a body of 512 kB,
  the limits of the contract, and the limits of the model call. `ANTHROPIC_API_KEY` is in
  `apps/web/.env.local` and in the Vercel project. It is not in the browser code. Set a spend
  limit for the key in the Claude Console.

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
- Predictions from the model team: the crop of 2023 is on the map (see "Predictions")
- The tool that draws custom fields

### Technical points

- A browser cannot connect to Postgres. The queries run in server code of the Next.js application.
- The browser reads the data through six GET Route Handlers (`/api/reference`, `/api/blocks`,
  `/api/blocks/<id>`, `/api/climate`, `/api/predictions`, `/api/predictions/<id>`) with TanStack Query. They are not Server Functions (`"use server"`): Next.js
  runs Server Functions one at a time and recommends Route Handlers for requests that read data.
- The assistant has one more Route Handler, `POST /api/chat`. An event handler of the chat sends
  the request and reads the answer stream; it is not a TanStack Query hook. See "Assistant".
- The map requests only the blocks in the visible area (`geom && ST_MakeEnvelope(...)`), with a limit
  on the number of blocks (`MAX_BLOCKS`, 120,000). The full state has 86,623 blocks in 2017, so the
  first view shows all of them. This answer has 3.1 MB (0.9 MB with gzip) and takes less than 1 second.
- **Blocks of one year (2026-11-15):** the answer has only the blocks of the selected year, and
  `getBlocks` compares the number of these blocks with `MAX_BLOCKS`. It counts the main
  crop rows of that year in the area, with the index `block_crops_main_idx`. It does not count the
  `blocks` table, which has the blocks of all the years (156,163). The full state is one answer for
  each year from 2017 to 2021: 86,623 blocks and 3.1 MB for 2017, 115,355 blocks and 4.1 MB (1.4 MB
  with gzip) for 2021, in 1 to 2 seconds. A block has 36 bytes in the answer. `MAX_BLOCKS` is
  120,000 (4.3 MB): do not increase it more, because the answer then exceeds the 4.5 MB of the host.
- **Views with more blocks than the limit (2026-11-15):** 2022 has 135,573 blocks, so its full state
  answer would have 4.8 MB. When the blocks of the year in the view are more than `MAX_BLOCKS`, the
  answer has only the blocks with `MIN_CROP_CELLS_IN_LARGE_VIEW` (5) crop cells or more, and the
  field `smallBlocksOmitted` gives the number of blocks that are not in it. The sidebar shows a
  note (`filters.blocksInViewWithoutSmall`). For the full state of 2022 the answer has 90,928 blocks
  (3.4 MB), and 44,645 blocks are not in it. If the larger blocks are also more than the limit, the
  answer is `tooMany`. The condition uses `block_cropland_acres` (4 cells are 0.9 acres, 5 cells
  are 1.1 acres).
- The answer of `/api/blocks` has one row of values for each block and no shapes. The browser
  calculates the square of a block from its id (`blockSquare` in `packages/core/src/block-grid.ts`,
  used by `blockFeatures`). For all the blocks of 2017 to 2022, the result is equal to
  `ST_AsGeoJSON(geom, 6)`. With the shapes, the answer for the full state had 24.9 MB. That is more
  than the limits of Vercel for the answer of a function (4.5 MB) and for the CDN cache (10 MB). Do
  not add the shapes to the answer. If the pipeline changes the grid, change the constants in
  `block-grid.ts`.
- The climate values are not in the answer of `/api/blocks`: four more values for each block make
  the answer larger than the limit of the host. The browser gets the climate cells of the year in
  one small answer and finds the cell of each block from the block center (`blockCenter`).
- The map requests no blocks outside `DATA_BOUNDS` (`apps/web/config/regions.ts`). All the blocks
  must be in this area. On 2026-11-15, 8 blocks of the years after 2017 were outside the old
  bounds, so the bounds are now wider. After the load of a new year, make sure that
  `ST_Extent(geom)` of `blocks` is in the bounds.
- A correct answer of the four routes has the header
  `Cache-Control: public, max-age=0, s-maxage=3600` (`cachedJson` in `apps/web/app/api/_lib/request.ts`).
  The CDN of Vercel keeps the answer for 1 hour and answers the subsequent requests for the same
  address. The function and the database then do no work.
- After a load of new data into the Neon database, the map can show the old data for a maximum of
  1 hour. To show the new data immediately, purge the CDN cache in Vercel (CDN → Caches → Purge
  cache, with the tag `*`) or deploy again: each deployment has its own cache.
- With a crop or county filter, the values of a block are the values of the crops that agree with
  the filter. The main crop of a block is the crop class with the most cells.
- Do not read the database in a `useEffect` hook. Use TanStack Query or server components.
- The database connection string goes in an environment file that is not committed.

### Drizzle (installed on 2026-11-15)

The package `packages/db` (`@demetra/db`) has the Drizzle setup. It is for server code only.

| File | Content |
|---|---|
| `src/schema.ts` | The tables `blocks`, `blockCrops`, `crops`, `counties`, `climateCells` and the view `blockMainCrop`, from `drizzle-kit pull` |
| `src/relations.ts` | The relations, for `db.query` and for Drizzle Studio |
| `src/client.ts` | The client `db` (driver `postgres`). It reads `DATABASE_URL`. |
| `src/queries/` | The query functions of the application |
| `drizzle.config.ts`, `load-env.ts` | The config for drizzle-kit. It reads `apps/web/.env.local`. |

- **Tables:** the pipeline (`schema.sql`, `load_year.sh`, `load_climate.sh`) makes and loads the
  tables. Drizzle only reads them. Do not add `drizzle-kit generate`, `migrate` or `push`. The config keeps the PostGIS
  system tables out.
- **After a change of the tables:** run `pnpm db:pull`. It writes the schema of the database to
  `packages/db/pulled/` (not committed). Compare it with `src/schema.ts` and copy the changes. The
  top of `src/schema.ts` lists the differences that must stay.
- **Geometry:** Drizzle can decode only PostGIS points. Do not select `blocks.geom` directly. Use
  `ST_AsGeoJSON(geom)` in the query.
- **Drizzle Studio in Docker:** the service `studio` (container `demetra-studio`) in the `demetra`
  stack shows the local database. Open `https://local.drizzle.studio/`. It starts with Docker. The
  service is in `docker-compose.yml` of the pipeline, and it mounts this repository as read-only.
  `pnpm db:studio:logs` shows its log.
- **Drizzle Studio for a different database:** `pnpm db:studio` starts Drizzle Studio on the host
  with the database of `apps/web/.env.local` (for example Neon), on port 4984. Open
  `https://local.drizzle.studio/?port=4984`.
- **Port:** the container uses local port 4983, the default of Drizzle Studio. The container
  `adrenaline-spike-studio` of a different project uses the same port. To run the two at the same
  time, set `STUDIO_PORT=4984` in the `.env` file of the pipeline `db/` folder.

## Decisions

- The reusable components of the first implementation stay. There is no completely new start.
- The first version has three map layers. More layers are open for suggestions.
- The climate layer replaces the revenue layer on the map (2026-11-15). It has four metrics. The
  climate cells of 10 km are interpolated, because NASA POWER has no finer data. A finer source
  (for example PRISM or gridMET, 4 km) is not used for now.
- Drizzle ORM in the application and Drizzle Studio in Docker.
- The tool that draws custom fields is removed. It is a possible later feature.
- The pipeline scripts stay outside this repository.
