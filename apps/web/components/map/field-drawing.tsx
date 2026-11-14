"use client";

import { useEffect } from "react";
import { useMap } from "react-map-gl/maplibre";
import { TerraDraw, TerraDrawPolygonMode } from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";

import { customFieldFromPolygon } from "@/lib/custom-field";
import { useAppStore } from "@/store/app-store";

const INK = "#1d1b18";
const PAPER = "#ffffff";

/**
 * Lets the user draw one field polygon while `drawing` is `true`.
 *
 * terra-draw is active only during the drawing. When the polygon is complete, it becomes a
 * custom field in the store, and the map shows it with its own layer.
 */
export function FieldDrawing() {
  const { current: mapRef } = useMap();
  const drawing = useAppStore((state) => state.drawing);
  const setDrawing = useAppStore((state) => state.setDrawing);
  const addCustomField = useAppStore((state) => state.addCustomField);

  useEffect(() => {
    if (!drawing || !mapRef) return;

    const draw = new TerraDraw({
      adapter: new TerraDrawMapLibreGLAdapter({ map: mapRef.getMap() }),
      modes: [
        new TerraDrawPolygonMode({
          styles: {
            fillColor: INK,
            fillOpacity: 0.14,
            outlineColor: INK,
            outlineWidth: 2,
            closingPointColor: PAPER,
            closingPointWidth: 5,
            closingPointOutlineColor: INK,
            closingPointOutlineWidth: 2,
          },
        }),
      ],
    });
    draw.start();
    draw.setMode("polygon");

    const onFinish = (id: string | number) => {
      const feature = draw.getSnapshotFeature(id);
      if (feature?.geometry.type === "Polygon") {
        const field = customFieldFromPolygon(feature.geometry);
        if (field) addCustomField(field);
      }
      setDrawing(false);
    };
    draw.on("finish", onFinish);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawing(false);
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      draw.off("finish", onFinish);
      try {
        draw.stop();
      } catch {
        // A change of the basemap removes the layers of terra-draw before this cleanup.
      }
    };
  }, [drawing, mapRef, addCustomField, setDrawing]);

  return null;
}
