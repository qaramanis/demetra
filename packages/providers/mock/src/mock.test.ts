import { CROP_IDS, GRIDS, METRICS, METRIC_IDS, bestStrategy, fhsClass } from "@demetra/core";
import type {
  BBox,
  Block,
  BlockFeatureCollection,
  Filters,
  GridRef,
  Irrigation,
  MetricId,
  Period,
} from "@demetra/core";
import { describe, expect, it } from "vitest";

import { MockFieldDataProvider } from "./index.ts";
import { rotationSequences } from "./model.ts";

const provider = new MockFieldDataProvider({ latencyMs: 0 });

/** About 22 km × 22 km around Larissa: about 480 blocks. */
const LARISSA: BBox = [22.3, 39.55, 22.55, 39.75];
const GRID: GridRef = { gridId: "utm", cellSize: 1000 };

const FULL_SEASON: Period = { year: 2026, startMonth: 4, endMonth: 10 };
const SHORT_PERIOD: Period = { year: 2019, startMonth: 6, endMonth: 7 };
const IRRIGATIONS: Irrigation[] = ["irrigated", "rainfed"];

const FILTERS: Filters = { crop: "cotton", period: FULL_SEASON, irrigation: "irrigated" };

const BLOCKS: Block[] = GRIDS.utm
  .cells(LARISSA, 1000)
  .map((cell) => ({ id: cell.id, kind: "cell", geometry: cell.geometry }));

const CUSTOM_FIELD: Block = {
  id: "custom-test",
  kind: "custom",
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [22.4, 39.62],
        [22.43, 39.62],
        [22.43, 39.64],
        [22.4, 39.64],
        [22.4, 39.62],
      ],
    ],
  },
};

const getBlocks = (filters: Filters) => provider.getBlocks({ bbox: LARISSA, grid: GRID, filters });

function meanOf(collection: BlockFeatureCollection, metric: MetricId): number {
  const sum = collection.features.reduce((total, feature) => total + feature.properties[metric], 0);
  return sum / collection.features.length;
}

describe("ranges", () => {
  const cases = CROP_IDS.flatMap((crop) =>
    IRRIGATIONS.flatMap((irrigation) =>
      [FULL_SEASON, SHORT_PERIOD].map((period) => ({ crop, irrigation, period })),
    ),
  );

  it.each(cases)(
    "keeps each metric in its range: $crop, $irrigation, $period.year",
    async (filters) => {
      const collection = await getBlocks(filters);
      expect(collection.features.length).toBeGreaterThan(400);
      for (const feature of collection.features) {
        for (const id of METRIC_IDS) {
          const value = feature.properties[id];
          const { range, decimals } = METRICS[id];
          expect(Number.isFinite(value)).toBe(true);
          expect(value).toBeGreaterThanOrEqual(range[0]);
          expect(value).toBeLessThanOrEqual(range[1]);
          // The value has no more decimal places than the metric permits.
          expect(value * 10 ** decimals).toBeCloseTo(Math.round(value * 10 ** decimals), 6);
        }
      }
    },
  );

  it("keeps each metric of a field polygon of the user in its range", async () => {
    const { values } = await provider.getBlockMetrics(CUSTOM_FIELD, FILTERS);
    for (const id of METRIC_IDS) {
      expect(values[id]).toBeGreaterThanOrEqual(METRICS[id].range[0]);
      expect(values[id]).toBeLessThanOrEqual(METRICS[id].range[1]);
    }
  });

  it("gives the FHS class that agrees with the score", async () => {
    for (const block of BLOCKS.slice(0, 60)) {
      const metrics = await provider.getBlockMetrics(block, FILTERS);
      expect(metrics.fhsClass).toBe(fhsClass(metrics.values.fhs));
      expect(metrics.blockId).toBe(block.id);
    }
  });

  it("shows the three FHS classes in the demo area", async () => {
    const collection = await getBlocks(FILTERS);
    const counts = { A: 0, B: 0, C: 0 };
    for (const feature of collection.features) counts[fhsClass(feature.properties.fhs)]++;
    // Each class has a clear share of the blocks, so that the map shows the three colours.
    for (const count of Object.values(counts)) {
      expect(count).toBeGreaterThan(collection.features.length * 0.1);
    }
  });
});

