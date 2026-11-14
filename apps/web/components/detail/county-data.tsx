"use client";

import { FALLOW_CROP_CODE } from "@demetra/core";
import type { BlockCrop } from "@demetra/core";

import { useT, type MessageKey } from "@/i18n";
import { formatNumber, formatUsd } from "@/lib/format";

import { CropTag, LimitIcon, revenueLimits } from "./crop-info";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 tabular-nums">{value}</dd>
    </>
  );
}

function usd(value: number | null): string {
  return value === null ? "—" : formatUsd(value);
}

/**
 * The county data of the selected crop row: commodity, yield, price and revenue per acre.
 * Fallow land has no county data, so only its note shows.
 */
export function CountyData({ crop, showCounty }: { crop: BlockCrop; showCounty: boolean }) {
  const t = useT();
  // A double crop class has no yield and no price: the note tells why.
  const limits: MessageKey[] =
    crop.econMatch === "double"
      ? [...revenueLimits(crop), "detail.doubleCrop"]
      : revenueLimits(crop);
  const unit = crop.yieldUnit?.toLowerCase();

  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-center gap-3">
        <h3 className="shrink-0 text-sm font-semibold">{t("detail.countyData")}</h3>
        <CropTag crop={crop} showCounty={showCounty} className="ml-auto" />
      </header>

      {crop.cropCode !== FALLOW_CROP_CODE && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
          <Row label={t("detail.commodity")} value={crop.mainCommodity ?? "—"} />
          <Row
            label={t("detail.yield")}
            value={
              crop.yieldPerAcre === null
                ? "—"
                : [formatNumber(crop.yieldPerAcre, 2), unit].filter(Boolean).join(" ")
            }
          />
          <Row label={t("detail.price")} value={usd(crop.pricePerUnitUsd)} />
          <Row label={t("detail.revenueCounty")} value={usd(crop.revenuePerAcreCountyUsd)} />
          <Row label={t("detail.revenueState")} value={usd(crop.revenuePerAcreStateUsd)} />
        </dl>
      )}

      {limits.length > 0 && (
        <ul className="flex flex-col gap-1 text-xs leading-relaxed text-muted-foreground">
          {limits.map((limit) => (
            <li key={limit} className="flex gap-1.5">
              <LimitIcon limits={[limit]} className="mt-[0.2rem]" />
              {t(limit)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
