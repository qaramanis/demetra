"use client";

import type { Block, MetricValues } from "@demetra/core";
import { useQueries } from "@tanstack/react-query";
import type { Feature, FeatureCollection, Polygon } from "geojson";
import type { FillLayerSpecification } from "maplibre-gl";
import { useMemo } from "react";
import { Layer, Source } from "react-map-gl/maplibre";

import { provider } from "@/data/provider";
import { fillColorExpression } from "@/lib/color-scale";
import { useAppStore, useFilters } from "@/store/app-store";

export const CUSTOM_FIELDS_SOURCE = "custom-fields";
export const CUSTOM_FIELDS_FILL_LAYER = "custom-fields-fill";

type FieldProperties = { id: string; kind: Block["kind"] } & Partial<MetricValues>;

/** The field polygons of the user as map features, with their metric values when loaded. */
function useCustomFieldFeatures(): FeatureCollection<Polygon, FieldProperties> {
  const fields = useAppStore((state) => state.customFields);
  const filters = useFilters();

  // The same query keys as the detail panel, so the two share their results.
  const values = useQueries({
    queries: fields.map((field) => ({
      queryKey: ["blockMetrics", provider.meta.id, field.id, filters],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        provider.getBlockMetrics(field, filters, { signal }),
    })),
    // The result keeps its identity until a value changes.
    combine: (results) => results.map((result) => result.data?.values),
  });

  return useMemo(
    () => ({
      type: "FeatureCollection",
      features: fields.map(
        (field, index): Feature<Polygon, FieldProperties> => ({
          type: "Feature",
          geometry: field.geometry,
          properties: { id: field.id, kind: field.kind, ...values[index] },
        }),
      ),
    }),
    [fields, values],
  );
}

/**
 * The field polygons of the user. A field has the colour of its value, the same as a block,
 * and a dark outline that separates it from the grid.
 */
export function CustomFieldsLayer({ beforeId }: { beforeId?: string }) {
  const metric = useAppStore((state) => state.metric);
  const data = useCustomFieldFeatures();

  const fillPaint = useMemo<NonNullable<FillLayerSpecification["paint"]>>(
    () => ({
      // Neutral until the values of the field load.
      "fill-color": ["case", ["has", metric], fillColorExpression(metric), "#ffffff"],
      "fill-opacity": [
        "case",
        ["boolean", ["feature-state", "hover"], false],
        1,
        ["case", ["has", metric], 0.92, 0.35],
      ],
    }),
    [metric],
  );

  return (
    <Source id={CUSTOM_FIELDS_SOURCE} type="geojson" data={data} promoteId="id">
      <Layer id={CUSTOM_FIELDS_FILL_LAYER} type="fill" beforeId={beforeId} paint={fillPaint} />
      <Layer
        id="custom-fields-casing"
        type="line"
        beforeId={beforeId}
        layout={{ "line-join": "round" }}
        paint={{ "line-color": "#ffffff", "line-width": 4 }}
      />
      <Layer
        id="custom-fields-outline"
        type="line"
        beforeId={beforeId}
        layout={{ "line-join": "round" }}
        paint={{ "line-color": "#1d1b18", "line-width": 1.5 }}
      />
    </Source>
  );
}
