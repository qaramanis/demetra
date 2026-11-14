import type { Period } from "@demetra/core";

/** The last growing season that the selector offers. */
export const LAST_SEASON = 2026;

/** The first growing season that the selector offers. */
export const FIRST_SEASON = 2017;

/** From the newest season to the oldest. */
export const SEASONS: readonly number[] = Array.from(
  { length: LAST_SEASON - FIRST_SEASON + 1 },
  (_, index) => LAST_SEASON - index,
);

/** April to October of the last season. */
export const DEFAULT_PERIOD: Period = { year: LAST_SEASON, startMonth: 4, endMonth: 10 };
