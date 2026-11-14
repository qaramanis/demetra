"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import type { ReactNode } from "react";
import * as maplibregl from "maplibre-gl";
import Map, {
  AttributionControl,
  NavigationControl,
  ScaleControl,
  type MapRef,
} from "react-map-gl/maplibre";

import { BASEMAP_STYLES } from "@/config/basemaps";
import { INITIAL_VIEW, MAP_ID } from "@/config/regions";
import { useAppStore } from "@/store/app-store";

// MapLibre 6 loads its worker from a separate file. The default address of that file is
// not correct in a bundle, so give the address of the copy that the bundler emits.
maplibregl.setWorkerUrl(
  new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href,
);

/** Web Mercator has no data nearer to the poles than this latitude. */
const MAX_LATITUDE = 85;

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

/** The full-screen map. The children are the data layers. */
export default function MapView({ children }: { children?: ReactNode }) {
  const basemap = useAppStore((state) => state.basemap);
  const setViewport = useAppStore((state) => state.setViewport);

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
      onLoad={(event) => {
        event.target.touchZoomRotate.disableRotation();
        setViewport(readViewport(event.target));
      }}
      onMoveEnd={(event) => setViewport(readViewport(event.target))}
      style={{ position: "absolute", inset: 0 }}
    >
      <AttributionControl compact position="bottom-right" />
      <NavigationControl position="bottom-right" showCompass={false} />
      <ScaleControl position="bottom-right" unit="metric" />
      {children}
    </Map>
  );
}
