import { NO_PREDICTION_CROP_CODE } from "@demetra/core";
import type { Crop } from "@demetra/core";

import { NO_PREDICTION_COLOR, UNKNOWN_CROP_COLOR } from "@/config/palettes";
import type { Translate } from "@/i18n";

/**
 * The name and the map color of a crop code. A block for which the model has no prediction has
 * a code that is not a crop class: it has its own name and color.
 */
export function cropLook(
  code: number,
  cropIndex: ReadonlyMap<number, Crop>,
  t: Translate,
): { name: string; color: string } {
  if (code === NO_PREDICTION_CROP_CODE) {
    return { name: t("prediction.none"), color: NO_PREDICTION_COLOR };
  }
  const crop = cropIndex.get(code);
  return { name: crop?.name ?? t("common.unknownCrop"), color: crop?.color ?? UNKNOWN_CROP_COLOR };
}
