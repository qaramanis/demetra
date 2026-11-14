import {
  CROPS,
  METRICS,
  METRIC_IDS,
  STREMMATA_PER_HECTARE,
  polygonCentroid,
} from "@demetra/core";
import type {
  Block,
  CropConfig,
  CropId,
  Filters,
  MetricValues,
  RotationStrategy,
} from "@demetra/core";

import { fractalNoise, seeded01 } from "./random.ts";

/**
 * The mock model.
 *
 * It is not the calculation engine. It makes values that are deterministic, that stay in the
 * range of each metric, and that react to the filters in a direction that makes sense. The
 * numbers in this file that are not from `crops.ts` are placeholders.
 */

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const clamp01 = (value: number): number => clamp(value, 0, 1);

const mean = (values: number[]): number =>
  values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);

/** Properties of the land of a block. The filters do not change them. Each value is in 0–1. */
export interface Land {
  /** Soil quality. */
  soil: number;
  /** Vigour of the vegetation that does not come from water: plant health, crop management. */
  vigour: number;
  /** Rain in the growing season. */
  rain: number;
  /** Slope of the terrain. */
  slope: number;
  /** Irrigation water that is available. */
  water: number;
  /** Quality of the observations. */
  observation: number;
}

/** Each land property is a smooth field. A larger wavelength gives larger zones on the map. */
const CHANNELS: Record<keyof Land, { seed: number; wavelengthKm: number }> = {
  soil: { seed: 11, wavelengthKm: 9 },
  vigour: { seed: 17, wavelengthKm: 5 },
  rain: { seed: 23, wavelengthKm: 35 },
  slope: { seed: 37, wavelengthKm: 7 },
  water: { seed: 41, wavelengthKm: 16 },
  observation: { seed: 59, wavelengthKm: 24 },
};

const KM_PER_DEGREE = 111.32;

/**
 * The land properties of a block. Each property has two parts:
 * - a smooth field at the centre of the block, so that adjacent blocks are similar;
 * - a small difference that comes from the id of the block.
 */
export function landOf(block: Block): Land {
  const [lon, lat] = polygonCentroid(block.geometry);
  const x = lon * KM_PER_DEGREE * Math.cos((lat * Math.PI) / 180);
  const y = lat * KM_PER_DEGREE;

  const channel = (name: keyof Land): number => {
    const { seed, wavelengthKm } = CHANNELS[name];
    const smooth = fractalNoise(x / wavelengthKm, y / wavelengthKm, seed);
    const difference = seeded01(`${block.id}:${name}`) - 0.5;
    // Smooth noise stays near 0.5, so make its contrast larger.
    return clamp01(0.5 + (smooth - 0.5) * 1.6 + difference * 0.14);
  };

  return {
    soil: channel("soil"),
    vigour: channel("vigour"),
    rain: channel("rain"),
    slope: channel("slope"),
    water: channel("water"),
    observation: channel("observation"),
  };
}

/** A full growing season has this number of months. A shorter period has a part of the water demand. */
const SEASON_MONTHS = 7;

/** ky for a crop that has no ky in `crops.ts` yet. */
const FALLBACK_KY = 1.05;

/** Part of the soil that a crop does not cover. Less cover gives more erosion. */
const BARE_SOIL: Record<CropId, number> = {
  cotton: 1,
  maize: 0.9,
  chickpea: 0.75,
  barley: 0.55,
  hay: 0.3,
};

export interface Season {
  /** The six metrics, rounded and inside their ranges. */
  values: MetricValues;
  /** kg per stremma. */
  yieldPerStr: number;
  /** € per stremma. */
  profitPerStr: number;
}

export interface SeasonOptions {
  /** Multiplies the yield. Used for a crop that follows the same crop. */
  yieldFactor?: number;
  /** Multiplies the fertiliser cost. Used for a crop that follows a crop that fixes nitrogen. */
  fertiliserFactor?: number;
}

function roundToRange(values: MetricValues): MetricValues {
  const rounded = { ...values };
  for (const id of METRIC_IDS) {
    const { range, decimals } = METRICS[id];
    const factor = 10 ** decimals;
    rounded[id] = clamp(Math.round(values[id] * factor) / factor, range[0], range[1]);
  }
  return rounded;
}

/** Each year is wetter or drier than the average, in the same way for all blocks. 0.8–1.2. */
function wetnessOf(year: number): number {
  return 0.8 + 0.4 * seeded01(`year:${year}`);
}

