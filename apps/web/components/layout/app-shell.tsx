"use client";

import dynamic from "next/dynamic";
import { MapProvider } from "react-map-gl/maplibre";

import { DetailPanel } from "@/components/detail/detail-panel";
import { FiltersSidebar } from "@/components/filters/filters-sidebar";
import { Legend } from "@/components/legend/legend";
import { BasemapToggle } from "@/components/map/basemap-toggle";
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
          <LocationSearch className="w-full max-w-72" />
          <RegionPresets />
        </TopBar>
        <div className="relative flex min-h-0 flex-1">
          <FiltersSidebar />
          <main className="relative min-w-0 flex-1 bg-muted">
            <MapView />
            <HoverTooltip />
            <div className="absolute top-3 left-3 z-10">
              <MockDataBadge />
            </div>
            <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center px-40">
              <div className="pointer-events-auto">
                <MapStatus />
              </div>
            </div>
            <div className="absolute top-3 right-3 z-10">
              <BasemapToggle />
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
