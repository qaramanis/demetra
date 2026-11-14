import type { Polygon, Position } from "geojson";

const RAD = Math.PI / 180;

const lonOf = (position: Position): number => position[0] ?? 0;
const latOf = (position: Position): number => position[1] ?? 0;

/** The vertices of a ring without the last vertex, which is a copy of the first. */
function openRing(ring: Position[]): Position[] {
  const first = ring[0];
  const last = ring[ring.length - 1];
  const closed =
    ring.length > 1 &&
    first !== undefined &&
    last !== undefined &&
    lonOf(first) === lonOf(last) &&
    latOf(first) === latOf(last);
  return closed ? ring.slice(0, -1) : ring;
}

function meanPoint(points: Position[]): [lon: number, lat: number] {
  let lon = 0;
  let lat = 0;
  for (const point of points) {
    lon += lonOf(point);
    lat += latOf(point);
  }
  const count = Math.max(1, points.length);
  return [lon / count, lat / count];
}

/** Centroid of the outer ring of a polygon, as [longitude, latitude]. */
export function polygonCentroid(polygon: Polygon): [lon: number, lat: number] {
  const points = openRing(polygon.coordinates[0] ?? []);
  const [lon0, lat0] = meanPoint(points);
  if (points.length < 3) return [lon0, lat0];

  // Local plane: longitude differences become shorter with the cosine of the latitude.
  const k = Math.cos(lat0 * RAD);
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i] as Position;
    const b = points[(i + 1) % points.length] as Position;
    const ax = (lonOf(a) - lon0) * k;
    const ay = latOf(a) - lat0;
    const bx = (lonOf(b) - lon0) * k;
    const by = latOf(b) - lat0;
    const cross = ax * by - bx * ay;
    area += cross;
    cx += (ax + bx) * cross;
    cy += (ay + by) * cross;
  }
  if (Math.abs(area) < 1e-18 || k === 0) return [lon0, lat0];
  return [lon0 + cx / (3 * area) / k, lat0 + cy / (3 * area)];
}
