"use client";

import type { BBox, BlockFilters, Crop } from "@demetra/core";
import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { useMemo } from "react";

import { DATA_BOUNDS } from "@/config/regions";
import { useAppStore, type Viewport } from "@/store/app-store";

import {
  fetchBlockDetail,
  fetchBlockPrediction,
  fetchBlocks,
  fetchClimate,
  fetchPredictedBlocks,
  fetchReferenceData,
} from "./api";

/** The years, the crop classes and the counties that the filters offer. */
export function useReferenceData() {
  return useQuery({
    queryKey: ["reference"],
    queryFn: ({ signal }) => fetchReferenceData(signal),
  });
}

const NO_CROPS: readonly Crop[] = [];

/** The crop classes of the data. The list is empty while it loads. */
export function useCrops(): readonly Crop[] {
  return useReferenceData().data?.crops ?? NO_CROPS;
}

/** The crop class of each crop code. */
export function useCropIndex(): ReadonlyMap<number, Crop> {
  const crops = useCrops();
  return useMemo(() => new Map(crops.map((crop) => [crop.code, crop])), [crops]);
}

/**
 * The filters of the map. The result is `null` until the list of years is loaded, because
 * the default year is the newest year that has data.
 */
export function useBlockFilters(): BlockFilters | null {
  const selectedYear = useAppStore((state) => state.year);
  const cropCode = useAppStore((state) => state.cropCode);
  const countyFips = useAppStore((state) => state.countyFips);
  const newestYear = useReferenceData().data?.years[0];
  const year = selectedYear ?? newestYear ?? null;

  return useMemo(
    () => (year === null ? null : { year, cropCode, countyFips }),
    [year, cropCode, countyFips],
  );
}

/**
 * The year on the map.
 * - `predicted`: the year has a prediction of the model team and no real data.
 * - `dataYear`: the year of the real data in the detail panel. For a prediction year, this is
 *   the newest year that has data.
 */
export interface MapYear {
  year: number;
  predicted: boolean;
  dataYear: number;
}

/** The year on the map. The result is `null` until the list of years is loaded. */
export function useMapYear(): MapYear | null {
  const year = useBlockFilters()?.year ?? null;
  const reference = useReferenceData().data;

  return useMemo(() => {
    if (year === null || !reference) return null;
    const predicted = reference.predictionYears.includes(year);
    return { year, predicted, dataYear: predicted ? (reference.years[0] ?? year) : year };
  }, [year, reference]);
}

/**
 * The climate of one year. The answer has all the climate cells of the data and it does not
 * change, so one request for each year is sufficient: the result stays in memory.
 */
function climateQuery(year: number) {
  return queryOptions({
    queryKey: ["climate", year],
    queryFn: ({ signal }) => fetchClimate(year, signal),
    staleTime: Infinity,
    gcTime: Infinity,
    // The result is a `Map`. A comparison with a previous result has no use.
    structuralSharing: false,
  });
}

/**
 * - `outside`: the view is outside the area that has data.
 * - `ready`: the blocks of `bbox` can be requested.
 */
type BlocksRequest = { status: "outside" } | { status: "ready"; bbox: BBox };

/** The size of the request lattice at zoom 0, in degrees. Each zoom level halves it. */
const SNAP_DEGREES = 180;

/**
 * Makes the bounding box larger, to the lines of a fixed lattice. The lattice has cells of
 * about one fifth of the view. A small movement of the map then gives the same request, and
 * TanStack Query answers it from its cache.
 */
function snapOutward(bbox: BBox, zoom: number): BBox {
  const [west, south, east, north] = bbox;
  const step = SNAP_DEGREES / 2 ** Math.max(0, Math.floor(zoom));
  return [
    Math.floor(west / step) * step,
    Math.floor(south / step) * step,
    Math.ceil(east / step) * step,
    Math.ceil(north / step) * step,
  ];
}

/** The part of a bounding box that is in the area that has data, or `null`. */
function clipToData(bbox: BBox): BBox | null {
  const round = (value: number) => Number(value.toFixed(6));
  const west = round(Math.max(bbox[0], DATA_BOUNDS[0]));
  const south = round(Math.max(bbox[1], DATA_BOUNDS[1]));
  const east = round(Math.min(bbox[2], DATA_BOUNDS[2]));
  const north = round(Math.min(bbox[3], DATA_BOUNDS[3]));
  return east > west && north > south ? [west, south, east, north] : null;
}

function planBlocksRequest(viewport: Viewport): BlocksRequest {
  // When the view contains all the data, each view gives the same request.
  const bbox = clipToData(snapOutward(viewport.bbox, viewport.zoom));
  return bbox ? { status: "ready", bbox } : { status: "outside" };
}

/**
 * The request for the blocks of a map area: the blocks of real data, or the predicted blocks
 * of a prediction year. `useBlocks` and `usePredictNextYear` use the same request, so the
 * prediction that the button loads is in the cache when the map shows it.
 */
