import type { BlockProperties } from "./blocks.ts";

/**
 * The layers of the map. A layer gives the blocks their color.
 * - `crop`: the main crop of each block, with the color of its crop class.
 * - `revenue`: the estimated revenue for each acre.
 * - `soil`: the soil quality (Storie index).
 */
export const MAP_LAYER_IDS = ["crop", "revenue", "soil"] as const;

export type MapLayerId = (typeof MAP_LAYER_IDS)[number];

/** A layer that shows a number with a color ramp. */
export type NumberLayerId = Exclude<MapLayerId, "crop">;

export interface NumberLayerDef {
  id: NumberLayerId;
  /** The property of a block that the layer shows. */
  property: "revenue" | "storie";
  unit: "usdPerAcre" | "index";
  /**
   * The values of the first and the last color. A value outside this range gets the nearest
   * color.
   */
  domain: readonly [min: number, max: number];
  /** The highest possible value, or `null` when there is no limit. */
  max: number | null;
}

export const NUMBER_LAYERS: Record<NumberLayerId, NumberLayerDef> = {
  // 95 % of the blocks have a revenue below 10,300 dollars for each acre. Some vegetable and
  // berry blocks have much more, so the colors stop at 10,000.
  revenue: { id: "revenue", property: "revenue", unit: "usdPerAcre", domain: [0, 10_000], max: null },
  soil: { id: "soil", property: "storie", unit: "index", domain: [0, 100], max: 100 },
};

/** The value that a number layer shows for a block. `undefined` = no data. */
export function numberLayerValue(
  layer: NumberLayerId,
  properties: Pick<BlockProperties, "revenue" | "storie">,
): number | undefined {
  return properties[NUMBER_LAYERS[layer].property];
}
