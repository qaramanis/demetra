"use client";

import { numberLayerValue } from "@demetra/core";
import type { BlockProperties, Crop, MapLayerId } from "@demetra/core";

import { UNKNOWN_CROP_COLOR } from "@/config/palettes";
import { useCropIndex } from "@/data/queries";
import { useT, type Translate } from "@/i18n";
import { colorOfValue } from "@/lib/color-scale";
import { formatNumber, formatShare, formatUsd } from "@/lib/format";
import { useAppStore } from "@/store/app-store";
import { useHoverStore } from "@/store/hover-store";

/** Above the pointer, this number of pixels. */
const OFFSET = 14;

/** The tooltip goes below the pointer when the pointer is nearer than this to the top edge. */
const MIN_SPACE_ABOVE = 120;

interface TooltipContent {
  /** The color of the block in the active layer. */
  color: string;
  value: string;
  /** A short text after the value. */
  label?: string;
  /** The lines below the value. */
  lines: string[];
}

function contentOf(
  layer: MapLayerId,
  properties: BlockProperties,
  crop: Crop | undefined,
  t: Translate,
): TooltipContent {
  const cropName = crop?.name ?? t("common.unknownCrop");

  if (layer === "crop") {
    const lines = [t("tooltip.share", { value: formatShare(properties.share) })];
    // The main crop is not the only crop of a block.
    if (properties.crops > 1) {
      lines.push(t("tooltip.cropClasses", { count: formatNumber(properties.crops) }));
    }
    return { color: crop?.color ?? UNKNOWN_CROP_COLOR, value: cropName, lines };
  }

  const value = numberLayerValue(layer, properties);
  const color = colorOfValue(layer, value);
  const lines = [t("tooltip.mainCrop", { name: cropName })];

  if (layer === "revenue") {
    return value === undefined
      ? { color, value: t("common.noData"), label: t("layer.revenue.name"), lines }
      : { color, value: t("common.perAcre", { value: formatUsd(value) }), lines };
  }
  return {
    color,
    value: value === undefined ? t("common.noData") : formatNumber(value),
    label: t("common.storieIndex"),
    lines,
  };
}

/** The value of the active layer for the block under the pointer. */
export function HoverTooltip() {
  const t = useT();
  const hovered = useHoverStore((state) => state.hovered);
  const layer = useAppStore((state) => state.layer);
  const cropIndex = useCropIndex();
  if (!hovered) return null;

  const { properties } = hovered;
  const content = contentOf(layer, properties, cropIndex.get(properties.crop), t);
  // Near the top edge there is no space above the pointer.
  const below = hovered.y < MIN_SPACE_ABOVE;

  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-20 w-max max-w-64 rounded-md border bg-popover px-2.5 py-1.5 text-popover-foreground shadow-md"
      style={{
        // Keep the tooltip inside the map near the left and right edges: half of the maximum
        // width (`max-w-64`) and a small margin.
        left: `clamp(8.25rem, ${hovered.x}px, calc(100% - 8.25rem))`,
        top: hovered.y,
        transform: below
          ? `translate(-50%, ${OFFSET + 8}px)`
          : `translate(-50%, calc(-100% - ${OFFSET}px))`,
      }}
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="size-2.5 shrink-0 rounded-[3px] ring-1 ring-foreground/15"
          style={{ backgroundColor: content.color }}
        />
        <span className="text-sm font-semibold tabular-nums">{content.value}</span>
        {content.label && <span className="text-xs text-muted-foreground">{content.label}</span>}
      </div>
      {content.lines.map((line) => (
        <div key={line} className="text-xs text-muted-foreground">
          {line}
        </div>
      ))}
      <div className="mt-0.5 font-mono text-[0.7rem] text-muted-foreground">{properties.id}</div>
    </div>
  );
}
