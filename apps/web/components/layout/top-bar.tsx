"use client";

import type { ReactNode } from "react";

import { useT } from "@/i18n";

import { Logo } from "./logo";

export function TopBar({ children }: { children?: ReactNode }) {
  const t = useT();
  return (
    <header className="z-20 flex h-14 shrink-0 items-center gap-3 border-b bg-card px-3 sm:gap-4 sm:px-4">
      <div className="flex items-center gap-2.5">
        <Logo />
        <div className="flex items-baseline gap-2.5">
          <span className="text-[0.95rem] font-semibold tracking-tight">{t("app.name")}</span>
          <span className="hidden text-xs text-muted-foreground xl:inline">{t("app.tagline")}</span>
        </div>
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">{children}</div>
    </header>
  );
}
