import { NUMBER_LAYERS } from "@demetra/core";
import type { Crop, MapLayerId, NumberLayerId } from "@demetra/core";
import type { ExpressionSpecification } from "maplibre-gl";

import { LAYER_RAMPS, NO_DATA_COLOR, UNKNOWN_CROP_COLOR } from "@/config/palettes";

/** The value of each color of the ramp of a number layer. */
function rampStops(layer: NumberLayerId): [value: number, color: string][] {
  const [min, max] = NUMBER_LAYERS[layer].domain;
  const colors = LAYER_RAMPS[layer];
  const last = colors.length - 1;
  return colors.map((color, index) => [min + ((max - min) * index) / last, color]);
}

/** MapLibre expression: the color of a block from its main crop. */
function cropFillExpression(crops: readonly Crop[]): ExpressionSpecification | string {
  // A `match` expression must have one branch or more.
  if (crops.length === 0) return UNKNOWN_CROP_COLOR;
  const branches = crops.flatMap((crop) => [crop.code, crop.color]);
  // The type of MapLibre cannot describe a `match` expression with a variable number of
  // branches.
  return [
    "match",
    ["get", "crop"],
    ...branches,
    UNKNOWN_CROP_COLOR,
  ] as unknown as ExpressionSpecification;
}

/** MapLibre expression: the color of a block from the value of a number layer. */
function numberFillExpression(layer: NumberLayerId): ExpressionSpecification {
  const property = NUMBER_LAYERS[layer].property;
  const stops = rampStops(layer).flat();
  return [
    "case",
    ["has", property],
    ["interpolate", ["linear"], ["get", property], ...stops],
    NO_DATA_COLOR,
  ] as ExpressionSpecification;
}

/** MapLibre expression that gives a block its color in a layer. */
export function fillColorExpression(
  layer: MapLayerId,
  crops: readonly Crop[],
): ExpressionSpecification | string {
  return layer === "crop" ? cropFillExpression(crops) : numberFillExpression(layer);
}

function parseHex(hex: string): [number, number, number] {
  return [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16)) as [
    number,
    number,
    number,
  ];
}

/** Position of a value on the ramp of a number layer, from 0 (left end) to 1 (right end). */
export function rampPosition(layer: NumberLayerId, value: number): number {
  const [min, max] = NUMBER_LAYERS[layer].domain;
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}

/**
 * The color of one value of a number layer, for example for the swatch in a tooltip.
 * `undefined` = no data.
 */
export function colorOfValue(layer: NumberLayerId, value: number | undefined): string {
  if (value === undefined) return NO_DATA_COLOR;
  const colors = LAYER_RAMPS[layer];
  const last = colors.length - 1;
  const position = rampPosition(layer, value) * last;
  const index = Math.min(last - 1, Math.floor(position));
  const from = parseHex(colors[index] as string);
  const to = parseHex(colors[index + 1] as string);
  const t = position - index;
  const channel = (i: 0 | 1 | 2) => Math.round(from[i] + (to[i] - from[i]) * t);
  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
}

/** CSS gradient of a ramp, from the lowest value on the left to the highest on the right. */
export function rampGradient(layer: NumberLayerId): string {
  return `linear-gradient(to right, ${LAYER_RAMPS[layer].join(", ")})`;
}