function blocksQuery(
  queryClient: QueryClient,
  bbox: BBox | null,
  filters: BlockFilters | null,
  predicted: boolean,
) {
  return queryOptions({
    queryKey: [predicted ? "predictions" : "blocks", bbox, filters],
    queryFn: ({ signal }) => {
      if (!bbox || !filters) throw new Error("No request");
      // A prediction has only the predicted crop of each block, and no climate values.
      if (predicted) return fetchPredictedBlocks({ bbox, filters }, signal);
      // The climate of the year loads at the same time as the blocks, and only one time for
      // each year. If it does not load, the map still shows the blocks: the climate layer
      // then shows "no data", and the next request for blocks tries again.
      const climate = queryClient.fetchQuery(climateQuery(filters.year)).catch(() => undefined);
      return fetchBlocks({ bbox, filters }, climate, signal);
    },
    // A prediction file does not change while the application runs. Without this value, the
    // map requests the prediction again immediately after the button loaded it.
    staleTime: predicted ? Infinity : 0,
    // An answer can have more than 100,000 blocks. A deep comparison with the previous answer is slow
    // and has no use, and an old answer must not stay in memory for a long time.
    structuralSharing: false,
    gcTime: 60 * 1000,
  });
}

/**
 * The blocks in the view of the map.
 *
 * `status`:
 * - `idle`: the list of years is not ready.
 * - `outside`: the view is outside the area that has data.
 * - `tooMany`: the view contains too many blocks. The user must zoom in.
 * - `ready`: `data` has the blocks, or the blocks load.
 *
 * `smallBlocksOmitted`: the view has too many blocks for one answer, so `data` is without the
 * blocks that have very little cropland.
 *
 * Each block also has the climate values of the year (see `fetchBlocks`).
 */
export function useBlocks() {
  const queryClient = useQueryClient();
  const viewport = useAppStore((state) => state.viewport);
  const filters = useBlockFilters();
  const predicted = useMapYear()?.predicted ?? false;
  const request = useMemo(() => planBlocksRequest(viewport), [viewport]);
  const bbox = request.status === "ready" ? request.bbox : null;

  const query = useQuery({
    ...blocksQuery(queryClient, bbox, filters, predicted),
    enabled: bbox !== null && filters !== null,
    // Keep the blocks on the map while the next blocks load.
    placeholderData: keepPreviousData,
  });

  // Old blocks must not stay on the map when the view has no blocks to show.
  const response = bbox !== null && filters !== null ? query.data : undefined;
  const status =
    request.status !== "ready"
      ? request.status
      : filters === null
        ? "idle"
        : response?.status === "tooMany"
          ? "tooMany"
          : "ready";

  return {
    status,
    data: response?.status === "ok" ? response.blocks : undefined,
    smallBlocksOmitted: response?.status === "ok" ? response.smallBlocksOmitted : undefined,
    isFetching: query.isFetching,
    isError: query.isError,
  } as const;
}

/**
 * The prediction of the year after the newest year that has data.
 *
 * `year` is the year of the prediction when the map shows the newest year that has data and
 * the next year has a prediction, if not `null`. `predict` first loads the predicted blocks of
 * the view, and then shows the prediction: the map changes in one step.
 */
export function usePredictNextYear() {
  const queryClient = useQueryClient();
  const reference = useReferenceData().data;
  const filters = useBlockFilters();
  const viewport = useAppStore((state) => state.viewport);
  const showPrediction = useAppStore((state) => state.showPrediction);

  const newestYear = reference?.years[0];
  const nextYear =
    newestYear !== undefined && reference?.predictionYears.includes(newestYear + 1)
      ? newestYear + 1
      : null;
  const offered = nextYear !== null && filters !== null && filters.year === newestYear;

  // The mutation gives the state of the request (pending, error) to the button. It only reads
  // data: it does not change the data on the server.
  const mutation = useMutation({
    mutationFn: async (query: { year: number; filters: BlockFilters; viewport: Viewport }) => {
      const request = planBlocksRequest(query.viewport);
      // Outside the data there are no blocks to load. The map then shows its message.
      if (request.status !== "ready") return;
      const filters = { ...query.filters, year: query.year };
      await queryClient.fetchQuery(blocksQuery(queryClient, request.bbox, filters, true));
    },
    onSuccess: (_, query) => showPrediction(query.year),
  });

  return {
    year: offered ? nextYear : null,
    predict: () => {
      if (offered) mutation.mutate({ year: nextYear, filters, viewport });
    },
    isPending: mutation.isPending,
    isError: mutation.isError,
  } as const;
}

/** Position of the block id in the query key below. */
const BLOCK_ID_INDEX = 1;

/**
 * All crops of one block in the year of the filters, with their revenue and soil values. For
 * a prediction year, the values are the real data of the newest year that has data.
 */
export function useBlockDetail(blockId: string | null) {
  const year = useMapYear()?.dataYear ?? null;
  return useQuery({
    queryKey: ["blockDetail", blockId, year],
    queryFn: ({ signal }) => {
      if (blockId === null || year === null) throw new Error("No block");
      return fetchBlockDetail(blockId, year, signal);
    },
    enabled: blockId !== null && year !== null,
    // Keep the old values on the screen while the values of a different year load, but only
    // for the same block. The values of a different block must not appear below the name of
    // the selected block.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[BLOCK_ID_INDEX] === blockId ? previous : undefined,
  });
}

/** The prediction for one block, when the map shows a prediction year. */
export function useBlockPrediction(blockId: string | null) {
  const mapYear = useMapYear();
  const year = mapYear?.predicted ? mapYear.year : null;
  return useQuery({
    queryKey: ["blockPrediction", blockId, year],
    queryFn: ({ signal }) => {
      if (blockId === null || year === null) throw new Error("No block");
      return fetchBlockPrediction(blockId, year, signal);
    },
    enabled: blockId !== null && year !== null,
    // A prediction file does not change while the application runs.
    staleTime: Infinity,
  });
}
