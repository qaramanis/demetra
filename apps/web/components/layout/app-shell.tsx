"use client";

import dynamic from "next/dynamic";
import { MapProvider } from "react-map-gl/maplibre";

import { DetailPanel } from "@/components/detail/detail-panel";
import { FiltersSidebar } from "@/components/filters/filters-sidebar";
import { FiltersToggle } from "@/components/filters/filters-toggle";
import { HoverTooltip } from "@/components/map/hover-tooltip";
import { LocationSearch } from "@/components/map/location-search";
import { MapStatus } from "@/components/map/map-status";
import { useT } from "@/i18n";

import { TopBar } from "./top-bar";

function MapLoading() {
  const t = useT();
  return (
    // The text shows only after 300 ms, so a fast load does not flash it.
    <div className="absolute inset-0 grid animate-in place-items-center text-sm text-muted-foreground delay-300 duration-200 ease-out fill-mode-backwards fade-in">
      {t("map.loading")}
    </div>
  );
}

// MapLibre needs the browser, so the map does not render on the server.
const MapView = dynamic(() => import("@/components/map/map-view"), {
  ssr: false,
  loading: MapLoading,
});

/**
 * The layout of the dashboard: top bar, filter sidebar on the left, map in the centre and
 * detail panel on the right.
 */
export function AppShell() {
  return (
    <MapProvider>
      <div className="flex h-dvh flex-col">
        <TopBar center={<LocationSearch className="w-full" />} end={<FiltersToggle />} />
        <div className="relative flex min-h-0 flex-1">
          <FiltersSidebar />
          <main className="relative min-w-0 flex-1 bg-muted">
            <MapView />
            <HoverTooltip />
            {/* The status message is at the bottom centre of the map. On a wide map, the same
                padding on the two sides keeps the message centred and out of the expanded
                attribution (352 px = 88). On a narrow map, the message goes up above the
                attribution, and the padding keeps it out of the zoom buttons. */}
            <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10 @container">
              <div className="flex justify-center px-10 pb-8 @5xl:px-88 @5xl:pb-0">
                <MapStatus />
              </div>
            </div>
          </main>
          <DetailPanel />
        </div>
      </div>
    </MapProvider>
  );
}
