"use client";

import { NO_PREDICTION_CROP_CODE, PREDICTION_HISTORY_YEARS } from "@demetra/core";
import type { BlockPrediction as BlockPredictionData } from "@demetra/core";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useBlockPrediction, useCropIndex } from "@/data/queries";
import { useT } from "@/i18n";
import { cropLook } from "@/lib/crop-look";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/** The model score of a crop: the number and a bar with the length of the score. */
function ScoreBar({ score }: { score: number }) {
  return (
    <span className="flex shrink-0 items-center gap-2">
      <span aria-hidden="true" className="h-1.5 w-12 overflow-hidden rounded-full bg-prediction/15">
        <span
          className="block h-full rounded-full bg-prediction"
          style={{ width: `${Math.round(score * 100)}%` }}
        />
      </span>
      <span className="w-8 text-right text-xs tabular-nums">{formatNumber(score, 2)}</span>
    </span>
  );
}

/** One crop of the model: its swatch, its name and its model score. */
function CropScoreRow({
  crop,
  score,
  main,
}: {
  crop: number;
  score: number | null;
  main?: boolean;
}) {
  const t = useT();
  const cropIndex = useCropIndex();
  const { name, color } = cropLook(crop, cropIndex, t);

  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className={cn(
          "shrink-0 ring-1 ring-foreground/10",
          main ? "size-4 rounded-[4px]" : "size-3 rounded-[3px]",
        )}
        style={{ backgroundColor: color }}
      />
      <span
        className={cn(
          "min-w-0 flex-1 truncate",
          main ? "text-sm font-medium" : "text-xs text-muted-foreground",
        )}
        title={name}
      >
        {name}
      </span>
      {score !== null && <ScoreBar score={score} />}
    </div>
  );
}

/**
 * The prediction of the block: the predicted crop with its model score, and the next crops of
 * the model. A block with no prediction has the reason.
 */
function PredictedCrops({ prediction }: { prediction: BlockPredictionData }) {
  const t = useT();
  const { crop, score, alternatives, year } = prediction;

  if (crop === null) {
    return <p className="text-sm text-muted-foreground">{t("prediction.noRow")}</p>;
  }

  if (crop === NO_PREDICTION_CROP_CODE) {
    return (
      <div className="flex flex-col gap-1">
        <CropScoreRow crop={crop} score={null} main />
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t("prediction.noneDetail", { from: year - PREDICTION_HISTORY_YEARS, to: year - 1 })}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <CropScoreRow crop={crop} score={score} main />
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t("prediction.mainCropRule")}
        </p>
      </div>
      {alternatives.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <h4 className="text-[0.7rem] font-medium text-muted-foreground">
            {t("prediction.nextCrops")}
          </h4>
          {alternatives.map((alternative) => (
            <CropScoreRow key={alternative.crop} crop={alternative.crop} score={alternative.score} />
          ))}
        </div>
      )}
      {score !== null && (
        <p className="text-xs leading-relaxed text-muted-foreground">{t("prediction.scoreNote")}</p>
      )}
    </div>
  );
}

/**
 * The prediction for a block, while the map shows a prediction year. The detail panel shows
 * the real data of `dataYear` below it: the note tells the user that the two are different.
 */
export function BlockPrediction({
  blockId,
  year,
  dataYear,
}: {
  blockId: string;
  year: number;
  dataYear: number;
}) {
  const t = useT();
  const query = useBlockPrediction(blockId);

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-prediction/30 bg-prediction/6 p-3">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-prediction-ink">
        <Sparkles aria-hidden="true" className="size-3.5 shrink-0 text-prediction" />
        {t("prediction.title", { year })}
      </h3>

      {query.isPending ? (
        <Skeleton className="h-9 rounded-md bg-prediction/10" />
      ) : query.isError ? (
        <div role="alert" className="flex flex-col items-start gap-2 text-sm">
          {t("prediction.detailError")}
          <Button variant="outline" size="sm" onClick={() => query.refetch()}>
            {t("detail.retry")}
          </Button>
        </div>
      ) : (
        <PredictedCrops prediction={query.data} />
      )}

      <p className="text-xs leading-relaxed text-prediction-ink">
        {t("prediction.detailNote", { year: dataYear })}
      </p>
    </section>
  );
}
