import type { Polygon } from "geojson";

import type { ClimateValues } from "./climate.ts";

/**
 * How the revenue of a crop class was found in the county data.
 * - `direct`: one county commodity agrees with the crop class.
 * - `group`: the crop class is a group of county commodities.
 * - `double`: a double crop class. The revenue is the sum of its two crops.
 * - `none`: no county commodity agrees. The crop has no county revenue.
 */
export type EconMatch = "direct" | "group" | "double" | "none";

/**
 * The soil below the cells of one crop in one block. A number is the mean of the cells. A
 * class is the most frequent class. `null` = the soil survey has no value.
 */
export interface SoilValues {
  /** Name of the main soil component. */
  component: string | null;
  order: string | null;
  surfaceTexture: string | null;
  sandPct: number | null;
  siltPct: number | null;
  clayPct: number | null;
  organicMatterPct: number | null;
  ph: number | null;
  /** Salinity: electrical conductivity, dS/m. */
  ecDsM: number | null;
  /** Sodium adsorption ratio. */
  sar: number | null;
  /** Saturated hydraulic conductivity, micrometres per second. */
  ksatUmS: number | null;
  /** Cation exchange capacity, meq per 100 g. */
  cecMeq100g: number | null;
  slopePct: number | null;
  drainageClass: string | null;
  hydrologicGroup: string | null;
  floodFrequency: string | null;
  depthToBedrockCm: number | null;
  depthToWaterTableCm: number | null;
  /** Available water storage in the top 100 cm, in cm. */
  aws0To100Cm: number | null;
  rootZoneDepthCm: number | null;
  /** Soil organic carbon in the top 30 cm, g per m². */
  soc0To30GM2: number | null;
  irrCapabilityClass: number | null;
  nonirrCapabilityClass: number | null;
  farmlandClass: string | null;
  /** California Revised Storie index, 0 to 100. */
  storieIndex: number | null;
  storieGrade: string | null;
  /** National Commodity Crop Productivity Index, 0 to 1. */
  nccpiAll: number | null;
  /** Fraction (0 to 1) of the cells that are in the largest soil map unit. */
  dominantMukeyShare: number | null;
  /** Number of soil map units below the cells. */
  soilUnits: number | null;
}

/** One crop class in one block and one county. */
export interface BlockCrop {
  countyFips: string;
  countyName: string;
  cropCode: number;
  cropName: string;
  /** The official color of the crop class in the Cropland Data Layer, for example "#00a582". */
  color: string;
  acres: number;
  /** Area of the crop as a fraction (0 to 1) of the cropland of the block. */
  shareOfCropland: number;
  isMainCrop: boolean;
  econMatch: EconMatch;
  /** The county commodity with the largest value that agrees with the crop class. */
  mainCommodity: string | null;
  yieldPerAcre: number | null;
  yieldUnit: string | null;
  pricePerUnitUsd: number | null;
  /** County average. It is not a value for a field. */
  revenuePerAcreCountyUsd: number | null;
  /** State average. */
  revenuePerAcreStateUsd: number | null;
  /** Acres x county revenue for each acre. */
  estRevenueUsd: number | null;
  soil: SoilValues;
}

/** All data of one block in one year. */
export interface BlockDetail {
  id: string;
  year: number;
  geometry: Polygon;
  center: [lon: number, lat: number];
  /** Acres of cropland in the block: all crops, all counties. */
  croplandAcres: number;
  /** One row for each county and crop class. The largest area is first. */
  crops: BlockCrop[];
  /**
   * The climate of the year, from the climate cell of the block: an estimate for a cell of
   * approximately 10 km. `null` = the year has no climate data.
   */
  climate: ClimateValues | null;
}
