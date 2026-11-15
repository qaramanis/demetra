import { FALLOW_CROP_CODE, UNRELIABLE_REVENUE_CROP_CODES } from "@demetra/core";
import type { EconMatch } from "@demetra/core";
import { and, asc, desc, eq, exists, gte, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "../client.ts";
import { blockCrops, blocks, counties, crops } from "../schema.ts";

/**
 * The data of the tools of the chat assistant. A language model reads each result as JSON, so
 * a result is small, with rounded numbers.
 *
 * The main crop of a block is the crop class with the most cells, the cells of two counties
 * added, and the lower code when two classes are equal (the rule of `getBlocks`). Each block of
 * a year has exactly one row with `is_block_main_crop`, and its crop is always this main crop
 * (checked for all the rows of 2017 to 2022). But when the main crop is in two counties, only
 * the row of the county with the most cells of that crop has the flag. The view
 * `block_main_crop` has only that row: its county, acres and share are for one county, not
 * for the block. These queries thus use the flag only to find the main crop code.
 */

/** The number of crops of a block in each year of `BlockCropHistory`. */
const MAX_HISTORY_CROPS = 5;

/** The number of next crops in `CropTransitions`. */
const MAX_NEXT_CROPS = 8;

/** The number of counties in `CropStats` for the full state. */
const MAX_STAT_COUNTIES = 6;

/**
 * The minimum cropland of a block in year N for `getCropTransitions`. A block is 242 acres.
 * In 2017 to 2022, 53% of the block-years have less than 40 acres of cropland, but they have
 * only 3.1% of the cropland. Their main crop is often a few cells at the edge of a field: below
 * 40 acres, almond blocks keep their main crop in only 35% to 69% of the next years and many
 * have no cropland in the next year. Above 40 acres, almond blocks keep it in 77% to 92%.
 */
const MIN_TRANSITION_CROPLAND_ACRES = 40;

/**
 * The acres of a row as `numeric`. `acres` is `real` with one decimal. PostgreSQL adds `real`
 * values in single precision, and the total of a crop in the state is then wrong by 100 acres
 * or more. The sum of `numeric` values is exact and is not slower. Cast the sum to `float8`.
 */
const rowAcres = sql`${blockCrops.acres}::numeric`;

const round = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

/** The years that have data, the oldest first. */
async function getDataYears(): Promise<number[]> {
  // Each block of a year has one row with `is_block_main_crop`, so the years of these rows are
  // the years of the data. The partial index `block_crops_main_idx` has them. The condition is
  // the column itself, so that it agrees with the condition of the index.
  const rows = await db
    .selectDistinct({ year: blockCrops.year })
    .from(blockCrops)
    .where(sql`${blockCrops.isBlockMainCrop}`)
    .orderBy(asc(blockCrops.year));
  return rows.map((row) => row.year);
}

/** The name of a crop class. `null` = the code is not in the `crops` table. */
async function getCropName(cropCode: number): Promise<string | null> {
  const [row] = await db
    .select({ name: crops.cdlClass })
    .from(crops)
    .where(eq(crops.cdlCode, cropCode))
    .limit(1);
  return row?.name ?? null;
}

/** The name of a county. `null` = no county or the code is not in the `counties` table. */
async function getCountyName(countyFips: string | null): Promise<string | null> {
  if (countyFips === null) return null;
  const [row] = await db
    .select({ name: counties.countyName })
    .from(counties)
    .where(eq(counties.countyFips, countyFips))
    .limit(1);
  return row?.name ?? null;
}

// ---------------------------------------------------------------------------------------------
// Crop history of a block

/** One crop class of a block in one year. The rows of two counties are added. */
export interface BlockCropShare {
  code: number;
  name: string;
  acres: number;
  /** Share of the cropland of the block, 0 to 1. */
  share: number;
}

/** The crops of a block in one year. */
export interface BlockCropYear {
  year: number;
  /** The cropland of the block in acres. A block is 242 acres. */
  croplandAcres: number;
  mainCropCode: number;
  mainCropName: string;
  /** The largest crops, the largest first. The first is the main crop. */
  crops: BlockCropShare[];
  /** The number of crop classes of the block that are not in `crops`. */
  otherCropCount: number;
}

/** The crops of a block in each year that has data. */
export interface BlockCropHistory {
  blockId: string;
  /** The oldest year first. A year in which the block has no cropland is not in the list. */
  years: BlockCropYear[];
}

/**
 * The crops of one block in each year that has data. The result is `null` when the block
 * does not exist.
 */
export async function getBlockCropHistory(id: string): Promise<BlockCropHistory | null> {
  const blockRequest = db
    .select({ id: blocks.blockId })
    .from(blocks)
    .where(eq(blocks.blockId, id))
    .limit(1);

  // One row for each year and crop class: a block on a county border has a row for each
  // county. In a year, the order is the rule of the main crop: the most cells first, then the
  // lower code. The index `block_crops_block_idx` (block_id, year) finds the rows.
  const cropCells = sql<number>`sum(${blockCrops.cells})::int`;
  const rowsRequest = db
    .select({
      year: blockCrops.year,
      code: blockCrops.cdlCode,
      name: crops.cdlClass,
      cells: cropCells,
      acres: sql<number>`sum(${rowAcres})::float8`,
      // Each row of a block has the same value.
      croplandAcres: sql<number>`max(${blockCrops.blockCroplandAcres})::float8`,
    })
    .from(blockCrops)
    .innerJoin(crops, eq(crops.cdlCode, blockCrops.cdlCode))
    .where(eq(blockCrops.blockId, id))
    .groupBy(blockCrops.year, blockCrops.cdlCode, crops.cdlClass)
    .orderBy(asc(blockCrops.year), desc(cropCells), asc(blockCrops.cdlCode));

  const [[block], rows] = await Promise.all([blockRequest, rowsRequest]);
  if (!block) return null;

  const rowsOfYear = new Map<number, typeof rows>();
  for (const row of rows) {
    const list = rowsOfYear.get(row.year);
    if (list) list.push(row);
    else rowsOfYear.set(row.year, [row]);
  }

  const years: BlockCropYear[] = [];
  for (const [year, list] of rowsOfYear) {
    const [main] = list;
    if (!main) continue;
    // The share comes from the cells: the cell counts are exact, the acres are rounded.
    const blockCells = list.reduce((total, row) => total + row.cells, 0);
    years.push({
      year,
      croplandAcres: round(main.croplandAcres, 1),
      mainCropCode: main.code,
      mainCropName: main.name,
      crops: list.slice(0, MAX_HISTORY_CROPS).map((row) => ({
        code: row.code,
        name: row.name,
        acres: round(row.acres, 1),
        share: round(row.cells / blockCells, 3),
      })),
      otherCropCount: Math.max(list.length - MAX_HISTORY_CROPS, 0),
    });
  }

  return { blockId: id, years };
}

// ---------------------------------------------------------------------------------------------
// Crop rotation

/** A main crop of year N + 1. */
export interface NextCrop {
  code: number;
  name: string;
  /** The number of block-years with this main crop in year N + 1. */
  blocks: number;
  /** Share of the block-years that have data in year N + 1, 0 to 1. */
  share: number;
}

/**
 * The main crops in year N + 1 of the blocks that have a main crop in year N, for each pair of
 * years of the data. The pairs are `firstYear` → `firstYear + 1` to `lastYear - 1` →
 * `lastYear`.
 */
export interface CropTransitions {
  cropCode: number;
  /** `null` = the code is not in the `crops` table. */
  cropName: string | null;
  /** `null` = the full state. */
  countyFips: string | null;
  countyName: string | null;
  /** Year N of the first pair. `null` = the data has no two years that follow each other. */
  firstYear: number | null;
  /** Year N + 1 of the last pair. */
  lastYear: number | null;
  /** Only blocks with this cropland or more in year N count. */
  minCroplandAcres: number;
  /** The blocks with the crop as main crop in a year N, added for all the pairs. */
  blockYears: number;
  /** Of `blockYears`, the block-years with no cropland in year N + 1. */
  noNextYearData: number;
  /** The most frequent main crops of year N + 1, the most frequent first. The same crop can
   * be in the list: these blocks keep their crop. */
  nextCrops: NextCrop[];
  /** The block-years with a main crop in year N + 1 that is not in `nextCrops`. */
  otherNextCropBlocks: number;
}

/**
 * The results of `getCropTransitions`. The query reads approximately 90,000 rows for a frequent
 * crop (almonds), from many pages of the table, and takes 0.4 s. The data changes only when the
 * pipeline loads a year, so the module keeps each result. A restart of the server clears it.
 */
const transitionsCache = new Map<string, Promise<CropTransitions>>();

/**
 * Crop rotation from the real data: for each pair of years N and N + 1, the blocks with
 * `cropCode` as main crop in year N, and their main crop in year N + 1. With `countyFips`,
 * only the blocks with cropland in that county in year N count.
 */
export function getCropTransitions(
  cropCode: number,
  countyFips: string | null,
): Promise<CropTransitions> {
  const key = `${cropCode}:${countyFips ?? ""}`;
  let result = transitionsCache.get(key);
  if (!result) {
    result = queryCropTransitions(cropCode, countyFips);
    transitionsCache.set(key, result);
    // An error must not stay in the cache.
    result.catch(() => transitionsCache.delete(key));
  }
  return result;
}

async function queryCropTransitions(
  cropCode: number,
  countyFips: string | null,
): Promise<CropTransitions> {
  const [years, cropName, countyName] = await Promise.all([
    getDataYears(),
    getCropName(cropCode),
    getCountyName(countyFips),
  ]);

  // Year N of each pair: a year of the data that is followed by a year of the data.
  const firstYears = years.filter((year) => years.includes(year + 1));

  const base = {
    cropCode,
    cropName,
    countyFips,
    countyName,
    firstYear: firstYears[0] ?? null,
    lastYear: firstYears.length > 0 ? Math.max(...firstYears) + 1 : null,
    minCroplandAcres: MIN_TRANSITION_CROPLAND_ACRES,
  };
  if (firstYears.length === 0) {
    return { ...base, blockYears: 0, noNextYearData: 0, nextCrops: [], otherNextCropBlocks: 0 };
  }

  const current = alias(blockCrops, "current_year");
  const next = alias(blockCrops, "next_year");

  // A block of the county has a row in that county in year N. The primary key (year, block_id,
  // county_fips, cdl_code) has these columns.
  const inCounty =
    countyFips === null
      ? undefined
      : exists(
          db
            .select({ one: sql`1` })
            .from(blockCrops)
            .where(
              and(
                eq(blockCrops.year, current.year),
                eq(blockCrops.blockId, current.blockId),
                eq(blockCrops.countyFips, countyFips),
              ),
            ),
        );

  // The row of the main crop of a block in year N, and its row in year N + 1. The conditions
  // on `is_block_main_crop` are the column itself, so that they agree with the condition of
  // the index `block_crops_main_idx` (year, block_id). The result has one row for each main
  // crop of year N + 1. The row with a `null` code has the blocks with no cropland in year N + 1.
  const rows = await db
    .select({
      code: next.cdlCode,
      name: crops.cdlClass,
      blocks: sql<number>`count(*)::int`,
    })
    .from(current)
    .leftJoin(
      next,
      and(
        eq(next.blockId, current.blockId),
        eq(next.year, sql`${current.year} + 1`),
        sql`${next.isBlockMainCrop}`,
      ),
    )
    .leftJoin(crops, eq(crops.cdlCode, next.cdlCode))
    .where(
      and(
        inArray(current.year, firstYears),
        eq(current.cdlCode, cropCode),
        sql`${current.isBlockMainCrop}`,
        gte(current.blockCroplandAcres, MIN_TRANSITION_CROPLAND_ACRES),
        inCounty,
      ),
    )
    .groupBy(next.cdlCode, crops.cdlClass);

  let blockYears = 0;
  let noNextYearData = 0;
  const nextRows: NextCrop[] = [];
  for (const row of rows) {
    blockYears += row.blocks;
    if (row.code === null) noNextYearData += row.blocks;
    else nextRows.push({ code: row.code, name: row.name ?? "", blocks: row.blocks, share: 0 });
  }
  nextRows.sort((a, b) => b.blocks - a.blocks || a.code - b.code);

  const withNextYear = blockYears - noNextYearData;
  const nextCrops = nextRows
    .slice(0, MAX_NEXT_CROPS)
    .map((row) => ({ ...row, share: round(row.blocks / withNextYear, 3) }));
  const listed = nextCrops.reduce((total, row) => total + row.blocks, 0);

  return {
    ...base,
    blockYears,
    noNextYearData,
    nextCrops,
    otherNextCropBlocks: withNextYear - listed,
  };
}

// ---------------------------------------------------------------------------------------------
// Statistics of a crop

/** The area of a crop in one year. */
export interface CropYearAcres {
  year: number;
  acres: number;
}

/**
 * A crop in one county and one year, with the county values. All the rows of one county, crop
 * and year have the same county values.
 */
export interface CropCountyValues {
  countyFips: string;
  countyName: string;
  acres: number;
  /** How the crop class agrees with the county data: `none` = no county revenue. */
  econMatch: EconMatch;
  mainCommodity: string | null;
  /** County average revenue for each acre, USD. */
  revenuePerAcreCountyUsd: number | null;
  yieldPerAcre: number | null;
  yieldUnit: string | null;
  pricePerUnitUsd: number | null;
}

/** One crop in one year, for the full state or for one county. */
export interface CropStats {
  cropCode: number;
  /** `null` = the code is not in the `crops` table. */
  cropName: string | null;
  year: number;
  /** `null` = the full state. */
  countyFips: string | null;
  countyName: string | null;
  acres: number;
  /** The number of blocks that contain the crop. */
  blocks: number;
  /** The number of blocks where the crop is the main crop. */
  mainCropBlocks: number;
  /** The sum of the estimated revenue. Only the acres with county revenue have a value. */
  estRevenueUsd: number;
  /** The acres that have an estimated revenue. */
  acresWithRevenue: number;
  /** State average revenue for each acre, USD. */
  revenuePerAcreStateUsd: number | null;
  /** Grain: the revenue is not reliable. */
  revenueUnreliable: boolean;
  /** Fallow land: no revenue. */
  noRevenue: boolean;
  /** The acres of the crop in each year of the data, the oldest first. */
  acresByYear: CropYearAcres[];
  /** Full state: the counties with the largest area of the crop, the largest first. One
   * county: only that county. Empty when the crop has no rows. */
  counties: CropCountyValues[];
}

/**
 * One crop in one year, for the full state or for one county (`countyFips`). A crop with no
 * rows gives zeros and empty lists.
 */
export async function getCropStats(
  cropCode: number,
  year: number,
  countyFips: string | null,
): Promise<CropStats> {
  const inCounty = countyFips === null ? undefined : eq(blockCrops.countyFips, countyFips);

  // One flagged row for each block, and its crop is the main crop. For the full state, the
  // flagged rows of the crop thus give the blocks. For one county, a block whose main crop is
  // also in another county can have the flag on the row of the other county: look for the
  // flagged row of the block in all the counties.
  const mainRow = alias(blockCrops, "main_row");
  const isMainCropRow =
    countyFips === null
      ? sql`${blockCrops.isBlockMainCrop}`
      : exists(
          db
            .select({ one: sql`1` })
            .from(mainRow)
            .where(
              and(
                eq(mainRow.year, blockCrops.year),
                eq(mainRow.blockId, blockCrops.blockId),
                eq(mainRow.cdlCode, blockCrops.cdlCode),
                sql`${mainRow.isBlockMainCrop}`,
              ),
            ),
        );

  // The "C" collation compares bytes: the count of the different block ids is faster.
  const blockKey = sql`${blockCrops.blockId} COLLATE "C"`;

  const totalsRequest = db
    .select({
      acres: sql<number>`coalesce(sum(${rowAcres}), 0)::float8`,
      blocks: sql<number>`count(DISTINCT ${blockKey})::int`,
      mainCropBlocks: sql<number>`count(DISTINCT ${blockKey}) FILTER (WHERE ${isMainCropRow})::int`,
      estRevenueUsd: sql<number>`coalesce(sum(${blockCrops.estRevenueUsd}), 0)::float8`,
      acresWithRevenue: sql<number>`coalesce(
        sum(${rowAcres}) FILTER (WHERE ${blockCrops.estRevenueUsd} IS NOT NULL), 0
      )::float8`,
      // One value for each crop and year.
      revenuePerAcreStateUsd: sql<number | null>`max(${blockCrops.revenuePerAcreStateUsd})`,
    })
    .from(blockCrops)
    .where(and(eq(blockCrops.year, year), eq(blockCrops.cdlCode, cropCode), inCounty));

  // All the rows of one county, crop and year have the same county values (checked for 2017
  // to 2022: 14,337 groups, no difference and no group with only some values null). `min`
  // thus gives that value.
  const countyAcres = sql<number>`sum(${rowAcres})::float8`;
  const countiesRequest = db
    .select({
      countyFips: blockCrops.countyFips,
      countyName: counties.countyName,
      acres: countyAcres,
      econMatch: sql<EconMatch>`min(${blockCrops.econMatch})`,
      mainCommodity: sql<string | null>`min(${blockCrops.mainCommodity})`,
      revenuePerAcreCountyUsd: sql<number | null>`min(${blockCrops.revenuePerAcreCountyUsd})`,
      yieldPerAcre: sql<number | null>`min(${blockCrops.yieldPerAcre})::float8`,
      yieldUnit: sql<string | null>`min(${blockCrops.yieldUnit})`,
      pricePerUnitUsd: sql<number | null>`min(${blockCrops.pricePerUnitUsd})::float8`,
    })
    .from(blockCrops)
    .innerJoin(counties, eq(counties.countyFips, blockCrops.countyFips))
    .where(and(eq(blockCrops.year, year), eq(blockCrops.cdlCode, cropCode), inCounty))
    .groupBy(blockCrops.countyFips, counties.countyName)
    .orderBy(desc(countyAcres), asc(blockCrops.countyFips))
    .limit(MAX_STAT_COUNTIES);

  const trendRequest = db
    .select({ year: blockCrops.year, acres: sql<number>`sum(${rowAcres})::float8` })
    .from(blockCrops)
    .where(and(eq(blockCrops.cdlCode, cropCode), inCounty))
    .groupBy(blockCrops.year);

  const [[totals], countyRows, trendRows, years, cropName, countyName] = await Promise.all([
    totalsRequest,
    countiesRequest,
    trendRequest,
    getDataYears(),
    getCropName(cropCode),
    getCountyName(countyFips),
  ]);

  // A year of the data with no rows of the crop has 0 acres.
  const acresOfYear = new Map(trendRows.map((row) => [row.year, row.acres]));

  return {
    cropCode,
    cropName,
    year,
    countyFips,
    countyName,
    acres: Math.round(totals?.acres ?? 0),
    blocks: totals?.blocks ?? 0,
    mainCropBlocks: totals?.mainCropBlocks ?? 0,
    estRevenueUsd: Math.round(totals?.estRevenueUsd ?? 0),
    acresWithRevenue: Math.round(totals?.acresWithRevenue ?? 0),
    revenuePerAcreStateUsd: totals?.revenuePerAcreStateUsd ?? null,
    revenueUnreliable: UNRELIABLE_REVENUE_CROP_CODES.includes(cropCode),
    noRevenue: cropCode === FALLOW_CROP_CODE,
    acresByYear: years.map((dataYear) => ({
      year: dataYear,
      acres: Math.round(acresOfYear.get(dataYear) ?? 0),
    })),
    counties: countyRows.map((row) => ({ ...row, acres: Math.round(row.acres) })),
  };
}
