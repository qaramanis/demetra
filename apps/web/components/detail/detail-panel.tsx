"use client";

import { M2_PER_HECTARE, M2_PER_STREMMA, polygonAreaM2, polygonCentroid } from "@demetra/core";
import type { Block } from "@demetra/core";
import { Trash2, X } from "lucide-react";
import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useT } from "@/i18n";
import { formatArea, formatCoordinates } from "@/lib/format";
import { useAppStore } from "@/store/app-store";

import { MetricCards } from "./metric-cards";
import { RotationStrategies } from "./rotation-strategies";

function Header({ block }: { block: Block }) {
  const t = useT();
  const select = useAppStore((state) => state.select);
  const removeCustomField = useAppStore((state) => state.removeCustomField);

  const { area, centre } = useMemo(
    () => ({ area: polygonAreaM2(block.geometry), centre: polygonCentroid(block.geometry) }),
    [block.geometry],
  );

  return (
    <header className="flex flex-col gap-3 border-b p-4">
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Badge variant="secondary">{t(`detail.kind.${block.kind}`)}</Badge>
          <h2 className="truncate font-mono text-[0.95rem] font-medium" title={block.id}>
            {block.id}
          </h2>
        </div>
        {block.kind === "custom" && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("detail.deleteField")}
            title={t("detail.deleteField")}
            onClick={() => removeCustomField(block.id)}
          >
            <Trash2 />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("detail.close")}
          title={t("detail.close")}
          onClick={() => select(null)}
        >
          <X />
        </Button>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted-foreground">{t("detail.area")}</dt>
        <dd className="tabular-nums">
          {t("detail.areaValue", {
            stremmata: formatArea(area / M2_PER_STREMMA),
            hectares: formatArea(area / M2_PER_HECTARE),
          })}
        </dd>
        <dt className="text-muted-foreground">{t("detail.centre")}</dt>
        <dd className="tabular-nums">{formatCoordinates(centre[0], centre[1])}</dd>
      </dl>
    </header>
  );
}

/** The right panel. It opens when a block is selected. */
export function DetailPanel() {
  const t = useT();
  const block = useAppStore((state) => state.selected);
  if (!block) return null;

  return (
    <aside
      aria-label={t("detail.title")}
      className="flex w-[26rem] shrink-0 animate-in flex-col border-l bg-card duration-200 fade-in slide-in-from-right-4 max-lg:absolute max-lg:inset-y-0 max-lg:right-0 max-lg:z-30 max-lg:max-w-full max-lg:shadow-xl"
    >
      <Header block={block} />
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-5 p-4">
          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">{t("detail.metrics")}</h3>
            <MetricCards block={block} />
          </section>
          <Separator />
          <RotationStrategies block={block} />
        </div>
      </ScrollArea>
    </aside>
  );
}
