"use client";

import { CLIMATE_METRIC_IDS, MAP_LAYER_IDS } from "@demetra/core";
import type { County, Crop } from "@demetra/core";
import { Check, LoaderCircle, Sparkles, X } from "lucide-react";
import { Fragment, useId, useMemo, useState, type ReactNode } from "react";

import { LayerSwatch, ScaleSwatch } from "@/components/layers/layer-swatch";
import { Legend } from "@/components/legend/legend";
import { BasemapToggle } from "@/components/map/basemap-toggle";
import { PredictionTag } from "@/components/prediction/prediction-tag";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxSearch,
  ComboboxTrigger,
  ComboboxValue,
} from "@/components/ui/combobox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useBlockFilters,
  useBlocks,
  useMapYear,
  usePredictNextYear,
  useReferenceData,
} from "@/data/queries";
import { useT } from "@/i18n";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h3 id={id} className="text-xs font-medium text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

/** The time between the entries of two metrics, when the list unfolds. */
const METRIC_STAGGER_MS = 40;

/**
 * The climate metric that the climate layer shows. Each metric has the colors of its scale,
 * so the user sees the colors of a metric before the selection.
 *
 * The list stays in the page. It unfolds below the climate layer when that layer becomes
 * active, and folds back when a different layer becomes active:
 * - The row of the grid changes from 0 to the height of the list (200 ms; 150 ms back). The
 *   layers below move with it and do not jump. A transition can reverse at any point.
 * - The metrics come in one after the other, from a small distance above. They fade out
 *   together when the list folds back.
 * - With reduced motion, the list opens and closes at once and the metrics only fade.
 * A closed list is `inert`: its buttons do not take clicks or focus.
 */
