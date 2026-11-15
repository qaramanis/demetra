import type { Feature, FeatureCollection, Polygon } from "geojson";

import { blockCenter, blockSquare } from "./block-grid.ts";
import { climateAt } from "./climate.ts";
import type { ClimateIndex, ClimateValues } from "./climate.ts";
import type { BBox } from "./types.ts";

/**
 * The largest number of blocks in one answer. The limit is for the blocks of one year:
 * California has from 86,623 blocks (2017) to 135,573 blocks (2022). For 2017 to 2021 the
 * full state is one answer with all the blocks. The limit protects the browser, and it keeps the answer below the size limit
 * of the host (4.5 MB): a block has approximately 36 bytes in the answer, so 120,000 blocks
 * have 4.3 MB. Do not increase the limit more than this.
 */
export const MAX_BLOCKS = 120_000;

/**
 * A view with more blocks than `MAX_BLOCKS` does not show the smallest blocks: the answer
 * then has only the blocks with this number of crop cells or more. A block has 1,089 cells,
 * and many blocks have very little cropland: in 2022, 44,645 of the 135,573 blocks have
 * fewer than 5 crop cells, with less than 0.2% of the crop cells of the state.
 */
export const MIN_CROP_CELLS_IN_LARGE_VIEW = 5;

/** The blocks that an answer does not have, because the view has too many blocks. */
export interface SmallBlocksOmitted {
  /** The answer has only the blocks with this number of crop cells or more. */
  minCropCells: number;
  /** The number of blocks that are not in the answer. */
  count: number;
}

/** The filters of the map. `null` = no filter. */
export interface BlockFilters {
  year: number;
  /** Code of a crop class of the Cropland Data Layer, for example 75 for almonds. */
  cropCode: number | null;
  /** FIPS code of a county, for example "06019" for Fresno. */
  countyFips: string | null;
}

export interface BlocksQuery {
  bbox: BBox;
  filters: BlockFilters;
}

/**
 * The values of one block on the map.
 *
 * A block has more than one crop. The values are for the crops of the block that agree with
 * the filters: all crops or one crop class, in all counties or in one county.
 *
 * The climate values (`ClimateValues`) are for the year of the filters. They are the values
 * of the climate cell of the block, and they do not depend on the crops. They are absent when
 * the climate of the year is not available.
 */
export interface BlockProperties extends Partial<ClimateValues> {
  id: string;
  /** Code of the main crop: the crop class with the largest area. */
  crop: number;
  /** Area of the main crop as a fraction (0 to 1) of all the cropland of the block. */
  share: number;
  /** Number of crop classes. */
  crops: number;
  /** Acres of the crops that agree with the filters. */
  acres: number;
  /**
   * Estimated revenue in US dollars for each acre, from the crops that have revenue data.
   * Absent when no crop has revenue data (for example fallow land).
   */
  revenue?: number;
  /** Storie index (0 to 100): the mean of the crops, weighted by area. Absent when unknown. */
  storie?: number;
}

export type BlockFeature = Feature<Polygon, BlockProperties>;

export type BlockFeatureCollection = FeatureCollection<Polygon, BlockProperties>;

/**
 * One block in the answer of the server: the values of `BlockProperties` in this order.
 * `null` = no value.
 *
 * A row has no property names and no shape. The answer for the full state is then 3 MB and
 * not 25 MB, which is necessary for the size limits of the host. `blockRow` makes a row and
 * `blockFeatures` reads the rows: use only these two functions, so that the order of the
 * values is in one file.
 */
export type BlockRow = [
  id: string,
  crop: number,
  share: number,
  crops: number,
  acres: number,
  revenue: number | null,
  storie: number | null,
];

/** The row of a block, for the answer of the server. */
export function blockRow(properties: BlockProperties): BlockRow {
  const { id, crop, share, crops, acres, revenue, storie } = properties;
  return [id, crop, share, crops, acres, revenue ?? null, storie ?? null];
}

/**
 * The blocks of an answer as GeoJSON for the map. The shape of each block is calculated from
 * its id. A row that has no correct block id has no shape and is not in the result.
 *
 * `climate` has the climate cells of the year of the blocks. Each block then gets the values
 * of the cell that contains its center.
 */
export function blockFeatures(
  rows: readonly BlockRow[],
  climate?: ClimateIndex,
): BlockFeatureCollection {
  const features: BlockFeature[] = [];
  for (const [id, crop, share, crops, acres, revenue, storie] of rows) {
    const geometry = blockSquare(id);
    if (!geometry) continue;
    const properties: BlockProperties = { id, crop, share, crops, acres };
    // A block without a value does not have the property. The map shows it as "no data".
    if (revenue !== null) properties.revenue = revenue;
    if (storie !== null) properties.storie = storie;
    if (climate) {
      const center = blockCenter(id);
      const values = center ? climateAt(climate, center[0], center[1]) : undefined;
      if (values) Object.assign(properties, values);
    }
    features.push({ type: "Feature", geometry, properties });
  }
  return { type: "FeatureCollection", features };
}

/**
 * The answer to a request for the blocks of a map area.
 * - `ok`: one row for each block. When the area contains more than `MAX_BLOCKS` blocks, the
 *   answer has only the larger blocks, and `smallBlocksOmitted` tells how many are not in it.
 * - `tooMany`: the area contains more than `limit` blocks, also without the small blocks. The
 *   user must zoom in.
 */
export type BlocksResponse =
  | { status: "ok"; rows: BlockRow[]; smallBlocksOmitted?: SmallBlocksOmitted }
  | { status: "tooMany"; count: number; limit: number };
