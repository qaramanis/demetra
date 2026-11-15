"use client";

import {
  LoaderCircle,
  MousePointerClick,
  SearchX,
  Sparkles,
  TriangleAlert,
  ZoomIn,
} from "lucide-react";
import type { ReactNode } from "react";
import { useMap } from "react-map-gl/maplibre";

import { Button } from "@/components/ui/button";
import { DATA_BOUNDS, MAP_ID } from "@/config/regions";
import { useBlocks, useMapYear, useReferenceData } from "@/data/queries";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

/**
 * One message. Each message has its own `key`, so a new message is a new pill: it comes up
 * from below with a short fade. `delayed` = the pill waits 300 ms before it shows. A fast
 * answer then removes the loading message before it is visible, and the map does not flash.
 * `prediction` = a message about predicted data, in the prediction colour.
 */
function Pill({
  children,
  delayed,
  prediction,
}: {
  children: ReactNode;
  delayed?: boolean;
  prediction?: boolean;
}) {
  return (
    <div
      className={cn(
        "pointer-events-auto flex min-h-8 max-w-full items-center gap-2 rounded-2xl border bg-card py-1.5 pr-3.5 pl-3 text-xs font-medium shadow-sm [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
        "animate-in duration-200 ease-out fade-in slide-in-from-bottom-1",
        delayed && "delay-300 fill-mode-backwards",
        prediction && "border-prediction/35 text-prediction-ink [&_svg]:text-prediction",
      )}
    >
      {children}
    </div>
  );
}

/** The message for the state of the blocks, or nothing. */
function StatusMessage() {
  const t = useT();
  const map = useMap()[MAP_ID];
  const blocks = useBlocks();
  const reference = useReferenceData();
  const hasSelected = useAppStore((state) => state.hasSelected);
  const hasFilter = useAppStore((state) => state.cropCode !== null || state.countyFips !== null);
  const mapYear = useMapYear();

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
      <Pill key="outside">
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
      <Pill key="tooMany">
        <ZoomIn />
        {t("map.zoomIn")}
      </Pill>
    );
  }

  // The blocks cannot load without the list of years.
  if (blocks.isError || reference.isError) {
    return (
      <Pill key="error">
        <TriangleAlert />
        {t("map.blocksError")}
      </Pill>
    );
  }

  // `idle`: the map or the list of years is not ready, so the first request did not start.
  if (blocks.isFetching || blocks.status === "idle") {
    return (
      <Pill key="loading" delayed>
        <LoaderCircle className="animate-spin text-primary!" />
        {t("map.blocksLoading")}
      </Pill>
    );
  }

  if (!blocks.data) return null;

  if (blocks.data.features.length === 0) {
    return (
      <Pill key="noBlocks">
        <SearchX />
        {/* Without a crop filter and a county filter, the area has no cropland. */}
        {t(hasFilter ? "map.noMatch" : "map.noBlocks")}
      </Pill>
    );
  }

  // The map shows a prediction and not real data. The message stays while the prediction is on
  // the map, and it also tells a new user what to do.
  if (mapYear?.predicted) {
    return (
      <Pill key={`prediction-${mapYear.year}`} prediction>
        <Sparkles />
        {t(hasSelected ? "map.predictionLoadedSelected" : "map.predictionLoaded", {
          year: mapYear.year,
        })}
      </Pill>
    );
  }

  // Tell a new user what to do, until the first selection.
  if (!hasSelected) {
    return (
      <Pill key="selectHint">
        <MousePointerClick />
        {t("map.selectHint")}
      </Pill>
    );
  }

  return null;
}

/** A short message on the map when the blocks are not visible or still load. */
export function MapStatus() {
  return (
    // The live region stays in the page, so that a screen reader reads each new message.
    <div role="status" className="flex max-w-full min-w-0 justify-center">
      <StatusMessage />
    </div>
  );
}
