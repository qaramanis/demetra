import type { Position } from "geojson";
import { describe, expect, it } from "vitest";

import { polygonAreaM2, polygonCentroid } from "../geo.ts";
import type { BBox } from "../types.ts";
import { GRIDS, MAX_LATTICE_CELLS, cellSizeLabel, estimateCellCount, gridCovers } from "./index.ts";
import { GRID_IDS } from "./types.ts";

/** About 22 km × 22 km around Larissa. */
const LARISSA: BBox = [22.3, 39.55, 22.55, 39.75];

function signedRingArea(ring: Position[]): number {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i] as [number, number];
    const [x2, y2] = ring[i + 1] as [number, number];
    sum += x1 * y2 - x2 * y1;
  }
  return sum / 2;
}

describe.each(GRID_IDS)("grid %s", (gridId) => {
  const grid = GRIDS[gridId];
  const cells = grid.cells(LARISSA, 1000);

  it("returns about one cell for each square kilometre", () => {
    const estimate = estimateCellCount(LARISSA, 1000);
    expect(estimate).toBeGreaterThan(400);
    expect(cells.length).toBeGreaterThan(estimate * 0.95);
    expect(cells.length).toBeLessThan(estimate * 1.05);
  });

  it("gives each cell a different id", () => {
    expect(new Set(cells.map((cell) => cell.id)).size).toBe(cells.length);
  });

  it("makes cells of 1 km²", () => {
    for (const cell of cells) {
      const area = polygonAreaM2(cell.geometry);
      // UTM has a scale error of less than 0.1 %. The EEA grid is an equal-area grid.
      expect(area).toBeGreaterThan(1_000_000 * 0.997);
      expect(area).toBeLessThan(1_000_000 * 1.003);
    }
  });

  it("makes closed, counterclockwise rings of four corners", () => {
    for (const cell of cells) {
      const ring = cell.geometry.coordinates[0] as Position[];
      expect(cell.geometry.type).toBe("Polygon");
      expect(ring).toHaveLength(5);
      expect(ring[4]).toEqual(ring[0]);
      expect(signedRingArea(ring)).toBeGreaterThan(0);
    }
  });

  it("returns only the cells that have their centre in the bounding box", () => {
    const [west, south, east, north] = LARISSA;
    // The centroid and the mean of the corners can differ by a very small amount.
    const tolerance = 1e-6;
    for (const cell of cells) {
      const [lon, lat] = polygonCentroid(cell.geometry);
      expect(lon).toBeGreaterThanOrEqual(west - tolerance);
      expect(lon).toBeLessThanOrEqual(east + tolerance);
      expect(lat).toBeGreaterThanOrEqual(south - tolerance);
      expect(lat).toBeLessThanOrEqual(north + tolerance);
    }
  });

  it("is deterministic", () => {
    expect(grid.cells(LARISSA, 1000)).toEqual(cells);
  });

  it("gives a cell the same id and geometry in each bounding box that contains it", () => {
    const shifted: BBox = [22.4, 39.6, 22.7, 39.85];
    const byId = new Map(cells.map((cell) => [cell.id, cell]));
    const shared = grid.cells(shifted, 1000).filter((cell) => byId.has(cell.id));
    expect(shared.length).toBeGreaterThan(100);
    for (const cell of shared) {
      expect(cell.geometry).toEqual(byId.get(cell.id)?.geometry);
    }
  });

  it("puts 10 × 10 smaller cells in each larger cell", () => {
    const box: BBox = [22.38, 39.6, 22.46, 39.68];
    const indices = (id: string) => {
      const match = /E(\d+)N(\d+)$/.exec(id);
      return [Number(match?.[1]), Number(match?.[2])] as const;
    };
    // The 1 km cell nearest to the centre of the box. All of it is in the box.
    const distance = (cell: { geometry: Parameters<typeof polygonCentroid>[0] }) => {
      const [lon, lat] = polygonCentroid(cell.geometry);
      return Math.hypot(lon - 22.42, lat - 39.64);
    };
    const parent = grid.cells(box, 1000).sort((a, b) => distance(a) - distance(b))[0];
    expect(parent).toBeDefined();
    if (!parent) return;
    const [parentX, parentY] = indices(parent.id);

    const children = grid.cells(box, 100).filter((cell) => {
      const [x, y] = indices(cell.id);
      return Math.floor(x / 10) === parentX && Math.floor(y / 10) === parentY;
    });
    expect(children).toHaveLength(100);

    const childArea = children.reduce((sum, cell) => sum + polygonAreaM2(cell.geometry), 0);
    expect(childArea / polygonAreaM2(parent.geometry)).toBeCloseTo(1, 4);
  });

  it("returns no cell for an empty bounding box", () => {
    expect(grid.cells([22.4, 39.6, 22.4, 39.6], 1000)).toEqual([]);
    expect(grid.cells([22.5, 39.6, 22.4, 39.7], 1000)).toEqual([]);
  });

  it("refuses a request that is too large", () => {
    expect(estimateCellCount([15, 35, 25, 45], 100)).toBeGreaterThan(MAX_LATTICE_CELLS);
    expect(() => grid.cells([15, 35, 25, 45], 100)).toThrow(RangeError);
  });
});

