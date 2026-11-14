import { getReferenceData } from "@demetra/db";
import { connection } from "next/server";

import { serverError } from "../_lib/request";

/**
 * `GET /api/reference`
 *
 * The values that the filters offer: the years that have data, the crop classes and the
 * counties. The answer is a `ReferenceData` object.
 */
export async function GET() {
  // This handler does not read the request. Without this line, Next.js tries to make the
  // answer during the build, when the database is possibly not there.
  await connection();

  try {
    return Response.json(await getReferenceData());
  } catch (error) {
    return serverError("reference", error);
  }
}
