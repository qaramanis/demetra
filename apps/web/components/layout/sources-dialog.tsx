"use client";

import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { type MessageKey, useT } from "@/i18n";

interface SourceLink {
  /** A year, or the key of the link text. */
  label: number | MessageKey;
  href: string;
}

interface Source {
  name: MessageKey;
  detail: MessageKey;
  links: SourceLink[];
}

const NASS = "https://www.nass.usda.gov/sites/default/files";
const CDL = `${NASS}/Research_and_Science/Cropland/Release/datasets`;
const AG_COMM = `${NASS}/Statistics_by_State/California/Publications/AgComm`;

/** The open data that the pipeline loads into the database. */
const SOURCES: Source[] = [
  {
    name: "sources.cdl.name",
    detail: "sources.cdl.detail",
    links: [2018, 2019, 2020, 2021, 2022].map((year) => ({
      label: year,
      href: `${CDL}/${year}_30m_cdls.zip`,
    })),
  },
  {
    name: "sources.counties.name",
    detail: "sources.counties.detail",
    links: [
      { label: 2018, href: `${AG_COMM}/2018/2018cactbsErrata.csv` },
      { label: 2019, href: `${AG_COMM}/2019/201908cropyear.csv` },
      { label: 2020, href: `${AG_COMM}/2020/main_data_table.csv` },
      { label: 2021, href: `${AG_COMM}/2021/CAC_2021_data_by_commodity_20240417.csv` },
      {
        label: 2022,
        href: `${AG_COMM}/2022/County_Ag_Commissioner_Report_2022_data_by_commodity.csv`,
      },
    ],
  },
  {
    name: "sources.soil.name",
    detail: "sources.soil.detail",
    links: [
      { label: "sources.soil.download", href: "https://nrcs.app.box.com/v/soils/file/2550640582912" },
    ],
  },
  {
    name: "sources.climate.name",
    detail: "sources.climate.detail",
    links: [
      { label: "sources.climate.api", href: "https://power.larc.nasa.gov/docs/services/api/" },
      { label: "sources.climate.viewer", href: "https://power.larc.nasa.gov/data-access-viewer/" },
    ],
  },
];

/** The button at the right end of the top bar, and the list of the open data sources. */
export function SourcesDialog() {
  const t = useT();

  return (
    <Dialog.Root>
      <Dialog.Trigger
        render={<Button variant="ghost" size="sm" className="text-muted-foreground" />}
      >
        {t("sources.open")}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/20 transition-opacity duration-150 ease-out data-ending-style:opacity-0 data-starting-style:opacity-0 dark:bg-black/50" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-md max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-xl bg-popover p-5 text-popover-foreground shadow-lg ring-1 ring-foreground/10 outline-none transition-[opacity,scale] duration-150 ease-out data-ending-style:scale-97 data-ending-style:opacity-0 data-starting-style:scale-97 data-starting-style:opacity-0">
          <div className="flex items-center justify-between gap-2">
            <Dialog.Title className="text-base font-semibold">{t("sources.title")}</Dialog.Title>
            <Dialog.Close
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("sources.close")}
                  title={t("sources.close")}
                  className="-mr-1.5"
                />
              }
            >
              <X />
            </Dialog.Close>
          </div>
          <ul className="flex flex-col gap-4 text-sm">
            {SOURCES.map((source) => (
              <li key={source.name} className="flex flex-col gap-1">
                <span className="font-medium">{t(source.name)}</span>
                <span className="text-muted-foreground">{t(source.detail)}</span>
                <span className="flex flex-wrap gap-x-3 gap-y-1">
                  {source.links.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary-ink tabular-nums underline-offset-4 hover:underline"
                    >
                      {typeof link.label === "number" ? link.label : t(link.label)}
                    </a>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
