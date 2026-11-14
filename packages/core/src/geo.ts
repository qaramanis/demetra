import type { Polygon, Position } from "geojson";

import type { BBox } from "./types.ts";

export const M2_PER_STREMMA = 1_000;
export const M2_PER_HECTARE = 10_000;
export const STREMMATA_PER_HECTARE = 10;

const RAD = Math.PI / 180;
const WGS84_A = 6_378_137;
const WGS84_E2 = 0.006_694_379_990_14;

const lonOf = (position: Position): number => position[0] ?? 0;
const latOf = (position: Position): number => position[1] ?? 0;

/** Radius of the sphere that has the same area scale as the WGS84 ellipsoid at a latitude. */
function localRadius(latitude: number): number {
  const sin = Math.sin(latitude * RAD);
  const w = 1 - WGS84_E2 * sin * sin;
  const meridional = (WGS84_A * (1 - WGS84_E2)) / w ** 1.5;
  const normal = WGS84_A / Math.sqrt(w);
  return Math.sqrt(meridional * normal);
}

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

function ringAreaM2(ring: Position[]): number {
  const points = openRing(ring);
  const count = points.length;
  if (count < 3) return 0;
  const radius = localRadius(meanPoint(points)[1]);
  let total = 0;
  for (let i = 0; i < count; i++) {
    const lower = points[i] as Position;
    const middle = points[(i + 1) % count] as Position;
    const upper = points[(i + 2) % count] as Position;
    total += (lonOf(upper) - lonOf(lower)) * RAD * Math.sin(latOf(middle) * RAD);
  }
  return Math.abs((total * radius * radius) / 2);
}

/** Area of a polygon on the WGS84 ellipsoid, in m². Holes are subtracted. */
export function polygonAreaM2(polygon: Polygon): number {
  const [outer, ...holes] = polygon.coordinates;
  if (!outer) return 0;
  let area = ringAreaM2(outer);
  for (const hole of holes) area -= ringAreaM2(hole);
  return Math.max(0, area);
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

/** Bounding box of the outer ring of a polygon. */
export function polygonBBox(polygon: Polygon): BBox {
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const point of polygon.coordinates[0] ?? []) {
    west = Math.min(west, lonOf(point));
    east = Math.max(east, lonOf(point));
    south = Math.min(south, latOf(point));
    north = Math.max(north, latOf(point));
  }
  return [west, south, east, north];
}

/** Approximate ground size of a bounding box, in metres. */
export function bboxSizeM(bbox: BBox): [width: number, height: number] {
  const [west, south, east, north] = bbox;
  const midLat = (south + north) / 2;
  const radius = localRadius(midLat);
  const width = Math.max(0, east - west) * RAD * radius * Math.cos(midLat * RAD);
  const height = Math.max(0, north - south) * RAD * radius;
  return [width, height];
}
