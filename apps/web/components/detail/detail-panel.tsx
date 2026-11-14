"use client";

import { polygonCentroid } from "@demetra/core";
import type { Block, BlockDetail } from "@demetra/core";
import { X } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useBlockDetail } from "@/data/queries";
import { useT } from "@/i18n";
import { formatAcres, formatCoordinates, formatShare } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

import { CountyData } from "./county-data";
import { BLOCK_ACRES, cropKey } from "./crop-info";
import { CropList } from "./crop-list";
import { CropSoil } from "./crop-soil";

/** The names of the counties of a block, in the order of the crop rows. */
function countyNames(detail: BlockDetail): string[] {
  return [...new Set(detail.crops.map((crop) => crop.countyName))];
}

function Header({ block }: { block: Block }) {
  const t = useT();
  const select = useAppStore((state) => state.select);
  const query = useBlockDetail(block.id);
  const centre = useMemo(() => polygonCentroid(block.geometry), [block.geometry]);
  const detail = query.data;
  const counties = detail ? countyNames(detail) : [];

  // The id and the centre are known before the data loads. The other values wait for the data.
  // The body of the panel shows an error.
  const fromData = (value: (detail: BlockDetail) => string) =>
    detail ? value(detail) : query.isPending ? <Skeleton className="my-0.5 h-4 w-28" /> : "—";
  const dataClass = cn("tabular-nums transition-opacity", query.isPlaceholderData && "opacity-50");

  return (
    <header className="flex flex-col gap-3 border-b p-4">
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Badge variant="secondary">{t("detail.block")}</Badge>
          <h2 className="truncate font-mono text-[0.95rem] font-medium" title={block.id}>
            {block.id}
          </h2>
        </div>
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
        <dt className="text-muted-foreground">
          {t(counties.length > 1 ? "detail.counties" : "detail.county")}
        </dt>
        <dd className={dataClass}>{fromData(() => counties.join(", ") || "—")}</dd>
        <dt className="text-muted-foreground">{t("detail.year")}</dt>
        <dd className={dataClass}>{fromData((data) => String(data.year))}</dd>
        <dt className="text-muted-foreground">{t("detail.cropland")}</dt>
        <dd className={dataClass}>
          {fromData((data) =>
            t("detail.croplandValue", {
              acres: formatAcres(data.croplandAcres),
              share: formatShare(data.croplandAcres / BLOCK_ACRES),
            }),
          )}
        </dd>
        <dt className="text-muted-foreground">{t("detail.centre")}</dt>
        <dd className="tabular-nums">{formatCoordinates(centre[0], centre[1])}</dd>
      </dl>
    </header>
  );
}

/**
 * The crops, the county data and the soil of a block. First, the row of the crop filter is
 * selected, or the first row. The panel gives this component a new key for each block, so the
 * selection of the user does not go to a different block.
 */
function DetailBody({ block }: { block: Block }) {
  const t = useT();
  const query = useBlockDetail(block.id);
  const cropCode = useAppStore((state) => state.cropCode);
  // The key of the row that the user selected. `null` = no selection yet.
  const [chosenKey, setChosenKey] = useState<string | null>(null);

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-2" aria-busy="true">
        <Skeleton className="mb-2 h-2 rounded-full" />
        {[0, 1, 2, 3, 4].map((index) => (
          <Skeleton key={index} className="h-7 rounded-md" />
        ))}
        <Skeleton className="mt-5 h-32 rounded-lg" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-2 rounded-lg border p-3 text-sm">
        {t("detail.error")}
        <Button variant="outline" size="sm" onClick={() => query.refetch()}>
          {t("detail.retry")}
        </Button>
      </div>
    );
  }

  const { crops, year } = query.data;
  if (crops.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
        {t("detail.noCrops", { year })}
      </p>
    );
  }

  // The selection of the user stays for a different year when the block still has that row.
  const selected =
    crops.find((crop) => cropKey(crop) === chosenKey) ??
    crops.find((crop) => crop.cropCode === cropCode) ??
    crops[0];
  const showCounty = new Set(crops.map((crop) => crop.countyFips)).size > 1;

  return (
    // Old values stay visible, with less contrast, while the values of a different year load.
    <div
      className={cn(
        "flex flex-col gap-5 transition-opacity",
        query.isPlaceholderData && "opacity-50",
      )}
    >
      <section className="flex flex-col gap-3">
        <header className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold">{t("detail.crops")}</h3>
          <p className="text-xs leading-relaxed text-muted-foreground">{t("detail.cropsHint")}</p>
        </header>
        <CropList
          crops={crops}
          selectedKey={cropKey(selected)}
          showCounty={showCounty}
          onSelect={setChosenKey}
        />
      </section>
      <Separator />
      <CountyData crop={selected} showCounty={showCounty} />
      <Separator />
      <CropSoil crop={selected} showCounty={showCounty} />
    </div>
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
        <div className="p-4">
          <DetailBody key={block.id} block={block} />
        </div>
      </ScrollArea>
    </aside>
  );
}
