"use client";

import { numberScaleOf } from "@demetra/core";
import type { MapLayerId, NumberScaleId } from "@demetra/core";

import { useCropIndex } from "@/data/queries";
import { rampGradient } from "@/lib/color-scale";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

/** Large crop classes of California with different colors: almonds, alfalfa, grapes, rice. */
const SWATCH_CROP_CODES = [75, 36, 69, 3] as const;

const SWATCH_CLASS = "h-2.5 w-7 shrink-0 overflow-hidden rounded-[3px]";

/** A small picture of the colors of a scale: its gradient. */
export function ScaleSwatch({ scale, className }: { scale: NumberScaleId; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(SWATCH_CLASS, className)}
      style={{ background: rampGradient(scale) }}
    />
  );
}

/**
 * A small picture of the colors of a layer: a gradient, or a strip of crop colors. The
 * climate layer shows the gradient of the selected climate metric.
 */
export function LayerSwatch({ layer, className }: { layer: MapLayerId; className?: string }) {
  const cropIndex = useCropIndex();
  const scale = useAppStore((state) => numberScaleOf(layer, state.climateMetric));
  const base = cn(SWATCH_CLASS, className);

  if (scale !== null) return <ScaleSwatch scale={scale} className={className} />;

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
