import { numberScaleOf } from "@demetra/core";
import type {
  BBox,
  Block,
  ClimateMetricId,
  MapBlockFeatureCollection,
  MapLayerId,
  NumberScaleId,
} from "@demetra/core";
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
  /** The climate metric that the climate layer shows. */
  climateMetric: ClimateMetricId;
  /** The year of the data. `null` = the newest year that has data. */
  year: number | null;
  /**
   * `true` after the user asks for the prediction of the next year. The year list then also
   * has the prediction years.
   */
  predictionsRevealed: boolean;
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
  /**
   * `true` from the start of a block request until the map has drawn the blocks of the
   * answer. The blocks layer of the map sets it.
   */
  blocksLoading: boolean;
  /**
   * The blocks that the map shows now. The legend describes these blocks, and not the blocks
   * of a newer answer that the map has not drawn yet. The blocks layer of the map sets it.
   */
  drawnBlocks: MapBlockFeatureCollection | undefined;
  /**
   * The layer that gives the blocks on the map their colors now. After a change of `layer`, the
   * map needs some time to draw the new colors. The legend describes this layer, so its height
   * changes after the work of the map. `null` = the map does not tell it, and the legend uses
   * `layer`. The blocks layer of the map sets it.
   */
  drawnLayer: MapLayerId | null;
  /**
   * The climate metric that the map shows now, with the same rule as `drawnLayer`. `null` =
   * the map does not tell it, and the legend uses `climateMetric`.
   */
  drawnClimateMetric: ClimateMetricId | null;

  setLayer: (layer: MapLayerId) => void;
  setClimateMetric: (climateMetric: ClimateMetricId) => void;
  setYear: (year: number | null) => void;
  /**
   * Shows the prediction of a year. A prediction has only the predicted crop of each block, so
   * the map shows the crop layer.
   */
  showPrediction: (year: number) => void;
  setCropCode: (cropCode: number | null) => void;
  setCountyFips: (countyFips: string | null) => void;
  setBasemap: (basemap: BasemapId) => void;
  setViewport: (viewport: Viewport) => void;
  select: (block: Block | null) => void;
  setFiltersOpen: (open: boolean) => void;
  setBlocksLoading: (blocksLoading: boolean) => void;
  setDrawnBlocks: (drawnBlocks: MapBlockFeatureCollection | undefined) => void;
  setDrawnLayer: (drawnLayer: MapLayerId | null) => void;
  setDrawnClimateMetric: (drawnClimateMetric: ClimateMetricId | null) => void;
}

/**
 * State of the user interface. TanStack Query keeps the block data. The store has only a
 * reference to the answer that is on the map.
 */
export const useAppStore = create<AppState>()((set) => ({
  layer: "crop",
  climateMetric: "tMean",
  year: null,
  predictionsRevealed: false,
  cropCode: null,
  countyFips: null,
  basemap: "vector",
  // The first view of the map shows all the data. With this value, the request for the
  // blocks starts before the map is ready, and the map gets the same request later.
  viewport: { bbox: DATA_BOUNDS, zoom: 0 },
  selected: null,
  hasSelected: false,
  filtersOpen: false,
  blocksLoading: false,
  drawnBlocks: undefined,
  drawnLayer: null,
  drawnClimateMetric: null,

  setLayer: (layer) => set({ layer }),
  setClimateMetric: (climateMetric) => set({ climateMetric }),
  setYear: (year) => set({ year }),
  showPrediction: (year) => set({ year, layer: "crop", predictionsRevealed: true }),
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
  // The map sets these values in each frame while it moves. When a value does not change, the
  // store does not tell the components.
  setBlocksLoading: (blocksLoading) =>
    set((state) => (state.blocksLoading === blocksLoading ? state : { blocksLoading })),
  setDrawnBlocks: (drawnBlocks) =>
    set((state) => (state.drawnBlocks === drawnBlocks ? state : { drawnBlocks })),
  setDrawnLayer: (drawnLayer) =>
    set((state) => (state.drawnLayer === drawnLayer ? state : { drawnLayer })),
  setDrawnClimateMetric: (drawnClimateMetric) =>
    set((state) =>
      state.drawnClimateMetric === drawnClimateMetric ? state : { drawnClimateMetric },
    ),
}));

/**
 * The scale that gives the blocks their color: the soil scale, or the scale of the selected
 * climate metric. `null` = the crop layer, which has a color for each crop class.
 */
export function useNumberScale(): NumberScaleId | null {
  return useAppStore((state) => numberScaleOf(state.layer, state.climateMetric));
}
