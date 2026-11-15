import "server-only";

import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import {
  FALLOW_CROP_CODE,
  NO_PREDICTION_CROP_CODE,
  PREDICTION_HISTORY_YEARS,
  UNRELIABLE_REVENUE_CROP_CODES,
  blockCenter,
} from "@demetra/core";
import type { BlockCrop, BlockDetail, BlockPrediction, ChatStep, ChatTool } from "@demetra/core";
import {
  getBlockCropHistory,
  getBlockDetail,
  getBlockPrediction,
  getCropStats,
  getCropTransitions,
} from "@demetra/db";
import { z } from "zod";

import type { ChatReference } from "./reference";
import { cropName } from "./reference";
import { getForecast, isNearCalifornia } from "./weather";

/**
 * The tools of the chat. Each tool reads data and gives the model a small JSON text (less
 * than approximately 1,500 tokens), with no shapes and no colours.
 *
 * A tool that cannot give a result throws an error with a short message for the model. The
 * tool runner sends the message to the model as an error result, and the model can then try
 * again or tell the user. The cause of a database failure goes to the server log only.
 */

/** The values that the tools of one request share. */
export interface ChatToolContext {
  reference: ChatReference;
  /** Tells the browser that a tool starts to run. */
  onStep: (step: ChatStep) => void;
}

/** The largest number of crop rows in the result of `get_block`. The others are summed. */
const MAX_CROP_ROWS = 10;

/** The number of the largest crops of a block that have their soil in the result. */
const SOIL_CROPS = 3;

const blockIdInput = z
  .string()
  .regex(/^\d{1,6}_\d{1,6}$/)
  .describe("The block id, <column>_<row>, for example 195_1045.");
const cropCodeInput = z
  .number()
  .int()
  .min(0)
  .max(255)
  .describe("The code of a crop class from the reference list, for example 75 (Almonds).");
const countyFipsInput = z
  .string()
  .regex(/^\d{5}$/)
  .describe("The FIPS code of a county from the reference list, for example 06019 (Fresno).");
const yearInput = z.number().int().describe("A year of the real data.");

/** A number with `decimals` decimal places, or `null`. */
function round(value: number | null | undefined, decimals = 0): number | null {
  if (value === null || value === undefined) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** The object without the keys that have no value, so the model reads fewer tokens. */
function withoutEmpty<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== null && entry !== undefined),
  ) as Partial<T>;
}

/** Runs a database request. A failure goes to the server log, and the model gets a short message. */
async function readData<T>(tool: ChatTool, request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (error) {
    console.error(`[api/chat] The tool ${tool} failed.`, error);
    throw new Error("The data is not available now.");
  }
}

function checkRealYear(reference: ChatReference, year: number): void {
  if (!reference.years.includes(year)) {
    const predicted = reference.predictionYears.includes(year)
      ? ` ${year} has only a model prediction for each block: use get_block_history.`
      : "";
    throw new Error(
      `${year} has no real data. The years of the real data are ${reference.years.join(", ")}.${predicted}`,
    );
  }
}

function checkCrop(reference: ChatReference, cropCode: number): void {
  if (cropName(reference, cropCode) === null) {
    throw new Error(`The data has no crop class with the code ${cropCode}. See the reference list.`);
  }
}

function checkCounty(reference: ChatReference, countyFips: string | undefined): void {
  if (countyFips !== undefined && !reference.countyNames.has(countyFips)) {
    throw new Error(`No county of California has the FIPS code ${countyFips}. See the reference list.`);
  }
}

/** A short note when the revenue of a crop has a limit of the data. */
function revenueNote(crop: BlockCrop): string | null {
  if (crop.cropCode === FALLOW_CROP_CODE) return "no revenue: fallow land";
  if (UNRELIABLE_REVENUE_CROP_CODES.includes(crop.cropCode)) return "not reliable: grain revenue";
  if (crop.revenuePerAcreCountyUsd === null) return "no county revenue";
  return null;
}

function cropRow(crop: BlockCrop) {
  return withoutEmpty({
    crop: crop.cropName,
    code: crop.cropCode,
    county: crop.countyName,
    acres: round(crop.acres, 1),
    sharePct: round(crop.shareOfCropland * 100),
    main: crop.isMainCrop ? true : null,
    countyRevenuePerAcreUsd: round(crop.revenuePerAcreCountyUsd),
    estRevenueUsd: round(crop.estRevenueUsd),
    // The state average helps only when the county has no value.
    stateRevenuePerAcreUsd:
      crop.revenuePerAcreCountyUsd === null ? round(crop.revenuePerAcreStateUsd) : null,
    countyYield:
      crop.yieldPerAcre !== null && crop.yieldUnit !== null
        ? `${round(crop.yieldPerAcre, 2)} ${crop.yieldUnit}/acre`
        : null,
    revenueNote: revenueNote(crop),
  });
}

