import { CROPS } from "./crops.ts";

export const METRIC_IDS = [
  "fhs",
  "wd",
  "eri",
  "profitMargin",
  "resilience",
  "confidence",
] as const;

export type MetricId = (typeof METRIC_IDS)[number];

export type MetricUnit = "score" | "mm" | "index" | "percent";

export interface MetricDef {
  id: MetricId;
  unit: MetricUnit;
  /** Lowest and highest valid value. A provider must not return a value outside this range. */
  range: readonly [min: number, max: number];
  /** Number of decimal places of a value. */
  decimals: number;
  /** `true` when a higher value is better for the grower. */
  higherIsBetter: boolean;
}

/** The water deficit of a season cannot be larger than the largest water requirement of a crop. */
const MAX_WATER_REQUIREMENT = Math.max(...Object.values(CROPS).map((crop) => crop.wReq));

export const METRICS: Record<MetricId, MetricDef> = {
  /** Vegetation health score. */
  fhs: { id: "fhs", unit: "score", range: [0, 100], decimals: 0, higherIsBetter: true },
  /** Crop water deficit of the period. */
  wd: {
    id: "wd",
    unit: "mm",
    range: [0, MAX_WATER_REQUIREMENT],
    decimals: 0,
    higherIsBetter: false,
  },
  /** Erosion risk index. */
  eri: { id: "eri", unit: "index", range: [0, 1], decimals: 2, higherIsBetter: false },
  /** Profit as a share of the revenue. A loss larger than the revenue is shown as −100 %. */
  profitMargin: {
    id: "profitMargin",
    unit: "percent",
    range: [-100, 100],
    decimals: 0,
    higherIsBetter: true,
  },
  resilience: {
    id: "resilience",
    unit: "percent",
    range: [0, 100],
    decimals: 0,
    higherIsBetter: true,
  },
  confidence: {
    id: "confidence",
    unit: "percent",
    range: [0, 100],
    decimals: 0,
    higherIsBetter: true,
  },
};

export const FHS_CLASSES = ["A", "B", "C"] as const;

export type FhsClass = (typeof FHS_CLASSES)[number];

/** Lowest score of classes A and B. Class C is each score below class B. */
export const FHS_CLASS_MIN = { A: 75, B: 50 } as const;

export function fhsClass(score: number): FhsClass {
  if (score >= FHS_CLASS_MIN.A) return "A";
  if (score >= FHS_CLASS_MIN.B) return "B";
  return "C";
}
