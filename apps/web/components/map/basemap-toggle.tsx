"use client";

import { Map as MapIcon, Satellite } from "lucide-react";
import { useRef, useState } from "react";

import { SegmentedControl } from "@/components/ui/segmented-control";
import type { BasemapId } from "@/config/basemaps";
import { useT } from "@/i18n";
import { useAppStore } from "@/store/app-store";

/** The time of the slide of the pill in `SegmentedControl` (`duration-250`). */
const SLIDE_MS = 250;

export function BasemapToggle() {
  const t = useT();
  const basemap = useAppStore((state) => state.basemap);
  const setBasemap = useAppStore((state) => state.setBasemap);
  // The selection that the toggle shows before the map gets it.
  const [pending, setPending] = useState<BasemapId | null>(null);
  const lastChange = useRef(0);

  // A new basemap makes MapLibre load a new style and add all the blocks again. This work stops
  // the main thread for about 250 ms, and the browser then does not move the pill. Thus the
  // map gets the basemap after the slide of the pill.
  const onChange = (next: BasemapId) => {
    const change = ++lastChange.current;
    setPending(next);
    // With reduced motion, the pill does not slide, and the map does not wait.
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTimeout(
      () => {
        // When the user changes the basemap again quickly, only the last change goes to the map.
        if (change !== lastChange.current) return;
        setBasemap(next);
        setPending(null);
      },
      reducedMotion ? 0 : SLIDE_MS,
    );
  };

  return (
    <SegmentedControl
      ariaLabel={t("basemap.label")}
      value={pending ?? basemap}
      onChange={onChange}
      stretch
      options={[
        {
          value: "vector",
          label: (
            <>
              <MapIcon />
              {t("basemap.vector")}
            </>
          ),
        },
        {
          value: "satellite",
          label: (
            <>
              <Satellite />
              {t("basemap.satellite")}
            </>
          ),
        },
      ]}
    />
  );
}
