"use client";

import { LoaderCircle, MousePointerClick, SearchX, TriangleAlert, ZoomIn } from "lucide-react";
import type { ReactNode } from "react";
import { useMap } from "react-map-gl/maplibre";

import { Button } from "@/components/ui/button";
import { DATA_BOUNDS, MAP_ID } from "@/config/regions";
import { useBlocks, useReferenceData } from "@/data/queries";
import { useT } from "@/i18n";
import { useAppStore } from "@/store/app-store";

function Pill({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      className="pointer-events-auto flex min-h-8 max-w-full items-center gap-2 rounded-2xl border bg-card py-1.5 pr-3.5 pl-3 text-xs font-medium shadow-sm [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:text-muted-foreground"
    >
      {children}
    </div>
  );
}

/** A short message above the map when the blocks are not visible or still load. */
export function MapStatus() {
  const t = useT();
  const map = useMap()[MAP_ID];
  const blocks = useBlocks();
  const reference = useReferenceData();
  const hasSelected = useAppStore((state) => state.hasSelected);
  const hasFilter = useAppStore((state) => state.cropCode !== null || state.countyFips !== null);

  const goToData = () => {
    const [west, south, east, north] = DATA_BOUNDS;
    map?.fitBounds(
      [
        [west, south],
        [east, north],
      ],
      { padding: 24, duration: 1200 },
    );
  };

  if (blocks.status === "outside") {
    return (
      <Pill>
        <TriangleAlert />
        {t("map.outside")}
        <Button variant="outline" size="xs" onClick={goToData}>
          {t("map.goToData")}
        </Button>
      </Pill>
    );
  }

  if (blocks.status === "tooMany") {
    return (
      <Pill>
        <ZoomIn />
        {t("map.zoomIn")}
      </Pill>
    );
  }

  // The blocks cannot load without the list of years.
  if (blocks.isError || reference.isError) {
    return (
      <Pill>
        <TriangleAlert />
        {t("map.blocksError")}
      </Pill>
    );
  }

  // `idle`: the map or the list of years is not ready, so the first request did not start.
  if (blocks.isFetching || blocks.status === "idle") {
    return (
      <Pill>
        <LoaderCircle className="animate-spin" />
        {t("map.blocksLoading")}
      </Pill>
    );
  }

  if (!blocks.data) return null;

  if (blocks.data.features.length === 0) {
    return (
      <Pill>
        <SearchX />
        {/* Without a crop filter and a county filter, the area has no cropland. */}
        {t(hasFilter ? "map.noMatch" : "map.noBlocks")}
      </Pill>
    );
  }

  // Tell a new user what to do, until the first selection.
  if (!hasSelected) {
    return (
      <Pill>
        <MousePointerClick />
        {t("map.selectHint")}
      </Pill>
    );
  }

  return null;
}
