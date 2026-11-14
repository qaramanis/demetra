import type { BBox } from "@demetra/core";

import type { MessageKey } from "@/i18n";

/** The id of the map in `MapProvider`. */
export const MAP_ID = "fieldMap";

/** First view of the map: Larissa. */
export const INITIAL_VIEW = { longitude: 22.42, latitude: 39.64, zoom: 9 } as const;

export interface RegionPreset {
  id: string;
  labelKey: MessageKey;
  bbox: BBox;
}

/** The demo areas. */
export const REGION_PRESETS: readonly RegionPreset[] = [
  { id: "thessaly", labelKey: "regions.thessaly", bbox: [21.6, 39.15, 22.95, 39.9] },
  {
    id: "centralMacedonia",
    labelKey: "regions.centralMacedonia",
    bbox: [22.1, 40.25, 23.75, 41.2],
  },
];
