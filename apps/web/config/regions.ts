import type { BBox } from "@demetra/core";

/** The id of the map in `MapProvider`. */
export const MAP_ID = "fieldMap";

/**
 * The area that has data: California. It is also the first view of the map.
 *
 * All the blocks must be in this area: the map requests no blocks outside it. The blocks of
 * 2017 to 2022 are from -124.418 to -114.134 degrees of longitude and from 32.530 to 42.016
 * degrees of latitude. After the load of a new year, make sure that this is still correct.
 */
export const DATA_BOUNDS: BBox = [-124.45, 32.5, -114.1, 42.05];
