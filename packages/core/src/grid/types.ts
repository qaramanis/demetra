import type { Polygon } from "geojson";

import type { BBox } from "../types.ts";

export const GRID_IDS = ["utm", "eea"] as const;

export type GridId = (typeof GRID_IDS)[number];

export interface GridCell {
  /** Stable id of the cell. The same cell has the same id in each request. */
  id: string;
  /** The cell as a GeoJSON polygon in WGS84. */
  geometry: Polygon;
}

export interface GridDef {
  id: GridId;
  /** Coordinate reference system of the grid lines. */
  crs: string;
  /** Cell sizes in metres, largest first. Each size divides the larger sizes exactly. */
  cellSizes: readonly number[];
  /** The area in which the grid is valid. */
  coverage: BBox;
  /** The cells that have their centre in the bounding box. */
  cells(bbox: BBox, cellSize: number): GridCell[];
}
