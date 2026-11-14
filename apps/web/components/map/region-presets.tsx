"use client";

import { useMap } from "react-map-gl/maplibre";

import { Button } from "@/components/ui/button";
import { REGION_PRESETS, type RegionPreset } from "@/config/regions";
import { useT } from "@/i18n";

/** Buttons that move the map to a demo area. */
export function RegionPresets() {
  const t = useT();
  const { fieldMap } = useMap();

  const goTo = (region: RegionPreset) => {
    const [west, south, east, north] = region.bbox;
    fieldMap?.fitBounds(
      [
        [west, south],
        [east, north],
      ],
      { padding: 24, duration: 1200 },
    );
  };

  return (
    <div className="hidden items-center gap-1.5 sm:flex">
      <span className="hidden text-xs text-muted-foreground lg:inline">{t("regions.goTo")}</span>
      {REGION_PRESETS.map((region) => (
        <Button key={region.id} variant="outline" size="sm" onClick={() => goTo(region)}>
          {t(region.labelKey)}
        </Button>
      ))}
    </div>
  );
}
