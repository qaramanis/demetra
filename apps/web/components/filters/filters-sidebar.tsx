"use client";

import { MAP_LAYER_IDS } from "@demetra/core";
import type { County, Crop } from "@demetra/core";
import { Check, X } from "lucide-react";
import { useId, type ReactNode } from "react";

import { LayerSwatch } from "@/components/layers/layer-swatch";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useBlockFilters, useBlocks, useReferenceData } from "@/data/queries";
import { useT, type MessageKey } from "@/i18n";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

/** The limits of the data, in the order of the note "About the data". */
const LIMIT_KEYS: readonly MessageKey[] = [
  "limits.countyAverages",
  "limits.grain",
  "limits.noRevenue",
  "limits.cropClasses",
  "limits.soil",
  "limits.noCosts",
];

// "All crops" and "All counties" have the value `null`, the same value as in the store. For a
// `null` value, Base UI gives the trigger the placeholder style. These items are normal
// choices, so their text keeps the normal color.
const TRIGGER_CLASS = "w-full data-placeholder:text-foreground";

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

/** The layer that gives the blocks and the legend their colors. */
function LayerFilter() {
  const t = useT();
  const layer = useAppStore((state) => state.layer);
  const setLayer = useAppStore((state) => state.setLayer);

  return (
    <div className="-mx-2 flex flex-col gap-0.5">
      {MAP_LAYER_IDS.map((id) => {
        const active = id === layer;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={active}
            onClick={() => setLayer(id)}
            className={cn(
              "flex h-9 items-center gap-2.5 rounded-md px-2 text-left text-sm transition-colors outline-none",
              "hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50",
              active && "bg-accent font-medium",
            )}
          >
            <LayerSwatch layer={id} />
            <span className="min-w-0 flex-1 truncate">{t(`layer.${id}.name`)}</span>
            {active && <Check className="size-4 shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}

/** The year of the data. The list has only the years that have data. */
function YearFilter({ years }: { years: readonly number[] }) {
  const t = useT();
  const year = useBlockFilters()?.year ?? null;
  const setYear = useAppStore((state) => state.setYear);
  const items = years.map((value) => ({ value, label: String(value) }));

  return (
    <Select
      items={items}
      value={year}
      onValueChange={(value) => {
        if (value !== null) setYear(value);
      }}
    >
      <SelectTrigger className="w-full" aria-label={t("filters.year")}>
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

/** One crop class, or all crops. Each crop class has a swatch of its color on the map. */
function CropFilter({ crops }: { crops: readonly Crop[] }) {
  const t = useT();
  const cropCode = useAppStore((state) => state.cropCode);
  const setCropCode = useAppStore((state) => state.setCropCode);
  const items = [
    { value: null, label: t("common.allCrops"), color: null },
    ...crops.map((crop) => ({ value: crop.code, label: crop.name, color: crop.color })),
  ];

  return (
    <Select items={items} value={cropCode} onValueChange={(value) => setCropCode(value)}>
      <SelectTrigger className={TRIGGER_CLASS} aria-label={t("filters.crop")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value ?? "all"} value={item.value}>
            {/* "All crops" has an empty swatch, so that all names start at the same position. */}
            <span
              aria-hidden="true"
              className={cn(
                "size-3 shrink-0 self-center rounded-[3px]",
                item.color && "ring-1 ring-foreground/10",
              )}
              style={item.color ? { backgroundColor: item.color } : undefined}
            />
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** One county, or all counties. */
function CountyFilter({ counties }: { counties: readonly County[] }) {
  const t = useT();
  const countyFips = useAppStore((state) => state.countyFips);
  const setCountyFips = useAppStore((state) => state.setCountyFips);
  const items = [
    { value: null, label: t("common.allCounties") },
    ...counties.map((county) => ({ value: county.fips, label: county.name })),
  ];

  return (
    <Select items={items} value={countyFips} onValueChange={(value) => setCountyFips(value)}>
      <SelectTrigger className={TRIGGER_CLASS} aria-label={t("filters.county")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value ?? "all"} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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
      className="-ml-2 self-start text-muted-foreground"
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
        {data ? <YearFilter years={data.years} /> : skeleton}
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

/** The limits of the data and its sources. */
function DataLimits() {
  const t = useT();
  return (
    <div className="flex flex-col gap-2 text-xs leading-relaxed text-muted-foreground">
      <ul className="flex list-disc flex-col gap-1 pl-4">
        {LIMIT_KEYS.map((key) => (
          <li key={key}>{t(key)}</li>
        ))}
      </ul>
      <p>{t("limits.sources")}</p>
    </div>
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
    text = t("filters.blocksInView", { count: formatNumber(blocks.data.features.length) });
  }

  return (
    <p aria-live="polite" className="border-t px-4 py-2.5 text-xs text-muted-foreground">
      {text || " "}
    </p>
  );
}

/** The left sidebar: the map layer, the filters and the limits of the data. */
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
          <Section title={t("filters.layer")}>
            <LayerFilter />
          </Section>
          <DataFilters />
          <Section title={t("limits.title")}>
            <DataLimits />
          </Section>
        </div>
      </ScrollArea>
      <BlockCount />
    </aside>
  );
}
