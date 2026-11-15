import { getBlockPrediction } from "@demetra/db";
import type { NextRequest } from "next/server";

import {
  badRequest,
  cachedJson,
  notFound,
  parseBlockId,
  parseYear,
  serverError,
} from "../../_lib/request";

/**
 * `GET /api/predictions/<id>?year=<year>`
 *
 * The prediction for one block, with the next crops of the model. The answer is a
 * `BlockPrediction` object. `crop: null` = the prediction has no row for the block. Status 404:
 * the year has no prediction.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/predictions/[id]">) {
  const id = parseBlockId((await ctx.params).id);
  if (id === null) {
    return badRequest("The block id must be `<column>_<row>`, for example 192_1377.");
  }

  const year = parseYear(request.nextUrl.searchParams.get("year"));
  if (year === null) return badRequest("The parameter `year` must be a year, for example 2023.");

  try {
    const prediction = await getBlockPrediction(id, year);
    return prediction ? cachedJson(prediction) : notFound(`The year ${year} has no prediction.`);
  } catch (error) {
    return serverError("predictions/[id]", error);
  }
}
