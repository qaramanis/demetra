import { describe, expect, it } from "vitest";

import { blockSquare } from "./block-grid.ts";
import { blockFeatures, blockRow } from "./blocks.ts";
import type { BlockProperties } from "./blocks.ts";

const ALMONDS: BlockProperties = {
  id: "192_1377",
  crop: 75,
  share: 0.865,
  crops: 6,
  acres: 95.8,
  revenue: 5046,
  storie: 82,
};

/** A block without revenue data, for example fallow land. */
const FALLOW: BlockProperties = { id: "100_1077", crop: 61, share: 0.8, crops: 2, acres: 1.1 };

describe("blockRow", () => {
  it("puts the values in the order of the row", () => {
    expect(blockRow(ALMONDS)).toEqual(["192_1377", 75, 0.865, 6, 95.8, 5046, 82]);
  });

  it("uses null for a value that the block does not have", () => {
    expect(blockRow(FALLOW)).toEqual(["100_1077", 61, 0.8, 2, 1.1, null, null]);
  });
});

describe("blockFeatures", () => {
  it("gives the same values that blockRow received", () => {
    const { features } = blockFeatures([blockRow(ALMONDS), blockRow(FALLOW)]);
    expect(features.map((feature) => feature.properties)).toEqual([ALMONDS, FALLOW]);
  });

  it("does not add a property for a null value", () => {
    const [feature] = blockFeatures([blockRow(FALLOW)]).features;
    expect(feature?.properties).not.toHaveProperty("revenue");
    expect(feature?.properties).not.toHaveProperty("storie");
  });

  it("gives each block its square", () => {
    const [feature] = blockFeatures([blockRow(ALMONDS)]).features;
    expect(feature?.type).toBe("Feature");
    expect(feature?.geometry).toEqual(blockSquare("192_1377"));
  });

  it("ignores a row that has no correct block id", () => {
    const rows = [blockRow({ ...ALMONDS, id: "not-a-block" }), blockRow(FALLOW)];
    expect(blockFeatures(rows).features.map((feature) => feature.properties.id)).toEqual([
      "100_1077",
    ]);
  });

  it("gives an empty collection for no rows", () => {
    expect(blockFeatures([])).toEqual({ type: "FeatureCollection", features: [] });
  });
});
