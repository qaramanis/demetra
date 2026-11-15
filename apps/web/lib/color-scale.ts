import { NO_PREDICTION_CROP_CODE, NUMBER_SCALES } from "@demetra/core";
import type { Crop, NumberScaleId } from "@demetra/core";
import type { ExpressionSpecification } from "maplibre-gl";

import {
  NO_DATA_COLOR,
  NO_PREDICTION_COLOR,
  SCALE_RAMPS,
  UNKNOWN_CROP_COLOR,
} from "@/config/palettes";

/**
 * The value of each color of the ramp of a scale. The values have equal steps, so the middle
 * color of a diverging scale is at the middle of its range.
 */
function rampStops(scale: NumberScaleId): [value: number, color: string][] {
  const [min, max] = NUMBER_SCALES[scale].domain;
  const colors = SCALE_RAMPS[scale];
  const last = colors.length - 1;
  return colors.map((color, index) => [min + ((max - min) * index) / last, color]);
}

/**
 * MapLibre expression: the color of a block from its main crop. A block of a prediction year
 * with no prediction has its own color.
 */
function cropFillExpression(crops: readonly Crop[]): ExpressionSpecification | string {
  // A `match` expression must have one branch or more.
  if (crops.length === 0) return UNKNOWN_CROP_COLOR;
  const branches = [
    ...crops.flatMap((crop) => [crop.code, crop.color]),
    NO_PREDICTION_CROP_CODE,
    NO_PREDICTION_COLOR,
  ];
  // The type of MapLibre cannot describe a `match` expression with a variable number of
  // branches.
  return [
    "match",
    ["get", "crop"],
    ...branches,
    UNKNOWN_CROP_COLOR,
  ] as unknown as ExpressionSpecification;
}

/** MapLibre expression: the color of a block from its value in a scale. */
function numberFillExpression(scale: NumberScaleId): ExpressionSpecification {
  const property = NUMBER_SCALES[scale].property;
  const stops = rampStops(scale).flat();
  return [
    "case",
    ["has", property],
    ["interpolate", ["linear"], ["get", property], ...stops],
    NO_DATA_COLOR,
  ] as ExpressionSpecification;
}

/**
 * MapLibre expression that gives a block its color: from a scale, or from its main crop when
 * `scale` is `null` (the crop layer).
 */
export function fillColorExpression(
  scale: NumberScaleId | null,
  crops: readonly Crop[],
): ExpressionSpecification | string {
  return scale === null ? cropFillExpression(crops) : numberFillExpression(scale);
}

function parseHex(hex: string): [number, number, number] {
  return [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16)) as [
    number,
    number,
    number,
  ];
}

/** Position of a value on the ramp of a scale, from 0 (left end) to 1 (right end). */
export function rampPosition(scale: NumberScaleId, value: number): number {
  const [min, max] = NUMBER_SCALES[scale].domain;
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}

/**
 * The color of one value of a scale, for example for the swatch in a tooltip.
 * `undefined` = no data.
 */
export function colorOfValue(scale: NumberScaleId, value: number | undefined): string {
  if (value === undefined) return NO_DATA_COLOR;
  const colors = SCALE_RAMPS[scale];
  const last = colors.length - 1;
  const position = rampPosition(scale, value) * last;
  const index = Math.min(last - 1, Math.floor(position));
  const from = parseHex(colors[index] as string);
  const to = parseHex(colors[index + 1] as string);
  const t = position - index;
  const channel = (i: 0 | 1 | 2) => Math.round(from[i] + (to[i] - from[i]) * t);
  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
}

/** CSS gradient of a ramp, from the lowest value on the left to the highest on the right. */
export function rampGradient(scale: NumberScaleId): string {
  return `linear-gradient(to right, ${SCALE_RAMPS[scale].join(", ")})`;
}
