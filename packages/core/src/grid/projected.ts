import proj4 from "proj4";

import type { BBox } from "../types.ts";
import { cellSizeLabel, latticeCells } from "./lattice.ts";
import type { GridCell, GridDef, GridId } from "./types.ts";

export interface ProjectedGridOptions {
  id: GridId;
  /** Name of the coordinate reference system, for example "EPSG:3035". */
  crs: string;
  /** proj4 definition of the coordinate reference system. */
  proj4def: string;
  /**
   * x and y (metres) of a corner of a cell. For a grid that must agree with a raster, use a
   * corner of a pixel of the raster.
   */
  origin?: readonly [x: number, y: number];
  cellSizes: readonly number[];
  coverage: BBox;
  /** The id of cell (ix, iy). The default is "<size>E<ix>N<iy>". */
  cellId?: (ix: number, iy: number, cellSize: number) => string;
}

function intersect(a: BBox, b: BBox): BBox {
  return [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.min(a[2], b[2]), Math.min(a[3], b[3])];
}

/**
 * A grid of square cells in one projected coordinate system.
 *
 * Use this function to add a grid that agrees with a raster dataset: give the coordinate
 * reference system of the raster, a corner of one of its pixels, and cell sizes that are
 * multiples of its pixel size.
 */
export function createProjectedGrid(options: ProjectedGridOptions): GridDef {
  const converter = proj4("WGS84", options.proj4def);
  const origin = options.origin ?? [0, 0];
  const cellId =
    options.cellId ??
    ((ix: number, iy: number, cellSize: number) => `${cellSizeLabel(cellSize)}E${ix}N${iy}`);

  return {
    id: options.id,
    crs: options.crs,
    cellSizes: options.cellSizes,
    coverage: options.coverage,
    cells(bbox: BBox, cellSize: number): GridCell[] {
      return latticeCells(
        {
          forward: (lon, lat) => converter.forward([lon, lat]) as [number, number],
          inverse: (x, y) => converter.inverse([x, y]) as [number, number],
          origin,
          cellId: (ix, iy) => cellId(ix, iy, cellSize),
        },
        intersect(bbox, options.coverage),
        cellSize,
      );
    },
  };
}
