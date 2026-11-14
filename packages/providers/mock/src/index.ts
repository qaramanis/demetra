import { GRIDS, fhsClass } from "@demetra/core";
import type {
  Block,
  BlockFeatureCollection,
  BlockMetrics,
  BlocksQuery,
  FieldDataProvider,
  Filters,
  ProviderMeta,
  RequestOptions,
  RotationStrategy,
} from "@demetra/core";

import { landOf, rotationSequences, simulateRotation, simulateSeason } from "./model.ts";

export interface MockProviderOptions {
  /** Delay of each request in milliseconds, so that loading states are visible. Default: 250. */
  latencyMs?: number;
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    if (ms <= 0) {
      resolve();
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}

/**
 * A provider that generates its values. The same block and the same filters always give the
 * same values. No dataset and no network are necessary.
 */
export class MockFieldDataProvider implements FieldDataProvider {
  readonly meta: ProviderMeta = {
    id: "mock",
    label: "Mock data",
    kind: "mock",
    attribution: [],
  };

  private readonly latencyMs: number;

  constructor(options: MockProviderOptions = {}) {
    this.latencyMs = options.latencyMs ?? 250;
  }

  async getBlocks(query: BlocksQuery, options?: RequestOptions): Promise<BlockFeatureCollection> {
    await delay(this.latencyMs, options?.signal);
    const cells = GRIDS[query.grid.gridId].cells(query.bbox, query.grid.cellSize);
    return {
      type: "FeatureCollection",
      features: cells.map((cell) => {
        const block: Block = { id: cell.id, kind: "cell", geometry: cell.geometry };
        return {
          type: "Feature",
          geometry: cell.geometry,
          properties: {
            id: block.id,
            kind: block.kind,
            ...simulateSeason(landOf(block), query.filters).values,
          },
        };
      }),
    };
  }

  async getBlockMetrics(
    block: Block,
    filters: Filters,
    options?: RequestOptions,
  ): Promise<BlockMetrics> {
    await delay(this.latencyMs, options?.signal);
    const { values } = simulateSeason(landOf(block), filters);
    return { blockId: block.id, values, fhsClass: fhsClass(values.fhs) };
  }

  async getRotationStrategies(
    block: Block,
    filters: Filters,
    options?: RequestOptions,
  ): Promise<RotationStrategy[]> {
    await delay(this.latencyMs, options?.signal);
    const land = landOf(block);
    return rotationSequences(filters.crop).map((sequence) =>
      simulateRotation(land, filters, sequence),
    );
  }
}