function soilRow(crop: BlockCrop) {
  const { soil } = crop;
  return withoutEmpty({
    crop: crop.cropName,
    county: crop.countyName,
    component: soil.component,
    order: soil.order,
    texture: soil.surfaceTexture,
    sandPct: round(soil.sandPct),
    siltPct: round(soil.siltPct),
    clayPct: round(soil.clayPct),
    organicMatterPct: round(soil.organicMatterPct, 1),
    ph: round(soil.ph, 1),
    salinityEcDsM: round(soil.ecDsM, 1),
    drainage: soil.drainageClass,
    hydrologicGroup: soil.hydrologicGroup,
    floodFrequency: soil.floodFrequency,
    slopePct: round(soil.slopePct),
    waterStorage0To100Cm: round(soil.aws0To100Cm, 1),
    depthToWaterTableCm: round(soil.depthToWaterTableCm),
    irrigatedCapabilityClass: soil.irrCapabilityClass,
    farmlandClass: soil.farmlandClass,
    storieIndex: round(soil.storieIndex),
    storieGrade: soil.storieGrade,
  });
}

/** The result of `get_block` for the model. */
function blockResult(detail: BlockDetail) {
  const shown = detail.crops.slice(0, MAX_CROP_ROWS);
  const rest = detail.crops.slice(MAX_CROP_ROWS);
  const [lon, lat] = detail.center;

  return withoutEmpty({
    source: `Demetra data, ${detail.year}`,
    block: detail.id,
    year: detail.year,
    center: { lat: round(lat, 4), lon: round(lon, 4) },
    croplandAcres: round(detail.croplandAcres, 1),
    crops: detail.crops.length > 0 ? shown.map(cropRow) : null,
    otherSmallCrops:
      rest.length > 0
        ? {
            rows: rest.length,
            acres: round(
              rest.reduce((sum, crop) => sum + crop.acres, 0),
              1,
            ),
            crops: [...new Set(rest.map((crop) => crop.cropName))],
          }
        : null,
    soilOfLargestCrops: detail.crops.length > 0 ? shown.slice(0, SOIL_CROPS).map(soilRow) : null,
    climate: detail.climate
      ? {
          meanTemperatureC: round(detail.climate.tMean, 1),
          heatDays35C: round(detail.climate.heatDays),
          rainWaterYearMm: round(detail.climate.rainWaterYear),
          rainAnomalyPct: round(detail.climate.rainAnomaly),
          note: "Estimates for a cell of about 10 km. The water year is October of the year before to September.",
        }
      : null,
    note:
      detail.crops.length === 0
        ? `The block has no cropland in ${detail.year}.`
        : "Revenue and yield are county averages. Soil maps are correct for 1 to 10 acres.",
  });
}

/** The prediction of one year for the model. */
function predictionResult(
  reference: ChatReference,
  year: number,
  prediction: BlockPrediction | null,
) {
  const crop = (code: number) => ({ code, name: cropName(reference, code) });

  if (prediction === null) return { year, status: "The year has no prediction." };
  if (prediction.crop === null) {
    return { year, status: "No prediction: the block is not in the prediction of the model." };
  }
  if (prediction.crop === NO_PREDICTION_CROP_CODE) {
    return {
      year,
      status: `No prediction: the block has no crop on more than 30% of its area in each of the ${PREDICTION_HISTORY_YEARS} years before.`,
    };
  }
  return withoutEmpty({
    year,
    status: "predicted",
    crop: crop(prediction.crop),
    score: round(prediction.score, 2),
    nextCrops: prediction.alternatives.map((next) => ({
      ...crop(next.crop),
      score: round(next.score, 2),
    })),
  });
}

