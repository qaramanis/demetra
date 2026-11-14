"use client";

import { METRIC_IDS } from "@demetra/core";
import type { Block, BlockMetrics, MetricId } from "@demetra/core";
import { MapPin } from "lucide-react";

import { ScaleBar } from "@/components/metrics/scale-bar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { METRIC_SCALES } from "@/config/palettes";
import { useBlockMetrics } from "@/data/queries";
import { useT } from "@/i18n";
import { formatMetricNumber, metricUnit } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

function FhsClassTag({ metrics }: { metrics: BlockMetrics }) {
  const t = useT();
  const scale = METRIC_SCALES.fhs;
  const color =
    scale.type === "classes"
      ? scale.classes.find((item) => item.id === metrics.fhsClass)?.color
      : undefined;
  return (
    <span className="ml-auto flex items-center gap-1.5 text-xs">
      <span
        aria-hidden="true"
        className="size-2.5 rounded-[3px]"
        style={{ backgroundColor: color }}
      />
      <span className="font-semibold">{metrics.fhsClass}</span>
      <span className="text-muted-foreground">{t(`fhsClass.${metrics.fhsClass}`)}</span>
    </span>
  );
}

function MetricCard({ metric, metrics }: { metric: MetricId; metrics: BlockMetrics }) {
  const t = useT();
  const active = useAppStore((state) => state.metric === metric);
  const setMetric = useAppStore((state) => state.setMetric);
  const value = metrics.values[metric];
  const name = t(`metric.${metric}.name`);

  return (
    <button
      type="button"
      aria-pressed={active}
      title={t("detail.showOnMap", { metric: name })}
      onClick={() => setMetric(metric)}
      className={cn(
        "flex flex-col gap-2 rounded-lg border bg-card p-3 text-left transition-colors outline-none",
        "hover:bg-accent/60 focus-visible:ring-3 focus-visible:ring-ring/50",
        active && "border-foreground/60 ring-1 ring-foreground/60",
      )}
    >
      <span className="flex w-full items-center gap-1.5 text-xs text-muted-foreground">
        <span className="min-w-0 flex-1 truncate">{name}</span>
        {active && <MapPin className="size-3.5 shrink-0 text-foreground" />}
      </span>
      <span className="flex w-full items-baseline gap-1">
        <span className="text-2xl leading-none font-semibold tracking-tight">
          {formatMetricNumber(metric, value)}
        </span>
        <span className="text-xs text-muted-foreground">{metricUnit(metric).trim()}</span>
        {metric === "fhs" && <FhsClassTag metrics={metrics} />}
      </span>
      <ScaleBar metric={metric} value={value} />
    </button>
  );
}

/** One card for each metric of the selected block. A card also selects the metric of the map. */
export function MetricCards({ block }: { block: Block }) {
  const t = useT();
  const query = useBlockMetrics(block);

  if (query.isPending) {
    return (
      <div className="grid grid-cols-2 gap-2" aria-busy="true">
        {METRIC_IDS.map((id) => (
          <Skeleton key={id} className="h-[5.5rem] rounded-lg" />
        ))}
      </div>
    );
  }

  if (query.isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-2 rounded-lg border p-3 text-sm">
        {t("detail.metricsError")}
        <Button variant="outline" size="sm" onClick={() => query.refetch()}>
          {t("detail.retry")}
        </Button>
      </div>
    );
  }

  if (!query.data) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
        {t("detail.noMetrics")}
      </p>
    );
  }

  return (
    // Old values stay visible, with less contrast, while the values of new filters load.
    <div
      className={cn(
        "grid grid-cols-2 gap-2 transition-opacity",
        query.isPlaceholderData && "opacity-50",
      )}
    >
      {METRIC_IDS.map((id) => (
        <MetricCard key={id} metric={id} metrics={query.data} />
      ))}
    </div>
  );
}
