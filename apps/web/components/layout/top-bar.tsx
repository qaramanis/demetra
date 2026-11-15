"use client";

import type { ReactNode } from "react";

import { useT } from "@/i18n";

import { Logo } from "./logo";

interface TopBarProps {
  /** In the horizontal centre of the bar. */
  center?: ReactNode;
  /** At the right end of the bar. */
  end?: ReactNode;
}

/**
 * The bar above the map. The two side columns have the same width, so the centre column is in
 * the centre of the bar. On a narrow screen, the centre column gets the space that the sides
 * do not use.
 */
export function TopBar({ center, end }: TopBarProps) {
  const t = useT();
  return (
    <header className="z-20 grid h-14 shrink-0 grid-cols-[1fr_minmax(0,20rem)_1fr] items-center gap-3 border-b bg-card px-3 sm:gap-4 sm:px-4">
      <div className="flex items-center gap-2.5">
        <Logo />
        <div className="flex items-baseline gap-2.5">
          <span className="text-[0.95rem] font-semibold tracking-tight">{t("app.name")}</span>
          <span className="hidden text-xs text-muted-foreground xl:inline">{t("app.tagline")}</span>
        </div>
      </div>
      <div className="min-w-0">{center}</div>
      <div className="flex items-center justify-end gap-2">{end}</div>
    </header>
  );
}
