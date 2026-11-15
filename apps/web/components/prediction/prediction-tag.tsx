import { useT } from "@/i18n";
import { cn } from "@/lib/utils";

/** The tag of a prediction year: the data of that year is a prediction, not real data. */
export function PredictionTag({ className }: { className?: string }) {
  const t = useT();
  return (
    <span
      className={cn(
        "inline-flex h-4 shrink-0 items-center rounded-full bg-prediction/14 px-1.5 text-[0.65rem] font-medium text-prediction-ink",
        className,
      )}
    >
      {t("prediction.tag")}
    </span>
  );
}
