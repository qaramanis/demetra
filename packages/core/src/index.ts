export { CROPS, CROP_IDS, KY_RANGE } from "./config/crops.ts";
export type { CropConfig, CropId } from "./config/crops.ts";

export {
  FHS_CLASSES,
  FHS_CLASS_MIN,
  METRICS,
  METRIC_IDS,
  fhsClass,
} from "./config/metrics.ts";
export type { FhsClass, MetricDef, MetricId, MetricUnit } from "./config/metrics.ts";

export {
  M2_PER_HECTARE,
  M2_PER_STREMMA,
  STREMMATA_PER_HECTARE,
  bboxSizeM,
  polygonAreaM2,
  polygonBBox,
  polygonCentroid,
} from "./geo.ts";

export {
  DEFAULT_GRID,
  GRIDS,
  MAX_LATTICE_CELLS,
  cellSizeLabel,
  createProjectedGrid,
  estimateCellCount,
  gridCovers,
  utmZone,
} from "./grid/index.ts";
export type { ProjectedGridOptions } from "./grid/index.ts";
export { GRID_IDS } from "./grid/types.ts";
export type { GridCell, GridDef, GridId } from "./grid/types.ts";

export type { FieldDataProvider, ProviderMeta, RequestOptions } from "./provider.ts";

export { bestStrategy, rankingValue } from "./ranking.ts";

export type {
  BBox,
  Block,
  BlockFeature,
  BlockFeatureCollection,
  BlockKind,
  BlockMetrics,
  BlockProperties,
  BlocksQuery,
  Filters,
  GridRef,
  Irrigation,
  MetricValues,
  Period,
  RankingCriterion,
  RotationStrategy,
} from "./types.ts";
