"use client";

import type { BlockFeatureCollection } from "@demetra/core";
import type {
  ExpressionSpecification,
  FillLayerSpecification,
  LineLayerSpecification,
} from "maplibre-gl";
import { useMemo } from "react";
import { Layer, Source } from "react-map-gl/maplibre";

import { useCrops } from "@/data/queries";
import { fillColorExpression } from "@/lib/color-scale";
import { useAppStore } from "@/store/app-store";

export const BLOCKS_SOURCE = "blocks";
export const BLOCKS_FILL_LAYER = "blocks-fill";

const EMPTY: BlockFeatureCollection = { type: "FeatureCollection", features: [] };

/** `true` for the block under the pointer. */
const HOVERED: ExpressionSpecification = ["boolean", ["feature-state", "hover"], false];

/**
 * The line layers start at this zoom. Below it a block is smaller than 4 pixels, and the
 * view can contain all the blocks of the state (109,490 in 2018): MapLibre then does not make and draw
 * a line for each block. Below this zoom the map also sets no hover state.
 */
export const LINES_MIN_ZOOM = 8;

interface BlocksLayerProps {
  data: BlockFeatureCollection | undefined;
  /** The layer below which the blocks go. */
  beforeId?: string;
}

/** The blocks, with a color from the active layer. */
export function BlocksLayer({ data, beforeId }: BlocksLayerProps) {
  const layer = useAppStore((state) => state.layer);
  const basemap = useAppStore((state) => state.basemap);
  const crops = useCrops();
  const onImagery = basemap === "satellite";

  const fillPaint = useMemo<NonNullable<FillLayerSpecification["paint"]>>(
    () => ({
      "fill-color": fillColorExpression(layer, crops),
      // Imagery is darker and has more detail than the vector map, so the fill is more opaque.
      // When the user zooms in, the fill becomes more transparent and the basemap shows the
      // ground below the blocks.
      "fill-opacity": [
        "interpolate",
        ["linear"],
        ["zoom"],
        12,
        ["case", HOVERED, 0.95, onImagery ? 0.82 : 0.74],
        15,
        ["case", HOVERED, 0.85, onImagery ? 0.5 : 0.6],
      ],
      // The line layer below draws the edges.
      "fill-antialias": false,
    }),
    [layer, crops, onImagery],
  );

  const outlinePaint = useMemo<NonNullable<LineLayerSpecification["paint"]>>(
    () => ({
      // A thin light line between the blocks separates them without a dark border. When
      // the blocks are small on the screen, the lines are almost invisible.
      "line-color": "#ffffff",
      "line-opacity": [
        "interpolate",
        ["linear"],
        ["zoom"],
        9,
        0.12,
        11,
        onImagery ? 0.35 : 0.6,
        13,
        onImagery ? 0.5 : 0.85,
      ],
      "line-width": ["interpolate", ["linear"], ["zoom"], 9, 0.3, 11, 0.6, 14, 1],
    }),
    [onImagery],
  );

  return (
    <Source
      id={BLOCKS_SOURCE}
      type="geojson"
      data={data ?? EMPTY}
      promoteId="id"
      // MapLibre removes the corners of a shape that are nearer than the tolerance (0.375
      // pixels by default) to the line between the adjacent corners. At zoom 5 a block is
      // 0.5 pixels wide: it then has no area and the fill is not visible. A square has no
      // corner that is not necessary, so the tolerance is zero.
      tolerance={0}
    >
      <Layer id={BLOCKS_FILL_LAYER} type="fill" beforeId={beforeId} paint={fillPaint} />
      <Layer
        id="blocks-outline"
        type="line"
        beforeId={beforeId}
        minzoom={LINES_MIN_ZOOM}
        paint={outlinePaint}
      />
      <Layer
        id="blocks-hover"
        type="line"
        beforeId={beforeId}
        // MapLibre draws a line with an opacity of zero too, so this layer has the same
        // minimum zoom as the outline. The two layers then use the same lines.
        minzoom={LINES_MIN_ZOOM}
        paint={{
          "line-color": "#1d1b18",
          "line-width": 2,
          "line-opacity": ["case", HOVERED, 1, 0],
        }}
      />
    </Source>
  );
}
