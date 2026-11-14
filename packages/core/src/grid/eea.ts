import { createProjectedGrid } from "./projected.ts";

/**
 * The EEA reference grid: ETRS89-LAEA Europe (EPSG:3035), with its origin at x = 0, y = 0.
 *
 * The Copernicus High Resolution Layers (crop types, fallow land, cropping seasons) are 10 m
 * rasters in this coordinate system, so a cell of this grid contains whole pixels of those
 * rasters: 100 × 100 pixels in a 1 km cell.
 *
 * Cell ids are the EEA cell codes, for example "1kmE5387N1926" in Larissa: the cell size, then the
 * easting and the northing of the south-west corner in units of the cell size.
 *
 * If your raster has a different origin or coordinate system, add a grid for it with
 * `createProjectedGrid` in `./index.ts`.
 */
export const eeaGrid = createProjectedGrid({
  id: "eea",
  crs: "EPSG:3035",
  proj4def:
    "+proj=laea +lat_0=52 +lon_0=10 +x_0=4321000 +y_0=3210000 +ellps=GRS80 +units=m +no_defs",
  origin: [0, 0],
  cellSizes: [1000, 100, 10],
  // Europe, from the Canary Islands and Iceland to Turkey.
  coverage: [-32, 27, 45, 72],
});
