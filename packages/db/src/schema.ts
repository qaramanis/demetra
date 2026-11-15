// The tables of the data pipeline, from `drizzle-kit pull`. The pipeline makes and loads them
// (`schema.sql`, `load_year.sh`, `load_climate.sh` and `load_predictions.sh`): Drizzle only
// reads them. After a change of the tables, run `pnpm db:pull`, compare `pulled/schema.ts` with
// this file and copy the changes.
//
// Differences from the pulled file:
// - `blocks.geom` has a custom type, because Drizzle can decode only PostGIS points.
// - The numeric columns give numbers, not text.
// - `econMatch` has the type of `@demetra/core`.
// - Three column names agree with `SoilValues` in `@demetra/core`: `cecMeq100g`,
//   `aws0To100Cm` and `soc0To30GM2` (the pulled names are `cecMeq100G`, `aws0100Cm` and
//   `soc030GM2`).
// - The three means of `climateCells` end with `Mean6y` (the pulled names end with `Mean6Y`).
// - The indexes have no operator classes: the pulled operator classes were incorrect.
// - The view is marked as an existing view.
//
// drizzle-kit loads this file. Do not import "server-only" here.
import type { EconMatch } from "@demetra/core";
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  char,
  check,
  customType,
  doublePrecision,
  foreignKey,
  geometry,
  index,
  integer,
  numeric,
  pgTable,
  pgView,
  primaryKey,
  real,
  smallint,
  text,
} from "drizzle-orm/pg-core";

/**
 * A PostGIS polygon in WGS84. Drizzle can decode only points, so a query that selects this
 * column gets the EWKB text of PostGIS, which is not useful. Select the polygon as GeoJSON:
 *
 *     sql<string>`ST_AsGeoJSON(${blocks.geom})`
 */
const polygon4326 = customType<{ data: string }>({
  dataType() {
    return "geometry(Polygon,4326)";
  },
});

/** The counties of California. */
export const counties = pgTable("counties", {
  countyFips: char("county_fips", { length: 5 }).primaryKey().notNull(),
  countyName: text("county_name").notNull(),
});

/** The crop classes of the Cropland Data Layer, with the official map color. */
export const crops = pgTable("crops", {
  cdlCode: smallint("cdl_code").primaryKey().notNull(),
  cdlClass: text("cdl_class").notNull(),
  color: text(),
});

/** One row for each block of 990 m x 990 m. The same for all years. */
export const blocks = pgTable(
  "blocks",
  {
    blockId: text("block_id").primaryKey().notNull(),
    blockCol: integer("block_col").notNull(),
    blockRow: integer("block_row").notNull(),
    xCenterAlbersM: integer("x_center_albers_m").notNull(),
    yCenterAlbersM: integer("y_center_albers_m").notNull(),
    lonCenter: doublePrecision("lon_center").notNull(),
    latCenter: doublePrecision("lat_center").notNull(),
    /** The square of the block. See `polygon4326`: select it with `ST_AsGeoJSON`. */
    geom: polygon4326().notNull(),
    /** The center as [longitude, latitude]. */
    center: geometry({ type: "point", srid: 4326 }).notNull(),
  },
  (table) => [index("blocks_geom_gix").using("gist", table.geom)],
);

