"use client";

import { bestStrategy } from "@demetra/core";
import type { Block, RankingCriterion, RotationStrategy } from "@demetra/core";
import { Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import { useRotationStrategies } from "@/data/queries";
import { useT } from "@/i18n";
import { formatEuros, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-1">
      <dt className="truncate text-[0.7rem] text-muted-foreground">{label}</dt>
      <dd className={cn("text-xs tabular-nums", strong ? "font-semibold" : "font-medium")}>
        {value}
      </dd>
    </div>
  );
}

function StrategyCard({
  strategy,
  best,
  ranking,
}: {
  strategy: RotationStrategy;
  best: boolean;
  ranking: RankingCriterion;
}) {
  const t = useT();
  return (
    <li
      className={cn(
        "relative flex min-w-0 flex-col gap-2.5 rounded-lg border bg-card p-2.5 pt-3.5",
        best && "border-foreground ring-1 ring-foreground",
      )}
    >
      {best && (
        <span className="absolute -top-2.5 left-2 flex h-5 items-center gap-1 rounded-full bg-foreground px-2 text-[0.7rem] font-medium text-background">
          <Trophy className="size-3" />
          {t("rotation.best")}
        </span>
      )}

      {/* The crop of each year, in order. */}
      <ol className="flex flex-col gap-1">
        {strategy.sequence.map((crop, index) => (
          <li key={index} className="flex items-center gap-1.5 text-xs font-medium">
            <span className="grid size-4 shrink-0 place-items-center rounded-full bg-muted text-[0.65rem] text-muted-foreground tabular-nums">
              {index + 1}
            </span>
            <span className="truncate">{t(`crop.${crop}`)}</span>
          </li>
        ))}
      </ol>

      <dl className="flex flex-col gap-1 border-t pt-2">
        <Stat
          label={t("rotation.profit")}
          value={formatEuros(strategy.avgProfitPerHa)}
          strong={ranking === "profit"}
        />
        <Stat
          label={t("rotation.yield")}
          value={`${formatNumber(strategy.avgYieldPerHa)} kg`}
          strong={ranking === "yield"}
        />
        <Stat label={t("rotation.resilience")} value={`${strategy.resilience} %`} />
        <Stat label={t("rotation.confidence")} value={`${strategy.confidence} %`} />
      </dl>
    </li>
  );
}

/** Three crop sequences of three years, side by side. The best sequence is highlighted. */
export function RotationStrategies({ block }: { block: Block }) {
  const t = useT();
  const ranking = useAppStore((state) => state.ranking);
  const setRanking = useAppStore((state) => state.setRanking);
  const query = useRotationStrategies(block);
  const best = query.data ? bestStrategy(query.data, ranking) : undefined;

  return (
    <section className="flex flex-col gap-3">
      <header className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold">{t("rotation.title")}</h3>
        <p className="text-xs leading-relaxed text-muted-foreground">{t("rotation.subtitle")}</p>
      </header>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium">{t("rotation.bestBy")}</span>
          <SegmentedControl
            ariaLabel={t("rotation.bestBy")}
            value={ranking}
            onChange={setRanking}
            options={[
              { value: "profit", label: t("ranking.profit") },
              { value: "yield", label: t("ranking.yield") },
            ]}
          />
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{t(`ranking.${ranking}.note`)}</p>
      </div>

      {query.isPending ? (
        <div className="grid grid-cols-3 gap-2 pt-1" aria-busy="true">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-48 rounded-lg" />
          ))}
        </div>
      ) : query.isError ? (
        <div role="alert" className="flex flex-col items-start gap-2 rounded-lg border p-3 text-sm">
          {t("rotation.error")}
          <Button variant="outline" size="sm" onClick={() => query.refetch()}>
            {t("detail.retry")}
          </Button>
        </div>
      ) : !query.data || query.data.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          {t("rotation.empty")}
        </p>
      ) : (
        <ul
          className={cn(
            "grid grid-cols-3 gap-2 pt-1 transition-opacity",
            query.isPlaceholderData && "opacity-50",
          )}
        >
          {query.data.map((strategy) => (
            <StrategyCard
              key={strategy.id}
              strategy={strategy}
              best={strategy.id === best?.id}
              ranking={ranking}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
