import type { BBox, Block, MapLayerId } from "@demetra/core";
import { create } from "zustand";

import type { BasemapId } from "@/config/basemaps";
import { DATA_BOUNDS } from "@/config/regions";

/** The part of the world that the map shows. */
export interface Viewport {
  bbox: BBox;
  zoom: number;
}

interface AppState {
  /** The layer that gives the blocks their color. */
  layer: MapLayerId;
  /** The year of the data. `null` = the newest year that has data. */
  year: number | null;
  /** Code of the crop class in the crop filter. `null` = all crops. */
  cropCode: number | null;
  /** FIPS code of the county in the county filter. `null` = all counties. */
  countyFips: string | null;
  basemap: BasemapId;
  viewport: Viewport;
  /** The block in the detail panel. */
  selected: Block | null;
  /** `true` after the first selection. The map then stops showing the selection hint. */
  hasSelected: boolean;
  /** On a small screen the filters are hidden until the user opens them. */
  filtersOpen: boolean;

  setLayer: (layer: MapLayerId) => void;
  setYear: (year: number | null) => void;
  setCropCode: (cropCode: number | null) => void;
  setCountyFips: (countyFips: string | null) => void;
  setBasemap: (basemap: BasemapId) => void;
  setViewport: (viewport: Viewport) => void;
  select: (block: Block | null) => void;
  setFiltersOpen: (open: boolean) => void;
}

/** State of the user interface. Block data is not here: TanStack Query keeps it. */
export const useAppStore = create<AppState>()((set) => ({
  layer: "crop",
  year: null,
  cropCode: null,
  countyFips: null,
  basemap: "vector",
  // The first view of the map shows all the data. With this value, the request for the
  // blocks starts before the map is ready, and the map gets the same request later.
  viewport: { bbox: DATA_BOUNDS, zoom: 0 },
  selected: null,
  hasSelected: false,
  filtersOpen: false,

  setLayer: (layer) => set({ layer }),
  setYear: (year) => set({ year }),
  setCropCode: (cropCode) => set({ cropCode }),
  setCountyFips: (countyFips) => set({ countyFips }),
  setBasemap: (basemap) => set({ basemap }),
  setViewport: (viewport) => set({ viewport }),
  select: (selected) =>
    set((state) => ({
      selected,
      hasSelected: state.hasSelected || selected !== null,
      // On a small screen the detail panel and the filters do not fit together.
      filtersOpen: selected ? false : state.filtersOpen,
    })),
  setFiltersOpen: (filtersOpen) => set({ filtersOpen }),
}));
