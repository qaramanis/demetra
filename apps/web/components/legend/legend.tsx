"use client";

import { NUMBER_SCALES, isPredictedBlock, numberScaleOf } from "@demetra/core";
import type { NumberScaleId } from "@demetra/core";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { NO_DATA_COLOR } from "@/config/palettes";
import { useCropIndex, useMapYear, useReferenceData } from "@/data/queries";
import { useT } from "@/i18n";
import { rampGradient } from "@/lib/color-scale";
import { cropLook } from "@/lib/crop-look";
import { formatNumber, formatShare } from "@/lib/format";
import { formatScaleValue } from "@/lib/scale-value";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

/** The number of crop classes that the crop legend shows. */
const LARGEST_CROPS = 8;

/**
 * The loading state shows only when the map needs more time than this. A short redraw, for
 * example after a small pan, then does not make the legend flicker.
 */
const LOADING_DELAY_MS = 300;

/** The widths of the name bars in the placeholder rows. */
const PLACEHOLDER_NAME_WIDTHS = ["72%", "52%", "64%", "44%", "58%"];

/**
 * The loading state that the legend shows. It starts after a delay, and it stops
 * immediately when the map is ready.
 */
function useDelayedLoading(loading: boolean): boolean {
  const [delayEnded, setDelayEnded] = useState(false);

  useEffect(() => {
    // When the loading stops, the value goes back to `false` for the next delay.
    const timer = setTimeout(() => setDelayEnded(loading), loading ? LOADING_DELAY_MS : 0);
    return () => clearTimeout(timer);
  }, [loading]);

  return loading && delayEnded;
}

/**
 * The values stay visible while the map draws new blocks, but they become lighter. The size of
 * the legend then does not change two times for each pan.
 */
function dimmedWhile(loading: boolean) {
  return cn("transition-opacity duration-200 ease-out", loading && "opacity-50");
}

/**
 * The height changes smoothly to the height of the content. The first height does not
 * animate. With reduced motion, the height changes immediately.
 */
