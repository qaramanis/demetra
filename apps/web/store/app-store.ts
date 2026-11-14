import { DEFAULT_GRID } from "@demetra/core";
import type {
  BBox,
  Block,
  CropId,
  Filters,
  GridRef,
  Irrigation,
  MetricId,
  Period,
  RankingCriterion,
} from "@demetra/core";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type { BasemapId } from "@/config/basemaps";
import { DEFAULT_PERIOD } from "@/config/period";

/** The part of the world that the map shows. */
export interface Viewport {
  bbox: BBox;
  zoom: number;
}

interface AppState {
  /** The metric that gives the blocks their colour. */
  metric: MetricId;
  crop: CropId;
  period: Period;
  irrigation: Irrigation;
  grid: GridRef;
  basemap: BasemapId;
  viewport: Viewport | null;
  /** The block in the detail panel. */
  selected: Block | null;
  /** `true` after the first selection. The map then stops showing the selection hint. */
  hasSelected: boolean;
  /** Field polygons that the user made. */
  customFields: Block[];
  /** `true` while the user draws a field polygon. */
  drawing: boolean;
  /** How the detail panel finds the best rotation strategy. */
  ranking: RankingCriterion;
  /** On a small screen the filters are hidden until the user opens them. */
  filtersOpen: boolean;

  setMetric: (metric: MetricId) => void;
  setCrop: (crop: CropId) => void;
  setPeriod: (period: Period) => void;
  setIrrigation: (irrigation: Irrigation) => void;
  setGrid: (grid: GridRef) => void;
  setBasemap: (basemap: BasemapId) => void;
  setViewport: (viewport: Viewport) => void;
  select: (block: Block | null) => void;
  addCustomField: (field: Block) => void;
  removeCustomField: (id: string) => void;
  setDrawing: (drawing: boolean) => void;
  setRanking: (ranking: RankingCriterion) => void;
  setFiltersOpen: (open: boolean) => void;
}

/** State of the user interface. Field data is not here: TanStack Query keeps it. */
export const useAppStore = create<AppState>()((set) => ({
  metric: "fhs",
  crop: "cotton",
  period: DEFAULT_PERIOD,
  irrigation: "irrigated",
  grid: DEFAULT_GRID,
  basemap: "vector",
  viewport: null,
  selected: null,
  hasSelected: false,
  customFields: [],
  drawing: false,
  ranking: "profit",
  filtersOpen: false,

  setMetric: (metric) => set({ metric }),
  setCrop: (crop) => set({ crop }),
  setPeriod: (period) => set({ period }),
  setIrrigation: (irrigation) => set({ irrigation }),
  // The cells of a different grid are different blocks, so the selection of a cell ends.
  setGrid: (grid) =>
    set((state) => ({ grid, selected: state.selected?.kind === "cell" ? null : state.selected })),
  // A new basemap style removes the layers of the drawing tool, so the drawing ends.
  setBasemap: (basemap) => set({ basemap, drawing: false }),
  setViewport: (viewport) => set({ viewport }),
  select: (selected) =>
    set((state) => ({
      selected,
      hasSelected: state.hasSelected || selected !== null,
      // On a small screen the detail panel and the filters do not fit together.
      filtersOpen: selected ? false : state.filtersOpen,
    })),
  addCustomField: (field) =>
    set((state) => ({
      customFields: [...state.customFields, field],
      selected: field,
      hasSelected: true,
    })),
  removeCustomField: (id) =>
    set((state) => ({
      customFields: state.customFields.filter((field) => field.id !== id),
      selected: state.selected?.id === id ? null : state.selected,
    })),
  setDrawing: (drawing) => set({ drawing }),
  setRanking: (ranking) => set({ ranking }),
  setFiltersOpen: (filtersOpen) => set({ filtersOpen }),
}));

/** The filters that change the values of the metrics. */
export function useFilters(): Filters {
  return useAppStore(
    useShallow((state) => ({
      crop: state.crop,
      period: state.period,
      irrigation: state.irrigation,
    })),
  );
}
