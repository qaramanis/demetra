import type { Block } from "@demetra/core";
import type { Polygon, Position } from "geojson";

/** About one centimetre on the ground. */
const DECIMALS = 7;

const round = (value: number): number => Number(value.toFixed(DECIMALS));

/** Twice the signed area of a ring in degrees. Positive = counterclockwise. */
function signedArea(ring: Position[]): number {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1 = 0, y1 = 0] = ring[i] ?? [];
    const [x2 = 0, y2 = 0] = ring[i + 1] ?? [];
    sum += x1 * y2 - x2 * y1;
  }
  return sum;
}

/** FNV-1a hash of a text as eight hexadecimal characters. */
function hash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/**
 * Makes a block from a polygon that the user made.
 *
 * The result is a standard GeoJSON polygon (RFC 7946): longitude and latitude in WGS84, a
 * closed outer ring, counterclockwise. A provider can use it directly to read a raster or a
 * vector dataset. The id comes from the coordinates, so the same polygon always gets the
 * same id.
 *
 * Returns `null` when the polygon has fewer than three different corners.
 */
export function customFieldFromPolygon(polygon: Polygon): Block | null {
  const corners: Position[] = [];
  for (const position of polygon.coordinates[0] ?? []) {
    const [lon, lat] = position;
    if (lon === undefined || lat === undefined) continue;
    const corner = [round(lon), round(lat)];
    const previous = corners[corners.length - 1];
    if (previous && previous[0] === corner[0] && previous[1] === corner[1]) continue;
    corners.push(corner);
  }

  // Remove the last corner when it is a copy of the first, then close the ring again.
  const first = corners[0];
  const last = corners[corners.length - 1];
  if (first && last && corners.length > 1 && first[0] === last[0] && first[1] === last[1]) {
    corners.pop();
  }
  if (!first || corners.length < 3) return null;

  let ring = [...corners, first];
  if (signedArea(ring) === 0) return null;
  if (signedArea(ring) < 0) ring = ring.toReversed();

  return {
    id: `custom-${hash(JSON.stringify(ring))}`,
    kind: "custom",
    geometry: { type: "Polygon", coordinates: [ring] },
  };
}
