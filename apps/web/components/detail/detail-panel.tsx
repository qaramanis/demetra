"use client";

import { polygonCentroid } from "@demetra/core";
import type { Block, BlockDetail } from "@demetra/core";
import { X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PredictionTag } from "@/components/prediction/prediction-tag";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useBlockDetail, useMapYear } from "@/data/queries";
import { useT } from "@/i18n";
import { formatAcres, formatCoordinates, formatShare } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

import { BlockClimate } from "./block-climate";
import { BlockPrediction } from "./block-prediction";
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
  // For a prediction year, the values of the data are the real data of the newest year.
  const mapYear = useMapYear();
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
          <Badge variant="secondary" className="bg-primary/12 text-primary-ink">
            {t("detail.block")}
          </Badge>
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
        {mapYear?.predicted ? (
          <dd className="flex items-center gap-1.5">
            <span className="font-medium text-prediction-ink tabular-nums">{mapYear.year}</span>
            <PredictionTag />
          </dd>
        ) : (
          <dd className={dataClass}>{fromData((data) => String(data.year))}</dd>
        )}
        <dt className="text-muted-foreground">
          {mapYear?.predicted
            ? t("detail.croplandIn", { year: mapYear.dataYear })
            : t("detail.cropland")}
        </dt>
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
 * The crops, the county data, the soil and the climate of a block. First, the row of the crop
 * filter is selected, or the first row. The panel gives this component a new key for each
 * block, so the selection of the user does not go to a different block.
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

  const { crops, year, climate } = query.data;
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
      {climate && (
        <>
          <Separator />
          <BlockClimate climate={climate} year={year} />
        </>
      )}
    </div>
  );
}

/** `enter` and `exit`: the panel slides. `open`: the panel is in its place. */
type Phase = "enter" | "open" | "exit";

interface Presence {
  /** The block in the panel. While the panel slides out, this is the last selected block. */
  block: Block | null;
  phase: Phase;
}

/**
 * The time after which a slide is complete, with a margin. A browser that does not run the
 * transition (for example in a hidden tab) sends no `transitionend` event: the panel then
 * finishes its motion after this time.
 */
const FINISH_AFTER_MS: Record<Exclude<Phase, "open">, number> = { enter: 450, exit: 350 };

/**
 * Keeps the panel in the page while it slides out, and tells when a slide is complete.
 * A different block in an open panel only changes the content, with no motion.
 */
function usePanelPresence(selected: Block | null) {
  const [presence, setPresence] = useState<Presence>({ block: selected, phase: "open" });
  const [previous, setPrevious] = useState(selected);

  // The selection changed: open, close or open again. A panel that slides out goes back.
  if (selected !== previous) {
    setPrevious(selected);
    setPresence((current) => {
      if (selected) {
        const closed = current.block === null || current.phase === "exit";
        return { block: selected, phase: closed ? "enter" : current.phase };
      }
      return current.block ? { ...current, phase: "exit" } : current;
    });
  }

  const finish = useCallback(() => {
    setPresence((current) => {
      if (current.phase === "enter") return { ...current, phase: "open" };
      if (current.phase === "exit") return { block: null, phase: "open" };
      return current;
    });
  }, []);

  useEffect(() => {
    if (presence.phase === "open") return;
    const timer = setTimeout(finish, FINISH_AFTER_MS[presence.phase]);
    return () => clearTimeout(timer);
  }, [presence.phase, finish]);

  return { ...presence, finish };
}

/**
 * The right panel. It opens when a block is selected.
 *
 * It slides in from the right edge and slides out to it. The map does not change its size
 * while the panel moves: on a wide screen the panel is above the map during the slide, and
 * takes its column in the layout only when it is in its place. The map then changes its
 * size once, below the panel. (A change of width on each frame makes the map draw again
 * and request new blocks on each frame.) On a narrow screen the panel is always above the
 * map. With reduced motion, the panel only fades.
 */
export function DetailPanel() {
  const t = useT();
  const selected = useAppStore((state) => state.selected);
  const { block, phase, finish } = usePanelPresence(selected);
  const mapYear = useMapYear();
  if (!block) return null;

  return (
    <aside
      aria-label={t("detail.title")}
      // The panel that slides out does not take clicks or focus.
      inert={phase === "exit"}
      onTransitionEnd={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.propertyName === "translate" || event.propertyName === "opacity") finish();
      }}
      className={cn(
        "flex w-[26rem] shrink-0 flex-col border-l bg-card",
        "max-lg:absolute max-lg:inset-y-0 max-lg:right-0 max-lg:z-30 max-lg:max-w-full max-lg:shadow-xl",
        phase !== "open" && "lg:absolute lg:inset-y-0 lg:right-0 lg:z-20",
        // Slide in in 300 ms, slide out faster, in 200 ms. `starting:` is the position
        // before the panel slides in. A transition can reverse at any point, so a quick
        // close and open again does not make the panel jump.
        "translate-x-0 ease-drawer motion-safe:transition-[translate] motion-reduce:transition-opacity",
        phase === "exit"
          ? "duration-200 motion-safe:translate-x-full motion-reduce:opacity-0"
          : "duration-300 motion-safe:starting:translate-x-full motion-reduce:starting:opacity-0",
      )}
    >
      <Header block={block} />
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-5 p-4">
          {/* A prediction year: the prediction first, then the real data of the newest year. */}
          {mapYear?.predicted && (
            <BlockPrediction
              blockId={block.id}
              year={mapYear.year}
              dataYear={mapYear.dataYear}
            />
          )}
          <DetailBody key={block.id} block={block} />
        </div>
      </ScrollArea>
    </aside>
  );
}
