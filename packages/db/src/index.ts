// Server code only. `client.ts` imports "server-only", so a client component that imports
// this package does not build.
export { db } from "./client.ts";

export {
  blockCrops,
  blockMainCrop,
  blockPredictions,
  blocks,
  climateCells,
  counties,
  crops,
} from "./schema.ts";

export {
  getBlockCropHistory,
  getBlockDetail,
  getBlockPrediction,
  getBlocks,
  getClimateCells,
  getCropStats,
  getCropTransitions,
  getPredictedBlocks,
  getPredictionYears,
  getReferenceData,
} from "./queries/index.ts";
export type {
  BlockCropHistory,
  BlockCropShare,
  BlockCropYear,
  CropCountyValues,
  CropStats,
  CropTransitions,
  CropYearAcres,
  NextCrop,
} from "./queries/index.ts";
