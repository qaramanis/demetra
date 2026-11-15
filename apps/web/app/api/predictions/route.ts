import { getPredictedBlocks } from "@demetra/db";
import type { NextRequest } from "next/server";

import {
  badRequest,
  cachedJson,
  notFound,
  parseBBox,
  parseCountyFips,
  parseCropCode,
  parseYear,
  serverError,
} from "../_lib/request";

/**
 * `GET /api/predictions?bbox=<west>,<south>,<east>,<north>&year=<year>[&crop=<code>][&county=<fips>]`
 *
 * The predicted blocks of a map area: the prediction of the model team for a year that has no
 * real data. The answer is a `PredictionsResponse` object: one row with the block id, the
 * predicted crop and its model score for each block, or `tooMany`. Status 404: the year has no
 * prediction. The rows have no shapes: `predictionFeatures` of `@demetra/core` makes the GeoJSON
 * from them.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const bbox = parseBBox(params.get("bbox"));
  if (!bbox) {
    return badRequest("The parameter `bbox` must be `west,south,east,north` in degrees.");
  }

  const year = parseYear(params.get("year"));
  if (year === null) return badRequest("The parameter `year` must be a year, for example 2023.");

  // The two filters are optional. A filter that is there must be correct.
  const cropCode = parseCropCode(params.get("crop"));
  if (params.has("crop") && cropCode === null) {
    return badRequest("The parameter `crop` must be a crop class code from 0 to 255.");
  }

  const countyFips = parseCountyFips(params.get("county"));
  if (params.has("county") && countyFips === null) {
    return badRequest("The parameter `county` must be a county FIPS code of 5 digits.");
  }

  try {
    const response = await getPredictedBlocks({ bbox, filters: { year, cropCode, countyFips } });
    return response ? cachedJson(response) : notFound(`The year ${year} has no prediction.`);
  } catch (error) {
    return serverError("predictions", error);
  }
}
