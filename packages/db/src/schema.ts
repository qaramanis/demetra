// The tables of the data pipeline, from `drizzle-kit pull`. The pipeline makes and loads them
// (`schema.sql` and `load_year.sh`): Drizzle only reads them. After a change of the tables,
// run `pnpm db:pull`, compare `pulled/schema.ts` with this file and copy the changes.
//
// Differences from the pulled file:
// - `blocks.geom` has a custom type, because Drizzle can decode only PostGIS points.
// - The numeric columns give numbers, not text.
// - `econMatch` has the type of `@demetra/core`.
// - Three column names agree with `SoilValues` in `@demetra/core`: `cecMeq100g`,
//   `aws0To100Cm` and `soc0To30GM2` (the pulled names are `cecMeq100G`, `aws0100Cm` and
//   `soc030GM2`).
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