/** One crop on one block in one period. */
export function simulateSeason(land: Land, filters: Filters, options: SeasonOptions = {}): Season {
  const crop: CropConfig = CROPS[filters.crop];
  const { year, startMonth, endMonth } = filters.period;
  const months = clamp(endMonth - startMonth + 1, 1, 12);
  const share = Math.min(1, months / SEASON_MONTHS);
  const wetness = wetnessOf(year);

  // Water: the crop needs `demand`. Rain gives a part. Irrigation gives most of the remainder.
  const demand = crop.wReq * share;
  const rain = (140 + 220 * land.rain) * wetness * share;
  const gap = Math.max(0, demand - rain);
  const irrigationCover = filters.irrigation === "irrigated" ? 0.7 + 0.25 * land.water : 0;
  const deficit = gap * (1 - irrigationCover);
  const stress = demand > 0 ? deficit / demand : 0;

  // Yield and money: water stress decreases the yield by the factor ky.
  const relativeYield = clamp(1 - (crop.ky ?? FALLBACK_KY) * stress, 0.05, 1);
  const yieldPerStr =
    crop.yBase * (0.8 + 0.3 * land.soil) * relativeYield * (options.yieldFactor ?? 1);
  const revenue = yieldPerStr * crop.price;
  const cost = crop.cFixed + crop.cFertBase * (options.fertiliserFactor ?? 1);
  const profitPerStr = revenue - cost;
  const margin = revenue > 0 ? (profitPerStr / revenue) * 100 : -100;

  const erosion = clamp01(
    land.slope ** 1.6 * BARE_SOIL[crop.id] * (0.85 + 0.75 * (wetness - 0.8)),
  );

  return {
    values: roundToRange({
      // Vegetation health: the vigour of the vegetation, decreased by water stress.
      fhs: 100 * clamp01((0.3 + 0.7 * land.vigour) * (1 - 0.85 * stress)),
      wd: deficit,
      eri: erosion,
      profitMargin: margin,
      resilience: 100 * clamp01(0.45 * (1 - stress) + 0.25 * (1 - erosion) + 0.3 * land.soil),
      confidence: 100 * clamp01(0.55 + 0.4 * land.observation - (months < 3 ? 0.08 : 0)),
    }),
    yieldPerStr,
    profitPerStr,
  };
}

/** Yield factor for each year that a crop follows the same crop. */
const REPEAT_YIELD_FACTOR = 0.92;

/** Resilience points for each crop after the first crop in a sequence. */
const DIVERSITY_BONUS = 4;

/** The confidence decreases by this part for each year into the future. */
const CONFIDENCE_LOSS_PER_YEAR = 0.04;

type Sequence = readonly [CropId, CropId, CropId];

/**
 * Three sequences of three years for a crop: the crop alone, the crop in a rotation with a
 * cereal and a legume, and a different rotation.
 */
export function rotationSequences(crop: CropId): Sequence[] {
  const unless = (preferred: CropId, fallback: CropId): CropId =>
    crop === preferred ? fallback : preferred;
  const cereal = unless("barley", "cotton");
  const legume = unless("chickpea", "hay");
  const lead = unless("maize", "cotton");
  return [
    [crop, crop, crop],
    [crop, cereal, legume],
    [lead, legume, cereal],
  ];
}

/** A sequence of three years on one block. Year 1 is the year of the period. */
export function simulateRotation(
  land: Land,
  filters: Filters,
  sequence: Sequence,
): RotationStrategy {
  let previous: CropConfig | undefined;
  let repeats = 0;
  const seasons = sequence.map((cropId, index) => {
    repeats = previous?.id === cropId ? repeats + 1 : 0;
    const season = simulateSeason(
      land,
      {
        ...filters,
        crop: cropId,
        period: { ...filters.period, year: filters.period.year + index },
      },
      {
        yieldFactor: REPEAT_YIELD_FACTOR ** repeats,
        // A crop that fixes nitrogen decreases the fertiliser cost of the next crop.
        fertiliserFactor: previous ? 1 - previous.nFixation : 1,
      },
    );
    previous = CROPS[cropId];
    return season;
  });

  const distinctCrops = new Set(sequence).size;
  return {
    id: sequence.join("-"),
    sequence,
    avgProfitPerHa: Math.round(
      mean(seasons.map((season) => season.profitPerStr)) * STREMMATA_PER_HECTARE,
    ),
    avgYieldPerHa: Math.round(
      mean(seasons.map((season) => season.yieldPerStr)) * STREMMATA_PER_HECTARE,
    ),
    resilience: Math.round(
      clamp(
        mean(seasons.map((season) => season.values.resilience)) +
          DIVERSITY_BONUS * (distinctCrops - 1),
        0,
        100,
      ),
    ),
    confidence: Math.round(
      clamp(
        mean(
          seasons.map(
            (season, index) => season.values.confidence * (1 - CONFIDENCE_LOSS_PER_YEAR * index),
          ),
        ),
        0,
        100,
      ),
    ),
  };
}
