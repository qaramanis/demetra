"use client";

import { CLIMATE_METRIC_IDS } from "@demetra/core";
import type { ClimateValues } from "@demetra/core";

import { useT } from "@/i18n";
import { colorOfValue } from "@/lib/color-scale";
import { formatScaleValue } from "@/lib/scale-value";

import { CropSwatch } from "./crop-info";

/**
 * The climate of a block in one year: the values of its climate cell. The values are for the
 * block and not for one crop. They are estimates, and the note tells this limit of the data.
 * Each value has a swatch in the color that the block has on the map for that metric.
 */
export function BlockClimate({ climate, year }: { climate: ClimateValues; year: number }) {
  const t = useT();

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">{t("climate.title", { year })}</h3>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        {CLIMATE_METRIC_IDS.map((metric) => (
          <div key={metric} className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-[0.7rem] text-muted-foreground">{t(`climate.${metric}.detail`)}</dt>
            <dd className="flex items-center gap-1.5 text-xs font-medium tabular-nums">
              <CropSwatch color={colorOfValue(metric, climate[metric])} />
              {formatScaleValue(metric, climate[metric], t)}
            </dd>
          </div>
        ))}
      </dl>

      <p className="text-xs leading-relaxed text-muted-foreground">{t("climate.note")}</p>
    </section>
  );
}
