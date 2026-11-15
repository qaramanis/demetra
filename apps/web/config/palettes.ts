import type { NumberScaleId } from "@demetra/core";

/**
 * The colors of the number scales on the map and in the legend: the soil scale, and one
 * scale for each climate metric.
 *
 * The crop layer does not have a palette here: each crop class has the official color of
 * the Cropland Data Layer, from the `crops` table of the database.
 *
 * Rules of the ramps:
 * - Darker always means "more of the quantity". The reader learns one rule for all scales.
 * - Each scale has its own hue, so the hue shows which scale is on the map.
 * - Each ramp goes from light to dark in equal steps of lightness (OKLCH), in one hue.
 *   A reader with a color vision deficiency sees the order, because the order is in the
 *   lightness and not in the hue.
 * - A diverging scale (the rain anomaly) has two directions from a middle value. The middle
 *   color is a light grey with no hue, and each side goes to dark in equal steps of lightness:
 *   brown for less than the middle value and blue for more. Darker then means "more different
 *   from the middle value".
 *
 * The colors were made in OKLCH and checked by calculation: equal lightness steps, and
 * the distance between colors under simulated protanopia and deuteranopia.
 */
export const SCALE_RAMPS: Record<NumberScaleId, readonly string[]> = {
  // Soil quality: from sand to dark brown.
  soil: [
    "#f2ece1",
    "#e4d0b1",
    "#d9b37f",
    "#cd964f",
    "#bd7820",
    "#a65f00",
    "#8a4900",
    "#6f3500",
    "#542300",
  ],

  // Mean temperature: from light peach to dark red.
  tMean: [
    "#f9e9e1",
    "#f7c7b1",
    "#f5a382",
    "#ec7f59",
    "#dd5b38",
    "#c1422b",
    "#a03026",
    "#801e1e",
    "#601017",
  ],

  // Heat days: from light pink to dark purple.
  heatDays: [
    "#f7e8f0",
    "#efc5df",
    "#e5a1d1",
    "#d480c5",
    "#be61b7",
    "#a04ca3",
    "#813c8a",
    "#632c71",
    "#471e57",
  ],

  // Rain: from light blue to dark blue.
  rainWaterYear: [
    "#e3eff7",
    "#b5d9f2",
    "#87c2ee",
    "#5ca9e7",
    "#398fda",
    "#2b75c0",
    "#265da0",
    "#1f4681",
    "#173161",
  ],

  // Rain anomaly: dark brown (much less rain than the mean), light grey (the mean), dark blue
  // (much more rain than the mean).
  rainAnomaly: [
    "#673500",
    "#9e5402",
    "#c28453",
    "#dcb79c",
    "#f0efec",
    "#a3c3e3",
    "#6099ce",
    "#1f6eae",
    "#004678",
  ],
};

/**
 * The color of a block that has no value in a number scale, for example a block with no soil
 * data in the soil layer. It is a grey with almost no hue and a middle lightness, so it is
 * different from the colors of the ramps.
 */
export const NO_DATA_COLOR = "#b1bbc8";

/** The color of a crop class that is not in the list of crop classes. */
export const UNKNOWN_CROP_COLOR = "#95a3b5";

/**
 * The color of a block of a prediction year for which the model has no prediction: its crop
 * history is not sufficient. Most of these blocks have little cropland. The light grey makes
 * them less visible than the blocks with a predicted crop.
 */
export const NO_PREDICTION_COLOR = "#d3cfc6";
