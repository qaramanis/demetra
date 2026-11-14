import { getBlocks } from "@demetra/db";
import type { NextRequest } from "next/server";

import {
  badRequest,
  parseBBox,
  parseCountyFips,
  parseCropCode,
  parseYear,
  serverError,
} from "../_lib/request";

/**
 * `GET /api/blocks?bbox=<west>,<south>,<east>,<north>&year=<year>[&crop=<code>][&county=<fips>]`
 *
 * The blocks of a map area, with the values of the crops that agree with the filters. The
 * answer is a `BlocksResponse` object: the blocks as GeoJSON, or `tooMany` when the area
 * contains more blocks than the limit.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const bbox = parseBBox(params.get("bbox"));
  if (!bbox) {
    return badRequest("The parameter `bbox` must be `west,south,east,north` in degrees.");
  }

  const year = parseYear(params.get("year"));
  if (year === null) return badRequest("The parameter `year` must be a year, for example 2017.");

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
    return Response.json(await getBlocks({ bbox, filters: { year, cropCode, countyFips } }));
  } catch (error) {
    return serverError("blocks", error);
  }
}
