"use client";

import { useT } from "@/i18n";

import { TopBar } from "./top-bar";

/**
 * The layout of the dashboard: top bar, filter sidebar on the left, map in the centre and
 * detail panel on the right.
 */
export function AppShell() {
  const t = useT();
  return (
    <div className="flex h-dvh flex-col">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <aside
          aria-label={t("filters.title")}
          className="hidden w-72 shrink-0 flex-col border-r bg-card md:flex"
        >
          <h2 className="px-4 pt-4 text-sm font-semibold">{t("filters.title")}</h2>
        </aside>
        <main className="relative min-w-0 flex-1 bg-muted">
          <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
            {t("map.loading")}
          </div>
        </main>
      </div>
    </div>
  );
}
