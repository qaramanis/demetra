import { FALLOW_CROP_CODE, UNRELIABLE_REVENUE_CROP_CODES } from "@demetra/core";
import type { BlockCrop } from "@demetra/core";
import { Info, TriangleAlert } from "lucide-react";

import type { MessageKey } from "@/i18n";
import { cn } from "@/lib/utils";

/** Area of a full block of 33 x 33 cells of 30 m, in acres. */
export const BLOCK_ACRES = (33 * 30) ** 2 / 4046.8564224;

/** The key of a crop row. A block on a county border has one row for each county and crop. */
export function cropKey(crop: BlockCrop): string {
  return `${crop.countyFips}:${crop.cropCode}`;
}

/** The limits of the revenue data of a crop row, as keys of the interface text. */
export function revenueLimits(crop: BlockCrop): MessageKey[] {
  if (crop.cropCode === FALLOW_CROP_CODE) return ["detail.limit.fallow"];
  const limits: MessageKey[] = [];
  if (crop.econMatch === "none") limits.push("detail.limit.noCountyRevenue");
  if (UNRELIABLE_REVENUE_CROP_CODES.includes(crop.cropCode)) limits.push("detail.limit.grain");
  return limits;
}

/** The icon of a list of limits: a warning when a value is not reliable, if not an info icon. */
export function LimitIcon({ limits, className }: { limits: MessageKey[]; className?: string }) {
  const Icon = limits.includes("detail.limit.grain") ? TriangleAlert : Info;
  return <Icon aria-hidden="true" className={cn("size-3 shrink-0", className)} />;
}

/** A small square in the color of a crop class, or in a different color of the map. */
export function CropSwatch({ color, className }: { color: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("size-2.5 shrink-0 rounded-[3px] ring-1 ring-foreground/10", className)}
      style={{ backgroundColor: color }}
    />
  );
}

/** The color and the name of a crop row. The county shows only for a block in two counties. */
export function CropTag({
  crop,
  showCounty,
  className,
}: {
  crop: BlockCrop;
  showCounty: boolean;
  className?: string;
}) {
  const name = showCounty ? `${crop.cropName} · ${crop.countyName}` : crop.cropName;
  return (
    <span
      className={cn("flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground", className)}
    >
      <CropSwatch color={crop.color} />
      <span className="truncate" title={name}>
        {name}
      </span>
    </span>
  );
}
