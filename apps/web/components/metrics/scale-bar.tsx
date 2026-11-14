import { METRICS } from "@demetra/core";
import type { MetricId } from "@demetra/core";

import { METRIC_SCALES } from "@/config/palettes";
import { rampGradient, rampPosition } from "@/lib/color-scale";

/** The colours of a metric as a thin bar, with a marker at the position of one value. */
export function ScaleBar({ metric, value }: { metric: MetricId; value: number }) {
  const scale = METRIC_SCALES[metric];
  const [min, max] = METRICS[metric].range;

  let position: number;
  let track: React.ReactNode;

  if (scale.type === "classes") {
    position = Math.min(1, Math.max(0, (value - min) / (max - min)));
    track = scale.classes.map((item, index) => {
      // Each class is as wide as its part of the range.
      const end = scale.classes[index + 1]?.min ?? max;
      return (
        <span
          key={item.id}
          style={{ backgroundColor: item.color, flexGrow: end - item.min, flexBasis: 0 }}
        />
      );
    });
  } else {
    position = rampPosition(scale, value);
    track = <span className="flex-1" style={{ background: rampGradient(scale) }} />;
  }

  return (
    <span aria-hidden="true" className="relative block h-1.5 w-full">
      <span className="absolute inset-0 flex overflow-hidden rounded-full ring-1 ring-foreground/10">
        {track}
      </span>
      {/* A dark dot with a light ring is visible on each colour of the palettes. */}
      <span
        className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-foreground shadow-sm"
        style={{ left: `${position * 100}%` }}
      />
    </span>
  );
}
