"use client";

import { FHS_CLASS_MIN, METRICS } from "@demetra/core";
import type { FhsClass, MetricId } from "@demetra/core";

import { METRIC_SCALES, type ClassScale, type RampScale } from "@/config/palettes";
import { useT } from "@/i18n";
import { rampGradient } from "@/lib/color-scale";
import { formatMetric, formatMetricNumber } from "@/lib/format";
import { useAppStore } from "@/store/app-store";

/** The score range of each FHS class, from the class limits in the core config. */
export const FHS_CLASS_RANGE: Record<FhsClass, string> = {
  A: `≥ ${FHS_CLASS_MIN.A}`,
  B: `${FHS_CLASS_MIN.B}–${FHS_CLASS_MIN.A - 1}`,
  C: `≤ ${FHS_CLASS_MIN.B - 1}`,
};

function ClassLegend({ scale }: { scale: ClassScale }) {
  const t = useT();
  // The best class first.
  const classes = scale.classes.toReversed();
  return (
    <ul className="flex flex-col gap-1.5">
      {classes.map((item) => (
        <li key={item.id} className="flex items-center gap-2 text-xs">
          <span
            aria-hidden="true"
            className="size-3.5 shrink-0 rounded-[3px]"
            style={{ backgroundColor: item.color }}
          />
          <span className="w-3 font-semibold">{item.id}</span>
          <span className="flex-1 text-muted-foreground">{t(`fhsClass.${item.id}`)}</span>
          <span className="text-muted-foreground tabular-nums">{FHS_CLASS_RANGE[item.id]}</span>
        </li>
      ))}
    </ul>
  );
}

function RampLegend({ metric, scale }: { metric: MetricId; scale: RampScale }) {
  const t = useT();
  const [min, max] = scale.domain;
  const [rangeMin, rangeMax] = METRICS[metric].range;
  // When the colours stop before the limits of the metric, the end labels say so.
  const minLabel = `${min > rangeMin ? "≤ " : ""}${formatMetric(metric, min)}`;
  const maxLabel = `${max < rangeMax ? "≥ " : ""}${formatMetric(metric, max)}`;

  return (
    <div className="flex flex-col gap-1">
      {scale.diverging && (
        <div className="flex justify-between text-[0.7rem] font-medium">
          <span>{t("legend.loss")}</span>
          <span>{t("legend.profit")}</span>
        </div>
      )}
      <div
        aria-hidden="true"
        className="h-2.5 rounded-[3px] ring-1 ring-foreground/10"
        style={{ background: rampGradient(scale) }}
      />
      <div className="relative flex justify-between text-[0.7rem] text-muted-foreground tabular-nums">
        <span>{minLabel}</span>
        {scale.diverging && (
          <span className="absolute left-1/2 -translate-x-1/2">
            {formatMetricNumber(metric, (min + max) / 2)}
          </span>
        )}
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}

/** The legend of the active metric, with the filters that the values depend on. */
export function Legend() {
  const t = useT();
  const metric = useAppStore((state) => state.metric);
  const crop = useAppStore((state) => state.crop);
  const irrigation = useAppStore((state) => state.irrigation);
  const period = useAppStore((state) => state.period);
  const scale = METRIC_SCALES[metric];

  const months =
    period.startMonth === period.endMonth
      ? t(`month.${period.startMonth}` as "month.1")
      : `${t(`month.${period.startMonth}` as "month.1")}–${t(`month.${period.endMonth}` as "month.1")}`;

  return (
    <section
      aria-label={t("legend.title")}
      className="flex w-60 flex-col gap-2.5 rounded-lg border bg-card/95 p-3 shadow-sm backdrop-blur-sm"
    >
      <header>
        <h2 className="text-[0.8rem] leading-tight font-semibold">{t(`metric.${metric}.name`)}</h2>
        <p className="mt-0.5 text-[0.7rem] text-muted-foreground">
          {t(`crop.${crop}`)} · {t(`irrigation.${irrigation}`)} · {months} {period.year}
        </p>
      </header>
      {scale.type === "classes" ? (
        <ClassLegend scale={scale} />
      ) : (
        <RampLegend metric={metric} scale={scale} />
      )}
    </section>
  );
}
