"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { METRIC_IDS } from "@demetra/core";
import type { MetricValues } from "@demetra/core";
import * as maplibregl from "maplibre-gl";
import { useCallback, useRef } from "react";
import Map, {
  AttributionControl,
  NavigationControl,
  ScaleControl,
  type MapLayerMouseEvent,
  type MapRef,
} from "react-map-gl/maplibre";

import { BASEMAP_STYLES } from "@/config/basemaps";
import { INITIAL_VIEW, MAP_ID } from "@/config/regions";
import { useBlocks } from "@/data/queries";
import { useAppStore } from "@/store/app-store";
import { useHoverStore } from "@/store/hover-store";

import { BLOCKS_FILL_LAYER, BLOCKS_SOURCE, BlocksLayer } from "./blocks-layer";
import { SelectionLayer } from "./selection-layer";
import { useLabelLayerId } from "./use-label-layer";

// MapLibre 6 loads its worker from a separate file. The default address of that file is
// not correct in a bundle, so give the address of the copy that the bundler emits.
maplibregl.setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);

/** Web Mercator has no data nearer to the poles than this latitude. */
const MAX_LATITUDE = 85;

const INTERACTIVE_LAYERS = [BLOCKS_FILL_LAYER];

type MapInstance = ReturnType<MapRef["getMap"]>;

function readViewport(map: MapInstance) {
  const bounds = map.getBounds();
  return {
    bbox: [
      Math.max(-180, bounds.getWest()),
      Math.max(-MAX_LATITUDE, bounds.getSouth()),
      Math.min(180, bounds.getEast()),
      Math.min(MAX_LATITUDE, bounds.getNorth()),
    ] as const,
    zoom: map.getZoom(),
  };
}

function metricValuesOf(properties: Record<string, unknown>): MetricValues | null {
  const values = {} as MetricValues;
  for (const id of METRIC_IDS) {
    const value = properties[id];
    if (typeof value !== "number") return null;
    values[id] = value;
  }
  return values;
}

/** The full-screen map with the blocks. */
export default function MapView() {
  const basemap = useAppStore((state) => state.basemap);
  const setViewport = useAppStore((state) => state.setViewport);
  const select = useAppStore((state) => state.select);
  const setHovered = useHoverStore((state) => state.setHovered);

  const blocks = useBlocks();
  const labelLayerId = useLabelLayerId(basemap);

  /** The feature that has the hover state on the map. */
  const hoveredRef = useRef<{ source: string; id: string } | null>(null);

  const clearHover = useCallback(
    (map: MapInstance) => {
      const previous = hoveredRef.current;
      if (previous && map.getSource(previous.source)) {
        map.setFeatureState(previous, { hover: false });
      }
      hoveredRef.current = null;
      map.getCanvas().style.cursor = "";
      setHovered(null);
    },
    [setHovered],
  );

  const onMouseMove = useCallback(
    (event: MapLayerMouseEvent) => {
      const map = event.target;
      const feature = event.features?.[0];
      const id = feature?.properties?.id as string | undefined;
      if (!feature || !id) {
        if (hoveredRef.current) clearHover(map);
        return;
      }

      const previous = hoveredRef.current;
      if (previous?.id !== id || previous.source !== feature.source) {
        if (previous && map.getSource(previous.source)) {
          map.setFeatureState(previous, { hover: false });
        }
        hoveredRef.current = { source: feature.source, id };
        map.setFeatureState(hoveredRef.current, { hover: true });
        map.getCanvas().style.cursor = "pointer";
      }
      setHovered({
        id,
        x: event.point.x,
        y: event.point.y,
        values: feature.source === BLOCKS_SOURCE ? metricValuesOf(feature.properties) : null,
      });
    },
    [clearHover, setHovered],
  );

  const onClick = useCallback(
    (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      const id = feature?.properties?.id as string | undefined;
      if (!feature || !id) {
        select(null);
        return;
      }
      // The geometry of a rendered feature is cut at the tile edges. Use the original block.
      const block = blocks.data?.features.find((item) => item.properties.id === id);
      if (block) select({ id, kind: "cell", geometry: block.geometry });
    },
    [blocks.data, select],
  );

  return (
    <Map
      id={MAP_ID}
      mapLib={maplibregl}
      initialViewState={INITIAL_VIEW}
      mapStyle={BASEMAP_STYLES[basemap]}
      minZoom={2}
      maxZoom={19}
      // North is always up: the blocks are easier to compare.
      dragRotate={false}
      pitchWithRotate={false}
      touchPitch={false}
      maxPitch={0}
      attributionControl={false}
      interactiveLayerIds={INTERACTIVE_LAYERS}
      onLoad={(event) => {
        event.target.touchZoomRotate.disableRotation();
        setViewport(readViewport(event.target));
      }}
      onMoveEnd={(event) => setViewport(readViewport(event.target))}
      onMouseMove={onMouseMove}
      onMouseLeave={(event) => clearHover(event.target)}
      onMouseOut={(event) => clearHover(event.target)}
      onClick={onClick}
      style={{ position: "absolute", inset: 0 }}
    >
      <AttributionControl compact position="bottom-right" />
      <NavigationControl position="bottom-right" showCompass={false} />
      <ScaleControl position="bottom-right" unit="metric" />

      <BlocksLayer data={blocks.data} beforeId={labelLayerId} />
      <SelectionLayer beforeId={labelLayerId} />
    </Map>
  );
}
