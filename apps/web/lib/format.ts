const NBSP = " ";
const MINUS = "−";

const formatters = new Map<number, Intl.NumberFormat>();

/** A number with a fixed number of decimal places and a true minus sign. */
export function formatNumber(value: number, decimals = 0): string {
  let formatter = formatters.get(decimals);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    formatters.set(decimals, formatter);
  }
  // Do not show "-0".
  const rounded = Number(value.toFixed(decimals));
  return formatter.format(rounded === 0 ? 0 : rounded).replace("-", MINUS);
}

/** Longitude and latitude as "36.7400° N, 119.7900° W". */
export function formatCoordinates(lon: number, lat: number): string {
  const part = (value: number, positive: string, negative: string) =>
    `${Math.abs(value).toFixed(4)}°${NBSP}${value >= 0 ? positive : negative}`;
  return `${part(lat, "N", "S")}, ${part(lon, "E", "W")}`;
}

/** An amount in US dollars without decimals, for example "$5,224" or "−$519". */
export function formatUsd(value: number): string {
  const rounded = Math.round(value);
  return `${rounded < 0 ? MINUS : ""}$${formatNumber(Math.abs(rounded))}`;
}

/**
 * An area in acres without the unit: one decimal place below 100 acres, none above. A block
 * of 990 m has 242 acres.
 */
export function formatAcres(value: number): string {
  return formatNumber(value, Math.abs(value) < 100 ? 1 : 0);
}

/** A fraction (0 to 1) as a percentage, for example "62 %". A small part is "< 1 %". */
export function formatShare(fraction: number): string {
  const percent = fraction * 100;
  if (percent > 0 && percent < 1) return `<${NBSP}1${NBSP}%`;
  return `${formatNumber(percent)}${NBSP}%`;
}
