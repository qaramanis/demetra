import type { RankingCriterion, RotationStrategy } from "./types.ts";

/** The value that a ranking criterion compares. */
export function rankingValue(strategy: RotationStrategy, criterion: RankingCriterion): number {
  return criterion === "profit" ? strategy.avgProfitPerHa : strategy.avgYieldPerHa;
}

/**
 * The best strategy for a criterion:
 * - `profit`: the highest average profit of one year (depends on the prices).
 * - `yield`: the highest average yield of one year (does not depend on the prices).
 *
 * If two strategies have the same value, the strategy with the higher resilience is the best.
 */
export function bestStrategy(
  strategies: readonly RotationStrategy[],
  criterion: RankingCriterion,
): RotationStrategy | undefined {
  let best: RotationStrategy | undefined;
  for (const strategy of strategies) {
    if (!best) {
      best = strategy;
      continue;
    }
    const value = rankingValue(strategy, criterion);
    const bestValue = rankingValue(best, criterion);
    if (value > bestValue || (value === bestValue && strategy.resilience > best.resilience)) {
      best = strategy;
    }
  }
  return best;
}
