import { getBlockDetail } from "@demetra/db";
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
 * `GET /api/blocks/<id>?year=<year>`
 *
 * All crops of one block in one year, with their revenue and soil values. The answer is a
 * `BlockDetail` object, or status 404 when the block does not exist.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/blocks/[id]">) {
  const id = parseBlockId((await ctx.params).id);
  if (id === null) {
    return badRequest("The block id must be `<column>_<row>`, for example 192_1377.");
  }

  const year = parseYear(request.nextUrl.searchParams.get("year"));
  if (year === null) return badRequest("The parameter `year` must be a year, for example 2017.");

  try {
    const detail = await getBlockDetail(id, year);
    return detail ? cachedJson(detail) : notFound(`The block ${id} does not exist.`);
  } catch (error) {
    return serverError("blocks/[id]", error);
  }
}
