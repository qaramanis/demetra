import { bboxSizeM } from "../geo.ts";
import type { BBox, GridRef } from "../types.ts";
import { eeaGrid } from "./eea.ts";
import type { GridDef, GridId } from "./types.ts";
import { utmGrid } from "./utm.ts";

export { cellSizeLabel, MAX_LATTICE_CELLS } from "./lattice.ts";
export { createProjectedGrid } from "./projected.ts";
export type { ProjectedGridOptions } from "./projected.ts";
export { utmZone } from "./utm.ts";

/**
 * The grids that the application can show.
 *
 * To add a grid for a new raster dataset: add its id to `GRID_IDS` in `./types.ts`, make
 * the grid with `createProjectedGrid`, and add it here.
 */
export const GRIDS: Record<GridId, GridDef> = {
  utm: utmGrid,
  eea: eeaGrid,
};

export const DEFAULT_GRID: GridRef = { gridId: "utm", cellSize: 1000 };

/** `true` when the centre of the bounding box is in the area of the grid. */
export function gridCovers(gridId: GridId, bbox: BBox): boolean {
  const [west, south, east, north] = GRIDS[gridId].coverage;
  const lon = (bbox[0] + bbox[2]) / 2;
  const lat = (bbox[1] + bbox[3]) / 2;
  return lon >= west && lon <= east && lat >= south && lat <= north;
}

/** Approximate number of cells in a bounding box. Use it before a request for the cells. */
export function estimateCellCount(bbox: BBox, cellSize: number): number {
  const [width, height] = bboxSizeM(bbox);
  return Math.round((width * height) / (cellSize * cellSize));
}
