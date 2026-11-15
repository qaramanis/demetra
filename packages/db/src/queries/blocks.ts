import { MAX_BLOCKS, blockRow } from "@demetra/core";
import type { BlockProperties, BlockRow, BlocksQuery, BlocksResponse } from "@demetra/core";
import { and, eq, sql } from "drizzle-orm";

import { db } from "../client.ts";
import { blockCrops, blocks } from "../schema.ts";

/**
 * The blocks of a map area, each with the values of its crops that agree with the filters.
 *
 * A block has one row for each county and crop class. The query adds the rows of each crop
 * class first, because a block on a county border has the same crop in two counties. Then it
 * makes one row for each block.
 *
 * The answer has no shapes. The id of a block gives its square, and the browser calculates
 * it (`blockSquare` in `@demetra/core`). With the shapes, the answer for the full state is
 * too large for the host.
 */
export async function getBlocks(query: BlocksQuery): Promise<BlocksResponse> {
  const [west, south, east, north] = query.bbox;
  const { year, cropCode, countyFips } = query.filters;

  // `&&` compares bounding boxes and uses the spatial index of `blocks.geom`.
  const inArea = sql`${blocks.geom} && ST_MakeEnvelope(${west}, ${south}, ${east}, ${north}, 4326)`;

  // The limit is for the blocks of the selected year: the `blocks` table has the blocks of all
  // the years, and a block is not in each year. In a year, a block has one row that is its main
  // crop, so these rows give the number of blocks. The index `block_crops_main_idx` has them.
  const [total] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(blockCrops)
    .innerJoin(blocks, eq(blocks.blockId, blockCrops.blockId))
    .where(and(eq(blockCrops.year, year), eq(blockCrops.isBlockMainCrop, true), inArea));
  const count = total?.count ?? 0;
  if (count > MAX_BLOCKS) return { status: "tooMany", count, limit: MAX_BLOCKS };
  if (count === 0) return { status: "ok", rows: [] };

  // The "C" collation compares bytes. The sort of the block ids is then much faster than
  // with the collation of the database, and the order of the groups is not important.
  const blockKey = sql<string>`${blockCrops.blockId} COLLATE "C"`;

  // Level 1: one row for each block and crop class.
  const perCrop = db
    .select({
      blockId: blockKey.as("block_key"),
      cdlCode: blockCrops.cdlCode,
      cells: sql<number>`sum(${blockCrops.cells})`.as("crop_cells"),
      share: sql<number>`sum(${blockCrops.shareOfBlockCropland})`.as("crop_share"),
      acres: sql<number>`sum(${blockCrops.acres})`.as("crop_acres"),
      revenue: sql<number | null>`sum(${blockCrops.estRevenueUsd})`.as("revenue_usd"),
      revenueAcres: sql<
        number | null
      >`sum(${blockCrops.acres}) FILTER (WHERE ${blockCrops.estRevenueUsd} IS NOT NULL)`.as(
        "revenue_acres",
      ),
      storieWeighted: sql<number | null>`sum(${blockCrops.storieIndex} * ${blockCrops.acres})`.as(
        "storie_weighted",
      ),
      storieAcres: sql<
        number | null
      >`sum(${blockCrops.acres}) FILTER (WHERE ${blockCrops.storieIndex} IS NOT NULL)`.as(
        "storie_acres",
      ),
    })
    .from(blockCrops)
    .innerJoin(blocks, eq(blocks.blockId, blockCrops.blockId))
    .where(
      and(
        eq(blockCrops.year, year),
        inArea,
        cropCode === null ? undefined : eq(blockCrops.cdlCode, cropCode),
        countyFips === null ? undefined : eq(blockCrops.countyFips, countyFips),
      ),
    )
    .groupBy(blockKey, blockCrops.cdlCode)
    .as("per_crop");

  // The main crop is the crop class with the most cells. PostgreSQL compares arrays value by
  // value, so the largest array is [most cells, lowest code of these, share of that crop].
  // The cell count is exact: the acres are rounded. When two crop classes have the same
  // number of cells, the lower code is the main crop, as in the data pipeline. Without
  // filters the result is equal to `is_block_main_crop` for all blocks.
  const mainCrop = sql`max(ARRAY[
    ${perCrop.cells}::float8, -${perCrop.cdlCode}::float8, ${perCrop.share}::float8
  ])`;

  // Level 2: one row for each block. The casts give JavaScript numbers, not text.
  const values = await db
    .select({
      id: perCrop.blockId,
      crop: sql<number>`(-(${mainCrop})[2])::int`,
      // The shares of the rows are rounded, so their sum can be a small quantity above 1.
      share: sql<number>`round(least((${mainCrop})[3], 1)::numeric, 3)::float8`,
      crops: sql<number>`count(*)::int`,
      acres: sql<number>`round(sum(${perCrop.acres})::numeric, 1)::float8`,
      revenue: sql<
        number | null
      >`round(sum(${perCrop.revenue}) / nullif(sum(${perCrop.revenueAcres}), 0))::int`,
      storie: sql<
        number | null
      >`round(sum(${perCrop.storieWeighted}) / nullif(sum(${perCrop.storieAcres}), 0))::int`,
    })
    .from(perCrop)
    .groupBy(perCrop.blockId);

  const rows: BlockRow[] = [];
  for (const row of values) {
    const properties: BlockProperties = {
      id: row.id,
      crop: row.crop,
      share: row.share,
      crops: row.crops,
      acres: row.acres,
    };
    // A block without a value does not have the property. The map shows it as "no data".
    if (row.revenue !== null) properties.revenue = row.revenue;
    if (row.storie !== null) properties.storie = row.storie;
    rows.push(blockRow(properties));
  }

  return { status: "ok", rows };
}
