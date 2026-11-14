"use client";

import { useEffect, useState } from "react";
import { useMap } from "react-map-gl/maplibre";

import type { BasemapId } from "@/config/basemaps";
import { MAP_ID } from "@/config/regions";

interface StyleLayer {
  id: string;
  type: string;
  "source-layer"?: string;
}

/** Water layers in the OpenMapTiles schema, which the vector basemap uses. */
const WATER_SOURCE_LAYERS = new Set(["water", "waterway"]);

/**
 * The basemap layer below which the data layers go.
 *
 * On the vector basemap this is the first water layer. The blocks are then above the land
 * cover, and below the water, the roads and the place names. The sea hides the blocks that
 * are not on land, and the roads and names stay readable.
 */
function findAnchor(layers: StyleLayer[]): string | undefined {
  const water = layers.find((layer) => WATER_SOURCE_LAYERS.has(layer["source-layer"] ?? ""));
  return (water ?? layers.find((layer) => layer.type === "symbol"))?.id;
}

/**
 * The id of the basemap layer below which the data layers go.
 *
 * The result is `undefined` while the style loads and for a basemap that has no such layer.
 * The data layers are then on top of the basemap.
 */
export function useLabelLayerId(basemap: BasemapId): string | undefined {
  const map = useMap()[MAP_ID];
  // The id is only valid for the basemap that it was read from.
  const [found, setFound] = useState<{ basemap: BasemapId; id: string | undefined } | null>(null);

  useEffect(() => {
    if (!map) return;
    const update = () => {
      // `getStyle` returns nothing until the style document is loaded.
      const style = map.getStyle() as { layers?: StyleLayer[] } | undefined;
      if (!style?.layers) return;
      const id = findAnchor(style.layers);
      setFound((previous) =>
        previous?.basemap === basemap && previous.id === id ? previous : { basemap, id },
      );
    };
    update();
    map.on("styledata", update);
    return () => {
      map.off("styledata", update);
    };
  }, [map, basemap]);

  if (!map || found?.basemap !== basemap || !found.id) return undefined;
  // A style change can remove the layer before the next `styledata` event.
  return map.getLayer(found.id) ? found.id : undefined;
}
