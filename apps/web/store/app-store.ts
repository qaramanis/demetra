import type { BBox } from "@demetra/core";
import { create } from "zustand";

import type { BasemapId } from "@/config/basemaps";

/** The part of the world that the map shows. */
export interface Viewport {
  bbox: BBox;
  zoom: number;
}

interface AppState {
  basemap: BasemapId;
  viewport: Viewport | null;

  setBasemap: (basemap: BasemapId) => void;
  setViewport: (viewport: Viewport) => void;
}

/** State of the user interface. Field data is not here: TanStack Query keeps it. */
export const useAppStore = create<AppState>()((set) => ({
  basemap: "vector",
  viewport: null,

  setBasemap: (basemap) => set({ basemap }),
  setViewport: (viewport) => set({ viewport }),
}));