/** The five tools of `CHAT_TOOLS`, in that order, for one request. */
export function chatTools({ reference, onStep }: ChatToolContext) {
  const newestYear = reference.years[0];

  const getBlock = betaZodTool({
    name: "get_block" satisfies ChatTool,
    description:
      "The crops of one block in one year of the real data (acres, share of the cropland, county revenue, a note when the revenue has a limit), the soil below its largest crops, and the climate of the year. Call it for any question about what is in a block, its revenue, its soil or its climate.",
    inputSchema: z.object({
      blockId: blockIdInput,
      year: yearInput.optional().describe(`A year of the real data. Default: ${newestYear}.`),
    }),
    run: async ({ blockId, year }) => {
      onStep({ tool: "get_block", blockId, ...(year === undefined ? {} : { year }) });
      const dataYear = year ?? newestYear;
      if (dataYear === undefined) throw new Error("The data has no years.");
      checkRealYear(reference, dataYear);

      const detail = await readData("get_block", () => getBlockDetail(blockId, dataYear));
      if (!detail) throw new Error(`The block ${blockId} does not exist.`);
      return JSON.stringify(blockResult(detail));
    },
  });

  const getBlockHistory = betaZodTool({
    name: "get_block_history" satisfies ChatTool,
    description:
      "The crops of one block in each year of the real data, and the model prediction of the crop for the prediction years. Call it for questions about the crop history or the rotation of a block, and about what to plant next.",
    inputSchema: z.object({ blockId: blockIdInput }),
    run: async ({ blockId }) => {
      onStep({ tool: "get_block_history", blockId });

      const [history, predictions] = await readData("get_block_history", () =>
        Promise.all([
          getBlockCropHistory(blockId),
          Promise.all(
            reference.predictionYears.map(async (year) =>
              predictionResult(reference, year, await getBlockPrediction(blockId, year)),
            ),
          ),
        ]),
      );
      if (history === null) throw new Error(`The block ${blockId} does not exist.`);

      return JSON.stringify({
        source: "Demetra data (history) and the model prediction of a second team (prediction)",
        history,
        predictions,
        predictionNote:
          "A prediction is not real data. The predicted crop is the crop on more than 30% of the block. A score shows how sure the model is; it is not an exact probability.",
      });
    },
  });

  const getRotationStats = betaZodTool({
    name: "get_rotation_stats" satisfies ChatTool,
    description:
      "The crops that follow a crop in the next year, in the same blocks, over all the years of the real data: in all of California or in one county. Call it for questions about crop rotation and about what can follow a crop.",
    inputSchema: z.object({
      cropCode: cropCodeInput,
      countyFips: countyFipsInput.optional().describe("Optional. Default: all of California."),
    }),
    run: async ({ cropCode, countyFips }) => {
      onStep({
        tool: "get_rotation_stats",
        cropCode,
        ...(countyFips === undefined ? {} : { countyFips }),
      });
      checkCrop(reference, cropCode);
      checkCounty(reference, countyFips);

      const transitions = await readData("get_rotation_stats", () =>
        getCropTransitions(cropCode, countyFips ?? null),
      );
      return JSON.stringify(transitions);
    },
  });

  const getCropStatsTool = betaZodTool({
    name: "get_crop_stats" satisfies ChatTool,
    description:
      "The area and the county revenue of one crop in one year of the real data: in all of California or in one county. Call it for questions about a crop type, where it grows, how much of it there is, and its revenue.",
    inputSchema: z.object({
      cropCode: cropCodeInput,
      year: yearInput.optional().describe(`A year of the real data. Default: ${newestYear}.`),
      countyFips: countyFipsInput.optional().describe("Optional. Default: all of California."),
    }),
    run: async ({ cropCode, year, countyFips }) => {
      onStep({
        tool: "get_crop_stats",
        cropCode,
        ...(year === undefined ? {} : { year }),
        ...(countyFips === undefined ? {} : { countyFips }),
      });
      const dataYear = year ?? newestYear;
      if (dataYear === undefined) throw new Error("The data has no years.");
      checkRealYear(reference, dataYear);
      checkCrop(reference, cropCode);
      checkCounty(reference, countyFips);

      const stats = await readData("get_crop_stats", () =>
        getCropStats(cropCode, dataYear, countyFips ?? null),
      );
      return JSON.stringify(stats);
    },
  });

  const getWeather = betaZodTool({
    name: "get_weather" satisfies ChatTool,
    description:
      "The weather forecast of Open-Meteo, an external service, at a block or at a point in or near California: the conditions now, and for each of the next 7 days the maximum and minimum temperature, rain, rain probability, reference evapotranspiration and wind. Call it for questions about the weather now or in the next days. Give a block id, or a latitude and a longitude.",
    inputSchema: z.object({
      blockId: blockIdInput.optional(),
      latitude: z.number().optional().describe("Degrees north, for example 36.74."),
      longitude: z.number().optional().describe("Degrees east, for example -119.79."),
    }),
    run: async ({ blockId, latitude, longitude }, context) => {
      onStep({ tool: "get_weather", ...(blockId === undefined ? {} : { blockId }) });

      let point: [lon: number, lat: number] | null = null;
      if (blockId !== undefined) point = blockCenter(blockId);
      else if (latitude !== undefined && longitude !== undefined) point = [longitude, latitude];
      if (!point) throw new Error("Give a block id, or a latitude and a longitude.");

      const [lon, lat] = point;
      if (!isNearCalifornia(lon, lat)) {
        throw new Error("The point is not in or near California. The forecast is only for California.");
      }

      try {
        return JSON.stringify(await getForecast(lon, lat, context?.signal));
      } catch (error) {
        console.error("[api/chat] The weather request failed.", error);
        throw new Error("The weather forecast is not available now.");
      }
    },
  });

  return [getBlock, getBlockHistory, getRotationStats, getCropStatsTool, getWeather];
}