describe("determinism", () => {
  it("returns the same blocks for the same request", async () => {
    const first = await getBlocks(FILTERS);
    const second = await getBlocks(FILTERS);
    const other = await new MockFieldDataProvider({ latencyMs: 0 }).getBlocks({
      bbox: LARISSA,
      grid: GRID,
      filters: FILTERS,
    });
    expect(second).toEqual(first);
    expect(other).toEqual(first);
  });

  it("returns the same metrics and strategies for the same block", async () => {
    const other = new MockFieldDataProvider({ latencyMs: 0 });
    for (const block of [...BLOCKS.slice(0, 20), CUSTOM_FIELD]) {
      expect(await other.getBlockMetrics(block, FILTERS)).toEqual(
        await provider.getBlockMetrics(block, FILTERS),
      );
      expect(await other.getRotationStrategies(block, FILTERS)).toEqual(
        await provider.getRotationStrategies(block, FILTERS),
      );
    }
  });

  it("gives a block the same values on the map and in the detail panel", async () => {
    const collection = await getBlocks(FILTERS);
    for (const feature of collection.features.slice(0, 40)) {
      const block: Block = { id: feature.properties.id, kind: "cell", geometry: feature.geometry };
      const { values } = await provider.getBlockMetrics(block, FILTERS);
      for (const id of METRIC_IDS) expect(values[id]).toBe(feature.properties[id]);
    }
  });

  it("gives a block the same values in each bounding box", async () => {
    const first = await getBlocks(FILTERS);
    const shifted = await provider.getBlocks({
      bbox: [22.4, 39.6, 22.7, 39.85],
      grid: GRID,
      filters: FILTERS,
    });
    const byId = new Map(first.features.map((feature) => [feature.properties.id, feature]));
    const shared = shifted.features.filter((feature) => byId.has(feature.properties.id));
    expect(shared.length).toBeGreaterThan(100);
    for (const feature of shared) {
      expect(feature.properties).toEqual(byId.get(feature.properties.id)?.properties);
    }
  });

  it("uses the id of the block as a seed", async () => {
    const twin: Block = { ...CUSTOM_FIELD, id: "custom-other" };
    const a = await provider.getBlockMetrics(CUSTOM_FIELD, FILTERS);
    const b = await provider.getBlockMetrics(twin, FILTERS);
    expect(METRIC_IDS.some((id) => a.values[id] !== b.values[id])).toBe(true);
  });

  it("gives different blocks different values", async () => {
    const collection = await getBlocks(FILTERS);
    for (const id of METRIC_IDS) {
      const distinct = new Set(collection.features.map((feature) => feature.properties[id]));
      expect(distinct.size).toBeGreaterThan(10);
    }
  });
});

