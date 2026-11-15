import type { BlockProperties } from "./blocks.ts";
import type { ClimateMetricId } from "./climate.ts";

/**
 * The layers of the map. A layer gives the blocks their color.
 * - `crop`: the main crop of each block, with the color of its crop class.
 * - `climate`: one climate metric of the year. The user selects the metric.
 * - `soil`: the soil quality (Storie index).
 */
export const MAP_LAYER_IDS = ["crop", "climate", "soil"] as const;

export type MapLayerId = (typeof MAP_LAYER_IDS)[number];

/**
 * A scale shows one number of each block with a color ramp. The soil layer has one scale.
 * The climate layer has one scale for each climate metric.
 */
export type NumberScaleId = "soil" | ClimateMetricId;

export interface NumberScaleDef {
  id: NumberScaleId;
  /** The property of a block that the scale shows. */
  property: "storie" | ClimateMetricId;
  unit: "index" | "celsius" | "days" | "mm" | "percent";
  /** The number of decimal places of a value in the interface. */
  decimals: number;
  /**
   * The values of the first and the last color. A value outside this range gets the nearest
   * color.
   */
  domain: readonly [min: number, max: number];
  /** The lowest possible value, or `null` when there is no limit. */
  min: number | null;
  /** The highest possible value, or `null` when there is no limit. */
  max: number | null;
  /**
   * `true` for a scale with two directions from a middle value, for example more rain and
   * less rain than the mean. The middle value is the middle of `domain`, and it has the
   * lightest color.
   */
  diverging: boolean;
}

// The ranges of the climate scales are from the blocks of 2017 to 2022. Each scale has 9
// colors, so the step between two colors is 1/8 of the range.
export const NUMBER_SCALES: Record<NumberScaleId, NumberScaleDef> = {
  soil: {
    id: "soil",
    property: "storie",
    unit: "index",
    decimals: 0,
    domain: [0, 100],
    min: 0,
    max: 100,
    diverging: false,
  },
  // 1 degree for each color. The blocks of 2017 to 2022 have a mean temperature from 4 to
  // 25 degrees, but half of them are from 15 to 18 degrees (the Central Valley). With the full
  // range (2 degrees for each color), 63 % of the blocks had only 2 colors. With 12 to 20
  // degrees, no color has more than 21 % of the blocks. The cold valleys of the north-east
  // (14 % of the blocks, 4 to 12 degrees) have the first color, and the desert valleys (5 %,
  // 20 to 25 degrees) the last color. The legend shows "≤ 12" and "≥ 20", and the tooltip and
  // the detail panel show the exact value.
  tMean: {
    id: "tMean",
    property: "tMean",
    unit: "celsius",
    decimals: 1,
    domain: [12, 20],
    min: null,
    max: null,
    diverging: false,
  },
  // 95 % of the blocks have fewer than 112 heat days. The desert valleys have up to 178.
  heatDays: {
    id: "heatDays",
    property: "heatDays",
    unit: "days",
    decimals: 0,
    domain: [0, 120],
    min: 0,
    max: 366,
    diverging: false,
  },
  // 100 mm for each color. The blocks of 2017 to 2022 have from 13 to 2,315 mm of rain, but
  // half of them have from 254 to 569 mm. With 0 to 1,200 mm (150 mm for each color), 52 % of
  // the blocks had only 2 colors. With 100 to 900 mm, no color has more than 21 % of the
  // blocks. The desert valleys (3 %, less than 100 mm) have the first color, and the north
  // coast and the mountains (10 %, more than 900 mm) the last color. The legend shows
  // "≤ 100" and "≥ 900".
  rainWaterYear: {
    id: "rainWaterYear",
    property: "rainWaterYear",
    unit: "mm",
    decimals: 0,
    domain: [100, 900],
    min: 0,
    max: null,
    diverging: false,
  },
  // 98 % of the blocks are from -66 % to +85 %. The middle of the range is the mean (0 %).
  rainAnomaly: {
    id: "rainAnomaly",
    property: "rainAnomaly",
    unit: "percent",
    decimals: 0,
    domain: [-80, 80],
    min: -100,
    max: null,
    diverging: true,
  },
};

/**
 * The scale that gives the blocks their color, or `null` for the crop layer: it has a color
 * for each crop class and no scale.
 */
export function numberScaleOf(
  layer: MapLayerId,
  climateMetric: ClimateMetricId,
): NumberScaleId | null {
  if (layer === "crop") return null;
  return layer === "soil" ? "soil" : climateMetric;
}

/** The value that a scale shows for a block. `undefined` = no data. */
export function numberScaleValue(
  scale: NumberScaleId,
  properties: Pick<BlockProperties, "storie" | ClimateMetricId>,
): number | undefined {
  return properties[NUMBER_SCALES[scale].property];
}
