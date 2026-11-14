import type { Feature, FeatureCollection, Polygon } from "geojson";

import type { CropId } from "./config/crops.ts";
import type { FhsClass, MetricId } from "./config/metrics.ts";
import type { GridId } from "./grid/types.ts";

/** Bounding box in degrees (WGS84). */
export type BBox = readonly [west: number, south: number, east: number, north: number];

export type MetricValues = Record<MetricId, number>;

export type Irrigation = "irrigated" | "rainfed";

/** A part of one growing season. Months are 1–12 and the two limits are included. */
export interface Period {
  year: number;
  startMonth: number;
  endMonth: number;
}

/** The filters that change the values of the metrics. */
export interface Filters {
  crop: CropId;
  period: Period;
  irrigation: Irrigation;
}

/** `cell` = a cell of a grid. `custom` = a field polygon that the user made. */
export type BlockKind = "cell" | "custom";

/**
 * An agricultural block. The geometry is a GeoJSON polygon in WGS84 (RFC 7946), so a provider
 * can use it directly to read a raster or a vector dataset.
 */
export interface Block {
  id: string;
  kind: BlockKind;
  geometry: Polygon;
}

/** Properties of a block on the map: its identity and one value for each metric. */
export interface BlockProperties extends MetricValues {
  id: string;
  kind: BlockKind;
}

export type BlockFeature = Feature<Polygon, BlockProperties>;

export type BlockFeatureCollection = FeatureCollection<Polygon, BlockProperties>;

export interface BlockMetrics {
  blockId: string;
  values: MetricValues;
  fhsClass: FhsClass;
}

/** A crop sequence of three years, with the average result of one year. */
export interface RotationStrategy {
  id: string;
  sequence: readonly [CropId, CropId, CropId];
  /** Average profit of one year, € per hectare. */
  avgProfitPerHa: number;
  /** Average yield of one year, kg per hectare. */
  avgYieldPerHa: number;
  /** 0–100 %. */
  resilience: number;
  /** 0–100 %. */
  confidence: number;
}

/** How to find the best rotation strategy. */
export type RankingCriterion = "profit" | "yield";

/** A grid and the size of its cells in metres. */
export interface GridRef {
  gridId: GridId;
  cellSize: number;
}

export interface BlocksQuery {
  bbox: BBox;
  grid: GridRef;
  filters: Filters;
}
