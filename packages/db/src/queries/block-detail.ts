import type { BlockCrop, BlockDetail } from "@demetra/core";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import type { Polygon } from "geojson";

import { db } from "../client.ts";
import { blockCrops, blocks, counties, crops } from "../schema.ts";

/** The color of a crop class that has no color in the `crops` table. */
const NO_COLOR = "#000000";

/**
 * The code of the crop class with the most cells in a block. The cells of one crop class in
 * two counties are added. When two crop classes have the same number of cells, the lower
 * code is the main crop. This is the same rule as in `getBlocks` and in the data pipeline.
 */
function mainCropCode(rows: readonly { cdlCode: number; cells: number }[]): number | null {
  const cellsOf = new Map<number, number>();
  for (const row of rows) cellsOf.set(row.cdlCode, (cellsOf.get(row.cdlCode) ?? 0) + row.cells);

  let main: number | null = null;
  let mainCells = -Infinity;
  for (const [code, cells] of cellsOf) {
    if (cells > mainCells || (cells === mainCells && main !== null && code < main)) {
      main = code;
      mainCells = cells;
    }
  }
  return main;
}

/**
 * All data of one block in one year: its shape and one row for each county and crop class,
 * with the revenue and the soil values. The largest area is first.
 *
 * The result is `null` when the block does not exist. When the block exists but the year
 * has no data for it, the list of crops is empty.
 */
export async function getBlockDetail(id: string, year: number): Promise<BlockDetail | null> {
  const blockRequest = db
    .select({
      lon: blocks.lonCenter,
      lat: blocks.latCenter,
      geometry: sql<string>`ST_AsGeoJSON(${blocks.geom}, 6)`,
    })
    .from(blocks)
    .where(eq(blocks.blockId, id))
    .limit(1);

  const rowsRequest = db
    .select({
      row: blockCrops,
      cropName: crops.cdlClass,
      color: crops.color,
      countyName: counties.countyName,
    })
    .from(blockCrops)
    .innerJoin(crops, eq(crops.cdlCode, blockCrops.cdlCode))
    .innerJoin(counties, eq(counties.countyFips, blockCrops.countyFips))
    .where(and(eq(blockCrops.blockId, id), eq(blockCrops.year, year)))
    .orderBy(desc(blockCrops.acres), asc(blockCrops.cdlCode), asc(blockCrops.countyFips));

  const [[block], rows] = await Promise.all([blockRequest, rowsRequest]);
  if (!block) return null;

  const main = mainCropCode(rows.map(({ row }) => row));

  const blockCropRows = rows.map(
    ({ row, cropName, color, countyName }): BlockCrop => ({
      countyFips: row.countyFips,
      countyName,
      cropCode: row.cdlCode,
      cropName,
      color: color ?? NO_COLOR,
      acres: row.acres,
      shareOfCropland: row.shareOfBlockCropland,
      isMainCrop: row.cdlCode === main,
      econMatch: row.econMatch,
      mainCommodity: row.mainCommodity,
      yieldPerAcre: row.yieldPerAcre,
      yieldUnit: row.yieldUnit,
      pricePerUnitUsd: row.pricePerUnitUsd,
      revenuePerAcreCountyUsd: row.revenuePerAcreCountyUsd,
      revenuePerAcreStateUsd: row.revenuePerAcreStateUsd,
      estRevenueUsd: row.estRevenueUsd,
      soil: {
        component: row.soilComponent,
        order: row.soilOrder,
        surfaceTexture: row.surfaceTexture,
        sandPct: row.sandPct,
        siltPct: row.siltPct,
        clayPct: row.clayPct,
        organicMatterPct: row.organicMatterPct,
        ph: row.ph,
        ecDsM: row.ecDsM,
        sar: row.sar,
        ksatUmS: row.ksatUmS,
        cecMeq100g: row.cecMeq100g,
        slopePct: row.slopePct,
        drainageClass: row.drainageClass,
        hydrologicGroup: row.hydrologicGroup,
        floodFrequency: row.floodFrequency,
        depthToBedrockCm: row.depthToBedrockCm,
        depthToWaterTableCm: row.depthToWaterTableCm,
        aws0To100Cm: row.aws0To100Cm,
        rootZoneDepthCm: row.rootZoneDepthCm,
        soc0To30GM2: row.soc0To30GM2,
        irrCapabilityClass: row.irrCapabilityClass,
        nonirrCapabilityClass: row.nonirrCapabilityClass,
        farmlandClass: row.farmlandClass,
        storieIndex: row.storieIndex,
        storieGrade: row.storieGrade,
        nccpiAll: row.nccpiAll,
        dominantMukeyShare: row.dominantMukeyShare,
        soilUnits: row.nSoilUnits,
      },
    }),
  );

  return {
    id,
    year,
    geometry: JSON.parse(block.geometry) as Polygon,
    center: [block.lon, block.lat],
    // Each row of a block has the same value.
    croplandAcres: rows[0]?.row.blockCroplandAcres ?? 0,
    crops: blockCropRows,
  };
}
