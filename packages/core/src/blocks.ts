import type { Feature, FeatureCollection, Polygon } from "geojson";

import { blockSquare } from "./block-grid.ts";
import type { BBox } from "./types.ts";

/**
 * The largest number of blocks in one answer. The limit is for the blocks of one year:
 * California has 86,623 blocks in 2017 and 109,490 in 2018, so the full state is one answer.
 * The limit protects the browser, and it keeps the answer below the size limit of the host.
 */
export const MAX_BLOCKS = 115_000;

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
 */
export interface BlockProperties {
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
 */
export function blockFeatures(rows: readonly BlockRow[]): BlockFeatureCollection {
  const features: BlockFeature[] = [];
  for (const [id, crop, share, crops, acres, revenue, storie] of rows) {
    const geometry = blockSquare(id);
    if (!geometry) continue;
    const properties: BlockProperties = { id, crop, share, crops, acres };
    // A block without a value does not have the property. The map shows it as "no data".
    if (revenue !== null) properties.revenue = revenue;
    if (storie !== null) properties.storie = storie;
    features.push({ type: "Feature", geometry, properties });
  }
  return { type: "FeatureCollection", features };
}

/**
 * The answer to a request for the blocks of a map area.
 * - `ok`: one row for each block.
 * - `tooMany`: the area contains more than `limit` blocks. The user must zoom in.
 */
export type BlocksResponse =
  | { status: "ok"; rows: BlockRow[] }
  | { status: "tooMany"; count: number; limit: number };
