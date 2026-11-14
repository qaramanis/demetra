"use client";

import { FlaskConical } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { provider } from "@/data/provider";
import { useT } from "@/i18n";

/** Tells the user that the values on the map are generated. Hidden for a real provider. */
export function MockDataBadge() {
  const t = useT();
  if (provider.meta.kind !== "mock") return null;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            className="flex h-7 items-center gap-1.5 rounded-full border border-amber-700/25 bg-amber-50 px-2.5 text-xs font-medium text-amber-900 shadow-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        }
      >
        <FlaskConical className="size-3.5" />
        {t("mock.badge")}
      </TooltipTrigger>
      <TooltipContent side="bottom" align="start">
        {t("mock.explanation")}
      </TooltipContent>
    </Tooltip>
  );
}