describe("filters", () => {
  it("gives a rainfed crop a larger water deficit and a lower health score", async () => {
    const irrigated = await getBlocks({ ...FILTERS, irrigation: "irrigated" });
    const rainfed = await getBlocks({ ...FILTERS, irrigation: "rainfed" });
    expect(meanOf(rainfed, "wd")).toBeGreaterThan(meanOf(irrigated, "wd") * 2);
    expect(meanOf(rainfed, "fhs")).toBeLessThan(meanOf(irrigated, "fhs") - 10);
    expect(meanOf(rainfed, "profitMargin")).toBeLessThan(meanOf(irrigated, "profitMargin"));
    expect(meanOf(rainfed, "resilience")).toBeLessThan(meanOf(irrigated, "resilience"));
  });

  it("changes the values when the crop changes", async () => {
    const maize = await getBlocks({ ...FILTERS, crop: "maize", irrigation: "rainfed" });
    const barley = await getBlocks({ ...FILTERS, crop: "barley", irrigation: "rainfed" });
    // Maize needs 600 mm of water and barley needs 280 mm.
    expect(meanOf(maize, "wd")).toBeGreaterThan(meanOf(barley, "wd") + 100);
    // Barley covers more of the soil than maize.
    expect(meanOf(barley, "eri")).toBeLessThan(meanOf(maize, "eri"));
  });

  it("changes the values when the year changes", async () => {
    const a = await getBlocks({ ...FILTERS, period: { ...FULL_SEASON, year: 2025 } });
    const b = await getBlocks({ ...FILTERS, period: { ...FULL_SEASON, year: 2026 } });
    expect(meanOf(a, "wd")).not.toBe(meanOf(b, "wd"));
  });

  it("gives a shorter period a smaller water deficit", async () => {
    const full = await getBlocks({ ...FILTERS, irrigation: "rainfed" });
    const short = await getBlocks({
      ...FILTERS,
      irrigation: "rainfed",
      period: { ...FULL_SEASON, startMonth: 6, endMonth: 7 },
    });
    expect(meanOf(short, "wd")).toBeLessThan(meanOf(full, "wd"));
  });
});

describe("rotation strategies", () => {
  it("returns the three example sequences for cotton", async () => {
    const strategies = await provider.getRotationStrategies(BLOCKS[0] as Block, FILTERS);
    expect(strategies.map((strategy) => strategy.sequence)).toEqual([
      ["cotton", "cotton", "cotton"],
      ["cotton", "barley", "chickpea"],
      ["maize", "chickpea", "barley"],
    ]);
  });

  it.each(CROP_IDS)("returns three different, valid strategies for %s", async (crop) => {
    expect(rotationSequences(crop)[0]).toEqual([crop, crop, crop]);
    for (const block of [...BLOCKS.slice(0, 25), CUSTOM_FIELD]) {
      for (const irrigation of IRRIGATIONS) {
        const strategies = await provider.getRotationStrategies(block, {
          ...FILTERS,
          crop,
          irrigation,
        });
        expect(strategies).toHaveLength(3);
        expect(new Set(strategies.map((strategy) => strategy.id)).size).toBe(3);
        for (const strategy of strategies) {
          expect(strategy.sequence).toHaveLength(3);
          expect(Number.isFinite(strategy.avgProfitPerHa)).toBe(true);
          expect(strategy.avgYieldPerHa).toBeGreaterThan(0);
          expect(strategy.resilience).toBeGreaterThanOrEqual(0);
          expect(strategy.resilience).toBeLessThanOrEqual(100);
          expect(strategy.confidence).toBeGreaterThanOrEqual(0);
          expect(strategy.confidence).toBeLessThanOrEqual(100);
        }
        expect(strategies).toContain(bestStrategy(strategies, "profit"));
        expect(strategies).toContain(bestStrategy(strategies, "yield"));
      }
    }
  });

  it("changes the strategies when the filters change", async () => {
    const block = BLOCKS[0] as Block;
    const irrigated = await provider.getRotationStrategies(block, FILTERS);
    const rainfed = await provider.getRotationStrategies(block, {
      ...FILTERS,
      irrigation: "rainfed",
    });
    expect(rainfed[0]?.avgProfitPerHa).toBeLessThan(irrigated[0]?.avgProfitPerHa ?? -Infinity);
  });
});

describe("provider", () => {
  it("says that it is a mock provider", () => {
    expect(provider.meta.kind).toBe("mock");
  });

  it("stops a request when the signal aborts", async () => {
    const slow = new MockFieldDataProvider({ latencyMs: 200 });
    const controller = new AbortController();
    const request = slow.getBlockMetrics(CUSTOM_FIELD, FILTERS, { signal: controller.signal });
    controller.abort();
    await expect(request).rejects.toBeDefined();
  });
});
