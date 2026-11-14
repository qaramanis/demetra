import type { BBox } from "@demetra/core";

/**
 * Place search with Nominatim, the search service of OpenStreetMap.
 *
 * The usage policy (https://operations.osmfoundation.org/policies/nominatim/) has three rules
 * that this module obeys:
 * - Each application must identify itself. Browser code cannot set the `User-Agent` header,
 *   but the browser sends the `Referer` header, and the policy accepts that.
 * - No more than one request each second.
 * - No search while the user types (autocomplete). The search starts when the user submits.
 */

const ENDPOINT = "https://nominatim.openstreetmap.org/search";

/** Minimum time between two requests, with a small margin. */
const MIN_INTERVAL_MS = 1100;

export const MIN_QUERY_LENGTH = 2;

export interface PlaceResult {
  id: string;
  /** Short name, for example "Larissa". */
  name: string;
  /** The remaining part of the address, for example "Thessaly, Greece". */
  context: string;
  center: [lon: number, lat: number];
  bbox: BBox | null;
}

interface NominatimRow {
  place_id: number;
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
  /** [south, north, west, east] */
  boundingbox?: [string, string, string, string];
}

let nextRequestAt = 0;

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
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

function toPlace(row: NominatimRow): PlaceResult {
  const [first, ...rest] = row.display_name.split(", ");
  const name = row.name || first || row.display_name;
  const box = row.boundingbox?.map(Number);
  const hasBox = box?.length === 4 && box.every(Number.isFinite);
  return {
    id: String(row.place_id),
    name,
    context: (row.name ? row.display_name.split(", ").slice(1) : rest).join(", "),
    center: [Number(row.lon), Number(row.lat)],
    bbox: hasBox ? [box[2] as number, box[0] as number, box[3] as number, box[1] as number] : null,
  };
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceResult[]> {
  // Reserve a time slot, so that two searches cannot start in the same second.
  const now = Date.now();
  const startAt = Math.max(now, nextRequestAt);
  nextRequestAt = startAt + MIN_INTERVAL_MS;
  if (startAt > now) await sleep(startAt - now, signal);

  const url = new URL(ENDPOINT);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "5");
  url.searchParams.set("accept-language", "en");

  const response = await fetch(url, {
    signal,
    headers: { Accept: "application/json" },
    // Send the address of this application, which identifies it to Nominatim.
    referrerPolicy: "strict-origin-when-cross-origin",
  });
  if (!response.ok) throw new Error(`Nominatim returned status ${response.status}`);

  const rows = (await response.json()) as NominatimRow[];
  return rows.map(toPlace);
}
