import type { Polygon } from "geojson";

/** Bounding box in degrees (WGS84). */
export type BBox = readonly [west: number, south: number, east: number, north: number];

/**
 * A block of 990 m x 990 m. The id is `<block_col>_<block_row>` on the national grid of the
 * Cropland Data Layer and is the same in all years. The geometry is a GeoJSON polygon in WGS84.
 */
export interface Block {
  id: string;
  geometry: Polygon;
}
