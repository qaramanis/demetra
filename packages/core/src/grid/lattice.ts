import type { Position } from "geojson";

import type { BBox } from "../types.ts";
import type { GridCell } from "./types.ts";

/**
 * A square lattice in a projected coordinate system (metres).
 *
 * Cell (ix, iy) covers x from `originX + ix * cellSize` to `originX + (ix + 1) * cellSize`,
 * and the same for y. When the origin and the cell size agree with the pixels of a raster,
 * each cell contains a whole number of pixels.
 */
export interface Lattice {
  /** Longitude and latitude (degrees) to grid coordinates (metres). */
  forward(lon: number, lat: number): [x: number, y: number];
  /** Grid coordinates (metres) to longitude and latitude (degrees). */
  inverse(x: number, y: number): [lon: number, lat: number];
  /** x and y of the corner of cell (0, 0). */
  origin: readonly [x: number, y: number];
  /** An extra condition on the centre of a cell, for example the limits of a UTM zone. */
  accepts?(lon: number, lat: number): boolean;
  cellId(ix: number, iy: number): string;
}

/** A request for more cells than this is an error of the caller. */
export const MAX_LATTICE_CELLS = 400_000;

/** The edges of a bounding box are curves in grid coordinates. Sample each edge. */
const EDGE_SAMPLES = 8;

/** The cells of a lattice that have their centre in the bounding box. */
export function latticeCells(lattice: Lattice, bbox: BBox, cellSize: number): GridCell[] {
  const [west, south, east, north] = bbox;
  if (!(east > west) || !(north > south) || !(cellSize > 0)) return [];
  const [originX, originY] = lattice.origin;

  // 1. The extent of the bounding box in grid coordinates.
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i <= EDGE_SAMPLES; i++) {
    const f = i / EDGE_SAMPLES;
    const lon = west + (east - west) * f;
    const lat = south + (north - south) * f;
    const samples: [number, number][] = [
      [lon, south],
      [lon, north],
      [west, lat],
      [east, lat],
    ];
    for (const [sampleLon, sampleLat] of samples) {
      const [x, y] = lattice.forward(sampleLon, sampleLat);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return [];

  const ix0 = Math.floor((minX - originX) / cellSize);
  const ix1 = Math.ceil((maxX - originX) / cellSize);
  const iy0 = Math.floor((minY - originY) / cellSize);
  const iy1 = Math.ceil((maxY - originY) / cellSize);
  const nx = ix1 - ix0;
  const ny = iy1 - iy0;
  if (nx <= 0 || ny <= 0) return [];
  if (nx * ny > MAX_LATTICE_CELLS) {
    throw new RangeError(
      `The bounding box contains about ${nx * ny} cells of ${cellSize} m. The limit is ${MAX_LATTICE_CELLS}.`,
    );
  }

  // 2. Each corner of the lattice, one time. Adjacent cells share their corners.
  const columns = nx + 1;
  const lons = new Float64Array(columns * (ny + 1));
  const lats = new Float64Array(columns * (ny + 1));
  for (let j = 0; j <= ny; j++) {
    for (let i = 0; i <= nx; i++) {
      const [lon, lat] = lattice.inverse(
        originX + (ix0 + i) * cellSize,
        originY + (iy0 + j) * cellSize,
      );
      lons[j * columns + i] = lon;
      lats[j * columns + i] = lat;
    }
  }
  const corner = (index: number): Position => [lons[index] as number, lats[index] as number];

  // 3. The cells.
  const cells: GridCell[] = [];
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const sw = j * columns + i;
      const se = sw + 1;
      const nw = sw + columns;
      const ne = nw + 1;
      const lon =
        ((lons[sw] as number) + (lons[se] as number) + (lons[ne] as number) + (lons[nw] as number)) /
        4;
      const lat =
        ((lats[sw] as number) + (lats[se] as number) + (lats[ne] as number) + (lats[nw] as number)) /
        4;
      if (lon < west || lon >= east || lat < south || lat >= north) continue;
      if (lattice.accepts && !lattice.accepts(lon, lat)) continue;
      cells.push({
        id: lattice.cellId(ix0 + i, iy0 + j),
        geometry: {
          type: "Polygon",
          // Counterclockwise outer ring, as RFC 7946 specifies.
          coordinates: [[corner(sw), corner(se), corner(ne), corner(nw), corner(sw)]],
        },
      });
    }
  }
  return cells;
}

/** "1km", "100m", "10m". */
export function cellSizeLabel(cellSize: number): string {
  return cellSize >= 1000 && cellSize % 1000 === 0 ? `${cellSize / 1000}km` : `${cellSize}m`;
}
