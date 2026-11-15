"use client";

import { NUMBER_LAYERS } from "@demetra/core";
import type { NumberLayerId } from "@demetra/core";
import { useMemo } from "react";

import { NO_DATA_COLOR, UNKNOWN_CROP_COLOR } from "@/config/palettes";
import { useBlockFilters, useBlocks, useCropIndex, useReferenceData } from "@/data/queries";
import { useT } from "@/i18n";
import { rampGradient } from "@/lib/color-scale";
import { formatNumber, formatShare, formatUsd } from "@/lib/format";
import { useAppStore } from "@/store/app-store";

/** The number of crop classes that the crop legend shows. */
const LARGEST_CROPS = 8;

function Swatch({ color }: { color: string }) {
  return (
    <span
      aria-hidden="true"
      className="size-3.5 shrink-0 rounded-[3px] ring-1 ring-foreground/10"
      style={{ backgroundColor: color }}
    />
  );
}

/** The main crops of the blocks in the view, the crop class with the most blocks first. */
function CropLegend() {
  const t = useT();
  const blocks = useBlocks().data;
  const cropIndex = useCropIndex();

  // One answer can have more than 100,000 blocks. Count them again only when the blocks change.
  const counts = useMemo(() => {
    const byCrop = new Map<number, number>();
    for (const feature of blocks?.features ?? []) {
      const code = feature.properties.crop;
      byCrop.set(code, (byCrop.get(code) ?? 0) + 1);
    }
    return [...byCrop].sort((a, b) => b[1] - a[1]);
  }, [blocks]);

  const total = blocks?.features.length ?? 0;
  if (total === 0) return null;

  const largest = counts.slice(0, LARGEST_CROPS);
  const more = counts.length - largest.length;

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[0.7rem] text-muted-foreground">{t("legend.shareOfBlocks")}</p>
      <ul className="flex flex-col gap-1.5">
        {largest.map(([code, count]) => {
          const crop = cropIndex.get(code);
          const name = crop?.name ?? t("common.unknownCrop");
          return (
            <li key={code} className="flex items-center gap-2 text-xs">
              <Swatch color={crop?.color ?? UNKNOWN_CROP_COLOR} />
              <span title={name} className="min-w-0 flex-1 truncate">
                {name}
              </span>
              <span className="text-muted-foreground tabular-nums">
                {formatShare(count / total)}
              </span>
            </li>
          );
        })}
      </ul>
      {more > 0 && (
        <p className="text-[0.7rem] text-muted-foreground">
          {more === 1
            ? t("legend.oneMoreCrop")
            : t("legend.moreCrops", { count: formatNumber(more) })}
        </p>
      )}
    </div>
  );
}

function formatLayerValue(layer: NumberLayerId, value: number): string {
  return NUMBER_LAYERS[layer].unit === "usdPerAcre" ? formatUsd(value) : formatNumber(value);
}

function RampLegend({ layer }: { layer: NumberLayerId }) {
  const t = useT();
  const { domain, max: limit, unit } = NUMBER_LAYERS[layer];
  const [min, max] = domain;
  // When the colors stop before the highest possible value, the end label says so.
  const maxLabel = `${limit === null || max < limit ? "≥ " : ""}${formatLayerValue(layer, max)}`;
  const unitText =
    unit === "usdPerAcre"
      ? t("common.perAcre", { value: t("legend.usd") })
      : t("common.storieIndex");

  return (
    <div className="flex flex-col gap-1">
      <p className="text-[0.7rem] text-muted-foreground">{unitText}</p>
      <div
        aria-hidden="true"
        className="h-2.5 rounded-[3px] ring-1 ring-foreground/10"
        style={{ background: rampGradient(layer) }}
      />
      <div className="flex justify-between text-[0.7rem] text-muted-foreground tabular-nums">
        <span>{formatLayerValue(layer, min)}</span>
        <span>{maxLabel}</span>
      </div>
      <div className="mt-1.5 flex items-center gap-2 text-xs">
        <Swatch color={NO_DATA_COLOR} />
        <span className="text-muted-foreground">
          {layer === "revenue" ? t("legend.noRevenue") : t("common.noData")}
        </span>
      </div>
    </div>
  );
}

/** The legend of the active layer, with the filters that the values depend on. */
export function Legend() {
  const t = useT();
  const layer = useAppStore((state) => state.layer);
  const cropCode = useAppStore((state) => state.cropCode);
  const countyFips = useAppStore((state) => state.countyFips);
  const year = useBlockFilters()?.year;
  const cropIndex = useCropIndex();
  const counties = useReferenceData().data?.counties;

  const cropName =
    cropCode === null
      ? t("common.allCrops")
      : (cropIndex.get(cropCode)?.name ?? t("common.unknownCrop"));
  const countyName =
    countyFips === null
      ? t("common.allCounties")
      : (counties?.find((county) => county.fips === countyFips)?.name ?? countyFips);

  return (
    <section
      aria-label={t("legend.title")}
      className="flex w-60 flex-col gap-2.5 rounded-lg border bg-card/95 p-3 shadow-sm backdrop-blur-sm"
    >
      <header>
        <h2 className="text-[0.8rem] leading-tight font-semibold">{t(`layer.${layer}.name`)}</h2>
        <p className="mt-0.5 text-[0.7rem] text-muted-foreground">
          {year !== undefined && `${year} · `}
          {cropName} · {countyName}
        </p>
      </header>
      {layer === "crop" ? <CropLegend /> : <RampLegend layer={layer} />}
    </section>
  );
}
