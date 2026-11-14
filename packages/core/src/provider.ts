import type {
  Block,
  BlockFeatureCollection,
  BlockMetrics,
  BlocksQuery,
  Filters,
  RotationStrategy,
} from "./types.ts";

export interface ProviderMeta {
  id: string;
  label: string;
  /** `mock` = generated values. `live` = values from real datasets. */
  kind: "mock" | "live";
  /** Attribution text of each dataset that the provider uses. */
  attribution: readonly string[];
}

export interface RequestOptions {
  signal?: AbortSignal;
}

/**
 * The only source of field data for the user interface.
 *
 * To add a real provider, make a package in `packages/providers/` that implements this
 * interface, then change the import in `apps/web/data/provider.ts`.
 */
export interface FieldDataProvider {
  readonly meta: ProviderMeta;

  /** The blocks of a grid in a bounding box, each with one value for each metric. */
  getBlocks(query: BlocksQuery, options?: RequestOptions): Promise<BlockFeatureCollection>;

  /** The metrics of one block. The block can be a grid cell or a field polygon of the user. */
  getBlockMetrics(block: Block, filters: Filters, options?: RequestOptions): Promise<BlockMetrics>;

  /** Rotation strategies of three years for one block. */
  getRotationStrategies(
    block: Block,
    filters: Filters,
    options?: RequestOptions,
  ): Promise<RotationStrategy[]>;
}
