"use client";

import { DEFAULT_GRID } from "@demetra/core";
import { LoaderCircle, MousePointerClick, PenTool, TriangleAlert, ZoomIn } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useBlocks } from "@/data/queries";
import { useT } from "@/i18n";
import { useAppStore } from "@/store/app-store";

function Pill({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      className="pointer-events-auto flex min-h-8 max-w-full items-center gap-2 rounded-2xl border bg-card py-1.5 pr-3.5 pl-3 text-xs font-medium shadow-sm [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:text-muted-foreground"
    >
      {children}
    </div>
  );
}

/** A short message above the map when the blocks are not visible or still load. */
export function MapStatus() {
  const t = useT();
  const blocks = useBlocks();
  const setGrid = useAppStore((state) => state.setGrid);
  const hasSelected = useAppStore((state) => state.hasSelected);
  const drawing = useAppStore((state) => state.drawing);

  if (drawing) {
    return (
      <Pill>
        <PenTool />
        {t("draw.hint")}
      </Pill>
    );
  }

  if (blocks.status === "tooMany") {
    return (
      <Pill>
        <ZoomIn />
        {t("map.zoomIn")}
      </Pill>
    );
  }

  if (blocks.status === "outside") {
    return (
      <Pill>
        <TriangleAlert />
        {t("map.outsideGrid")}
        <Button variant="outline" size="xs" onClick={() => setGrid(DEFAULT_GRID)}>
          {t("map.useGlobalGrid")}
        </Button>
      </Pill>
    );
  }

  if (blocks.isError) {
    return (
      <Pill>
        <TriangleAlert />
        {t("map.blocksError")}
      </Pill>
    );
  }

  if (blocks.isFetching) {
    return (
      <Pill>
        <LoaderCircle className="animate-spin" />
        {t("map.blocksLoading")}
      </Pill>
    );
  }

  // Tell a new user what to do, until the first selection.
  if (blocks.data && !hasSelected) {
    return (
      <Pill>
        <MousePointerClick />
        {t("map.selectHint")}
      </Pill>
    );
  }

  return null;
}
