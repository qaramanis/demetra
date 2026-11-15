import type { Polygon, Position } from "geojson";

/**
 * The shape of a block, calculated from its id.
 *
 * A block is a square of 990 m on the national grid of the Cropland Data Layer, in EPSG:5070
 * (NAD83 / Conus Albers). The id of a block is `<block_col>_<block_row>`, so the id gives the
 * position of the square. The answer of the server for a map area thus has no shapes: the
 * browser calculates them here. With the shapes, the answer for the full state has 25 MB.
 * Without them it has 3 MB.
 *
 * The data pipeline makes the same squares for the column `blocks.geom`. For all the 156,163
 * blocks of the database (2017 to 2022), the result of `blockSquare` is equal to
 * `ST_AsGeoJSON(geom, 6)`: the same corners, in the same order. The result of `blockCenter` is
 * equal to `lon_center` and `lat_center`. If the pipeline changes the grid, change the
 * constants here too.
 */

/** The top left corner of the grid, in metres of EPSG:5070. */
const GRID_ORIGIN_X_M = -2_356_095;
const GRID_ORIGIN_Y_M = 3_172_605;

/** The side of a block: 33 cells of 30 m. */
const BLOCK_SIZE_M = 990;

const BLOCK_ID = /^(\d{1,6})_(\d{1,6})$/;

// EPSG:5070 is the Albers equal-area conic projection on the ellipsoid GRS 1980. The formulas
// are from J. P. Snyder, "Map Projections: A Working Manual" (1987), the Albers projection
// for the ellipsoid.
const RAD = Math.PI / 180;
const SEMI_MAJOR_AXIS_M = 6_378_137;
const FLATTENING = 1 / 298.257222101;
const ECCENTRICITY_SQUARED = 2 * FLATTENING - FLATTENING ** 2;
const ECCENTRICITY = Math.sqrt(ECCENTRICITY_SQUARED);
const STANDARD_PARALLEL_1 = 29.5 * RAD;
const STANDARD_PARALLEL_2 = 45.5 * RAD;
const LATITUDE_OF_ORIGIN = 23 * RAD;
const CENTRAL_MERIDIAN = -96 * RAD;

/** The term `m` of Snyder for a latitude in radians. */
function snyderM(latitude: number): number {
  const sin = Math.sin(latitude);
  return Math.cos(latitude) / Math.sqrt(1 - ECCENTRICITY_SQUARED * sin * sin);
}

/** The term `q` of Snyder for the sine of a latitude. */
function snyderQ(sin: number): number {
  return (
    (1 - ECCENTRICITY_SQUARED) *
    (sin / (1 - ECCENTRICITY_SQUARED * sin * sin) -
      (1 / (2 * ECCENTRICITY)) * Math.log((1 - ECCENTRICITY * sin) / (1 + ECCENTRICITY * sin)))
  );
}

const CONE_CONSTANT =
  (snyderM(STANDARD_PARALLEL_1) ** 2 - snyderM(STANDARD_PARALLEL_2) ** 2) /
  (snyderQ(Math.sin(STANDARD_PARALLEL_2)) - snyderQ(Math.sin(STANDARD_PARALLEL_1)));
const C =
  snyderM(STANDARD_PARALLEL_1) ** 2 + CONE_CONSTANT * snyderQ(Math.sin(STANDARD_PARALLEL_1));
const ORIGIN_RADIUS_M =
  (SEMI_MAJOR_AXIS_M * Math.sqrt(C - CONE_CONSTANT * snyderQ(Math.sin(LATITUDE_OF_ORIGIN)))) /
  CONE_CONSTANT;

/**
 * The latitude has no direct formula: each step makes the result more accurate. With 5
 * steps, the corners are equal to the corners of the database shapes.
 */
const LATITUDE_STEPS = 5;

/** A value in degrees with 6 decimal places (0.1 m), as the database shapes have. */
const roundDegrees = (value: number): number => Math.round(value * 1e6) / 1e6;

/** The longitude and the latitude, in degrees, of a point of EPSG:5070 in metres. */
function toLonLat(x: number, y: number): [lon: number, lat: number] {
  const dy = ORIGIN_RADIUS_M - y;
  const radius = Math.hypot(x, dy);
  const angle = Math.atan2(x, dy);
  const q =
    (C - (radius * radius * CONE_CONSTANT * CONE_CONSTANT) / SEMI_MAJOR_AXIS_M ** 2) /
    CONE_CONSTANT;

  let latitude = Math.asin(q / 2);
  for (let step = 0; step < LATITUDE_STEPS; step++) {
    const sin = Math.sin(latitude);
    const t = 1 - ECCENTRICITY_SQUARED * sin * sin;
    latitude +=
      ((t * t) / (2 * Math.cos(latitude))) * ((q - snyderQ(sin)) / (1 - ECCENTRICITY_SQUARED));
  }

  return [
    roundDegrees((CENTRAL_MERIDIAN + angle / CONE_CONSTANT) / RAD),
    roundDegrees(latitude / RAD),
  ];
}

/**
 * The square of a block as a GeoJSON polygon in WGS84, or `null` when the text is not a
 * block id.
 *
 * The columns of the grid go to the east and the rows go to the south. The corners have the
 * order of the database shapes: south-west, north-west, north-east, south-east. In WGS84 the
 * square is a small quantity turned, because the grid is not parallel to the meridians.
 */
export function blockSquare(id: string): Polygon | null {
  const match = BLOCK_ID.exec(id);
  if (!match) return null;

  const left = GRID_ORIGIN_X_M + Number(match[1]) * BLOCK_SIZE_M;
  const top = GRID_ORIGIN_Y_M - Number(match[2]) * BLOCK_SIZE_M;
  const right = left + BLOCK_SIZE_M;
  const bottom = top - BLOCK_SIZE_M;

  const first: Position = toLonLat(left, bottom);
  return {
    type: "Polygon",
    coordinates: [
      [first, toLonLat(left, top), toLonLat(right, top), toLonLat(right, bottom), [...first]],
    ],
  };
}

/**
 * The center of a block as [longitude, latitude] in WGS84, or `null` when the text is not a
 * block id.
 *
 * The data pipeline calculates `blocks.lon_center` and `blocks.lat_center` from the same
 * point. The center gives the climate cell of the block, so the browser and the database
 * must find the same cell.
 */
export function blockCenter(id: string): [lon: number, lat: number] | null {
  const match = BLOCK_ID.exec(id);
  if (!match) return null;

  return toLonLat(
    GRID_ORIGIN_X_M + (Number(match[1]) + 0.5) * BLOCK_SIZE_M,
    GRID_ORIGIN_Y_M - (Number(match[2]) + 0.5) * BLOCK_SIZE_M,
  );
}
