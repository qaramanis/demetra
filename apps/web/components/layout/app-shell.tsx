"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { MapProvider } from "react-map-gl/maplibre";

import { ChatWidget } from "@/components/chat/chat-widget";
import { DetailPanel } from "@/components/detail/detail-panel";
import { FiltersSidebar } from "@/components/filters/filters-sidebar";
import { FiltersToggle } from "@/components/filters/filters-toggle";
import { HoverTooltip } from "@/components/map/hover-tooltip";
import { LocationSearch } from "@/components/map/location-search";
import { MapStatus } from "@/components/map/map-status";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { useChatStore } from "@/store/chat-store";

import { SourcesDialog } from "./sources-dialog";
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
 * The area of the status message: the bottom centre of the visible map, at the same distance
 * from the bottom edge for each width of the map.
 *
 * The map changes its width in one step, when the detail panel is in its place. A message
 * that is in the map then jumps to the side. Thus the area is not in the map: its right edge
 * follows the left edge of the panel, with the same time and the same curve as the slide of
 * the panel. The message slides with the panel and stays in the centre of the visible map.
 *
 * The width of the panel is 26rem (104). When the panel opens, the area becomes narrower by
 * this width in one step, with the same centre (12 px + 13rem on each side = 55). The area
 * then slides 13rem (52) to the left. Only `translate` has a transition: the browser moves
 * it without the main thread, as it moves the panel, so the two stay together while the map
 * is busy. Below `lg` the panel is above the map, and the area does not change. With reduced
 * motion, the message moves at once.
 *
 * The chat button is in the bottom right corner, and the map controls are above it. The same
 * padding on the two sides keeps the message centred and out of the button (56 px = 14).
 * While the chat window is open, the message is centred in the part of the map at the left
 * of the window: the padding is half of the window width, and the message slides left by the
 * same distance (`--chat-status-shift` in `globals.css`), with the time and the curve of the
 * window. A map that has no space for the message next to the window hides it. The message is
 * below the map controls (`z-index: 2`).
 */
function StatusArea() {
  const panelOpen = useAppStore((state) => state.selected !== null);
  const chatOpen = useChatStore((state) => state.open);
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-3 bottom-3 z-1 @container",
        "ease-drawer motion-safe:transition-[translate] motion-reduce:transition-none",
        panelOpen ? "duration-300 lg:inset-x-55 lg:-translate-x-52" : "duration-200",
      )}
    >
      <div
        className={cn(
          "flex justify-center ease-out motion-safe:transition-[translate,opacity,visibility] motion-reduce:transition-[opacity,visibility]",
          chatOpen
            ? "px-(--chat-status-shift) -translate-x-(--chat-status-shift) duration-(--chat-open-duration) @max-2xl:invisible @max-2xl:opacity-0"
            : "px-14 duration-(--chat-close-duration)",
        )}
      >
        <MapStatus />
      </div>
    </div>
  );
}

/**
 * The map and the detail panel, with the status message and the chat. `data-chat` gives the
 * sizes of the chat and moves the map controls above it (`globals.css`).
 */
function MapArea({ children }: { children: ReactNode }) {
  const chatOpen = useChatStore((state) => state.open);
  return (
    <div data-chat={chatOpen ? "open" : "closed"} className="relative flex min-w-0 flex-1">
      {children}
    </div>
  );
}

/**
 * The layout of the dashboard: top bar, filter sidebar on the left, map in the centre and
 * detail panel on the right.
 */
export function AppShell() {
  return (
    <MapProvider>
      <div className="flex h-dvh flex-col">
        <TopBar
          center={<LocationSearch className="w-full" />}
          end={
            <>
              <SourcesDialog />
              <FiltersToggle />
            </>
          }
        />
        <div className="relative flex min-h-0 flex-1">
          <FiltersSidebar />
          {/* The map and the detail panel. This area does not change its width when the panel
              opens or closes, so the status message is in this area and not in the map. */}
          <MapArea>
            <main className="relative min-w-0 flex-1 bg-muted">
              <MapView />
              <HoverTooltip />
            </main>
            <DetailPanel />
            <StatusArea />
            <ChatWidget />
          </MapArea>
        </div>
      </div>
    </MapProvider>
  );
}
