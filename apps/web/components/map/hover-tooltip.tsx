"use client";

import { useT } from "@/i18n";
import { colorOf } from "@/lib/color-scale";
import { formatMetric } from "@/lib/format";
import { useAppStore } from "@/store/app-store";
import { useHoverStore } from "@/store/hover-store";

/** Above the pointer, this number of pixels. */
const OFFSET = 14;

/** The value of the active metric for the block under the pointer. */
export function HoverTooltip() {
  const t = useT();
  const hovered = useHoverStore((state) => state.hovered);
  const metric = useAppStore((state) => state.metric);
  if (!hovered) return null;

  const value = hovered.values?.[metric];
  // Near the top edge there is no space above the pointer.
  const below = hovered.y < 76;

  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-20 w-max max-w-64 rounded-md border bg-popover px-2.5 py-1.5 text-popover-foreground shadow-md"
      style={{
        // Keep the tooltip inside the map near the left and right edges.
        left: `clamp(6.5rem, ${hovered.x}px, calc(100% - 6.5rem))`,
        top: hovered.y,
        transform: below
          ? `translate(-50%, ${OFFSET + 8}px)`
          : `translate(-50%, calc(-100% - ${OFFSET}px))`,
      }}
    >
      {value !== undefined ? (
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="size-2.5 shrink-0 rounded-[3px] ring-1 ring-foreground/15"
            style={{ backgroundColor: colorOf(metric, value) }}
          />
          <span className="text-sm font-semibold tabular-nums">{formatMetric(metric, value)}</span>
          <span className="text-xs text-muted-foreground">{t(`metric.${metric}.short`)}</span>
        </div>
      ) : (
        <div className="text-sm font-medium">{t("customField.name")}</div>
      )}
      <div className="mt-0.5 font-mono text-[0.7rem] text-muted-foreground">{hovered.id}</div>
    </div>
  );
}
