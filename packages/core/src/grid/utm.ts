import proj4, { type Converter } from "proj4";

import type { BBox } from "../types.ts";
import { cellSizeLabel, latticeCells } from "./lattice.ts";
import type { GridCell, GridDef } from "./types.ts";

/** UTM is not defined nearer to the poles than these latitudes. */
const MIN_LATITUDE = -80;
const MAX_LATITUDE = 84;
const ZONE_WIDTH = 6;

const converters = new Map<string, Converter>();

function utmConverter(zone: number, south: boolean): Converter {
  const key = `${zone}${south ? "S" : "N"}`;
  let converter = converters.get(key);
  if (!converter) {
    converter = proj4(
      "WGS84",
      `+proj=utm +zone=${zone}${south ? " +south" : ""} +datum=WGS84 +units=m +no_defs`,
    );
    converters.set(key, converter);
  }
  return converter;
}

/** UTM zone number (1–60) of a longitude. */
export function utmZone(lon: number): number {
  return Math.min(60, Math.max(1, Math.floor((lon + 180) / ZONE_WIDTH) + 1));
}

function zoneCells(
  zone: number,
  south: boolean,
  bbox: BBox,
  cellSize: number,
): GridCell[] {
  const zoneWest = (zone - 1) * ZONE_WIDTH - 180;
  const zoneEast = zoneWest + ZONE_WIDTH;
  const part: BBox = [
    Math.max(bbox[0], zoneWest),
    Math.max(bbox[1], south ? MIN_LATITUDE : 0),
    Math.min(bbox[2], zoneEast),
    Math.min(bbox[3], south ? 0 : MAX_LATITUDE),
  ];
  const converter = utmConverter(zone, south);
  const prefix = `${zone}${south ? "S" : "N"}-${cellSizeLabel(cellSize)}`;
  return latticeCells(
    {
      forward: (lon, lat) => converter.forward([lon, lat]) as [number, number],
      inverse: (x, y) => converter.inverse([x, y]) as [number, number],
      origin: [0, 0],
      // A cell belongs to the zone and the hemisphere that contain its centre.
      accepts: (lon, lat) =>
        lon >= zoneWest && lon < zoneEast && (south ? lat < 0 : lat >= 0),
      cellId: (ix, iy) => `${prefix}E${ix}N${iy}`,
    },
    part,
    cellSize,
  );
}

/**
 * A global grid of square cells: the UTM zones of WGS84, with cell corners at multiples of
 * the cell size. Sentinel-2 rasters use the same coordinates, so a cell contains whole
 * Sentinel-2 pixels.
 *
 * Cell ids are "<zone><N|S>-<size>E<ix>N<iy>", for example "34N-1kmE621N4388" in Larissa.
 *
 * At the limit between two zones the cells of the two zones do not fit exactly.
 */
export const utmGrid: GridDef = {
  id: "utm",
  crs: "UTM (WGS84)",
  cellSizes: [1000, 100, 10],
  coverage: [-180, MIN_LATITUDE, 180, MAX_LATITUDE],
  cells(bbox: BBox, cellSize: number): GridCell[] {
    const west = Math.max(-180, bbox[0]);
    const east = Math.min(180, bbox[2]);
    const south = Math.max(MIN_LATITUDE, bbox[1]);
    const north = Math.min(MAX_LATITUDE, bbox[3]);
    if (!(east > west) || !(north > south)) return [];
    const clipped: BBox = [west, south, east, north];

    const cells: GridCell[] = [];
    // The last zone that the box touches. An east edge exactly on a zone limit is not in the next zone.
    const lastZone = utmZone(Math.max(west, east - 1e-9));
    for (let zone = utmZone(west); zone <= lastZone; zone++) {
      if (north > 0) cells.push(...zoneCells(zone, false, clipped, cellSize));
      if (south < 0) cells.push(...zoneCells(zone, true, clipped, cellSize));
    }
    return cells;
  },
};
