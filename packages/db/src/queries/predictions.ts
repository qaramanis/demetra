import { MAX_BLOCKS, NO_PREDICTION_CROP_CODE, predictionRow } from "@demetra/core";
import type {
  BlockPrediction,
  BlocksQuery,
  CropScore,
  PredictionRow,
  PredictionsResponse,
} from "@demetra/core";
import { and, desc, eq, exists, sql } from "drizzle-orm";

import { db } from "../client.ts";
import { blockCrops, blockPredictions, blocks } from "../schema.ts";

/**
 * The crop predictions of the model team (table `block_predictions`). A prediction is for a
 * year after the newest year of the real data. See `prediction.ts` of `@demetra/core`.
 */

/** The years that have predictions, the newest first. */
export async function getPredictionYears(): Promise<number[]> {
  const rows = await db
    .selectDistinct({ year: blockPredictions.year })
    .from(blockPredictions)
    .orderBy(desc(blockPredictions.year));
  return rows.map((row) => row.year);
}

/** `true` when the year has predictions. */
async function hasPredictions(year: number): Promise<boolean> {
  const rows = await db
    .select({ year: blockPredictions.year })
    .from(blockPredictions)
    .where(eq(blockPredictions.year, year))
    .limit(1);
  return rows.length > 0;
}

/**
 * The predicted blocks of a map area, with the filters of the map. The result is `null` when
 * the year has no predictions.
 *
 * - Crop filter: the blocks with that predicted crop.
 * - County filter: the blocks that have cropland in the county in the newest year of the real
 *   data. A prediction has no counties.
 *
 * The answer has no shapes, as the answer of `getBlocks`.
 */
export async function getPredictedBlocks(query: BlocksQuery): Promise<PredictionsResponse | null> {
  const [west, south, east, north] = query.bbox;
  const { year, cropCode, countyFips } = query.filters;

  // `&&` compares bounding boxes and uses the spatial index of `blocks.geom`.
  const inArea = sql`${blocks.geom} && ST_MakeEnvelope(${west}, ${south}, ${east}, ${north}, 4326)`;
  const inCounty =
    countyFips === null
      ? undefined
      : exists(
          db
            .select({ one: sql`1` })
            .from(blockCrops)
            .where(
              and(
                eq(blockCrops.year, sql`(SELECT max(${blockCrops.year}) FROM ${blockCrops})`),
                eq(blockCrops.countyFips, countyFips),
                eq(blockCrops.blockId, blockPredictions.blockId),
              ),
            ),
        );
  const conditions = and(
    eq(blockPredictions.year, year),
    inArea,
    cropCode === null ? undefined : eq(blockPredictions.cdlCode, cropCode),
    inCounty,
  );

  // One row more than the limit tells that the area has too many blocks.
  const values = await db
    .select({
      id: blockPredictions.blockId,
      crop: sql<number>`coalesce(${blockPredictions.cdlCode}, ${NO_PREDICTION_CROP_CODE})::int`,
      score: blockPredictions.score,
    })
    .from(blockPredictions)
    .innerJoin(blocks, eq(blocks.blockId, blockPredictions.blockId))
    .where(conditions)
    .limit(MAX_BLOCKS + 1);

  if (values.length > MAX_BLOCKS) {
    const [total] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(blockPredictions)
      .innerJoin(blocks, eq(blocks.blockId, blockPredictions.blockId))
      .where(conditions);
    return { status: "tooMany", count: total?.count ?? values.length, limit: MAX_BLOCKS };
  }

  // An area with no blocks is a correct answer. A year with no predictions is not.
  if (values.length === 0 && !(await hasPredictions(year))) return null;

  const rows: PredictionRow[] = values.map(predictionRow);
  return { status: "ok", rows };
}

/**
 * The prediction for one block, with the next crops of the model. The result is `null` when
 * the year has no predictions. `crop: null` = the year has no row for the block.
 */
export async function getBlockPrediction(
  id: string,
  year: number,
): Promise<BlockPrediction | null> {
  const [row] = await db
    .select({
      crop: blockPredictions.cdlCode,
      score: blockPredictions.score,
      crop2: blockPredictions.cdlCode2,
      score2: blockPredictions.score2,
      crop3: blockPredictions.cdlCode3,
      score3: blockPredictions.score3,
    })
    .from(blockPredictions)
    .where(and(eq(blockPredictions.year, year), eq(blockPredictions.blockId, id)));

  if (!row) {
    if (!(await hasPredictions(year))) return null;
    return { id, year, crop: null, score: null, alternatives: [] };
  }

  const alternatives: CropScore[] = [];
  for (const [crop, score] of [
    [row.crop2, row.score2],
    [row.crop3, row.score3],
  ] as const) {
    if (crop !== null && score !== null) alternatives.push({ crop, score });
  }

  return {
    id,
    year,
    crop: row.crop ?? NO_PREDICTION_CROP_CODE,
    score: row.score,
    alternatives,
  };
}
