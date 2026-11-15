import { describe, expect, it } from "vitest";

import { blockSquare } from "./block-grid.ts";
import {
  NO_PREDICTION_CROP_CODE,
  isPredictedBlock,
  predictionFeatures,
  predictionRow,
} from "./prediction.ts";

describe("predictionRow", () => {
  it("rounds the score to two decimal places", () => {
    expect(predictionRow({ id: "192_1377", crop: 75, score: 0.9326 })).toEqual([
      "192_1377",
      75,
      0.93,
    ]);
    expect(predictionRow({ id: "192_1377", crop: -1, score: null })).toEqual([
      "192_1377",
      -1,
      null,
    ]);
  });
});

describe("predictionFeatures", () => {
  it("gives each predicted block its square, its crop and its score", () => {
    const { features } = predictionFeatures([
      ["192_1377", 75, 0.93],
      ["100_1077", NO_PREDICTION_CROP_CODE, null],
      ["not-a-block", 75, 0.5],
    ]);
    expect(features).toHaveLength(2);
    expect(features[0]?.geometry).toEqual(blockSquare("192_1377"));
    expect(features.map((feature) => feature.properties)).toEqual([
      { id: "192_1377", crop: 75, score: 0.93, predicted: true },
      { id: "100_1077", crop: NO_PREDICTION_CROP_CODE, predicted: true },
    ]);
  });
});

describe("isPredictedBlock", () => {
  it("tells a predicted block from a block of real data", () => {
    expect(isPredictedBlock({ id: "192_1377", crop: 75, predicted: true })).toBe(true);
    expect(isPredictedBlock({ id: "192_1377", crop: 75, share: 0.8, crops: 2, acres: 9 })).toBe(
      false,
    );
  });
});
