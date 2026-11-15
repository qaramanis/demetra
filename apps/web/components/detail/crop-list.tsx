"use client";

import type { BlockCrop } from "@demetra/core";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useT, type MessageKey } from "@/i18n";
import { formatAcres, formatShare, formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

import { CropSwatch, LimitIcon, cropKey, revenueLimits } from "./crop-info";

/** The share of each crop row in the cropland of the block, as one stacked bar. */
function CropBar({ crops }: { crops: BlockCrop[] }) {
  return (
    <div
      aria-hidden="true"
      className="flex h-2 gap-px overflow-hidden rounded-full ring-1 ring-foreground/10"
    >
      {crops.map((crop) => (
        <span
          key={cropKey(crop)}
          style={{ backgroundColor: crop.color, flexGrow: crop.shareOfCropland, flexBasis: 0 }}
        />
      ))}
    </div>
  );
}

/** An icon that shows the limits of the revenue of a row in a tooltip. */
function LimitHint({ limits }: { limits: MessageKey[] }) {
  const t = useT();
  return (
    <Tooltip>
      {/* A span and not a button, because the icon is in the button of the row. */}
      <TooltipTrigger render={<span className="flex shrink-0 text-muted-foreground" />}>
        <LimitIcon limits={limits} />
      </TooltipTrigger>
      <TooltipContent side="top" className="flex-col items-start gap-1">
        {limits.map((limit) => (
          <p key={limit}>{t(limit)}</p>
        ))}
      </TooltipContent>
    </Tooltip>
  );
}

function CropRow({
  crop,
  selected,
  showCounty,
  onSelect,
}: {
  crop: BlockCrop;
  selected: boolean;
  showCounty: boolean;
  onSelect: () => void;
}) {
  const t = useT();
  // A crop without county revenue data shows the state average, in a lighter color.
  const perAcre = crop.revenuePerAcreCountyUsd ?? crop.revenuePerAcreStateUsd;
  const stateAverage = crop.revenuePerAcreCountyUsd === null && perAcre !== null;
  const limits: MessageKey[] = stateAverage
    ? [...revenueLimits(crop), "detail.limit.stateAverage"]
    : revenueLimits(crop);

  return (
    <li className="col-span-5 grid grid-cols-subgrid">
      <button
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        className={cn(
          "col-span-5 grid grid-cols-subgrid items-center rounded-md px-2 py-1.5 text-left text-xs",
          "transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          // The selected row has a light fill and a thin line of the accent colour.
          selected ? "bg-primary/12 ring-1 ring-primary/45" : "hover:bg-accent/60",
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <CropSwatch color={crop.color} />
          <span className="min-w-0">
            <span className="block truncate font-medium" title={crop.cropName}>
              {crop.cropName}
            </span>
            {showCounty && (
              <span className="block truncate text-[0.7rem] text-muted-foreground">
                {crop.countyName}
              </span>
            )}
          </span>
          {limits.length > 0 && (
            <>
              <LimitHint limits={limits} />
              <span className="sr-only">{limits.map((limit) => t(limit)).join(" ")}</span>
            </>
          )}
        </span>
        <span className="text-right tabular-nums">{formatAcres(crop.acres)}</span>
        <span className="text-right text-muted-foreground tabular-nums">
          {formatShare(crop.shareOfCropland)}
        </span>
        <span className={cn("text-right tabular-nums", stateAverage && "text-muted-foreground")}>
          {perAcre === null ? "—" : formatUsd(perAcre)}
        </span>
        <span className="text-right font-medium tabular-nums">
          {crop.estRevenueUsd === null ? "—" : formatUsd(crop.estRevenueUsd)}
        </span>
      </button>
    </li>
  );
}

/**
 * The crops of a block: a stacked bar with the share of each crop, then one row for each
 * county and crop. A row selects the crop for the county data and the soil values.
 */
export function CropList({
  crops,
  selectedKey,
  showCounty,
  onSelect,
}: {
  crops: BlockCrop[];
  selectedKey: string;
  showCounty: boolean;
  onSelect: (key: string) => void;
}) {
  const t = useT();
  // Fallow land and crops without county revenue data have no estimated revenue.
  const withRevenue = crops.filter((crop) => crop.estRevenueUsd !== null);
  const blockRevenue = withRevenue.reduce((sum, crop) => sum + (crop.estRevenueUsd ?? 0), 0);
  const revenueShare = withRevenue.reduce((sum, crop) => sum + crop.shareOfCropland, 0);

  return (
    <div className="flex flex-col gap-3">
      <CropBar crops={crops} />

      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto_auto] gap-x-2.5">
        {/* The column names. */}
        <div className="col-span-5 grid grid-cols-subgrid px-2 pb-1 text-[0.7rem] text-muted-foreground">
          <span>{t("detail.column.crop")}</span>
          <span className="text-right">{t("detail.column.acres")}</span>
          <span className="text-right" title={t("detail.column.shareTitle")}>
            {t("detail.column.share")}
          </span>
          <span className="text-right" title={t("detail.column.perAcreTitle")}>
            {t("detail.column.perAcre")}
          </span>
          <span className="text-right" title={t("detail.column.revenueTitle")}>
            {t("detail.column.revenue")}
          </span>
        </div>

        <ul className="col-span-5 grid grid-cols-subgrid gap-y-0.5">
          {crops.map((crop) => {
            const key = cropKey(crop);
            return (
              <CropRow
                key={key}
                crop={crop}
                selected={key === selectedKey}
                showCounty={showCounty}
                onSelect={() => onSelect(key)}
              />
            );
          })}
        </ul>

        <dl className="col-span-5 mt-1 grid grid-cols-subgrid border-t px-2 pt-2 text-xs">
          <dt className="col-span-4 text-muted-foreground">{t("detail.blockRevenue")}</dt>
          <dd className="text-right font-semibold tabular-nums">
            {withRevenue.length === 0 ? "—" : formatUsd(blockRevenue)}
          </dd>
        </dl>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        {t("detail.revenueCoverage", { share: formatShare(revenueShare) })}{" "}
        {t("detail.countyAverages")}
      </p>
    </div>
  );
}
