/** Clamp x into [0, 1]. */
export function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

/**
 * Price deviation normalized against the stock's OWN historical behavior
 * (z-score against trailing std dev), not a fixed % threshold — this is
 * what makes a 2% move in a normally-quiet stock score higher than a 2%
 * move in a normally-volatile one. Capped at a z-score of 4 → maps to 1.0.
 */
export function normalizePriceDeviation(
  percentChange: number,
  trailingStdDevPct: number
): number {
  const std = trailingStdDevPct > 0 ? trailingStdDevPct : 1; // avoid /0
  const z = Math.abs(percentChange) / std;
  return clamp01(z / 4);
}

/**
 * Volume anomaly: ratio of current volume to trailing average.
 * 1.0x (normal) → 0. 3.0x+ → 1.0 (capped).
 */
export function normalizeVolumeAnomaly(volumeRatio: number): number {
  return clamp01((volumeRatio - 1) / 2);
}

/**
 * Volatility change: today's absolute move vs the stock's own trailing
 * average absolute move. 1x → 0, 4x+ → 1.
 */
export function normalizeVolatilityChange(
  percentChange: number,
  trailingAvgMoveAbsPct: number
): number {
  const base = trailingAvgMoveAbsPct > 0 ? trailingAvgMoveAbsPct : 1;
  const ratio = Math.abs(percentChange) / base;
  return clamp01((ratio - 1) / 3);
}

/**
 * Relative performance: how much the stock diverged from its sector AND
 * the broader market — this is the "outperformed sector while sector
 * moved with market" differentiator from brief §14. Divergence, not raw
 * magnitude, is what's rewarded.
 */
export function normalizeRelativePerformance(
  stockPct: number,
  sectorPct: number,
  marketPct: number
): number {
  const vsSector = Math.abs(stockPct - sectorPct);
  const vsMarket = Math.abs(stockPct - marketPct);
  const divergence = (vsSector + vsMarket) / 2;
  // 0pp divergence → 0. 6pp+ divergence → 1.0 (capped). Calibrated against
  // the brief's own worked example (§14/§30): +6.2% vs sector +1.7% /
  // market +0.4% should land in HIGH_ATTENTION once combined with the
  // other factors — see tests/change.engine.test.ts.
  return clamp01(divergence / 6);
}

export function normalizeEventImpact(hasEvent: boolean): number {
  return hasEvent ? 1 : 0;
}
