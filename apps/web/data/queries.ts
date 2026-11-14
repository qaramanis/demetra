"use client";

import type { BBox, BlockFilters, Crop } from "@demetra/core";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { DATA_BOUNDS } from "@/config/regions";
import { useAppStore, type Viewport } from "@/store/app-store";

import { fetchBlockDetail, fetchBlocks, fetchReferenceData } from "./api";

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
 * The blocks in the view of the map.
 *
 * `status`:
 * - `idle`: the list of years is not ready.
 * - `outside`: the view is outside the area that has data.
 * - `tooMany`: the view contains too many blocks. The user must zoom in.
 * - `ready`: `data` has the blocks, or the blocks load.
 */
export function useBlocks() {
  const viewport = useAppStore((state) => state.viewport);
  const filters = useBlockFilters();
  const request = useMemo(() => planBlocksRequest(viewport), [viewport]);
  const bbox = request.status === "ready" ? request.bbox : null;

  const query = useQuery({
    queryKey: ["blocks", bbox, filters],
    queryFn: ({ signal }) => {
      if (!bbox || !filters) throw new Error("No request");
      return fetchBlocks({ bbox, filters }, signal);
    },
    enabled: bbox !== null && filters !== null,
    // Keep the blocks on the map while the next blocks load.
    placeholderData: keepPreviousData,
    // An answer can have 86,623 blocks. A deep comparison with the previous answer is slow
    // and has no use, and an old answer must not stay in memory for a long time.
    structuralSharing: false,
    gcTime: 60 * 1000,
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
    isFetching: query.isFetching,
    isError: query.isError,
  } as const;
}

/** Position of the block id in the query key below. */
const BLOCK_ID_INDEX = 1;

/** All crops of one block in the year of the filters, with their revenue and soil values. */
export function useBlockDetail(blockId: string | null) {
  const year = useBlockFilters()?.year ?? null;
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
