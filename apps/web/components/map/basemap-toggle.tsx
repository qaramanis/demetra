"use client";

import { Map as MapIcon, Satellite } from "lucide-react";

import { SegmentedControl } from "@/components/ui/segmented-control";
import { useT } from "@/i18n";
import { useAppStore } from "@/store/app-store";

export function BasemapToggle() {
  const t = useT();
  const basemap = useAppStore((state) => state.basemap);
  const setBasemap = useAppStore((state) => state.setBasemap);

  return (
    <SegmentedControl
      ariaLabel={t("basemap.label")}
      value={basemap}
      onChange={setBasemap}
      className="border bg-card shadow-sm"
      options={[
        {
          value: "vector",
          label: (
            <>
              <MapIcon />
              {t("basemap.vector")}
            </>
          ),
        },
        {
          value: "satellite",
          label: (
            <>
              <Satellite />
              {t("basemap.satellite")}
            </>
          ),
        },
      ]}
    />
  );
}
