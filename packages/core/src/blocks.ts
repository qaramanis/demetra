import type { Feature, FeatureCollection, Polygon } from "geojson";

import type { BBox } from "./types.ts";

/**
 * The largest number of blocks in one answer. California has 86,623 blocks, so the full
 * state is one answer. The limit protects the browser when more data is loaded.
 */
export const MAX_BLOCKS = 100_000;

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
 * The answer to a request for the blocks of a map area.
 * - `ok`: the blocks.
 * - `tooMany`: the area contains more than `limit` blocks. The user must zoom in.
 */
export type BlocksResponse =
  | { status: "ok"; blocks: BlockFeatureCollection }
  | { status: "tooMany"; count: number; limit: number };
