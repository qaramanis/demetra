"use client";

import { SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useT } from "@/i18n";
import { useAppStore } from "@/store/app-store";

/** Opens and closes the filters on a small screen. A wide screen always shows the filters. */
export function FiltersToggle() {
  const t = useT();
  const open = useAppStore((state) => state.filtersOpen);
  const setOpen = useAppStore((state) => state.setFiltersOpen);

  return (
    <Button
      variant={open ? "default" : "outline"}
      size="icon"
      aria-label={t("filters.title")}
      aria-pressed={open}
      onClick={() => setOpen(!open)}
      className="md:hidden"
    >
      <SlidersHorizontal />
    </Button>
  );
}
