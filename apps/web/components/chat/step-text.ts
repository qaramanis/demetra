import type { ChatStep, Crop } from "@demetra/core";

import type { Translate } from "@/i18n";
import { cropLook } from "@/lib/crop-look";

/** The tools whose result is for one year. */
const YEAR_TOOLS = new Set<string>(["get_block", "get_rotation_stats", "get_crop_stats"]);

/**
 * The text of one step of an answer, for example "Finds the crops that follow Tomatoes in
 * Yolo County". The step has codes and ids only: the names come from the reference data.
 */
export function stepText(
  step: ChatStep,
  cropIndex: ReadonlyMap<number, Crop>,
  countyNames: ReadonlyMap<string, string>,
  t: Translate,
): string {
  const block = step.blockId;
  const crop = step.cropCode === undefined ? undefined : cropLook(step.cropCode, cropIndex, t).name;

  let text: string;
  switch (step.tool) {
    case "get_block":
      text = block ? t("chat.step.block", { block }) : t("chat.step.blockAny");
      break;
    case "get_block_history":
      text = block ? t("chat.step.history", { block }) : t("chat.step.historyAny");
      break;
    case "get_rotation_stats":
      text = crop ? t("chat.step.rotation", { crop }) : t("chat.step.rotationAny");
      break;
    case "get_crop_stats":
      text = crop ? t("chat.step.cropStats", { crop }) : t("chat.step.cropStatsAny");
      break;
    case "get_weather":
      text = block ? t("chat.step.weather", { block }) : t("chat.step.weatherAny");
      break;
    default:
      text = t("chat.step.other");
  }

  const county = step.countyFips === undefined ? undefined : countyNames.get(step.countyFips);
  if (county) text = t("chat.step.inCounty", { step: text, county });
  if (step.year !== undefined && YEAR_TOOLS.has(step.tool)) {
    text = t("chat.step.inYear", { step: text, year: step.year });
  }
  return text;
}