function AnimatedHeight({ children }: { children: ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    let animate = false;
    const update = () => {
      // On a small screen the sidebar is hidden until the user opens it. The legend then has
      // no box, and the next height does not animate.
      if (outer.getClientRects().length === 0) {
        animate = false;
        return;
      }
      if (!animate) outer.style.transition = "none";
      outer.style.height = `${inner.getBoundingClientRect().height}px`;
      if (!animate) {
        // Read the layout, so that the browser applies the height before the transition
        // comes back.
        outer.getBoundingClientRect();
        outer.style.transition = "";
        animate = true;
      }
    };
    // The observer does not report a content of zero height when it starts, so the first
    // height is set here.
    update();
    // The observer runs after the layout and before the paint, so the new height starts in
    // the same frame as the new content.
    const observer = new ResizeObserver(update);
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  return (
    // The negative margin and the padding keep the rings of the swatches in the visible area.
    <div
      ref={outerRef}
      className="-mx-1 overflow-hidden px-1 transition-[height] duration-220 ease-out motion-reduce:transition-none"
    >
      {/* Without content, the space above the content goes too. */}
      <div ref={innerRef} className="pt-2.5 empty:hidden">
        {children}
      </div>
    </div>
  );
}

function Swatch({ color }: { color: string }) {
  return (
    <span
      aria-hidden="true"
      className="size-3.5 shrink-0 rounded-[3px] ring-1 ring-foreground/10"
      style={{ backgroundColor: color }}
    />
  );
}

/** Rows in the shape of the crop rows, for the time before the first blocks are on the map. */
function CropPlaceholder() {
  const t = useT();
  return (
    <div className="flex animate-in flex-col gap-1.5 duration-200 ease-out fade-in">
      <p className="text-[0.7rem] text-muted-foreground">{t("legend.shareOfBlocks")}</p>
      <ul aria-hidden="true" className="flex flex-col gap-1.5">
        {PLACEHOLDER_NAME_WIDTHS.map((width) => (
          <li key={width} className="flex h-4 items-center gap-2">
            <Skeleton className="size-3.5 shrink-0 rounded-[3px]" />
            <span className="min-w-0 flex-1">
              <Skeleton className="h-2.5 rounded-sm" style={{ width }} />
            </span>
            <Skeleton className="h-2.5 w-7 rounded-sm" />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The main crops of the blocks in the view, the crop class with the most blocks first. */
function CropLegend({ loading }: { loading: boolean }) {
  const t = useT();
  // The blocks that the map shows, and not the blocks of a newer answer. The rows then change
  // when the map is ready, and not during the long work that new data starts.
  const blocks = useAppStore((state) => state.drawnBlocks);
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
  // There are no old values to show while the blocks load.
  if (total === 0) return loading ? <CropPlaceholder /> : null;

  const largest = counts.slice(0, LARGEST_CROPS);
  const more = counts.length - largest.length;
  // All the blocks of an answer are predicted, or none.
  const firstBlock = blocks?.features[0]?.properties;
  const predicted = firstBlock !== undefined && isPredictedBlock(firstBlock);

  return (
    <div className={cn("flex flex-col gap-1.5", dimmedWhile(loading))}>
      <p className="text-[0.7rem] text-muted-foreground">{t("legend.shareOfBlocks")}</p>
      <ul className="flex flex-col gap-1.5">
        {largest.map(([code, count]) => {
          const { name, color } = cropLook(code, cropIndex, t);
          return (
            <li key={code} className="flex items-center gap-2 text-xs">
              <Swatch color={color} />
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
      {/* A predicted crop has a different rule from the main crop of the real data. */}
      {predicted && (
        <p className="mt-1.5 text-[0.7rem] leading-relaxed text-prediction-ink">
          {t("prediction.legendNote")}
        </p>
      )}
    </div>
  );
}

/** The color ramp of a scale, with the values of its ends. */
function RampLegend({ scale, loading }: { scale: NumberScaleId; loading: boolean }) {
  const t = useT();
  const { domain, min: lowest, max: highest, diverging } = NUMBER_SCALES[scale];
  const [min, max] = domain;
  // The legend shows whole numbers.
  const label = (value: number) => formatScaleValue(scale, value, t, 0);
  // When the colors stop before the lowest or the highest possible value, the end label says so.
  const minLabel = `${lowest === null || min > lowest ? "≤ " : ""}${label(min)}`;
  const maxLabel = `${highest === null || max < highest ? "≥ " : ""}${label(max)}`;
  const climate = scale !== "soil";

  return (
    <div className={cn("flex flex-col gap-1", dimmedWhile(loading))}>
      <p className="text-[0.7rem] text-muted-foreground">
        {climate ? t(`climate.${scale}.detail`) : t("common.storieIndex")}
      </p>
      <div
        aria-hidden="true"
        className="h-2.5 rounded-[3px] ring-1 ring-foreground/10"
        style={{ background: rampGradient(scale) }}
      />
      {/* Three columns, so that the middle value of a diverging scale is below the middle of
          the ramp. */}
      <div className="grid grid-cols-[1fr_auto_1fr] text-[0.7rem] text-muted-foreground tabular-nums">
        <span>{minLabel}</span>
        <span>{diverging && label((min + max) / 2)}</span>
        <span className="text-right">{maxLabel}</span>
      </div>
      <div className="mt-1.5 flex items-center gap-2 text-xs">
        <Swatch color={NO_DATA_COLOR} />
        <span className="text-muted-foreground">{t("common.noData")}</span>
      </div>
      {/* The climate values are estimates. The legend tells this limit of the data. */}
      {climate && (
        <p className="mt-1.5 text-[0.7rem] leading-relaxed text-muted-foreground">
          {t("climate.legendNote")}
        </p>
      )}
    </div>
  );
}

/** The legend of the active layer, with the filters that the values depend on. */
export function Legend() {
  const t = useT();
  const selectedLayer = useAppStore((state) => state.layer);
  const drawnLayer = useAppStore((state) => state.drawnLayer);
  // The layer that the map shows. After a change of the layer, the legend changes when the map
  // has drawn the new colors. The height of the legend then does not animate while the map is
  // busy.
  const layer = drawnLayer ?? selectedLayer;
  // The climate metric follows the same rule.
  const selectedMetric = useAppStore((state) => state.climateMetric);
  const drawnMetric = useAppStore((state) => state.drawnClimateMetric);
  const scale = numberScaleOf(layer, drawnMetric ?? selectedMetric);
  const cropCode = useAppStore((state) => state.cropCode);
  const countyFips = useAppStore((state) => state.countyFips);
  const mapYear = useMapYear();
  const cropIndex = useCropIndex();
  const counties = useReferenceData().data?.counties;
  const loading = useDelayedLoading(useAppStore((state) => state.blocksLoading));

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
      aria-busy={loading}
      className="flex flex-col rounded-lg border p-3"
    >
      <header>
        <h2 className="text-[0.8rem] leading-tight font-semibold">
          {/* The climate layer has the name of its metric. A prediction year shows the
              predicted crops. */}
          {mapYear?.predicted
            ? t("legend.predictedCrop")
            : scale === null || scale === "soil"
              ? t(`layer.${layer}.name`)
              : t(`climate.${scale}.name`)}
        </h2>
        <p className="mt-0.5 text-[0.7rem] text-muted-foreground">
          {mapYear && (
            <span className={cn(mapYear.predicted && "font-medium text-prediction-ink")}>
              {mapYear.predicted
                ? t("legend.predictionYear", { year: mapYear.year })
                : mapYear.year}
            </span>
          )}
          {mapYear && " · "}
          {cropName} · {countyName}
        </p>
        {/* The status message of the map announces the loading. This text is for a user who
            reads the legend. */}
        {loading && <span className="sr-only">{t("map.blocksLoading")}</span>}
      </header>
      <AnimatedHeight>
        {scale === null ? (
          <CropLegend loading={loading} />
        ) : (
          <RampLegend scale={scale} loading={loading} />
        )}
      </AnimatedHeight>
    </section>
  );
}
