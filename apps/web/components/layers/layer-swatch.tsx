"use client";

import type { MapLayerId } from "@demetra/core";

import { useCropIndex } from "@/data/queries";
import { rampGradient } from "@/lib/color-scale";
import { cn } from "@/lib/utils";

/** Large crop classes of California with different colors: almonds, alfalfa, grapes, rice. */
const SWATCH_CROP_CODES = [75, 36, 69, 3] as const;

/** A small picture of the colors of a layer: a gradient, or a strip of crop colors. */
export function LayerSwatch({ layer, className }: { layer: MapLayerId; className?: string }) {
  const cropIndex = useCropIndex();
  const base = cn("h-2.5 w-7 shrink-0 overflow-hidden rounded-[3px]", className);

  if (layer !== "crop") {
    return <span aria-hidden="true" className={base} style={{ background: rampGradient(layer) }} />;
  }

  const colors = SWATCH_CROP_CODES.flatMap((code) => cropIndex.get(code)?.color ?? []);

  // While the crop classes load, the swatch is neutral.
  if (colors.length === 0) {
    return <span aria-hidden="true" className={cn(base, "bg-muted-foreground/30")} />;
  }

  return (
    <span aria-hidden="true" className={cn(base, "flex")}>
      {colors.map((color, index) => (
        <span key={index} className="flex-1" style={{ backgroundColor: color }} />
      ))}
    </span>
  );
}
