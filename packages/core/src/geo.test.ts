import type { Polygon } from "geojson";
import { describe, expect, it } from "vitest";

import { polygonCentroid } from "./geo.ts";

/** Block 100_1077 of the database: a square of 990 m in EPSG:5070, as a polygon in WGS84. */
const BLOCK: Polygon = {
  type: "Polygon",
  coordinates: [
    [
      [-122.692285, 39.101673],
      [-122.695488, 39.11016],
      [-122.684385, 39.112608],
      [-122.681183, 39.104121],
      [-122.692285, 39.101673],
    ],
  ],
};

describe("polygonCentroid", () => {
  it("returns the centre of a block", () => {
    const [lon, lat] = polygonCentroid(BLOCK);
    expect(lon).toBeCloseTo(-122.688335, 5);
    expect(lat).toBeCloseTo(39.10714, 5);
  });

  it("gives the same result for an open ring and a closed ring", () => {
    const open: Polygon = {
      type: "Polygon",
      coordinates: [(BLOCK.coordinates[0] ?? []).slice(0, -1)],
    };
    expect(polygonCentroid(open)).toEqual(polygonCentroid(BLOCK));
  });

  it("returns the mean point when the ring has fewer than three corners", () => {
    const line: Polygon = {
      type: "Polygon",
      coordinates: [
        [
          [-120, 36],
          [-119, 37],
        ],
      ],
    };
    expect(polygonCentroid(line)).toEqual([-119.5, 36.5]);
  });
});
