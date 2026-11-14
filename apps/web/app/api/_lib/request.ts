import type { BBox } from "@demetra/core";

/**
 * Helpers for the Route Handlers: the checks of the request parameters and the error
 * answers. Each parameter comes from the browser, so a handler must not trust it.
 *
 * The folder name starts with "_", so Next.js does not make a route from it.
 */

const DECIMAL = /^-?\d{1,3}(\.\d{1,15})?$/;
const DIGITS = /^\d{1,6}$/;

/** A whole number from `min` to `max`, or `null` when the text is not such a number. */
export function parseInteger(text: string | null, min: number, max: number): number | null {
  if (text === null || !DIGITS.test(text)) return null;
  const value = Number(text);
  return value >= min && value <= max ? value : null;
}

/** A year of the data, or `null`. */
export function parseYear(text: string | null): number | null {
  return parseInteger(text, 2000, 2100);
}

/** The code of a crop class of the Cropland Data Layer (0 to 255), or `null`. */
export function parseCropCode(text: string | null): number | null {
  return parseInteger(text, 0, 255);
}

/** The FIPS code of a county (5 digits), or `null`. */
export function parseCountyFips(text: string | null): string | null {
  return text !== null && /^\d{5}$/.test(text) ? text : null;
}

/** The id of a block, `<block_col>_<block_row>`, or `null`. */
export function parseBlockId(text: string | null): string | null {
  return text !== null && /^\d{1,6}_\d{1,6}$/.test(text) ? text : null;
}

/** A bounding box from the text "west,south,east,north" in degrees, or `null`. */
export function parseBBox(text: string | null): BBox | null {
  if (text === null) return null;
  const parts = text.split(",");
  if (parts.length !== 4 || !parts.every((part) => DECIMAL.test(part))) return null;
  const [west, south, east, north] = parts.map(Number) as [number, number, number, number];
  if (west < -180 || east > 180 || south < -90 || north > 90) return null;
  if (!(west < east) || !(south < north)) return null;
  return [west, south, east, north];
}

/**
 * The time that the CDN of the host keeps an answer, in seconds. The data changes only when
 * the data pipeline loads a year, so after a load the map can show the old data for this
 * time. A purge of the CDN cache, or a new deployment, shows the new data immediately.
 */
const CDN_CACHE_SECONDS = 60 * 60;

/**
 * An answer with data that is the same for all users.
 *
 * `s-maxage` is for the CDN: it answers the subsequent requests for the same address, and
 * the handler and the database do no work. `max-age=0` is for the browser: it must not keep
 * a copy, because a purge of the CDN cache cannot remove that copy.
 *
 * Do not use this for an answer with an error: only correct data must stay in the cache.
 */
export function cachedJson(data: unknown): Response {
  return Response.json(data, {
    headers: { "Cache-Control": `public, max-age=0, s-maxage=${CDN_CACHE_SECONDS}` },
  });
}

/** The answer to a request that has an incorrect parameter. */
export function badRequest(error: string): Response {
  return Response.json({ error }, { status: 400 });
}

/** The answer to a request for a thing that does not exist. */
export function notFound(error: string): Response {
  return Response.json({ error }, { status: 404 });
}

/**
 * The answer when the database request fails. The cause goes to the server log only: the
 * browser must not get internal details.
 */
export function serverError(route: string, cause: unknown): Response {
  console.error(`[api/${route}] The database request failed.`, cause);
  return Response.json({ error: "The data is not available now." }, { status: 500 });
}
