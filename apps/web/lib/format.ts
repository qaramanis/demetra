import { METRICS } from "@demetra/core";
import type { MetricId } from "@demetra/core";

const NBSP = " ";
const MINUS = "−";

const formatters = new Map<number, Intl.NumberFormat>();

/** A number with a fixed number of decimal places and a true minus sign. */
export function formatNumber(value: number, decimals = 0): string {
  let formatter = formatters.get(decimals);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-GB", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    formatters.set(decimals, formatter);
  }
  // Do not show "-0".
  const rounded = Number(value.toFixed(decimals));
  return formatter.format(rounded === 0 ? 0 : rounded).replace("-", MINUS);
}

const UNIT_SUFFIX = {
  score: "",
  index: "",
  mm: `${NBSP}mm`,
  percent: `${NBSP}%`,
} as const;

/** The unit of a metric as text after the number: " mm", " %" or nothing. */
export function metricUnit(metric: MetricId): string {
  return UNIT_SUFFIX[METRICS[metric].unit];
}

/** The number of a metric without its unit. */
export function formatMetricNumber(metric: MetricId, value: number): string {
  return formatNumber(value, METRICS[metric].decimals);
}

/** A metric value with its unit, for example "53 mm" or "22 %". */
export function formatMetric(metric: MetricId, value: number): string {
  return `${formatMetricNumber(metric, value)}${metricUnit(metric)}`;
}

/** Longitude and latitude as "39.6400° N, 22.4200° E". */
export function formatCoordinates(lon: number, lat: number): string {
  const part = (value: number, positive: string, negative: string) =>
    `${Math.abs(value).toFixed(4)}°${NBSP}${value >= 0 ? positive : negative}`;
  return `${part(lat, "N", "S")}, ${part(lon, "E", "W")}`;
}

/** The size of a grid cell: "1 km", "100 m" or "10 m". */
export function formatCellSize(cellSize: number): string {
  return cellSize >= 1000 && cellSize % 1000 === 0
    ? `${cellSize / 1000}${NBSP}km`
    : `${cellSize}${NBSP}m`;
}

/** An amount in euros without decimals, for example "€491" or "−€519". */
export function formatEuros(value: number): string {
  const rounded = Math.round(value);
  return `${rounded < 0 ? MINUS : ""}€${formatNumber(Math.abs(rounded))}`;
}

const areaFormatter = new Intl.NumberFormat("en-GB", { maximumSignificantDigits: 3 });

/**
 * An area with three significant digits: "1,000", "47.3", "0.1". The area of a block is an
 * estimate, so more digits would give a wrong idea of its accuracy.
 */
export function formatArea(value: number): string {
  return areaFormatter.format(value);
}
