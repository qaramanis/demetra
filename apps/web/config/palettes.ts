import { FHS_CLASS_MIN, METRICS } from "@demetra/core";
import type { FhsClass, MetricId } from "@demetra/core";

/**
 * The colours of the metrics on the map and in the legend.
 *
 * Rules of the palettes:
 * - Darker always means "more of the quantity". The reader learns one rule for all metrics.
 * - Each metric has its own hue, so the hue shows which metric is on the map.
 * - Each ramp goes from light to dark in equal steps of lightness (OKLCH), in one hue.
 *   A reader with a colour vision deficiency sees the order, because the order is in the
 *   lightness and not in the hue.
 * - The profit margin has two directions, so it has two hues (red for a loss, blue for a
 *   profit) with a neutral grey at zero. Red and blue stay different for readers with
 *   red-green colour vision deficiency.
 *
 * The colours were made in OKLCH and checked by calculation: equal lightness steps, and
 * the distance between colours under simulated protanopia and deuteranopia.
 */

export interface ClassScale {
  type: "classes";
  /** From the lowest class to the highest. `min` is the lowest value of the class. */
  classes: readonly { id: FhsClass; min: number; color: string }[];
}

export interface RampScale {
  type: "ramp";
  /** The values of the first and the last colour. Values outside get the nearest colour. */
  domain: readonly [min: number, max: number];
  /** Colours at equal distances across the domain. */
  colors: readonly string[];
  /** `true` when the ramp has two directions around zero. */
  diverging?: boolean;
}

export type MetricScale = ClassScale | RampScale;

export const METRIC_SCALES: Record<MetricId, MetricScale> = {
  // Vegetation health: straw for sparse vegetation, deep green for healthy vegetation.
  // The three classes are far from each other in lightness (2.1 : 1 or more on white).
  fhs: {
    type: "classes",
    classes: [
      { id: "C", min: METRICS.fhs.range[0], color: "#b3b959" },
      { id: "B", min: FHS_CLASS_MIN.B, color: "#5d8c2d" },
      { id: "A", min: FHS_CLASS_MIN.A, color: "#115126" },
    ],
  },

  // Water deficit: from sand to dry brown.
  wd: {
    type: "ramp",
    domain: METRICS.wd.range,
    colors: [
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
  },

  // Erosion risk: from lilac to deep purple.
  eri: {
    type: "ramp",
    domain: METRICS.eri.range,
    colors: [
      "#f3e9f3",
      "#e2c8e6",
      "#d1a7da",
      "#bd88ce",
      "#a56cbe",
      "#8b53a9",
      "#6d418b",
      "#52306e",
      "#391f52",
    ],
  },

  // Profit margin: red for a loss, neutral grey at zero, blue for a profit. The colours stop
  // at ±60 %, because most margins are in that range. Larger values get the last colour.
  profitMargin: {
    type: "ramp",
    diverging: true,
    domain: [-60, 60],
    colors: [
      "#9b1014",
      "#bf473f",
      "#dd766c",
      "#f5a69d",
      "#edece8",
      "#99c1f4",
      "#669bdd",
      "#3575c3",
      "#0051a0",
    ],
  },

  // Resilience: from aqua to deep teal.
  resilience: {
    type: "ramp",
    domain: METRICS.resilience.range,
    colors: [
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
  },

  // Confidence: from light grey to slate. It has almost no hue, because it describes the
  // data and not the field.
  confidence: {
    type: "ramp",
    domain: METRICS.confidence.range,
    colors: [
      "#eaedf0",
      "#cdd4dc",
      "#b1bbc8",
      "#95a3b5",
      "#7c8ba0",
      "#65748a",
      "#505d72",
      "#3d4859",
      "#2c3340",
    ],
  },
};
