"use client";

import { PenTool, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useT } from "@/i18n";
import { useAppStore } from "@/store/app-store";

/** Starts or cancels the drawing of a field polygon. */
export function DrawButton() {
  const t = useT();
  const drawing = useAppStore((state) => state.drawing);
  const setDrawing = useAppStore((state) => state.setDrawing);

  return (
    <Button
      variant={drawing ? "default" : "outline"}
      aria-pressed={drawing}
      onClick={() => setDrawing(!drawing)}
      className="h-8 shadow-sm"
    >
      {drawing ? <X data-icon="inline-start" /> : <PenTool data-icon="inline-start" />}
      {drawing ? t("draw.cancel") : t("draw.start")}
    </Button>
  );
}
