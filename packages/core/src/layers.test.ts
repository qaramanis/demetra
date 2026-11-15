import { describe, expect, it } from "vitest";

import { CLIMATE_METRIC_IDS } from "./climate.ts";
import { NUMBER_SCALES, numberScaleOf, numberScaleValue } from "./layers.ts";

describe("numberScaleOf", () => {
  it("gives no scale for the crop layer", () => {
    expect(numberScaleOf("crop", "tMean")).toBeNull();
  });

  it("gives the soil scale for the soil layer, for each climate metric", () => {
    expect(numberScaleOf("soil", "heatDays")).toBe("soil");
  });

  it("gives the scale of the selected metric for the climate layer", () => {
    for (const metric of CLIMATE_METRIC_IDS) expect(numberScaleOf("climate", metric)).toBe(metric);
  });
});

describe("NUMBER_SCALES", () => {
  it("has a scale for each climate metric", () => {
    for (const metric of CLIMATE_METRIC_IDS) expect(NUMBER_SCALES[metric].property).toBe(metric);
  });

  it("has the mean (0 %) at the middle of the rain anomaly scale", () => {
    const { domain, diverging } = NUMBER_SCALES.rainAnomaly;
    expect(diverging).toBe(true);
    expect((domain[0] + domain[1]) / 2).toBe(0);
  });
});

describe("numberScaleValue", () => {
  it("gives the value of the property of the scale", () => {
    expect(numberScaleValue("soil", { storie: 82, heatDays: 90 })).toBe(82);
    expect(numberScaleValue("heatDays", { storie: 82, heatDays: 90 })).toBe(90);
  });

  it("gives undefined for a block that has no value", () => {
    expect(numberScaleValue("tMean", { storie: 82 })).toBeUndefined();
  });
});
