import { blockFeatures } from "@demetra/core";
import type {
  BlockDetail,
  BlockFeatureCollection,
  BlocksQuery,
  BlocksResponse,
  ReferenceData,
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
 * The blocks of a map area, for the map.
 * - `ok`: the blocks as GeoJSON.
 * - `tooMany`: the area contains more than `limit` blocks. The user must zoom in.
 */
export type MapBlocks =
  | { status: "ok"; blocks: BlockFeatureCollection }
  | Exclude<BlocksResponse, { status: "ok" }>;

/** The blocks of a map area, with the values of the crops that agree with the filters. */
export async function fetchBlocks(query: BlocksQuery, signal?: AbortSignal): Promise<MapBlocks> {
  const { bbox, filters } = query;
  const params = new URLSearchParams({ bbox: bbox.join(","), year: String(filters.year) });
  if (filters.cropCode !== null) params.set("crop", String(filters.cropCode));
  if (filters.countyFips !== null) params.set("county", filters.countyFips);
  const response = await getJson<BlocksResponse>(`/api/blocks?${params.toString()}`, signal);

  // The answer has values only. The shapes are calculated here, one time for each answer,
  // and TanStack Query keeps the result.
  return response.status === "ok"
    ? { status: "ok", blocks: blockFeatures(response.rows) }
    : response;
}

/** All crops of one block in one year, with their revenue and soil values. */
export function fetchBlockDetail(
  blockId: string,
  year: number,
  signal?: AbortSignal,
): Promise<BlockDetail> {
  return getJson<BlockDetail>(`/api/blocks/${encodeURIComponent(blockId)}?year=${year}`, signal);
}
