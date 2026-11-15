import { Suspense } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { translate } from "@/i18n";

function DashboardLoading() {
  return (
    // The text shows only after 300 ms, so a fast load does not flash it.
    <div className="grid h-dvh animate-in place-items-center text-sm text-muted-foreground delay-300 duration-200 ease-out fill-mode-backwards fade-in">
      {translate("map.loading")}
    </div>
  );
}

/**
 * The dashboard reads its data with TanStack Query in Client Components. TanStack Query reads
 * the current time when it makes a query, and Next.js cannot put that in the static part of
 * the page. With the boundary, the static part is the fallback and Next.js renders the
 * dashboard for each request.
 */
export default function Home() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <AppShell />
    </Suspense>
  );
}
