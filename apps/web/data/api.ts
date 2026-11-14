import type { BlockDetail, BlocksQuery, BlocksResponse, ReferenceData } from "@demetra/core";

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

/** The blocks of a map area, with the values of the crops that agree with the filters. */
export function fetchBlocks(query: BlocksQuery, signal?: AbortSignal): Promise<BlocksResponse> {
  const { bbox, filters } = query;
  const params = new URLSearchParams({ bbox: bbox.join(","), year: String(filters.year) });
  if (filters.cropCode !== null) params.set("crop", String(filters.cropCode));
  if (filters.countyFips !== null) params.set("county", filters.countyFips);
  return getJson<BlocksResponse>(`/api/blocks?${params.toString()}`, signal);
}

/** All crops of one block in one year, with their revenue and soil values. */
export function fetchBlockDetail(
  blockId: string,
  year: number,
  signal?: AbortSignal,
): Promise<BlockDetail> {
  return getJson<BlockDetail>(`/api/blocks/${encodeURIComponent(blockId)}?year=${year}`, signal);
}
