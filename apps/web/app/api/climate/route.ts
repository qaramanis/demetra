import { getClimateCells } from "@demetra/db";
import type { NextRequest } from "next/server";

import { badRequest, cachedJson, parseYear, serverError } from "../_lib/request";

/**
 * `GET /api/climate?year=<year>`
 *
 * The climate of one year for all the climate cells of the data (cells of approximately
 * 10 km). The answer is a `ClimateResponse` object: one row of values for each cell.
 * `climateIndex` of `@demetra/core` reads the rows, and `blockFeatures` gives each block the
 * values of its cell.
 */
export async function GET(request: NextRequest) {
  const year = parseYear(request.nextUrl.searchParams.get("year"));
  if (year === null) return badRequest("The parameter `year` must be a year, for example 2017.");

  try {
    return cachedJson(await getClimateCells(year));
  } catch (error) {
    return serverError("climate", error);
  }
}
