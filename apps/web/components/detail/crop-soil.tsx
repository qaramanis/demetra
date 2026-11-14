"use client";

import type { BlockCrop } from "@demetra/core";

import { useT } from "@/i18n";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

import { CropTag } from "./crop-info";
import { StorieBar } from "./storie-bar";

function SoilValue({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-0.5", wide && "col-span-2")}>
      <dt className="text-[0.7rem] text-muted-foreground">{label}</dt>
      <dd className="text-xs font-medium tabular-nums">{value}</dd>
    </div>
  );
}

/**
 * The soil below the cells of the selected crop row: the Storie index on the colors of the
 * soil layer, then the other soil values. A number is the mean of the cells.
 */
export function CropSoil({ crop, showCounty }: { crop: BlockCrop; showCounty: boolean }) {
  const t = useT();
  const soil = crop.soil;

  // "—" = the soil survey has no value.
  const text = (value: string | null) => value ?? "—";
  const number = (value: number | null, decimals = 0) =>
    value === null ? "—" : formatNumber(value, decimals);
  const percent = (value: number | null, decimals = 0) =>
    value === null ? "—" : t("soil.percent", { value: formatNumber(value, decimals) });
  const cm = (value: number | null, decimals = 0) =>
    value === null ? "—" : t("soil.cm", { value: formatNumber(value, decimals) });

  const { sandPct, siltPct, clayPct } = soil;
  const particles =
    sandPct === null || siltPct === null || clayPct === null
      ? "—"
      : t("soil.percent", {
          value: [sandPct, siltPct, clayPct].map((value) => formatNumber(value)).join(" / "),
        });

  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-center gap-3">
        <h3 className="shrink-0 text-sm font-semibold">{t("soil.title")}</h3>
        <CropTag crop={crop} showCounty={showCounty} className="ml-auto" />
      </header>

      <div className="flex flex-col gap-2 rounded-lg border p-3">
        <span className="text-xs text-muted-foreground">{t("common.storieIndex")}</span>
        <span className="flex items-baseline gap-2">
          <span className="text-2xl leading-none font-semibold tracking-tight tabular-nums">
            {number(soil.storieIndex)}
          </span>
          {soil.storieGrade && (
            <span className="truncate text-xs text-muted-foreground">{soil.storieGrade}</span>
          )}
        </span>
        <StorieBar value={soil.storieIndex} />
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        <SoilValue label={t("soil.texture")} value={text(soil.surfaceTexture)} />
        <SoilValue label={t("soil.sandSiltClay")} value={particles} />
        <SoilValue label={t("soil.organicMatter")} value={percent(soil.organicMatterPct, 1)} />
        <SoilValue label={t("soil.ph")} value={number(soil.ph, 1)} />
        <SoilValue
          label={t("soil.ec")}
          value={
            soil.ecDsM === null ? "—" : t("soil.dsPerM", { value: formatNumber(soil.ecDsM, 1) })
          }
        />
        <SoilValue label={t("soil.sar")} value={number(soil.sar, 1)} />
        <SoilValue label={t("soil.drainage")} value={text(soil.drainageClass)} />
        <SoilValue label={t("soil.hydrologicGroup")} value={text(soil.hydrologicGroup)} />
        <SoilValue label={t("soil.aws")} value={cm(soil.aws0To100Cm, 1)} />
        <SoilValue label={t("soil.rootZone")} value={cm(soil.rootZoneDepthCm)} />
        <SoilValue label={t("soil.bedrock")} value={cm(soil.depthToBedrockCm)} />
        <SoilValue label={t("soil.waterTable")} value={cm(soil.depthToWaterTableCm)} />
        <SoilValue label={t("soil.slope")} value={percent(soil.slopePct, 1)} />
        <SoilValue label={t("soil.nccpi")} value={number(soil.nccpiAll, 2)} />
        <SoilValue label={t("soil.capabilityIrrigated")} value={number(soil.irrCapabilityClass)} />
        <SoilValue
          label={t("soil.capabilityNotIrrigated")}
          value={number(soil.nonirrCapabilityClass)}
        />
        <SoilValue label={t("soil.farmland")} value={text(soil.farmlandClass)} wide />
        <SoilValue label={t("soil.component")} value={text(soil.component)} />
        <SoilValue label={t("soil.order")} value={text(soil.order)} />
      </dl>

      <p className="text-xs leading-relaxed text-muted-foreground">{t("soil.note")}</p>
    </section>
  );
}
