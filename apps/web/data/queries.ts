"use client";

import { estimateCellCount, gridCovers } from "@demetra/core";
import type { BBox, Block, GridRef } from "@demetra/core";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { useAppStore, useFilters, type Viewport } from "@/store/app-store";

import { provider } from "./provider";

/** The map does not show more blocks than this number. */
export const MAX_VISIBLE_CELLS = 60_000;

/**
 * - `idle`: the map is not ready.
 * - `outside`: the grid does not cover the view.
 * - `tooMany`: the view contains too many blocks. The user must zoom in.
 * - `ready`: the blocks of `bbox` can be requested.
 */
export type BlocksRequest =
  | { status: "idle" | "outside" | "tooMany" }
  | { status: "ready"; bbox: BBox };

const METRES_PER_DEGREE = 111_320;

/**
 * Makes the bounding box larger, to the lines of a fixed lattice of about eight cells. A
 * small movement of the map then gives the same request, and TanStack Query answers it from
 * its cache.
 */
function snapOutward(bbox: BBox, cellSize: number): BBox {
  const [west, south, east, north] = bbox;
  const step = (cellSize * 8) / METRES_PER_DEGREE;
  const round = (value: number) => Number(value.toFixed(6));
  return [
    round(Math.floor(west / step) * step),
    round(Math.floor(south / step) * step),
    round(Math.ceil(east / step) * step),
    round(Math.ceil(north / step) * step),
  ];
}

export function planBlocksRequest(viewport: Viewport | null, grid: GridRef): BlocksRequest {
  if (!viewport) return { status: "idle" };
  if (!gridCovers(grid.gridId, viewport.bbox)) return { status: "outside" };
  if (estimateCellCount(viewport.bbox, grid.cellSize) > MAX_VISIBLE_CELLS) {
    return { status: "tooMany" };
  }
  return { status: "ready", bbox: snapOutward(viewport.bbox, grid.cellSize) };
}

/** The blocks in the view of the map, with one value for each metric. */
export function useBlocks() {
  const viewport = useAppStore((state) => state.viewport);
  const grid = useAppStore((state) => state.grid);
  const filters = useFilters();
  const request = useMemo(() => planBlocksRequest(viewport, grid), [viewport, grid]);
  const bbox = request.status === "ready" ? request.bbox : null;

  const query = useQuery({
    queryKey: ["blocks", provider.meta.id, grid, bbox, filters],
    queryFn: ({ signal }) => {
      if (!bbox) throw new Error("No bounding box");
      return provider.getBlocks({ bbox, grid, filters }, { signal });
    },
    enabled: bbox !== null,
    // Keep the blocks on the map while the next blocks load.
    placeholderData: keepPreviousData,
  });

  return {
    status: request.status,
    // Old blocks must not stay on the map when the view has no blocks to show.
    data: request.status === "ready" ? query.data : undefined,
    isFetching: query.isFetching,
    isError: query.isError,
  };
}

/** Position of the block id in the query keys below. */
const BLOCK_ID_INDEX = 2;

/** The metrics of one block. */
export function useBlockMetrics(block: Block | null) {
  const filters = useFilters();
  return useQuery({
    queryKey: ["blockMetrics", provider.meta.id, block?.id, filters],
    queryFn: ({ signal }) => {
      if (!block) throw new Error("No block");
      return provider.getBlockMetrics(block, filters, { signal });
    },
    enabled: block !== null,
    // Keep the old values on the screen while new values load, but only for the same block.
    // The values of a different block must not appear below the name of the selected block.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[BLOCK_ID_INDEX] === block?.id ? previous : undefined,
  });
}

/** The rotation strategies of one block. */
export function useRotationStrategies(block: Block | null) {
  const filters = useFilters();
  return useQuery({
    queryKey: ["rotationStrategies", provider.meta.id, block?.id, filters],
    queryFn: ({ signal }) => {
      if (!block) throw new Error("No block");
      return provider.getRotationStrategies(block, filters, { signal });
    },
    enabled: block !== null,
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[BLOCK_ID_INDEX] === block?.id ? previous : undefined,
  });
}
