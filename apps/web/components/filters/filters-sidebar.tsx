"use client";

import { CROP_IDS, GRIDS, GRID_IDS, METRIC_IDS } from "@demetra/core";
import type { CropId, GridId } from "@demetra/core";
import { Check } from "lucide-react";
import { useId, type ReactNode } from "react";

import { MetricSwatch } from "@/components/metrics/metric-swatch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { SEASONS } from "@/config/period";
import { useBlocks } from "@/data/queries";
import { useT, type MessageKey } from "@/i18n";
import { formatCellSize, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

const monthKey = (month: number) => `month.${month}` as MessageKey;

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

/** The metric that gives the blocks and the legend their colours. */
function MetricFilter() {
  const t = useT();
  const metric = useAppStore((state) => state.metric);
  const setMetric = useAppStore((state) => state.setMetric);

  return (
    <div className="-mx-2 flex flex-col gap-0.5">
      {METRIC_IDS.map((id) => {
        const active = id === metric;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={active}
            onClick={() => setMetric(id)}
            className={cn(
              "flex h-9 items-center gap-2.5 rounded-md px-2 text-left text-sm transition-colors outline-none",
              "hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50",
              active && "bg-accent font-medium",
            )}
          >
            <MetricSwatch metric={id} />
            <span className="min-w-0 flex-1 truncate">{t(`metric.${id}.name`)}</span>
            {active && <Check className="size-4 shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}

function CropFilter() {
  const t = useT();
  const crop = useAppStore((state) => state.crop);
  const setCrop = useAppStore((state) => state.setCrop);
  const items = CROP_IDS.map((id) => ({ value: id, label: t(`crop.${id}`) }));

  return (
    <Select
      items={items}
      value={crop}
      onValueChange={(value) => {
        if (value) setCrop(value as CropId);
      }}
    >
      <SelectTrigger className="w-full" aria-label={t("filters.crop")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** One growing season: a year and a range of months. */
function PeriodFilter() {
  const t = useT();
  const period = useAppStore((state) => state.period);
  const setPeriod = useAppStore((state) => state.setPeriod);
  const years = SEASONS.map((year) => ({ value: year, label: String(year) }));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <Select
          items={years}
          value={period.year}
          onValueChange={(year) => {
            if (year) setPeriod({ ...period, year });
          }}
        >
          <SelectTrigger className="w-24" aria-label={t("filters.year")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm tabular-nums">
          {t(monthKey(period.startMonth))}
          {period.endMonth !== period.startMonth && ` – ${t(monthKey(period.endMonth))}`}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <Slider
          min={1}
          max={12}
          step={1}
          value={[period.startMonth, period.endMonth]}
          thumbLabels={[t("filters.firstMonth"), t("filters.lastMonth")]}
          onValueChange={(value) => {
            if (!Array.isArray(value)) return;
            const [startMonth, endMonth] = value;
            if (startMonth === undefined || endMonth === undefined) return;
            setPeriod({ ...period, startMonth, endMonth });
          }}
        />
        <div aria-hidden="true" className="flex justify-between px-[3px]">
          {MONTHS.map((month) => (
            <span
              key={month}
              className={cn(
                "w-1.5 text-center text-[0.65rem] leading-none",
                month >= period.startMonth && month <= period.endMonth
                  ? "text-foreground"
                  : "text-muted-foreground/70",
              )}
            >
              {t(monthKey(month)).charAt(0)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function IrrigationFilter() {
  const t = useT();
  const irrigation = useAppStore((state) => state.irrigation);
  const setIrrigation = useAppStore((state) => state.setIrrigation);

  return (
    <SegmentedControl
      stretch
      ariaLabel={t("filters.irrigation")}
      value={irrigation}
      onChange={setIrrigation}
      options={[
        { value: "irrigated", label: t("irrigation.irrigated") },
        { value: "rainfed", label: t("irrigation.rainfed") },
      ]}
    />
  );
}

/** The grid that divides the land into blocks, and the size of its cells. */
function GridFilter() {
  const t = useT();
  const grid = useAppStore((state) => state.grid);
  const setGrid = useAppStore((state) => state.setGrid);
  const items = GRID_IDS.map((id) => ({ value: id, label: t(`grid.${id}.name`) }));
  const sizes = GRIDS[grid.gridId].cellSizes;

  return (
    <div className="flex flex-col gap-2">
      <Select
        items={items}
        value={grid.gridId}
        onValueChange={(value) => {
          if (!value) return;
          const gridId = value as GridId;
          const cellSizes = GRIDS[gridId].cellSizes;
          // Keep the cell size when the new grid has it.
          const cellSize = cellSizes.includes(grid.cellSize)
            ? grid.cellSize
            : (cellSizes[0] ?? grid.cellSize);
          setGrid({ gridId, cellSize });
        }}
      >
        <SelectTrigger className="w-full" aria-label={t("filters.grid")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <SegmentedControl
        stretch
        ariaLabel={t("filters.cellSize")}
        value={String(grid.cellSize)}
        onChange={(value) => setGrid({ ...grid, cellSize: Number(value) })}
        options={sizes.map((size) => ({ value: String(size), label: formatCellSize(size) }))}
      />

      <p className="text-xs leading-relaxed text-muted-foreground">
        {t(`grid.${grid.gridId}.hint`)}
      </p>
    </div>
  );
}

/** The number of blocks on the map, or the reason why there are none. */
function BlockCount() {
  const t = useT();
  const blocks = useBlocks();

  let text = "";
  if (blocks.status === "tooMany") text = t("map.zoomIn");
  else if (blocks.status === "outside") text = t("map.outsideGrid");
  else if (blocks.data) {
    text = t("filters.blocksInView", { count: formatNumber(blocks.data.features.length) });
  }

  return (
    <p aria-live="polite" className="border-t px-4 py-2.5 text-xs text-muted-foreground">
      {text || " "}
    </p>
  );
}

/** The left sidebar: the active metric and the filters that change the values. */
export function FiltersSidebar() {
  const t = useT();
  const open = useAppStore((state) => state.filtersOpen);
  return (
    <aside
      aria-label={t("filters.title")}
      className={cn(
        "w-72 shrink-0 flex-col border-r bg-card md:flex",
        // On a small screen the sidebar is above the map, and only when the user opens it.
        "max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:z-30 max-md:max-w-[85vw] max-md:shadow-xl",
        open ? "flex" : "hidden",
      )}
    >
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-6 p-4">
          <Section title={t("filters.metric")}>
            <MetricFilter />
          </Section>
          <Section title={t("filters.crop")}>
            <CropFilter />
          </Section>
          <Section title={t("filters.period")}>
            <PeriodFilter />
          </Section>
          <Section title={t("filters.irrigation")}>
            <IrrigationFilter />
          </Section>
          <Section title={t("filters.grid")}>
            <GridFilter />
          </Section>
        </div>
      </ScrollArea>
      <BlockCount />
    </aside>
  );
}
