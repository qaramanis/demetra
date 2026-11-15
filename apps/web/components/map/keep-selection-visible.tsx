"use client";

import { polygonCentroid } from "@demetra/core";
import { useEffect } from "react";
import { useMap } from "react-map-gl/maplibre";

import { useAppStore } from "@/store/app-store";

/** The selected block stays this number of pixels or more from the edges of the map. */
const MARGIN = 72;

/**
 * Time for the detail panel to take its place and for the map to get its new size. The
 * panel slides in for 300 ms above the map, and then takes its column in the layout.
 */
const LAYOUT_DELAY_MS = 350;

/**
 * Moves the map when the selected block is not in the visible part of the map, for example
 * when the detail panel opens above it.
 */
export function KeepSelectionVisible() {
  const { current: map } = useMap();
  const selected = useAppStore((state) => state.selected);

  useEffect(() => {
    if (!map || !selected) return;
    const timer = setTimeout(() => {
      const point = map.project(polygonCentroid(selected.geometry));
      const { clientWidth: width, clientHeight: height } = map.getContainer();
      const overflow = (position: number, size: number) => {
        if (position < MARGIN) return position - MARGIN;
        if (position > size - MARGIN) return position - (size - MARGIN);
        return 0;
      };
      const dx = overflow(point.x, width);
      const dy = overflow(point.y, height);
      if (dx !== 0 || dy !== 0) map.panBy([dx, dy], { duration: 350 });
    }, LAYOUT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [map, selected]);

  return null;
}
