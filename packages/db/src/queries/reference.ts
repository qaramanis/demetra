import type { ReferenceData } from "@demetra/core";
import { asc, desc, inArray } from "drizzle-orm";

import { db } from "../client.ts";
import { blockCrops, counties, crops } from "../schema.ts";
import { getPredictionYears } from "./predictions.ts";

/** The color of a crop class that has no color in the `crops` table. */
const NO_COLOR = "#000000";

/**
 * The values that the filters offer: the years that have data, the years that have a
 * prediction, the crop classes that occur in the data, and the counties.
 */
export async function getReferenceData(): Promise<ReferenceData> {
  const yearsRequest = db
    .selectDistinct({ year: blockCrops.year })
    .from(blockCrops)
    .orderBy(desc(blockCrops.year));

  // The `crops` table has all the classes of the Cropland Data Layer. The filter must offer
  // only the classes that have blocks.
  const cropsRequest = db
    .select({ code: crops.cdlCode, name: crops.cdlClass, color: crops.color })
    .from(crops)
    .where(
      inArray(crops.cdlCode, db.selectDistinct({ code: blockCrops.cdlCode }).from(blockCrops)),
    )
    .orderBy(asc(crops.cdlClass));

  const countiesRequest = db
    .select({ fips: counties.countyFips, name: counties.countyName })
    .from(counties)
    .orderBy(asc(counties.countyName));

  const [yearRows, predictionYears, cropRows, countyRows] = await Promise.all([
    yearsRequest,
    getPredictionYears(),
    cropsRequest,
    countiesRequest,
  ]);

  const years = yearRows.map((row) => row.year);
  // A prediction is for a year after the real data. When the real data of a predicted year is
  // loaded, the real data replaces the prediction.
  const newestYear = years[0] ?? -Infinity;

  return {
    years,
    predictionYears: predictionYears.filter((year) => year > newestYear),
    crops: cropRows.map((row) => ({ ...row, color: row.color ?? NO_COLOR })),
    counties: countyRows,
  };
}