/** One row for each year + block + county + crop class. */
export const blockCrops = pgTable(
  "block_crops",
  {
    year: smallint().notNull(),
    blockId: text("block_id").notNull(),
    countyFips: char("county_fips", { length: 5 }).notNull(),
    cdlCode: smallint("cdl_code").notNull(),
    cells: integer().notNull(),
    acres: real().notNull(),
    shareOfBlock: real("share_of_block").notNull(),
    shareOfBlockCropland: real("share_of_block_cropland").notNull(),
    isBlockMainCrop: boolean("is_block_main_crop").notNull(),
    blockCroplandAcres: real("block_cropland_acres").notNull(),
    // County yield and price data
    econMatch: text("econ_match").$type<EconMatch>().notNull(),
    mainCommodity: text("main_commodity"),
    nCommodities: smallint("n_commodities"),
    countyHarvestedAcres: integer("county_harvested_acres"),
    yieldPerAcre: numeric("yield_per_acre", { precision: 12, scale: 2, mode: "number" }),
    yieldUnit: text("yield_unit"),
    pricePerUnitUsd: numeric("price_per_unit_usd", { precision: 14, scale: 2, mode: "number" }),
    countyValueUsd: bigint("county_value_usd", { mode: "number" }),
    revenuePerAcreCountyUsd: integer("revenue_per_acre_county_usd"),
    revenuePerAcreStateUsd: integer("revenue_per_acre_state_usd"),
    estRevenueUsd: bigint("est_revenue_usd", { mode: "number" }),
    // Soil of the cells of this crop in this block
    dominantMukey: integer("dominant_mukey"),
    dominantMukeyShare: real("dominant_mukey_share"),
    nSoilUnits: smallint("n_soil_units"),
    soilComponent: text("soil_component"),
    soilOrder: text("soil_order"),
    surfaceTexture: text("surface_texture"),
    sandPct: real("sand_pct"),
    siltPct: real("silt_pct"),
    clayPct: real("clay_pct"),
    organicMatterPct: real("organic_matter_pct"),
    ph: real(),
    ecDsM: real("ec_ds_m"),
    sar: real(),
    ksatUmS: real("ksat_um_s"),
    cecMeq100g: real("cec_meq_100g"),
    slopePct: real("slope_pct"),
    drainageClass: text("drainage_class"),
    hydrologicGroup: text("hydrologic_group"),
    floodFrequency: text("flood_frequency"),
    depthToBedrockCm: integer("depth_to_bedrock_cm"),
    depthToWaterTableCm: integer("depth_to_water_table_cm"),
    aws0To100Cm: real("aws_0_100_cm"),
    rootZoneDepthCm: integer("root_zone_depth_cm"),
    soc0To30GM2: integer("soc_0_30_g_m2"),
    irrCapabilityClass: smallint("irr_capability_class"),
    nonirrCapabilityClass: smallint("nonirr_capability_class"),
    farmlandClass: text("farmland_class"),
    storieIndex: smallint("storie_index"),
    storieGrade: text("storie_grade"),
    nccpiAll: real("nccpi_all"),
  },
  (table) => [
    index("block_crops_block_idx").on(table.blockId, table.year),
    index("block_crops_main_idx").on(table.year, table.blockId).where(sql`is_block_main_crop`),
    index("block_crops_year_county_idx").on(table.year, table.countyFips),
    index("block_crops_year_crop_idx").on(table.year, table.cdlCode),
    foreignKey({
      columns: [table.blockId],
      foreignColumns: [blocks.blockId],
      name: "block_crops_block_id_fkey",
    }),
    foreignKey({
      columns: [table.countyFips],
      foreignColumns: [counties.countyFips],
      name: "block_crops_county_fips_fkey",
    }),
    foreignKey({
      columns: [table.cdlCode],
      foreignColumns: [crops.cdlCode],
      name: "block_crops_cdl_code_fkey",
    }),
    primaryKey({
      columns: [table.year, table.blockId, table.countyFips, table.cdlCode],
      name: "block_crops_pkey",
    }),
  ],
);

/**
 * The crop predictions of the model team: one row for each year + block, for a year after the
 * newest year of `block_crops`. `load_predictions.sh` loads the table.
 *
 * `cdlCode` is the predicted majority crop: the crop class with the largest area, when it has
 * more than 30% of the block (61 = fallow). NULL = no prediction (status
 * INSUFFICIENT_CROP_HISTORY). `cdlCode2` and `cdlCode3` are the next crops of the model. A score
 * is the output of the model for a crop, from 0 to 1: it is not an exact probability.
 */
export const blockPredictions = pgTable(
  "block_predictions",
  {
    year: smallint().notNull(),
    blockId: text("block_id").notNull(),
    status: text().$type<"PREDICTED" | "INSUFFICIENT_CROP_HISTORY">().notNull(),
    cdlCode: smallint("cdl_code"),
    score: real(),
    cdlCode2: smallint("cdl_code_2"),
    score2: real("score_2"),
    cdlCode3: smallint("cdl_code_3"),
    score3: real("score_3"),
  },
  (table) => [
    index("block_predictions_year_crop_idx").on(table.year, table.cdlCode),
    foreignKey({
      columns: [table.blockId],
      foreignColumns: [blocks.blockId],
      name: "block_predictions_block_id_fkey",
    }),
    foreignKey({
      columns: [table.cdlCode],
      foreignColumns: [crops.cdlCode],
      name: "block_predictions_cdl_code_fkey",
    }),
    foreignKey({
      columns: [table.cdlCode2],
      foreignColumns: [crops.cdlCode],
      name: "block_predictions_cdl_code_2_fkey",
    }),
    foreignKey({
      columns: [table.cdlCode3],
      foreignColumns: [crops.cdlCode],
      name: "block_predictions_cdl_code_3_fkey",
    }),
    primaryKey({ columns: [table.year, table.blockId], name: "block_predictions_pkey" }),
    check(
      "block_predictions_status_check",
      sql`status = ANY (ARRAY['PREDICTED'::text, 'INSUFFICIENT_CROP_HISTORY'::text])`,
    ),
    check(
      "block_predictions_crop_check",
      sql`((status = 'PREDICTED'::text) = (cdl_code IS NOT NULL)) AND ((cdl_code IS NULL) = (score IS NULL))`,
    ),
    check(
      "block_predictions_next_check",
      sql`((cdl_code_2 IS NULL) = (score_2 IS NULL)) AND ((cdl_code_3 IS NULL) = (score_3 IS NULL))`,
    ),
    check(
      "block_predictions_score_check",
      sql`((score >= (0)::double precision) AND (score <= (1)::double precision)) AND ((score_2 >= (0)::double precision) AND (score_2 <= (1)::double precision)) AND ((score_3 >= (0)::double precision) AND (score_3 <= (1)::double precision))`,
    ),
  ],
);