function ClimateMetricFilter({ open }: { open: boolean }) {
  const t = useT();
  const metric = useAppStore((state) => state.climateMetric);
  const setMetric = useAppStore((state) => state.setClimateMetric);

  return (
    <div
      inert={!open}
      className={cn(
        // `-mt-0.5` cancels the gap of the layer list above this element. The `mt-0.5` of the
        // list puts the gap back, so it is there only while the list is open.
        "-mt-0.5 grid transition-[grid-template-rows] ease-out motion-reduce:transition-none",
        open ? "grid-rows-[1fr] duration-200" : "grid-rows-[0fr] duration-150",
      )}
    >
      <div className="min-h-0 overflow-hidden">
        <div
          role="group"
          aria-label={t("climate.metric")}
          // A line on the left connects the metrics to the climate layer above them.
          className="mt-0.5 mb-1 ml-[1.375rem] flex flex-col gap-0.5 border-l pl-2"
        >
          {CLIMATE_METRIC_IDS.map((id, index) => {
            const active = id === metric;
            return (
              <div
                key={id}
                className={cn(
                  "transition-[opacity,translate] ease-out motion-reduce:translate-none",
                  open ? "duration-200" : "-translate-y-1 opacity-0 duration-100",
                )}
                // The delay is on this wrapper and not on the button, so that the hover color
                // of the button has no delay.
                style={{ transitionDelay: open ? `${index * METRIC_STAGGER_MS}ms` : "0ms" }}
              >
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => setMetric(id)}
                  className={cn(
                    "flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-left text-[0.8rem] transition-colors outline-none",
                    "hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50",
                    active ? "font-medium" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <ScaleSwatch scale={id} className="w-5" />
                  <span className="min-w-0 flex-1 truncate">{t(`climate.${id}.name`)}</span>
                  {active && <Check className="size-3.5 shrink-0 text-primary-ink" />}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * The layer that gives the blocks and the legend their colors. The climate layer has a list
 * of metrics below it while it is active. A prediction has only the predicted crop of each
 * block, so a prediction year has only the crop layer.
 */
function LayerFilter() {
  const t = useT();
  const layer = useAppStore((state) => state.layer);
  const setLayer = useAppStore((state) => state.setLayer);
  const predicted = useMapYear()?.predicted ?? false;

  return (
    <div className="-mx-2 flex flex-col gap-0.5">
      {MAP_LAYER_IDS.map((id) => {
        const active = id === layer;
        return (
          <Fragment key={id}>
            <button
              type="button"
              aria-pressed={active}
              disabled={predicted && id !== "crop"}
              onClick={() => setLayer(id)}
              className={cn(
                "flex h-9 items-center gap-2.5 rounded-md px-2 text-left text-sm transition-[background-color,opacity] outline-none",
                "focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-45",
                // The active layer has a light fill of the accent colour.
                active ? "bg-primary/12 font-medium hover:bg-primary/15" : "hover:bg-accent",
              )}
            >
              <LayerSwatch layer={id} />
              <span className="min-w-0 flex-1 truncate">{t(`layer.${id}.name`)}</span>
              {active && <Check className="size-4 shrink-0 text-primary-ink" />}
            </button>
            {id === "climate" && <ClimateMetricFilter open={active} />}
          </Fragment>
        );
      })}
      {predicted && (
        <p className="px-2 pt-1 text-[0.7rem] leading-relaxed text-muted-foreground">
          {t("prediction.layersNote")}
        </p>
      )}
    </div>
  );
}

/**
 * A part below the year field that comes in and goes out with a short motion: the row of the
 * grid changes from 0 to the height of the content (200 ms; 150 ms back), with a fade. The
 * filters below move with it and do not jump. The part also comes in with this motion when
 * the page opens (`starting:`). While it is hidden, the part stays in the page until its
 * motion is complete (`transition-discrete`), and it is `inert`. With reduced motion, it only
 * fades.
 */
function Reveal({ show, children }: { show: boolean; children: ReactNode }) {
  return (
    <div
      inert={!show}
      className={cn(
        "grid transition-[grid-template-rows,opacity,display] transition-discrete ease-out motion-reduce:transition-[opacity,display]",
        show
          ? "grid-rows-[1fr] opacity-100 duration-200 starting:grid-rows-[0fr] starting:opacity-0"
          : "hidden grid-rows-[0fr] opacity-0 duration-150",
      )}
    >
      {/* The padding keeps the focus ring of the button in the visible area. */}
      <div className="-mx-1 min-h-0 overflow-hidden px-1 pb-1">
        <div className="pt-2">{children}</div>
      </div>
    </div>
  );
}

/**
 * The button that shows the prediction of the next year. It comes in when the map shows the
 * newest year that has data, and the next year has a prediction. It loads the prediction
 * first: the map then changes in one step.
 */
function PredictNextYear() {
  const t = useT();
  const prediction = usePredictNextYear();
  // The text stays the same while the button goes out.
  const [shownYear, setShownYear] = useState(prediction.year);
  if (prediction.year !== null && prediction.year !== shownYear) setShownYear(prediction.year);

  return (
    <Reveal show={prediction.year !== null}>
      <div className="flex flex-col gap-1.5">
        <Button
          variant="outline"
          aria-busy={prediction.isPending}
          onClick={() => {
            if (!prediction.isPending) prediction.predict();
          }}
          className="w-full justify-start border-prediction/35 bg-prediction/8 text-prediction-ink hover:bg-prediction/14 hover:text-prediction-ink focus-visible:border-prediction focus-visible:ring-prediction/30"
        >
          {prediction.isPending ? <LoaderCircle className="animate-spin" /> : <Sparkles />}
          <span className="min-w-0 flex-1 truncate text-left">
            {t(prediction.isPending ? "prediction.loading" : "prediction.predictNextYear")}
          </span>
          <span className="text-xs tabular-nums opacity-75">{shownYear}</span>
        </Button>
        {prediction.isError && (
          <p role="alert" className="text-xs text-destructive">
            {t("prediction.error")}
          </p>
        )}
      </div>
    </Reveal>
  );
}

/** The note below the year field while the map shows a prediction: it is not real data. */
function PredictionNote() {
  const t = useT();
  const mapYear = useMapYear();
  const predicted = mapYear?.predicted ?? false;
  // The text stays the same while the note goes out.
  const [shownYear, setShownYear] = useState(predicted ? mapYear?.year : undefined);
  if (predicted && mapYear && mapYear.year !== shownYear) setShownYear(mapYear.year);

  return (
    <Reveal show={predicted}>
      <p className="flex gap-2 rounded-lg bg-prediction/8 px-2.5 py-2 text-xs leading-relaxed text-prediction-ink">
        <Sparkles aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-prediction" />
        {t("prediction.note", { year: shownYear ?? "" })}
      </p>
    </Reveal>
  );
}

/** One year in the year list. A prediction year has the prediction colour and a tag. */
function YearItem({ year, predicted }: { year: number; predicted?: boolean }) {
  return (
    <SelectItem
      value={year}
      className={cn(
        predicted &&
          "font-medium text-prediction-ink focus:bg-prediction/10 focus:**:text-prediction-ink!",
      )}
    >
      {year}
      {predicted && <PredictionTag className="ml-auto" />}
    </SelectItem>
  );
}

/**
 * The year of the data. The list has the years that have data. After the user asks for the
 * prediction of the next year, the list also has the prediction years, in a separate group
 * with the prediction colour. Below the field: the prediction button or the prediction note.
 */
function YearFilter({
  years,
  predictionYears,
}: {
  years: readonly number[];
  predictionYears: readonly number[];
}) {
  const t = useT();
  const year = useBlockFilters()?.year ?? null;
  const setYear = useAppStore((state) => state.setYear);
  const showPrediction = useAppStore((state) => state.showPrediction);
  const revealed = useAppStore((state) => state.predictionsRevealed);
  const shownPredictions = revealed ? predictionYears : [];
  const items = [...shownPredictions, ...years].map((value) => ({
    value,
    label: String(value),
  }));
  const predicted = year !== null && predictionYears.includes(year);

  return (
    <div className="flex flex-col">
      <Select
        items={items}
        value={year}
        onValueChange={(value) => {
          if (value === null) return;
          if (predictionYears.includes(value)) showPrediction(value);
          else setYear(value);
        }}
      >
        <SelectTrigger
          className={cn(
            "w-full",
            predicted &&
              "border-prediction/45 bg-prediction/6 hover:border-prediction/70 data-popup-open:border-prediction/80",
          )}
          aria-label={t("filters.year")}
        >
          <SelectValue>
            {(value: number | null) => (
              <>
                <span className={cn("tabular-nums", predicted && "font-medium text-prediction-ink")}>
                  {value}
                </span>
                {predicted && <PredictionTag />}
              </>
            )}
          </SelectValue>
        </SelectTrigger>
        {/* Below the field, as the lists of the crop and the county, and not over the field. */}
        <SelectContent alignItemWithTrigger={false}>
          {shownPredictions.length > 0 ? (
            <>
              <SelectGroup>
                <SelectLabel className="text-prediction-ink">
                  {t("filters.predictionYears")}
                </SelectLabel>
                {shownPredictions.map((value) => (
                  <YearItem key={value} year={value} predicted />
                ))}
              </SelectGroup>
              <SelectSeparator />
              <SelectGroup>
                <SelectLabel>{t("filters.dataYears")}</SelectLabel>
                {years.map((value) => (
                  <YearItem key={value} year={value} />
                ))}
              </SelectGroup>
            </>
          ) : (
            years.map((value) => <YearItem key={value} year={value} />)
          )}
        </SelectContent>
      </Select>
      <PredictNextYear />
      <PredictionNote />
    </div>
  );
}

/**
 * An item of a filter with a search. `value: null` = all crops or all counties. The item
 * object is the value of the combobox, so that "all" is a normal choice and not an empty
 * value.
 */
interface FilterItem<T> {
  value: T | null;
  label: string;
  /** The color of a crop class on the map. */
  color?: string | null;
}

const sameFilterItem = <T,>(item: FilterItem<T>, value: FilterItem<T>) =>
  item.value === value.value;

/** The swatch of a crop class. "All crops" has an empty swatch, so that all names align. */
function CropItemSwatch({ color }: { color: string | null | undefined }) {
  return (
    <span
      aria-hidden="true"
      className={cn("size-3 shrink-0 rounded-[3px]", color && "ring-1 ring-foreground/10")}
      style={color ? { backgroundColor: color } : undefined}
    />
  );
}

/**
 * One crop class, or all crops. Each crop class has a swatch of its color on the map. The
 * list has a search field: there are more than 100 crop classes.
 */
function CropFilter({ crops }: { crops: readonly Crop[] }) {
  const t = useT();
  const cropCode = useAppStore((state) => state.cropCode);
  const setCropCode = useAppStore((state) => state.setCropCode);
  const items = useMemo<FilterItem<number>[]>(
    () => [
      { value: null, label: t("common.allCrops"), color: null },
      ...crops.map((crop) => ({ value: crop.code, label: crop.name, color: crop.color })),
    ],
    [crops, t],
  );
  const selected = items.find((item) => item.value === cropCode) ?? items[0];

  return (
    <Combobox
      items={items}
      value={selected}
      onValueChange={(item) => {
        if (item) setCropCode(item.value);
      }}
      isItemEqualToValue={sameFilterItem}
    >
      <ComboboxTrigger className="w-full" aria-label={t("filters.crop")}>
        <ComboboxValue>
          {(item: FilterItem<number>) => (
            <>
              {/* In the field, "All crops" has no empty swatch: its text aligns with the other fields. */}
              {item.color && <CropItemSwatch color={item.color} />}
              <span className="truncate">{item.label}</span>
            </>
          )}
        </ComboboxValue>
      </ComboboxTrigger>
      <ComboboxContent aria-label={t("filters.crop")}>
        <ComboboxSearch placeholder={t("filters.searchCrops")} aria-label={t("filters.searchCrops")} />
        <ComboboxEmpty>{t("filters.noMatch")}</ComboboxEmpty>
        <ComboboxList>
          {(item: FilterItem<number>) => (
            <ComboboxItem key={item.value ?? "all"} value={item}>
              <CropItemSwatch color={item.color} />
              <span className="truncate">{item.label}</span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

/** One county, or all counties. The list of the 58 counties has a search field. */
function CountyFilter({ counties }: { counties: readonly County[] }) {
  const t = useT();
  const countyFips = useAppStore((state) => state.countyFips);
  const setCountyFips = useAppStore((state) => state.setCountyFips);
  const items = useMemo<FilterItem<string>[]>(
    () => [
      { value: null, label: t("common.allCounties") },
      ...counties.map((county) => ({ value: county.fips, label: county.name })),
    ],
    [counties, t],
  );
  const selected = items.find((item) => item.value === countyFips) ?? items[0];

  return (
    <Combobox
      items={items}
      value={selected}
      onValueChange={(item) => {
        if (item) setCountyFips(item.value);
      }}
      isItemEqualToValue={sameFilterItem}
    >
      <ComboboxTrigger className="w-full" aria-label={t("filters.county")}>
        <ComboboxValue>
          {(item: FilterItem<string>) => <span className="truncate">{item.label}</span>}
        </ComboboxValue>
      </ComboboxTrigger>
      <ComboboxContent aria-label={t("filters.county")}>
        <ComboboxSearch
          placeholder={t("filters.searchCounties")}
          aria-label={t("filters.searchCounties")}
        />
        <ComboboxEmpty>{t("filters.noMatch")}</ComboboxEmpty>
        <ComboboxList>
          {(item: FilterItem<string>) => (
            <ComboboxItem key={item.value ?? "all"} value={item}>
              <span className="truncate">{item.label}</span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

/** Removes the crop filter and the county filter. It shows only when one of them is set. */
function ClearFilters() {
  const t = useT();
  const active = useAppStore((state) => state.cropCode !== null || state.countyFips !== null);
  const setCropCode = useAppStore((state) => state.setCropCode);
  const setCountyFips = useAppStore((state) => state.setCountyFips);

  if (!active) return null;

  return (
    <Button
      variant="ghost"
      size="xs"
      className="-ml-2 self-start text-primary-ink hover:bg-primary/10 hover:text-primary-ink"
      onClick={() => {
        setCropCode(null);
        setCountyFips(null);
      }}
    >
      <X />
      {t("filters.clear")}
    </Button>
  );
}

/** The filters that offer the values of the reference data: year, crop class and county. */
function DataFilters() {
  const t = useT();
  const reference = useReferenceData();
  const data = reference.data;

  if (!data && reference.isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-2 rounded-lg border p-3 text-sm">
        {t("filters.error")}
        <Button variant="outline" size="sm" onClick={() => reference.refetch()}>
          {t("filters.retry")}
        </Button>
      </div>
    );
  }

  // While the reference data loads, a skeleton with the size of a select is in its position.
  const skeleton = <Skeleton className="h-8 rounded-lg" />;

  return (
    <>
      <Section title={t("filters.year")}>
        {data ? <YearFilter years={data.years} predictionYears={data.predictionYears} /> : skeleton}
      </Section>
      <Section title={t("filters.crop")}>
        {data ? <CropFilter crops={data.crops} /> : skeleton}
      </Section>
      <Section title={t("filters.county")}>
        {data ? <CountyFilter counties={data.counties} /> : skeleton}
        <ClearFilters />
      </Section>
    </>
  );
}

/** The number of blocks on the map, or the reason why there are none. */
function BlockCount() {
  const t = useT();
  const blocks = useBlocks();

  let text = "";
  if (blocks.status === "tooMany") text = t("filters.tooMany");
  else if (blocks.status === "outside") text = t("filters.outside");
  else if (blocks.data) {
    const count = formatNumber(blocks.data.features.length);
    // A view with too many blocks does not show the blocks that have very little cropland.
    text = blocks.smallBlocksOmitted
      ? t("filters.blocksInViewWithoutSmall", {
          count,
          omitted: formatNumber(blocks.smallBlocksOmitted.count),
          cells: blocks.smallBlocksOmitted.minCropCells,
        })
      : t("filters.blocksInView", { count });
  }

  return (
    <p aria-live="polite" className="border-t px-4 py-2.5 text-xs text-muted-foreground">
      {text || " "}
    </p>
  );
}

/** The column of the sidebar: the filters, the map layer, the basemap and the legend. */
function FiltersPanel({ open }: { open: boolean }) {
  const t = useT();
  return (
    <aside
      aria-label={t("filters.title")}
      className={cn(
        "w-72 shrink-0 flex-col border-r bg-card md:flex",
        // On a small screen the sidebar is above the map and above the detail panel, and only
        // when the user opens it.
        "max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:z-40 max-md:max-w-[85vw] max-md:shadow-xl",
        // It slides in from the left edge, and slides out faster. `transition-discrete` keeps
        // it visible while it slides out. `starting:` is its position before it slides in.
        "max-md:motion-safe:transition-[translate,display] max-md:motion-safe:transition-discrete max-md:ease-drawer",
        open
          ? "flex max-md:duration-300 max-md:motion-safe:starting:-translate-x-full"
          : "hidden max-md:-translate-x-full max-md:duration-200",
      )}
    >
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-6 p-4">
          <DataFilters />
          <Section title={t("filters.layer")}>
            <LayerFilter />
          </Section>
          {/* The basemap toggle and the legend fill the width of the column, so they have the
              same width. */}
          <div className="flex flex-col gap-2">
            <BasemapToggle />
            <Legend />
          </div>
        </div>
      </ScrollArea>
      <BlockCount />
    </aside>
  );
}

/**
 * The left sidebar. On a small screen it opens above the map, and a light shade covers the
 * rest of the map. A tap on the shade closes the sidebar. The shade fades in and out with the
 * slide of the sidebar.
 */
export function FiltersSidebar() {
  const open = useAppStore((state) => state.filtersOpen);
  const setOpen = useAppStore((state) => state.setFiltersOpen);
  return (
    <>
      <div
        aria-hidden="true"
        onClick={() => setOpen(false)}
        className={cn(
          "absolute inset-0 z-40 bg-foreground/20 transition-[opacity,display] transition-discrete ease-out md:hidden",
          open ? "block duration-300 starting:opacity-0" : "hidden opacity-0 duration-200",
        )}
      />
      <FiltersPanel open={open} />
    </>
  );
}
