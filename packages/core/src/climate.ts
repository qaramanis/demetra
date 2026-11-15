/**
 * The climate of the blocks.
 *
 * The database has the climate of each year for cells of 0.1 degrees (approximately 10 km):
 * the table `climate_cells`. The center of a cell is at a multiple of 0.1 degrees. A block
 * has the climate of the cell that contains its center.
 *
 * The answer of the server has one row for each cell, and the browser finds the cell of each
 * block. The answer for the blocks thus has no climate values, and it stays below the size
 * limit of the host.
 *
 * The values are estimates. The source (NASA POWER) has cells of approximately 50 km, and it
 * has no values for smaller cells. The data pipeline calculates the daily values of a 10 km
 * cell from the four source cells around it (bilinear interpolation), and then the metrics
 * of the year. The values do not show the effect of mountains, valleys or the coast inside a
 * source cell.
 */

/** The climate metrics that the map shows, in the order of the values in `ClimateCellRow`. */
export const CLIMATE_METRIC_IDS = ["tMean", "heatDays", "rainWaterYear", "rainAnomaly"] as const;

export type ClimateMetricId = (typeof CLIMATE_METRIC_IDS)[number];

/** The climate of one cell in one year. */
export interface ClimateValues {
  /** Mean air temperature of the year at 2 m, in degrees Celsius. */
  tMean: number;
  /** The number of days in the year with a maximum temperature of 35 °C or more. */
  heatDays: number;
  /** Rain of the water year, in mm: from October of the year before to September. */
  rainWaterYear: number;
  /**
   * Rain of the water year compared with the mean of all the years of the cell, in percent.
   * 0 = the mean. −50 = half of the mean.
   */
  rainAnomaly: number;
}

/**
 * One cell in the answer of the server: the position of the cell, then the values of
 * `ClimateValues` in the order of `CLIMATE_METRIC_IDS`. The position is the index of the cell
 * (see `climateCellIndex`): the latitude and the longitude of the cell center, multiplied by 10.
 */
export type ClimateCellRow = [
  latIndex: number,
  lonIndex: number,
  tMean: number,
  heatDays: number,
  rainWaterYear: number,
  rainAnomaly: number,
];

/** The answer to a request for the climate of one year: one row for each cell. */
export interface ClimateResponse {
  year: number;
  rows: ClimateCellRow[];
}

const CELLS_PER_DEGREE = 10;

/**
 * The index of the cell that contains a latitude or a longitude in degrees. The center of
 * cell `k` is at `k / 10` degrees.
 *
 * The data pipeline (`build_climate_grid.py`) and the database queries use the same formula:
 * `floor(degrees * 10 + 0.5)`. Do not change it to a `round` function: for a value at the
 * limit between two cells, `round` gives different results in JavaScript, Python and SQL.
 */
export function climateCellIndex(degrees: number): number {
  return Math.floor(degrees * CELLS_PER_DEGREE + 0.5);
}

/** The climate values of each cell of one year. Make it with `climateIndex`. */
export type ClimateIndex = ReadonlyMap<number, ClimateValues>;

// The longitude index is from -1,800 to 1,800, so each pair of indexes gives a different key.
const cellKey = (latIndex: number, lonIndex: number): number => latIndex * 10_000 + lonIndex;

/** The row of a cell, for the answer of the server. */
export function climateCellRow(
  latIndex: number,
  lonIndex: number,
  values: ClimateValues,
): ClimateCellRow {
  const { tMean, heatDays, rainWaterYear, rainAnomaly } = values;
  return [latIndex, lonIndex, tMean, heatDays, rainWaterYear, rainAnomaly];
}

/** The cells of an answer, in a form that finds the cell of a position quickly. */
export function climateIndex(rows: readonly ClimateCellRow[]): ClimateIndex {
  const index = new Map<number, ClimateValues>();
  for (const [latIndex, lonIndex, tMean, heatDays, rainWaterYear, rainAnomaly] of rows) {
    index.set(cellKey(latIndex, lonIndex), { tMean, heatDays, rainWaterYear, rainAnomaly });
  }
  return index;
}

/** The climate at a position, or `undefined` when the position is in no cell of the index. */
export function climateAt(
  index: ClimateIndex,
  lon: number,
  lat: number,
): ClimateValues | undefined {
  return index.get(cellKey(climateCellIndex(lat), climateCellIndex(lon)));
}