describe("UTM grid", () => {
  const grid = GRIDS.utm;

  it("uses ids with the zone, the hemisphere and the cell size", () => {
    for (const cell of grid.cells(LARISSA, 1000)) {
      expect(cell.id).toMatch(/^34N-1kmE\d+N\d+$/);
    }
    expect(grid.cells([22.4, 39.62, 22.42, 39.63], 100)[0]?.id).toMatch(/^34N-100mE\d+N\d+$/);
  });

  it("works on the two sides of a zone limit, without a cell in the two zones", () => {
    // Longitude 24° E is the limit between zones 34 and 35.
    const cells = grid.cells([23.9, 40.5, 24.1, 40.6], 1000);
    const zones = new Set(cells.map((cell) => cell.id.slice(0, 3)));
    expect(zones).toEqual(new Set(["34N", "35N"]));
    expect(new Set(cells.map((cell) => cell.id)).size).toBe(cells.length);
    for (const cell of cells) {
      const [lon] = polygonCentroid(cell.geometry);
      expect(cell.id.startsWith(lon < 24 ? "34N" : "35N")).toBe(true);
    }
  });

  it("works in the southern hemisphere and on the equator", () => {
    const south = grid.cells([-47.1, -15.9, -47.0, -15.8], 1000);
    expect(south.length).toBeGreaterThan(50);
    expect(south.every((cell) => cell.id.startsWith("23S-"))).toBe(true);

    const equator = grid.cells([36.0, -0.05, 36.1, 0.05], 1000);
    const hemispheres = new Set(equator.map((cell) => cell.id.slice(2, 3)));
    expect(hemispheres).toEqual(new Set(["N", "S"]));
  });

  it("works in places far from the demo area", () => {
    expect(grid.cells([-93.7, 41.9, -93.5, 42.1], 1000).length).toBeGreaterThan(300);
    expect(grid.cells([139.6, 35.6, 139.8, 35.8], 1000).length).toBeGreaterThan(300);
  });

  it("returns no cell near the poles", () => {
    expect(grid.cells([10, 85, 11, 86], 1000)).toEqual([]);
  });
});

describe("EEA grid", () => {
  const grid = GRIDS.eea;

  it("uses EEA cell codes", () => {
    for (const cell of grid.cells(LARISSA, 1000)) {
      expect(cell.id).toMatch(/^1kmE\d{4}N\d{4}$/);
    }
    expect(grid.cells([22.4, 39.62, 22.42, 39.63], 100)[0]?.id).toMatch(/^100mE\d{5}N\d{5}$/);
    expect(grid.cells([22.4, 39.62, 22.401, 39.6205], 10)[0]?.id).toMatch(/^10mE\d{6}N\d{6}$/);
  });

  it("puts the cell corners on multiples of the cell size in EPSG:3035", () => {
    // EPSG:3035 gives the point 52° N, 10° E the coordinates x = 4,321,000 and y = 3,210,000.
    // The cell that has this point as its south-west corner is thus E4321 N3210.
    const cells = grid.cells([10.0, 52.0, 10.02, 52.012], 1000);
    const cell = cells.find((item) => item.id === "1kmE4321N3210");
    expect(cell).toBeDefined();
    const [lon, lat] = cell?.geometry.coordinates[0]?.[0] ?? [];
    expect(lon).toBeCloseTo(10, 6);
    expect(lat).toBeCloseTo(52, 6);
  });

  it("covers Europe only", () => {
    expect(gridCovers("eea", LARISSA)).toBe(true);
    expect(gridCovers("eea", [-93.7, 41.9, -93.5, 42.1])).toBe(false);
    expect(grid.cells([-93.7, 41.9, -93.5, 42.1], 1000)).toEqual([]);
    expect(gridCovers("utm", [-93.7, 41.9, -93.5, 42.1])).toBe(true);
  });
});

describe("cellSizeLabel", () => {
  it("uses kilometres for whole kilometres and metres for smaller sizes", () => {
    expect(cellSizeLabel(1000)).toBe("1km");
    expect(cellSizeLabel(100)).toBe("100m");
    expect(cellSizeLabel(10)).toBe("10m");
  });
});
