import type { Position } from "geojson";
import { describe, expect, it } from "vitest";

import { blockCenter, blockSquare } from "./block-grid.ts";

/**
 * Shapes of the database (`ST_AsGeoJSON(geom, 6)` of the table `blocks`): a block in the
 * Sacramento Valley, and the blocks that are the nearest to each edge of California.
 */
const DATABASE_SHAPES: Record<string, Position[]> = {
  "100_1077": [
    [-122.692285, 39.101673],
    [-122.695488, 39.11016],
    [-122.684385, 39.112608],
    [-122.681183, 39.104121],
    [-122.692285, 39.101673],
  ],
  // West
  "2_906": [
    [-124.355484, 40.30226],
    [-124.358938, 40.310706],
    [-124.347707, 40.313304],
    [-124.344254, 40.304857],
    [-124.355484, 40.30226],
  ],
  // East
  "706_1771": [
    [-114.275832, 34.389246],
    [-114.277906, 34.397937],
    [-114.267254, 34.399629],
    [-114.265181, 34.390938],
    [-114.275832, 34.389246],
  ],
  // North
  "70_728": [
    [-124.203056, 41.983402],
    [-124.206575, 41.991865],
    [-124.195068, 41.994453],
    [-124.19155, 41.98599],
    [-124.203056, 41.983402],
  ],
  // South
  "637_1949": [
    [-114.633906, 32.723102],
    [-114.635976, 32.731806],
    [-114.625555, 32.733535],
    [-114.623487, 32.72483],
    [-114.633906, 32.723102],
  ],
};

describe("blockSquare", () => {
  it.each(Object.entries(DATABASE_SHAPES))(
    "gives the database shape of block %s",
    (id, corners) => {
      expect(blockSquare(id)).toEqual({ type: "Polygon", coordinates: [corners] });
    },
  );

  it("returns null when the text is not a block id", () => {
    expect(blockSquare("")).toBeNull();
    expect(blockSquare("100")).toBeNull();
    expect(blockSquare("100_")).toBeNull();
    expect(blockSquare("100_1077_2")).toBeNull();
    expect(blockSquare("a_b")).toBeNull();
  });
});

/** Centers of the database (`lon_center` and `lat_center` of the table `blocks`). */
const DATABASE_CENTERS: Record<string, [lon: number, lat: number]> = {
  "100_1077": [-122.688335, 39.10714],
  "192_1377": [-120.767753, 36.770842],
  "2_906": [-124.351596, 40.307782],
  "706_1771": [-114.271543, 34.394438],
};

describe("blockCenter", () => {
  it.each(Object.entries(DATABASE_CENTERS))(
    "gives the center of the database for block %s",
    (id, center) => {
      expect(blockCenter(id)).toEqual(center);
    },
  );

  it("returns null when the text is not a block id", () => {
    expect(blockCenter("")).toBeNull();
    expect(blockCenter("100_")).toBeNull();
    expect(blockCenter("a_b")).toBeNull();
  });
});
