"use client";

import { numberScaleOf } from "@demetra/core";
import type { ClimateMetricId, MapBlockFeatureCollection, MapLayerId } from "@demetra/core";
import type {
  ExpressionSpecification,
  FillLayerSpecification,
  LineLayerSpecification,
} from "maplibre-gl";
import { useEffect, useMemo } from "react";
import { Layer, Source, useMap, type MapRef } from "react-map-gl/maplibre";

import { useCrops } from "@/data/queries";
import { fillColorExpression } from "@/lib/color-scale";
import { useAppStore } from "@/store/app-store";

export const BLOCKS_SOURCE = "blocks";
export const BLOCKS_FILL_LAYER = "blocks-fill";

const EMPTY: MapBlockFeatureCollection = { type: "FeatureCollection", features: [] };

/** `true` for the block under the pointer. */
const HOVERED: ExpressionSpecification = ["boolean", ["feature-state", "hover"], false];

/**
 * The line layers start at this zoom. Below it a block is smaller than 4 pixels, and the
 * view can contain all the blocks of the state (109,490 in 2018): MapLibre then does not make and draw
 * a line for each block. Below this zoom the map also sets no hover state.
 */
export const LINES_MIN_ZOOM = 8;

/**
 * `true` while the map does not show all the blocks of its data: while the worker of MapLibre
 * makes the tiles of new data, and while a tile in the view loads again.
 */
function isDrawing(map: MapRef): boolean {
  // When the basemap changes, the source is not on the map for a short time.
  return map.getSource(BLOCKS_SOURCE) !== undefined && !map.isSourceLoaded(BLOCKS_SOURCE);
}

/**
 * Tells the store which blocks the map shows, and when the blocks are not on the map yet:
 * from the start of a request until the map has drawn the answer. A change of the layer or of
 * the basemap, or a new part of the view, also makes the map draw the blocks again.
 */
function useReportBlocks(
  data: MapBlockFeatureCollection | undefined,
  layer: MapLayerId,
  climateMetric: ClimateMetricId,
  requesting: boolean,
) {
  const { current: map } = useMap();
  const setBlocksLoading = useAppStore((state) => state.setBlocksLoading);
  const setDrawnBlocks = useAppStore((state) => state.setDrawnBlocks);
  const setDrawnLayer = useAppStore((state) => state.setDrawnLayer);
  const setDrawnClimateMetric = useAppStore((state) => state.setDrawnClimateMetric);

  useEffect(() => {
    if (!map) return;
    let frame = 0;
    // The colors of a new layer or of a new climate metric go to the map before this effect.
    // But MapLibre starts to draw them only in its next frame, and before that frame the source
    // shows as loaded. Thus the map has drawn `layer` and `climateMetric` only when the source
    // is loaded after a frame of the map.
    let rendered = false;
    const report = () => {
      const drawing = isDrawing(map);
      // Without blocks, the map only removes the old blocks. There is nothing to wait for.
      setBlocksLoading(requesting || (drawing && (data?.features.length ?? 0) > 0));
      if (drawing) return;
      // React gave `data` to the source before this effect, so the map has drawn `data`.
      setDrawnBlocks(data);
      if (rendered) {
        setDrawnLayer(layer);
        setDrawnClimateMetric(climateMetric);
      }
    };
    // MapLibre sends `sourcedataloading` while React renders the source, and the store must not
    // change then. Thus the map is read in the next frame.
    const reportLater = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(report);
    };
    const reportAfterFrame = () => {
      rendered = true;
      reportLater();
    };

    report();
    // New data starts with `sourcedataloading`, and each tile that loads sends `sourcedata`. A
    // change of the layer loads the tiles again in a frame of the map, without an event before
    // it: `render` finds this change.
    map.on("sourcedataloading", reportLater);
    map.on("sourcedata", reportLater);
    map.on("sourcedataabort", reportLater);
    map.on("render", reportAfterFrame);
    map.on("idle", reportLater);
    map.on("error", reportLater);
    return () => {
      cancelAnimationFrame(frame);
      map.off("sourcedataloading", reportLater);
      map.off("sourcedata", reportLater);
      map.off("sourcedataabort", reportLater);
      map.off("render", reportAfterFrame);
      map.off("idle", reportLater);
      map.off("error", reportLater);
    };
  }, [
    map,
    data,
    layer,
    climateMetric,
    requesting,
    setBlocksLoading,
    setDrawnBlocks,
    setDrawnLayer,
    setDrawnClimateMetric,
  ]);

  // Without the map, there are no blocks, and they do not load.
  useEffect(
    () => () => {
      setBlocksLoading(false);
      setDrawnBlocks(undefined);
      setDrawnLayer(null);
      setDrawnClimateMetric(null);
    },
    [setBlocksLoading, setDrawnBlocks, setDrawnLayer, setDrawnClimateMetric],
  );
}

interface BlocksLayerProps {
  /** The blocks of real data, or the predicted blocks of a prediction year. */
  data: MapBlockFeatureCollection | undefined;
  /** `true` while the request for the blocks runs, or while it waits for the list of years. */
  requesting: boolean;
  /** The layer below which the blocks go. */
  beforeId?: string;
}

/** The blocks, with a color from the active layer. */
export function BlocksLayer({ data, requesting, beforeId }: BlocksLayerProps) {
  const layer = useAppStore((state) => state.layer);
  const climateMetric = useAppStore((state) => state.climateMetric);
  // The scale of the colors: the soil scale, the scale of a climate metric, or none (crops).
  const scale = numberScaleOf(layer, climateMetric);
  const basemap = useAppStore((state) => state.basemap);
  const crops = useCrops();
  const onImagery = basemap === "satellite";
  useReportBlocks(data, layer, climateMetric, requesting);

  const fillPaint = useMemo<NonNullable<FillLayerSpecification["paint"]>>(
    () => ({
      "fill-color": fillColorExpression(scale, crops),
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
    [scale, crops, onImagery],
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
