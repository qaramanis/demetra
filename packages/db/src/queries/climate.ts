import { climateCellRow } from "@demetra/core";
import type { ClimateResponse } from "@demetra/core";
import { asc, eq, sql } from "drizzle-orm";

import { db } from "../client.ts";
import { climateCells } from "../schema.ts";

/**
 * The climate of one year: one row for each climate cell, with the metrics that the map
 * shows. A year that has no climate data gives no rows.
 *
 * The answer has all the cells of the data, and not only the cells of a map area: California
 * has 4,814 cells, which is approximately 150 kB.
 */
export async function getClimateCells(year: number): Promise<ClimateResponse> {
  const rows = await db
    .select({
      // The index of a cell is the position of its center multiplied by 10.
      latIndex: sql<number>`(${climateCells.cellLat} * 10)::int`,
      lonIndex: sql<number>`(${climateCells.cellLon} * 10)::int`,
      tMean: climateCells.tMean,
      heatDays: climateCells.heatDays,
      rainWaterYear: climateCells.rainWateryearMm,
      rainAnomaly: climateCells.rainAnomalyPct,
    })
    .from(climateCells)
    .where(eq(climateCells.year, year))
    .orderBy(asc(climateCells.cellLat), asc(climateCells.cellLon));

  return {
    year,
    rows: rows.map(({ latIndex, lonIndex, ...values }) =>
      climateCellRow(latIndex, lonIndex, values),
    ),
  };
}
