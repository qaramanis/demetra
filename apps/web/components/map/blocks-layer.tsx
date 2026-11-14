"use client";

import type { BlockFeatureCollection } from "@demetra/core";
import type {
  ExpressionSpecification,
  FillLayerSpecification,
  LineLayerSpecification,
} from "maplibre-gl";
import { useMemo } from "react";
import { Layer, Source } from "react-map-gl/maplibre";

import { fillColorExpression } from "@/lib/color-scale";
import { useAppStore } from "@/store/app-store";

export const BLOCKS_SOURCE = "blocks";
export const BLOCKS_FILL_LAYER = "blocks-fill";

const EMPTY: BlockFeatureCollection = { type: "FeatureCollection", features: [] };

/** `true` for the block under the pointer. */
const HOVERED: ExpressionSpecification = ["boolean", ["feature-state", "hover"], false];

interface BlocksLayerProps {
  data: BlockFeatureCollection | undefined;
  /** The layer below which the blocks go. */
  beforeId?: string;
}

/** The blocks, with a colour from the active metric. */
export function BlocksLayer({ data, beforeId }: BlocksLayerProps) {
  const metric = useAppStore((state) => state.metric);
  const basemap = useAppStore((state) => state.basemap);
  const onImagery = basemap === "satellite";

  const fillPaint = useMemo<NonNullable<FillLayerSpecification["paint"]>>(
    () => ({
      "fill-color": fillColorExpression(metric),
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
    [metric, onImagery],
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
    <Source id={BLOCKS_SOURCE} type="geojson" data={data ?? EMPTY} promoteId="id">
      <Layer id={BLOCKS_FILL_LAYER} type="fill" beforeId={beforeId} paint={fillPaint} />
      <Layer id="blocks-outline" type="line" beforeId={beforeId} paint={outlinePaint} />
      <Layer
        id="blocks-hover"
        type="line"
        beforeId={beforeId}
        paint={{
          "line-color": "#1d1b18",
          "line-width": 2,
          "line-opacity": ["case", HOVERED, 1, 0],
        }}
      />
    </Source>
  );
}
