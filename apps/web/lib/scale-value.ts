import { NUMBER_SCALES } from "@demetra/core";
import type { NumberScaleId } from "@demetra/core";

import type { Translate } from "@/i18n";
import { formatNumber } from "@/lib/format";

/**
 * A value of a scale with its unit, for example "17.2 °C", "66 days" or "+38 %". The Storie
 * index has no unit. A diverging scale shows the sign of a value above its middle value.
 *
 * `decimals`: the number of decimal places. Without it, the scale gives the number.
 */
export function formatScaleValue(
  scale: NumberScaleId,
  value: number,
  t: Translate,
  decimals = NUMBER_SCALES[scale].decimals,
): string {
  const { unit, diverging } = NUMBER_SCALES[scale];
  const rounded = Number(value.toFixed(decimals));
  const number = `${diverging && rounded > 0 ? "+" : ""}${formatNumber(value, decimals)}`;

  switch (unit) {
    case "celsius":
      return t("climate.celsius", { value: number });
    case "days":
      return rounded === 1 ? t("climate.oneDay") : t("climate.days", { value: number });
    case "mm":
      return t("climate.mm", { value: number });
    case "percent":
      return t("climate.percent", { value: number });
    case "index":
      return number;
  }
}
