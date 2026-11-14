"use client";

import dynamic from "next/dynamic";
import { MapProvider } from "react-map-gl/maplibre";

import { DetailPanel } from "@/components/detail/detail-panel";
import { FiltersSidebar } from "@/components/filters/filters-sidebar";
import { FiltersToggle } from "@/components/filters/filters-toggle";
import { Legend } from "@/components/legend/legend";
import { BasemapToggle } from "@/components/map/basemap-toggle";
import { DrawButton } from "@/components/map/draw-button";
import { HoverTooltip } from "@/components/map/hover-tooltip";
import { LocationSearch } from "@/components/map/location-search";
import { MapStatus } from "@/components/map/map-status";
import { MockDataBadge } from "@/components/map/mock-data-badge";
import { RegionPresets } from "@/components/map/region-presets";
import { useT } from "@/i18n";

import { TopBar } from "./top-bar";

function MapLoading() {
  const t = useT();
  return (
    <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
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
        <TopBar>
          <FiltersToggle />
          <LocationSearch className="w-full max-w-72" />
          <RegionPresets />
        </TopBar>
        <div className="relative flex min-h-0 flex-1">
          <FiltersSidebar />
          <main className="relative min-w-0 flex-1 bg-muted">
            <MapView />
            <HoverTooltip />
            {/* The controls above the map. On a narrow map the status message has its own row. */}
            <div className="pointer-events-none absolute inset-x-3 top-3 z-10 @container">
              <div className="flex flex-wrap items-start gap-2">
                <div className="pointer-events-auto order-1">
                  <MockDataBadge />
                </div>
                <div className="order-3 flex basis-full justify-center @4xl:order-2 @4xl:flex-1 @4xl:basis-0">
                  <MapStatus />
                </div>
                <div className="pointer-events-auto order-2 ml-auto flex items-center gap-2 @4xl:order-3 @4xl:ml-0">
                  <DrawButton />
                  <BasemapToggle />
                </div>
              </div>
            </div>
            <div className="absolute bottom-3 left-3 z-10">
              <Legend />
            </div>
          </main>
          <DetailPanel />
        </div>
      </div>
    </MapProvider>
  );
}
