import type { MetricId } from "@demetra/core";

import { METRIC_SCALES } from "@/config/palettes";
import { rampGradient } from "@/lib/color-scale";
import { cn } from "@/lib/utils";

/** A small picture of the colours of a metric: a gradient, or one block for each class. */
export function MetricSwatch({ metric, className }: { metric: MetricId; className?: string }) {
  const scale = METRIC_SCALES[metric];
  const base = cn("h-2.5 w-7 shrink-0 overflow-hidden rounded-[3px]", className);

  if (scale.type === "classes") {
    return (
      <span aria-hidden="true" className={cn(base, "flex")}>
        {scale.classes.map((item) => (
          <span key={item.id} className="flex-1" style={{ backgroundColor: item.color }} />
        ))}
      </span>
    );
  }

  return <span aria-hidden="true" className={base} style={{ background: rampGradient(scale) }} />;
}
