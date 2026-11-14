import type { NumberLayerId } from "@demetra/core";

/**
 * The colors of the number layers on the map and in the legend.
 *
 * The crop layer does not have a palette here: each crop class has the official color of
 * the Cropland Data Layer, from the `crops` table of the database.
 *
 * Rules of the ramps:
 * - Darker always means "more of the quantity". The reader learns one rule for all layers.
 * - Each layer has its own hue, so the hue shows which layer is on the map.
 * - Each ramp goes from light to dark in equal steps of lightness (OKLCH), in one hue.
 *   A reader with a color vision deficiency sees the order, because the order is in the
 *   lightness and not in the hue.
 *
 * The colors were made in OKLCH and checked by calculation: equal lightness steps, and
 * the distance between colors under simulated protanopia and deuteranopia.
 */
export const LAYER_RAMPS: Record<NumberLayerId, readonly string[]> = {
  // Revenue: from aqua to deep teal.
  revenue: [
    "#e4f0ee",
    "#badbd9",
    "#8cc7c7",
    "#5eb1b5",
    "#2e9ba3",
    "#00828e",
    "#006975",
    "#00515d",
    "#003a45",
  ],

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
};

/**
 * The color of a block that has no value in a number layer, for example fallow land in the
 * revenue layer. It is a grey with almost no hue, so it is different from the two ramps.
 */
export const NO_DATA_COLOR = "#b1bbc8";

/** The color of a crop class that is not in the list of crop classes. */
export const UNKNOWN_CROP_COLOR = "#95a3b5";
