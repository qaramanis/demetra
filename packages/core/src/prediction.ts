import type { Feature, FeatureCollection, Polygon } from "geojson";

import { blockSquare } from "./block-grid.ts";
import type { BlockProperties, BlocksResponse } from "./blocks.ts";

/**
 * The predictions of the model team.
 *
 * The model team trains its models on the analysis file of the data pipeline: one row for each
 * block and year, with the majority crop `crop_type`. Its prediction has one row for each block
 * for a year that has no real data. The model team calculates the predictions before, and the
 * data pipeline loads them into the table `block_predictions`. The application only reads them.
 *
 * A predicted crop has a different rule from the main crop of the real data. The main crop of
 * the real data is the crop class with the most cells. A predicted crop is the crop class with
 * the largest area only when that class has more than 30% of the full block (`crop_type` of the
 * analysis file; `fallow` is Fallow/Idle Cropland).
 *
 * The model of 2023 (ExtraTrees) predicts only the blocks that have a majority crop in each of
 * the three years before. The other blocks have no prediction.
 *
 * The model also gives a score from 0 to 1 for the predicted crop and for the next crops. A
 * higher score means that the model is more certain. A score is not an exact probability.
 */

/**
 * The code of a block for which the model has no prediction. The codes of the Cropland Data
 * Layer are from 0 to 255, so no crop class has this code.
 */
export const NO_PREDICTION_CROP_CODE = -1;

/**
 * The model predicts a block only when the block has a majority crop (`crop_type` is not
 * `undefined`) in each of this number of years before the predicted year. The status of the
 * other blocks in the file of the model team is INSUFFICIENT_CROP_HISTORY. This rule is from
 * the file of 2023: it agrees with all its 76,772 rows.
 */
export const PREDICTION_HISTORY_YEARS = 3;

/**
 * One block in the answer of the server: the block id, the code of the predicted crop and its
 * model score. `score: null` = no score (a block with no prediction).
 */
export type PredictionRow = [id: string, crop: number, score: number | null];

/**
 * The answer to a request for the predicted blocks of a map area.
 * - `ok`: one row for each block.
 * - `tooMany`: the area contains more than `limit` blocks, as for the real data.
 */
export type PredictionsResponse =
  | { status: "ok"; rows: PredictionRow[] }
  | Extract<BlocksResponse, { status: "tooMany" }>;

/** A crop that the model gives for a block, with its model score (0 to 1). */
export interface CropScore {
  crop: number;
  score: number;
}

/**
 * The prediction for one block.
 * - `crop`: the code of the predicted crop, or `NO_PREDICTION_CROP_CODE`. `null` = the
 *   prediction file has no row for the block.
 * - `score`: the model score of `crop`, or `null`.
 * - `alternatives`: the next crops of the model, the highest score first.
 */
export interface BlockPrediction {
  id: string;
  year: number;
  crop: number | null;
  score: number | null;
  alternatives: CropScore[];
}

/** The values of one predicted block on the map. */
export interface PredictedBlockProperties {
  id: string;
  /** Code of the predicted crop, or `NO_PREDICTION_CROP_CODE`. */
  crop: number;
  /** The model score of the predicted crop (0 to 1). Absent when there is no prediction. */
  score?: number;
  predicted: true;
}

/** The values of a block on the map: real data, or a prediction. */
export type MapBlockProperties = BlockProperties | PredictedBlockProperties;

export type MapBlockFeatureCollection = FeatureCollection<Polygon, MapBlockProperties>;

/** `true` for a block of a prediction. */
export function isPredictedBlock(
  properties: MapBlockProperties,
): properties is PredictedBlockProperties {
  return "predicted" in properties;
}

/** The decimal places of a score in the answer for a map area: the tooltip shows two. */
const ROW_SCORE_DECIMALS = 2;

/** The row of a predicted block, for the answer of the server. */
export function predictionRow(block: {
  id: string;
  crop: number;
  score: number | null;
}): PredictionRow {
  const score = block.score === null ? null : Number(block.score.toFixed(ROW_SCORE_DECIMALS));
  return [block.id, block.crop, score];
}

/**
 * The predicted blocks of an answer as GeoJSON for the map. The shape of each block is
 * calculated from its id, as for the real data (`blockFeatures`).
 */
export function predictionFeatures(
  rows: readonly PredictionRow[],
): FeatureCollection<Polygon, PredictedBlockProperties> {
  const features: Feature<Polygon, PredictedBlockProperties>[] = [];
  for (const [id, crop, score] of rows) {
    const geometry = blockSquare(id);
    if (!geometry) continue;
    const properties: PredictedBlockProperties = { id, crop, predicted: true };
    // A block without a score does not have the property.
    if (score !== null) properties.score = score;
    features.push({ type: "Feature", geometry, properties });
  }
  return { type: "FeatureCollection", features };
}
