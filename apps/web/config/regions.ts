import type { BBox } from "@demetra/core";

import type { MessageKey } from "@/i18n";

/** The id of the map in `MapProvider`. */
export const MAP_ID = "fieldMap";

/** The area that has data: California. It is also the first view of the map. */
export const DATA_BOUNDS: BBox = [-124.4, 32.5, -114.2, 42.05];

export interface RegionPreset {
  id: string;
  labelKey: MessageKey;
  bbox: BBox;
}

/** The areas that the user can go to with one click. */
export const REGION_PRESETS: readonly RegionPreset[] = [
  { id: "california", labelKey: "regions.california", bbox: DATA_BOUNDS },
  { id: "centralValley", labelKey: "regions.centralValley", bbox: [-122.6, 34.95, -118.6, 40.7] },
  { id: "salinasValley", labelKey: "regions.salinasValley", bbox: [-121.85, 35.95, -120.8, 36.9] },
  {
    id: "imperialValley",
    labelKey: "regions.imperialValley",
    bbox: [-115.95, 32.62, -115.05, 33.35],
  },
];
