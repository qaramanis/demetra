import type { MetricId } from "@demetra/core";
import type { ExpressionSpecification } from "maplibre-gl";

import { METRIC_SCALES, type RampScale } from "@/config/palettes";

/** The value of each colour of a ramp. */
export function rampStops(scale: RampScale): [value: number, color: string][] {
  const [min, max] = scale.domain;
  const last = scale.colors.length - 1;
  return scale.colors.map((color, index) => [min + ((max - min) * index) / last, color]);
}

/** MapLibre expression that gives a block its colour from the value of a metric. */
export function fillColorExpression(metric: MetricId): ExpressionSpecification {
  const scale = METRIC_SCALES[metric];
  const value: ExpressionSpecification = ["get", metric];

  if (scale.type === "classes") {
    const [lowest, ...higher] = scale.classes;
    const steps = higher.flatMap((item) => [item.min, item.color]);
    return ["step", value, lowest?.color ?? "#000000", ...steps] as ExpressionSpecification;
  }

  const stops = rampStops(scale).flat();
  return ["interpolate", ["linear"], value, ...stops] as ExpressionSpecification;
}

function parseHex(hex: string): [number, number, number] {
  return [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16)) as [
    number,
    number,
    number,
  ];
}

/** The colour of one value, for example for the swatch in a tooltip. */
export function colorOf(metric: MetricId, value: number): string {
  const scale = METRIC_SCALES[metric];

  if (scale.type === "classes") {
    let color = scale.classes[0]?.color ?? "#000000";
    for (const item of scale.classes) if (value >= item.min) color = item.color;
    return color;
  }

  const [min, max] = scale.domain;
  const last = scale.colors.length - 1;
  const position = Math.min(1, Math.max(0, (value - min) / (max - min))) * last;
  const index = Math.min(last - 1, Math.floor(position));
  const from = parseHex(scale.colors[index] as string);
  const to = parseHex(scale.colors[index + 1] as string);
  const t = position - index;
  const channel = (i: 0 | 1 | 2) => Math.round(from[i] + (to[i] - from[i]) * t);
  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
}

/** CSS gradient of a ramp, from the lowest value on the left to the highest on the right. */
export function rampGradient(scale: RampScale): string {
  return `linear-gradient(to right, ${scale.colors.join(", ")})`;
}

/** Position of a value on a ramp, from 0 (left end) to 1 (right end). */
export function rampPosition(scale: RampScale, value: number): number {
  const [min, max] = scale.domain;
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}
