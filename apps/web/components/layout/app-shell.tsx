"use client";

import dynamic from "next/dynamic";
import { MapProvider } from "react-map-gl/maplibre";

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
  const t = useT();
  return (
    <MapProvider>
      <div className="flex h-dvh flex-col">
        <TopBar>
          <LocationSearch className="w-full max-w-72" />
          <RegionPresets />
        </TopBar>
        <div className="flex min-h-0 flex-1">
          <aside
            aria-label={t("filters.title")}
            className="hidden w-72 shrink-0 flex-col border-r bg-card md:flex"
          >
            <h2 className="px-4 pt-4 text-sm font-semibold">{t("filters.title")}</h2>
          </aside>
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
          </main>
        </div>
      </div>
    </MapProvider>
  );
}
