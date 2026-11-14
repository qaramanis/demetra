"use client";

import type { Feature, FeatureCollection, Polygon } from "geojson";
import { useMemo } from "react";
import { Layer, Source } from "react-map-gl/maplibre";

import { useAppStore } from "@/store/app-store";

const EMPTY: FeatureCollection<Polygon> = { type: "FeatureCollection", features: [] };

/**
 * The outline of the selected block: a dark line on a white line. The pair is visible on
 * each colour of the palettes and on the two basemaps.
 */
export function SelectionLayer({ beforeId }: { beforeId?: string }) {
  const selected = useAppStore((state) => state.selected);

  const data = useMemo<FeatureCollection<Polygon> | Feature<Polygon>>(
    () =>
      selected
        ? { type: "Feature", geometry: selected.geometry, properties: { id: selected.id } }
        : EMPTY,
    [selected],
  );

  return (
    <Source id="selection" type="geojson" data={data}>
      <Layer
        id="selection-casing"
        type="line"
        beforeId={beforeId}
        layout={{ "line-join": "round" }}
        paint={{ "line-color": "#ffffff", "line-width": 6 }}
      />
      <Layer
        id="selection-line"
        type="line"
        beforeId={beforeId}
        layout={{ "line-join": "round" }}
        paint={{ "line-color": "#1d1b18", "line-width": 2.5 }}
      />
    </Source>
  );
}
