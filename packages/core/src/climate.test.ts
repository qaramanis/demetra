import { describe, expect, it } from "vitest";

import { climateAt, climateCellIndex, climateCellRow, climateIndex } from "./climate.ts";
import type { ClimateValues } from "./climate.ts";

const FRESNO: ClimateValues = {
  tMean: 17.52,
  heatDays: 90,
  rainWaterYear: 249.1,
  rainAnomaly: -26.9,
};
const COAST: ClimateValues = { tMean: 12.4, heatDays: 0, rainWaterYear: 1203.5, rainAnomaly: 12 };

describe("climateCellIndex", () => {
  it("gives the cell that has its center at a multiple of 0.1 degrees", () => {
    expect(climateCellIndex(36.8)).toBe(368);
    expect(climateCellIndex(36.770842)).toBe(368);
    expect(climateCellIndex(36.849)).toBe(368);
    expect(climateCellIndex(-120.767753)).toBe(-1208);
  });

  it("puts a value at the limit between two cells in the cell with the higher index", () => {
    // 36.75 and -120.75 are binary fractions, so they are exactly at the limit.
    expect(climateCellIndex(36.75)).toBe(368);
    expect(climateCellIndex(-120.75)).toBe(-1207);
  });
});

describe("climateIndex", () => {
  const index = climateIndex([
    climateCellRow(368, -1208, FRESNO),
    climateCellRow(401, -1242, COAST),
  ]);

  it("gives a position the values of the cell that contains it", () => {
    expect(climateAt(index, -120.767753, 36.770842)).toEqual(FRESNO);
    expect(climateAt(index, -124.2, 40.14)).toEqual(COAST);
  });

  it("gives undefined for a position that is in no cell", () => {
    expect(climateAt(index, -120.767753, 36.9)).toBeUndefined();
    // The same numbers with the latitude and the longitude exchanged are a different cell.
    expect(climateAt(index, 36.770842, -120.767753)).toBeUndefined();
  });

  it("puts the values of a row in the order of ClimateValues", () => {
    expect(climateCellRow(368, -1208, FRESNO)).toEqual([368, -1208, 17.52, 90, 249.1, -26.9]);
  });
});
