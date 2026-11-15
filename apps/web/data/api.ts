import { blockFeatures, climateIndex, predictionFeatures } from "@demetra/core";
import type {
  BlockDetail,
  BlockPrediction,
  BlocksQuery,
  BlocksResponse,
  ClimateIndex,
  ClimateResponse,
  MapBlockFeatureCollection,
  PredictionsResponse,
  ReferenceData,
  SmallBlocksOmitted,
} from "@demetra/core";

/**
 * The requests to the server of this application. The browser does not connect to the
 * database: the Route Handlers in `app/api` run the queries.
 */

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`${url} returned status ${response.status}`);
  return (await response.json()) as T;
}

/** The years, the crop classes and the counties that the filters offer. */
export function fetchReferenceData(signal?: AbortSignal): Promise<ReferenceData> {
  return getJson<ReferenceData>("/api/reference", signal);
}

/**
 * The climate of one year: the values of each climate cell (cells of approximately 10 km),
 * in a form that finds the cell of a block.
 */
export async function fetchClimate(year: number, signal?: AbortSignal): Promise<ClimateIndex> {
  const response = await getJson<ClimateResponse>(`/api/climate?year=${year}`, signal);
  return climateIndex(response.rows);
}

/**
 * The blocks of a map area, for the map: blocks of real data, or predicted blocks.
 * - `ok`: the blocks as GeoJSON. `smallBlocksOmitted` is there when the area has too many
 *   blocks for one answer: the answer is then without the blocks that have very little cropland.
 * - `tooMany`: the area contains more than `limit` blocks. The user must zoom in.
 */
export type MapBlocks =
  | { status: "ok"; blocks: MapBlockFeatureCollection; smallBlocksOmitted?: SmallBlocksOmitted }
  | Exclude<BlocksResponse, { status: "ok" }>;

/** The parameters of a request for the blocks of a map area. */
function blocksParams({ bbox, filters }: BlocksQuery): string {
  const params = new URLSearchParams({ bbox: bbox.join(","), year: String(filters.year) });
  if (filters.cropCode !== null) params.set("crop", String(filters.cropCode));
  if (filters.countyFips !== null) params.set("county", filters.countyFips);
  return params.toString();
}

/**
 * The blocks of a map area, with the values of the crops that agree with the filters.
 *
 * `climate` is the climate of the year of the filters: each block gets the values of its
 * climate cell. The promise gives `undefined` when the climate is not available. The blocks
 * then have no climate values.
 */
export async function fetchBlocks(
  query: BlocksQuery,
  climate: Promise<ClimateIndex | undefined>,
  signal?: AbortSignal,
): Promise<MapBlocks> {
  const [response, cells] = await Promise.all([
    getJson<BlocksResponse>(`/api/blocks?${blocksParams(query)}`, signal),
    climate,
  ]);

  // The answer has values only. The shapes are calculated here, one time for each answer,
  // and TanStack Query keeps the result.
  if (response.status !== "ok") return response;
  const blocks = blockFeatures(response.rows, cells);
  return response.smallBlocksOmitted
    ? { status: "ok", blocks, smallBlocksOmitted: response.smallBlocksOmitted }
    : { status: "ok", blocks };
}

/**
 * The predicted blocks of a map area: the prediction of the model team for a year that has no
 * real data. Each block has only its predicted crop. A prediction has no climate values.
 */
export async function fetchPredictedBlocks(
  query: BlocksQuery,
  signal?: AbortSignal,
): Promise<MapBlocks> {
  const response = await getJson<PredictionsResponse>(
    `/api/predictions?${blocksParams(query)}`,
    signal,
  );
  if (response.status !== "ok") return response;
  return { status: "ok", blocks: predictionFeatures(response.rows) };
}

/** The prediction for one block. */
export function fetchBlockPrediction(
  blockId: string,
  year: number,
  signal?: AbortSignal,
): Promise<BlockPrediction> {
  return getJson<BlockPrediction>(
    `/api/predictions/${encodeURIComponent(blockId)}?year=${year}`,
    signal,
  );
}

/** All crops of one block in one year, with their revenue and soil values. */
export function fetchBlockDetail(
  blockId: string,
  year: number,
  signal?: AbortSignal,
): Promise<BlockDetail> {
  return getJson<BlockDetail>(`/api/blocks/${encodeURIComponent(blockId)}?year=${year}`, signal);
}
