import type { ChangeFactor, MarketQuote, StockChangeResult } from "../common/types.js";
import {
  normalizeEventImpact,
  normalizePriceDeviation,
  normalizeRelativePerformance,
  normalizeVolatilityChange,
  normalizeVolumeAnomaly,
} from "./normalize.js";
import { classifyScore, WEIGHTS } from "./thresholds.js";
import { buildExplanation } from "./explanation.js";

export interface ChangeInput {
  previousPrice: number | null; // null if this is the user's first-ever visit
  currentQuote: MarketQuote;
  hasRecentEvent: boolean;
}

/**
 * Pure function: (previous snapshot, current quote, event flag) -> score.
 * No database, no HTTP, no clock reads — fully unit-testable in isolation
 * per brief §35. See tests/change.engine.test.ts.
 */
export function computeStockChange(input: ChangeInput): StockChangeResult {
  const { previousPrice, currentQuote, hasRecentEvent } = input;

  if (previousPrice === null) {
    // First visit: nothing to compare against. Not an error, not a score.
    return {
      symbol: currentQuote.symbol,
      companyName: currentQuote.companyName,
      previousPrice: currentQuote.price,
      currentPrice: currentQuote.price,
      percentChange: 0,
      score: 0,
      attentionLevel: "NORMAL",
      factors: [],
      explanation: "First visit — nothing to compare yet.",
      freshness: currentQuote.freshness,
    };
  }

  const percentChange =
    previousPrice === 0 ? 0 : ((currentQuote.price - previousPrice) / previousPrice) * 100;

  const volumeRatio =
    currentQuote.averageVolume > 0
      ? currentQuote.volume / currentQuote.averageVolume
      : 1;

  const rawFactors: { key: ChangeFactor["key"]; label: string; rawValue: number }[] = [
    {
      key: "priceDeviation",
      label: "Price anomaly",
      rawValue: normalizePriceDeviation(percentChange, currentQuote.trailingStdDevPct),
    },
    {
      key: "volumeAnomaly",
      label: "Volume anomaly",
      rawValue: normalizeVolumeAnomaly(volumeRatio),
    },
    {
      key: "volatilityChange",
      label: "Volatility",
      rawValue: normalizeVolatilityChange(percentChange, currentQuote.trailingAvgMoveAbsPct),
    },
    {
      key: "relativePerformance",
      label: "Relative performance",
      rawValue: normalizeRelativePerformance(
        percentChange,
        currentQuote.sectorChangePercent,
        currentQuote.marketChangePercent
      ),
    },
    {
      key: "eventImpact",
      label: "Event impact",
      rawValue: normalizeEventImpact(hasRecentEvent),
    },
  ];

  const factors: ChangeFactor[] = rawFactors.map((f) => {
    const weight = WEIGHTS[f.key];
    return {
      key: f.key,
      label: f.label,
      rawValue: f.rawValue,
      weight,
      contribution: Math.round(f.rawValue * weight * 100 * 10) / 10,
    };
  });

  const score = Math.max(
    0,
    Math.min(100, Math.round(factors.reduce((sum, f) => sum + f.contribution, 0)))
  );

  const attentionLevel = classifyScore(score);
  const explanation = buildExplanation(currentQuote.symbol, percentChange, factors);

  return {
    symbol: currentQuote.symbol,
    companyName: currentQuote.companyName,
    previousPrice,
    currentPrice: currentQuote.price,
    percentChange: Math.round(percentChange * 100) / 100,
    score,
    attentionLevel,
    factors,
    explanation,
    freshness: currentQuote.freshness,
  };
}
