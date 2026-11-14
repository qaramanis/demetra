import type { StyleSpecification } from "react-map-gl/maplibre";

export const BASEMAP_IDS = ["vector", "satellite"] as const;

export type BasemapId = (typeof BASEMAP_IDS)[number];

/** Esri World Imagery raster tiles. No API key is necessary. */
const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    "esri-world-imagery": {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: "Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    },
  },
  layers: [{ id: "esri-world-imagery", type: "raster", source: "esri-world-imagery" }],
};

/** Map styles that need no API key. */
export const BASEMAP_STYLES: Record<BasemapId, string | StyleSpecification> = {
  // OpenFreeMap vector tiles.
  vector: "https://tiles.openfreemap.org/styles/liberty",
  satellite: SATELLITE_STYLE,
};
