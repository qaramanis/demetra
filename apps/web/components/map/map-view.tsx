"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import type { BlockProperties } from "@demetra/core";
import type { Polygon } from "geojson";
import * as maplibregl from "maplibre-gl";
import { useCallback, useMemo, useRef } from "react";
import Map, {
  AttributionControl,
  NavigationControl,
  ScaleControl,
  type MapLayerMouseEvent,
  type MapProps,
  type MapRef,
} from "react-map-gl/maplibre";

import { BASEMAP_STYLES } from "@/config/basemaps";
import { DATA_BOUNDS, MAP_ID } from "@/config/regions";
import { useBlocks } from "@/data/queries";
import { useAppStore } from "@/store/app-store";
import { useHoverStore } from "@/store/hover-store";

import { BLOCKS_FILL_LAYER, BlocksLayer, LINES_MIN_ZOOM } from "./blocks-layer";
import { KeepSelectionVisible } from "./keep-selection-visible";
import { SelectionLayer } from "./selection-layer";
import { useLabelLayerId } from "./use-label-layer";

// MapLibre 6 loads its worker from a separate file. The default address of that file is
// not correct in a bundle, so give the address of the copy that the bundler emits.
maplibregl.setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);

/** Web Mercator has no data nearer to the poles than this latitude. */
const MAX_LATITUDE = 85;

const [WEST, SOUTH, EAST, NORTH] = DATA_BOUNDS;

/** First view of the map: the area that has data. */
const INITIAL_VIEW: NonNullable<MapProps["initialViewState"]> = {
  bounds: [WEST, SOUTH, EAST, NORTH],
  fitBoundsOptions: { padding: 24 },
};

/** The layers that get the pointer. */
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

/** The values of a rendered block. The result is `null` when a necessary value is absent. */
function blockPropertiesOf(properties: Record<string, unknown>): BlockProperties | null {
  const { id, crop, share, crops, acres, revenue, storie } = properties;
  if (typeof id !== "string" || typeof crop !== "number" || typeof share !== "number") return null;
  if (typeof crops !== "number" || typeof acres !== "number") return null;
  const values: BlockProperties = { id, crop, share, crops, acres };
  // A block without revenue data or soil data does not have these properties.
  if (typeof revenue === "number") values.revenue = revenue;
  if (typeof storie === "number") values.storie = storie;
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

  /**
   * The original geometry of each block, by block id. One answer can have 86,623 blocks, so
   * a click does not search the full list. In this file `Map` is the map component, so the
   * index uses `globalThis.Map`.
   */
  const geometryById = useMemo(() => {
    const index = new globalThis.Map<string, Polygon>();
    for (const feature of blocks.data?.features ?? []) {
      index.set(feature.properties.id, feature.geometry);
    }
    return index;
  }, [blocks.data]);

  /** The block under the pointer. `state` = the block has the hover state on the map. */
  const hoveredRef = useRef<{ source: string; id: string; state: boolean } | null>(null);

  /** The width of the map before the last change of its size. */
  const widthRef = useRef<number | null>(null);

  /**
   * MapLibre keeps the center of the view when the map gets a new size. The content then
   * moves sideways when the detail panel opens or closes. Keep the left edge in its place.
   */
  const keepLeftEdge = useCallback((map: MapInstance) => {
    const width = map.getContainer().clientWidth;
    const previous = widthRef.current;
    widthRef.current = width;
    if (previous !== null && width !== previous) {
      map.panBy([(width - previous) / 2, 0], { duration: 0 });
    }
  }, []);

  const clearHover = useCallback(
    (map: MapInstance) => {
      const previous = hoveredRef.current;
      if (previous?.state && map.getSource(previous.source)) {
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
      const properties = feature ? blockPropertiesOf(feature.properties) : null;
      if (!feature || !properties) {
        if (hoveredRef.current) clearHover(map);
        return;
      }

      const { id } = properties;
      const previous = hoveredRef.current;
      if (previous?.id !== id || previous.source !== feature.source) {
        if (previous?.state && map.getSource(previous.source)) {
          map.setFeatureState(previous, { hover: false });
        }
        // A change of the hover state makes MapLibre send the paint data of the full tile to
        // the graphics card again. At a low zoom one tile has most of the blocks of the
        // state, so there the map shows only the tooltip. The hover line starts at the same
        // zoom.
        const state = map.getZoom() >= LINES_MIN_ZOOM;
        hoveredRef.current = { source: feature.source, id, state };
        if (state) map.setFeatureState(hoveredRef.current, { hover: true });
        map.getCanvas().style.cursor = "pointer";
      }
      setHovered({ x: event.point.x, y: event.point.y, properties });
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
      const geometry = geometryById.get(id);
      if (geometry) select({ id, geometry });
    },
    [geometryById, select],
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
        widthRef.current = event.target.getContainer().clientWidth;
        setViewport(readViewport(event.target));
      }}
      onResize={(event) => keepLeftEdge(event.target)}
      onMoveEnd={(event) => setViewport(readViewport(event.target))}
      onMouseMove={onMouseMove}
      onMouseLeave={(event) => clearHover(event.target)}
      onMouseOut={(event) => clearHover(event.target)}
      onClick={onClick}
      style={{ position: "absolute", inset: 0 }}
    >
      <AttributionControl compact position="bottom-right" />
      <NavigationControl position="bottom-right" showCompass={false} />
      {/* The areas of the data are in acres, so the scale shows miles and feet. */}
      <ScaleControl position="bottom-right" unit="imperial" />

      <BlocksLayer data={blocks.data} beforeId={labelLayerId} />
      <SelectionLayer beforeId={labelLayerId} />
      <KeepSelectionVisible />
    </Map>
  );
}