/**
 * One row for each year + climate cell of 0.1 degrees (approximately 10 km). The center of a
 * cell is at a multiple of 0.1 degrees. The cell of a block:
 *
 *     cell_lat = floor(lat_center * 10 + 0.5) / 10, and the same for cell_lon
 *
 * The values are estimates: the pipeline (`build_climate_grid.py`) interpolates them from the
 * NASA POWER source cells of approximately 50 km. `load_climate.sh` loads the table.
 */
export const climateCells = pgTable(
  "climate_cells",
  {
    year: smallint().notNull(),
    /** Latitude of the cell center, in degrees. */
    cellLat: numeric("cell_lat", { precision: 4, scale: 1, mode: "number" }).notNull(),
    /** Longitude of the cell center, in degrees. */
    cellLon: numeric("cell_lon", { precision: 5, scale: 1, mode: "number" }).notNull(),
    /** `false` = a cell around the cells that have blocks. */
    hasBlock: boolean("has_block").notNull(),
    /** Mean temperature of the year, °C. */
    tMean: real("t_mean").notNull(),
    /** Mean daily maximum from June to August, °C. */
    tmaxSummerMean: real("tmax_summer_mean").notNull(),
    /** Mean daily minimum from December of the year before to February, °C. */
    tminWinterMean: real("tmin_winter_mean").notNull(),
    /** Days with a minimum below 0 °C. */
    frostDays: smallint("frost_days").notNull(),
    /** Days with a maximum of 35 °C or more. */
    heatDays: smallint("heat_days").notNull(),
    /** Growing degree days: base 10 °C, limit 30 °C. */
    gdd10: real().notNull(),
    rainYearMm: real("rain_year_mm").notNull(),
    /** Rain from October of the year before to September. */
    rainWateryearMm: real("rain_wateryear_mm").notNull(),
    rainSummerMm: real("rain_summer_mm").notNull(),
    /** Reference evapotranspiration from April to September. */
    et0GsMm: real("et0_gs_mm").notNull(),
    /** Rain − reference evapotranspiration, from April to September. */
    waterBalanceGsMm: real("water_balance_gs_mm").notNull(),
    /** Root zone soil wetness, 0 to 1. */
    soilwetRootMean: real("soilwet_root_mean").notNull(),
    soilwetRootSummer: real("soilwet_root_summer").notNull(),
    /** Days with data in the year. */
    nDays: smallint("n_days").notNull(),
    // The means of all the years of the cell.
    rainWateryearMmMean6y: real("rain_wateryear_mm_mean6y").notNull(),
    heatDaysMean6y: real("heat_days_mean6y").notNull(),
    tMeanMean6y: real("t_mean_mean6y").notNull(),
    /** 100 × (rain of the water year / its mean of all the years − 1). */
    rainAnomalyPct: real("rain_anomaly_pct").notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.year, table.cellLat, table.cellLon],
      name: "climate_cells_pkey",
    }),
  ],
);

/**
 * One row for each year + block: the main crop, with the block shape and the crop color.
 * A block has more than one crop: do not use this view as the only crop of a block.
 */
export const blockMainCrop = pgView("block_main_crop", {
  year: smallint(),
  blockId: text("block_id"),
  /** See `polygon4326`: select it with `ST_AsGeoJSON`. */
  geom: polygon4326(),
  center: geometry({ type: "point", srid: 4326 }),
  lonCenter: doublePrecision("lon_center"),
  latCenter: doublePrecision("lat_center"),
  countyFips: char("county_fips", { length: 5 }),
  countyName: text("county_name"),
  cdlCode: smallint("cdl_code"),
  cdlClass: text("cdl_class"),
  color: text(),
  acres: real(),
  shareOfBlock: real("share_of_block"),
  shareOfBlockCropland: real("share_of_block_cropland"),
  blockCroplandAcres: real("block_cropland_acres"),
  revenuePerAcreCountyUsd: integer("revenue_per_acre_county_usd"),
  revenuePerAcreStateUsd: integer("revenue_per_acre_state_usd"),
  estRevenueUsd: bigint("est_revenue_usd", { mode: "number" }),
  surfaceTexture: text("surface_texture"),
  drainageClass: text("drainage_class"),
  storieIndex: smallint("storie_index"),
  storieGrade: text("storie_grade"),
  nccpiAll: real("nccpi_all"),
}).existing();
