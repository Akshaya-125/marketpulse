import { describe, it, expect } from "vitest";
import { computeStockChange } from "../src/change/ChangeIntelligenceEngine.js";
import type { MarketQuote } from "../src/common/types.js";

function baseQuote(overrides: Partial<MarketQuote> = {}): MarketQuote {
  return {
    symbol: "TCS",
    companyName: "Tata Consultancy Services",
    price: 3620,
    previousClose: 3620,
    dayChangePercent: 0,
    volume: 2_100_000,
    averageVolume: 2_100_000,
    sector: "IT",
    sectorChangePercent: 0.4,
    marketChangePercent: 0.3,
    trailingAvgMoveAbsPct: 0.9,
    trailingStdDevPct: 1.1,
    timestamp: new Date().toISOString(),
    source: "mock-provider",
    freshness: "FRESH",
    ...overrides,
  };
}

describe("ChangeIntelligenceEngine", () => {
  it("Test 1: small price movement -> NORMAL", () => {
    const result = computeStockChange({
      previousPrice: 3600,
      currentQuote: baseQuote({ price: 3618 }), // ~0.5% move, in line with sector/market
      hasRecentEvent: false,
    });
    expect(result.attentionLevel).toBe("NORMAL");
    expect(result.score).toBeLessThan(30);
  });

  it("Test 2: large price movement -> materially higher score than small movement", () => {
    const small = computeStockChange({
      previousPrice: 3600,
      currentQuote: baseQuote({ price: 3618 }),
      hasRecentEvent: false,
    });
    const large = computeStockChange({
      previousPrice: 3600,
      currentQuote: baseQuote({ price: 3850, sectorChangePercent: 0.4, marketChangePercent: 0.3 }),
      hasRecentEvent: false,
    });
    expect(large.score).toBeGreaterThan(small.score);
  });

  it("Test 3: large movement + abnormal volume -> very high score (HIGH_ATTENTION)", () => {
    const result = computeStockChange({
      previousPrice: 3620,
      currentQuote: baseQuote({
        price: 3850, // +6.2%
        volume: 5_880_000, // 2.8x average
        sectorChangePercent: 1.7,
        marketChangePercent: 0.4,
      }),
      hasRecentEvent: false,
    });
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.attentionLevel).toBe("HIGH_ATTENTION");
  });

  it("Test 4: stock moves with its whole sector -> low relativePerformance contribution", () => {
    const result = computeStockChange({
      previousPrice: 3620,
      currentQuote: baseQuote({
        price: 3620 * 1.062, // +6.2%
        sectorChangePercent: 6.0,
        marketChangePercent: 5.8,
      }),
      hasRecentEvent: false,
    });
    const rel = result.factors.find((f) => f.key === "relativePerformance")!;
    expect(rel.contribution).toBeLessThan(5);
  });

  it("Test 5: stock significantly outperforms sector -> higher relativePerformance contribution", () => {
    const inLine = computeStockChange({
      previousPrice: 3620,
      currentQuote: baseQuote({ price: 3620 * 1.062, sectorChangePercent: 6.0, marketChangePercent: 5.8 }),
      hasRecentEvent: false,
    });
    const outperform = computeStockChange({
      previousPrice: 3620,
      currentQuote: baseQuote({ price: 3620 * 1.062, sectorChangePercent: 1.7, marketChangePercent: 0.4 }),
      hasRecentEvent: false,
    });
    const relIn = inLine.factors.find((f) => f.key === "relativePerformance")!.contribution;
    const relOut = outperform.factors.find((f) => f.key === "relativePerformance")!.contribution;
    expect(relOut).toBeGreaterThan(relIn);
  });

  it("Test 9: high user priority influences ranking, not the raw score", () => {
    // Priority isn't a ChangeIntelligenceEngine input at all — this test
    // documents that constraint at the engine boundary: the function
    // signature has no priority parameter, so it's structurally impossible
    // for priority to inflate the score. Ranking behavior is covered in
    // rankAttention.test.ts.
    const result = computeStockChange({
      previousPrice: 3600,
      currentQuote: baseQuote({ price: 3618 }),
      hasRecentEvent: false,
    });
    expect(result.attentionLevel).toBe("NORMAL");
  });

  it("Test 10: identical price, sector and market also flat -> no meaningful change", () => {
    const result = computeStockChange({
      previousPrice: 3620,
      currentQuote: baseQuote({ price: 3620, sectorChangePercent: 0, marketChangePercent: 0 }),
      hasRecentEvent: false,
    });
    expect(result.score).toBe(0);
    expect(result.attentionLevel).toBe("NORMAL");
  });

  it("first visit (no previous snapshot) is handled without a fabricated score", () => {
    const result = computeStockChange({
      previousPrice: null,
      currentQuote: baseQuote(),
      hasRecentEvent: false,
    });
    expect(result.score).toBe(0);
    expect(result.explanation).toMatch(/first visit/i);
  });

  it("every factor sums to the total score (explainability contract)", () => {
    const result = computeStockChange({
      previousPrice: 3620,
      currentQuote: baseQuote({ price: 3850, volume: 5_880_000, sectorChangePercent: 1.7 }),
      hasRecentEvent: true,
    });
    const summed = Math.round(result.factors.reduce((s, f) => s + f.contribution, 0));
    expect(Math.abs(summed - result.score)).toBeLessThanOrEqual(1); // rounding tolerance
  });
});
